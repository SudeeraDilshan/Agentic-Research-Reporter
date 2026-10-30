# Flow:
#   START → supervisor ─┬→ researcher → supervisor (loop)
#                       ├→ analyst    → supervisor (loop)
#                       └→ END
#
# The supervisor LLM decides at each step: call an agent or finish.

from typing import TypedDict, Annotated, Literal
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from config import get_llm

llm = get_llm()

WORKERS = ["researcher", "analyst"]

class State(TypedDict):
    messages: Annotated[list, add_messages]
    next: str       # which node to call next (set by supervisor)

# ─── Supervisor — the orchestrating brain ─────────────────────
SUPERVISOR_PROMPT = SystemMessage(content=f"""
You are a supervisor managing a team of agents: {WORKERS}.
Given the conversation so far, decide which agent should act next OR finish.

Reply with EXACTLY one of: {WORKERS + ['FINISH']}

Rules:
- 'researcher' → when more facts/information are needed
- 'analyst'    → when facts are available and need interpretation or synthesis
- 'FINISH'     → when a complete, well-reasoned answer has been given

Reply with only the single word. No explanation.
""")

def supervisor_node(state: State) -> dict:
    print("  [supervisor] deciding next step…")
    decision = llm.invoke([SUPERVISOR_PROMPT] + state["messages"])
    next_node = decision.content.strip()
    print(f"  [supervisor] → '{next_node}'")
    return {"next": next_node}

def supervisor_router(state: State) -> Literal["researcher", "analyst", "__end__"]:
    n = state["next"]
    if n == "FINISH":
        return END
    return n

# ─── Specialist agents ────────────────────────────────────────
def researcher_node(state: State) -> dict:
    print("  [researcher] gathering information…")
    system = SystemMessage(content=(
        "You are a research specialist. Provide concise factual information "
        "relevant to the latest user question. Max 80 words."
    ))
    response = llm.invoke([system] + state["messages"])
    return {"messages": [AIMessage(content=f"📚 RESEARCHER: {response.content}")]}

def analyst_node(state: State) -> dict:
    print("  [analyst] interpreting findings…")
    system = SystemMessage(content=(
        "You are an analyst. Given the research facts, provide a clear "
        "interpretation and actionable insight. Max 80 words."
    ))
    response = llm.invoke([system] + state["messages"])
    return {"messages": [AIMessage(content=f"📊 ANALYST: {response.content}")]}

# ─── Graph ────────────────────────────────────────────────────
builder = StateGraph(State)
builder.add_node("supervisor", supervisor_node)
builder.add_node("researcher", researcher_node)
builder.add_node("analyst", analyst_node)

builder.add_edge(START, "supervisor")

# Supervisor conditionally routes after every decision
builder.add_conditional_edges("supervisor", supervisor_router)

# After each specialist, return to supervisor (the loop!)
builder.add_edge("researcher", "supervisor")
builder.add_edge("analyst", "supervisor")

app = builder.compile()

if __name__ == "__main__":
    question = "What is the impact of large language models on software engineering jobs?"

    print("=" * 55)
    print("  Exercise 06 — Supervisor Pattern")
    print(f"  Question: {question}")
    print("=" * 55)

    result = app.invoke({
        "messages": [HumanMessage(content=question)],
        "next": "",
    })

    print("\n💬 Full agent conversation:")
    for msg in result["messages"]:
        if isinstance(msg, HumanMessage):
            print(f"\n  🧑 Human: {msg.content}")
        elif isinstance(msg, AIMessage) and msg.content:
            print(f"\n  🤖 {msg.content[:200]}")

    print("\n📝 Key concepts used:")
    print("   • Supervisor LLM decides which agent runs next")
    print("   • Graph loops: agents return to supervisor after finishing")
    print("   • 'FINISH' signal → supervisor routes to END")
    print("   • Emergent multi-step reasoning across agents")
