# ============================================================
# Exercise 05: Checkpointing — Memory & Multi-Turn Conversations
# ============================================================
# CONCEPTS: MemorySaver · thread_id · state persistence · time-travel
#
# Run: .\venv\Scripts\python 05_checkpointing.py
# ============================================================

from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver      # ← in-memory checkpointer
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from config import get_llm

llm = get_llm()

# ─── State ────────────────────────────────────────────────────
class State(TypedDict):
    messages: Annotated[list, add_messages]

# ─── Node: Conversational assistant ───────────────────────────
def assistant_node(state: State) -> dict:
    system = SystemMessage(content=(
        "You are a helpful assistant with a great memory. "
        "You remember everything said in this conversation and refer back to it naturally."
    ))
    response = llm.invoke([system] + state["messages"])
    return {"messages": [response]}

# ─── Graph with checkpointer ──────────────────────────────────
builder = StateGraph(State)
builder.add_node("assistant", assistant_node)
builder.add_edge(START, "assistant")
builder.add_edge("assistant", END)

# ← KEY: compile WITH a checkpointer to enable persistence
checkpointer = MemorySaver()
app = builder.compile(checkpointer=checkpointer)

# ─── Thread config ────────────────────────────────────────────
# thread_id isolates separate conversation contexts
alice_thread = {"configurable": {"thread_id": "alice-001"}}
bob_thread   = {"configurable": {"thread_id": "bob-001"}}

def chat(thread_config: dict, user_message: str) -> str:
    """Send one message in a thread; the graph remembers history."""
    result = app.invoke(
        {"messages": [HumanMessage(content=user_message)]},
        config=thread_config,
    )
    return result["messages"][-1].content

# ─── Run ──────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 55)
    print("  Exercise 05 — Checkpointing & Memory")
    print("=" * 55)

    # ── Alice's multi-turn conversation ────────────────────────
    print("\n🧑 Alice's conversation (thread: alice-001):")
    r1 = chat(alice_thread, "Hi! My name is Alice and I love astronomy.")
    print(f"  Turn 1 → {r1[:120]}…")

    r2 = chat(alice_thread, "What's a fun fact about my favourite subject?")
    print(f"  Turn 2 → {r2[:120]}…")

    r3 = chat(alice_thread, "What's my name again?")
    print(f"  Turn 3 → {r3[:120]}…")

    # ── Bob's completely separate conversation ──────────────────
    print("\n🧑 Bob's conversation (thread: bob-001) — separate memory:")
    r4 = chat(bob_thread, "Hello, I'm Bob. Do you know Alice?")
    print(f"  Turn 1 → {r4[:120]}…")

    # ── Time-travel: inspect state history ─────────────────────
    print("\n⏮️  Alice's checkpoint history:")
    history = list(app.get_state_history(alice_thread))
    print(f"   {len(history)} checkpoint(s) saved")
    for i, checkpoint in enumerate(history[:3]):   # show first 3
        n_msgs = len(checkpoint.values.get("messages", []))
        print(f"   Checkpoint [{i}]: {n_msgs} message(s) in state")

    print("\n📝 Key concepts used:")
    print("   • MemorySaver() → in-memory state persistence")
    print("   • compile(checkpointer=...) → enables state saving")
    print("   • thread_id → isolates separate user sessions")
    print("   • app.invoke(input, config=thread) → continues the thread")
    print("   • app.get_state_history(thread) → time-travel debugging")
