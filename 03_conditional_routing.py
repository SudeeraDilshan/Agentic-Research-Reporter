# ============================================================
# Exercise 03: Conditional Routing — Smart Decision Making
# ============================================================
# CONCEPTS: add_conditional_edges · router functions · Literal types
#
# Flow:  Input → classifier → [researcher | coder | writer] → END
#
# Run: .\venv\Scripts\python 03_conditional_routing.py
# ============================================================

from typing import TypedDict, Annotated, Literal
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from config import get_llm

llm = get_llm()

# ─── State ────────────────────────────────────────────────────
class State(TypedDict):
    messages: Annotated[list, add_messages]
    next_agent: str   # filled by the classifier; read by the router

# ─── Classifier node — decides which specialist to call ───────
def classifier_node(state: State) -> dict:
    """Uses LLM to categorise the user's intent."""
    print("  [classifier] analysing intent…")
    system = SystemMessage(content=(
        "You are a request classifier. "
        "Read the user's message and reply with EXACTLY one word:\n"
        "  'research'  — if they want information or facts\n"
        "  'code'      — if they want code written or debugged\n"
        "  'write'     — if they want text, essays, emails, etc.\n"
        "Output ONLY that single word. No punctuation."
    ))
    response = llm.invoke([system] + state["messages"])
    intent = response.content.strip().lower()
    print(f"  [classifier] intent detected → '{intent}'")
    return {"next_agent": intent, "messages": []}

# ─── Router function — maps classifier output to node names ───
def route(state: State) -> Literal["researcher", "coder", "writer"]:
    intent = state["next_agent"]
    if "code" in intent:
        return "coder"
    elif "write" in intent or "writ" in intent:
        return "writer"
    else:
        return "researcher"   # default

# ─── Specialist nodes ─────────────────────────────────────────
def researcher_node(state: State) -> dict:
    print("  [researcher] fetching facts…")
    system = SystemMessage(content="You are a research specialist. Provide concise factual answers in under 100 words.")
    response = llm.invoke([system] + state["messages"])
    return {"messages": [AIMessage(content=f"🔍 RESEARCH: {response.content}")]}

def coder_node(state: State) -> dict:
    print("  [coder] writing code…")
    system = SystemMessage(content="You are a coding specialist. Write clean, commented code with a brief explanation. Be concise.")
    response = llm.invoke([system] + state["messages"])
    return {"messages": [AIMessage(content=f"💻 CODE: {response.content}")]}

def writer_node(state: State) -> dict:
    print("  [writer] composing text…")
    system = SystemMessage(content="You are a writing specialist. Write polished, engaging text. Be concise.")
    response = llm.invoke([system] + state["messages"])
    return {"messages": [AIMessage(content=f"✍️ WRITING: {response.content}")]}

# ─── Graph ────────────────────────────────────────────────────
builder = StateGraph(State)
builder.add_node("classifier", classifier_node)
builder.add_node("researcher", researcher_node)
builder.add_node("coder", coder_node)
builder.add_node("writer", writer_node)

builder.add_edge(START, "classifier")

# ← KEY: conditional routing based on state["next_agent"]
builder.add_conditional_edges(
    "classifier",   # source node
    route,          # router function → returns node name string
    {               # mapping (optional, for clarity/renaming)
        "researcher": "researcher",
        "coder": "coder",
        "writer": "writer",
    }
)

# All specialists go directly to END
builder.add_edge("researcher", END)
builder.add_edge("coder", END)
builder.add_edge("writer", END)

app = builder.compile()

# ─── Run ──────────────────────────────────────────────────────
if __name__ == "__main__":
    test_cases = [
        "What are the main causes of climate change?",
        "Write a Python function to reverse a string",
        "Write me a short professional email declining a meeting",
    ]

    print("=" * 55)
    print("  Exercise 03 — Conditional Routing")
    print("=" * 55)

    for query in test_cases:
        print(f"\n📨 Query: \"{query}\"")
        result = app.invoke({
            "messages": [HumanMessage(content=query)],
            "next_agent": "",
        })
        # The last AI message is from the specialist
        last_ai = next(
            (m for m in reversed(result["messages"]) if isinstance(m, AIMessage)),
            None
        )
        if last_ai:
            print(f"   → {last_ai.content[:200]}…")
        print("-" * 55)

    print("\n📝 Key concepts used:")
    print("   • add_conditional_edges(source, router_fn, mapping)")
    print("   • Router function inspects state and returns a node name")
    print("   • LLM classifier drives dynamic routing decisions")
