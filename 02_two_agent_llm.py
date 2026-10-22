# ============================================================
# Exercise 02: Two-Agent Chat with Real LLM via OpenRouter
# ============================================================
# CONCEPTS: ChatOpenRouter · SystemMessage · conditional routing
#
# Run: .\venv\Scripts\python 02_two_agent_llm.py
# ============================================================

from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from config import get_llm  # ← uses your OPENROUTER_API_KEY

llm = get_llm()  # reads DEFAULT_MODEL from .env

# ─── State ────────────────────────────────────────────────────
class State(TypedDict):
    messages: Annotated[list, add_messages]
    topic: str

# ─── Node 1: Researcher — gathers facts ───────────────────────
def researcher_node(state: State) -> dict:
    print("  [researcher] thinking…")
    system = SystemMessage(content=(
        "You are a concise research agent. "
        "Given a topic, provide 3 key facts in bullet points. "
        "Be brief — max 80 words total."
    ))
    response = llm.invoke([system] + state["messages"])
    print(f"  [researcher] done ✓")
    return {"messages": [response]}

# ─── Node 2: Summariser — wraps up nicely ─────────────────────
def summariser_node(state: State) -> dict:
    print("  [summariser] thinking…")
    system = SystemMessage(content=(
        "You are a summarisation agent. "
        "Take the research facts provided and write a single, polished "
        "2-sentence summary suitable for a general audience."
    ))
    response = llm.invoke([system] + state["messages"])
    print(f"  [summariser] done ✓")
    return {"messages": [response]}

# ─── Graph ────────────────────────────────────────────────────
builder = StateGraph(State)
builder.add_node("researcher", researcher_node)
builder.add_node("summariser", summariser_node)

builder.add_edge(START, "researcher")
builder.add_edge("researcher", "summariser")
builder.add_edge("summariser", END)

app = builder.compile()

# ─── Run ──────────────────────────────────────────────────────
if __name__ == "__main__":
    topic = "quantum computing"
    print("=" * 55)
    print(f"  Exercise 02 — Two-Agent LLM Chain")
    print(f"  Topic: {topic}")
    print("=" * 55)

    result = app.invoke({
        "messages": [HumanMessage(content=f"Research this topic for me: {topic}")],
        "topic": topic,
    })

    print("\n💬 Full conversation:")
    for msg in result["messages"]:
        if isinstance(msg, HumanMessage):
            print(f"\n  🧑 Human:\n     {msg.content}")
        elif isinstance(msg, AIMessage):
            print(f"\n  🤖 AI:\n     {msg.content}")

    print("\n📝 Key concepts used:")
    print("   • ChatOpenRouter via config.get_llm()")
    print("   • SystemMessage shapes each agent's persona")
    print("   • Messages accumulate across nodes (add_messages)")
    print("   • Sequential chain: researcher → summariser")
