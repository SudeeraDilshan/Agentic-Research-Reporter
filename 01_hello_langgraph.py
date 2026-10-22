# ============================================================
# Exercise 01: Hello LangGraph — Your First Graph
# ============================================================
# CONCEPTS: State · Nodes · Edges · StateGraph · compile()
#
# Run: .\venv\Scripts\python 01_hello_langgraph.py
# ============================================================

from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_core.messages import HumanMessage, AIMessage

# ─── STEP 1: Define State (shared memory for ALL nodes) ───────
class State(TypedDict):
    messages: Annotated[list, add_messages]  # add_messages = append, not overwrite
    step_count: int                          # plain int = last-write-wins

# ─── STEP 2: Define Nodes (worker functions) ──────────────────
def greeter_node(state: State) -> dict:
    """Node 1: reads the user message and greets them."""
    user_msg = state["messages"][-1].content
    print(f"  [greeter] received: '{user_msg}'")
    return {
        "messages": [AIMessage(content=f"👋 Hello! You said: '{user_msg}'. Passing to responder…")],
        "step_count": state.get("step_count", 0) + 1,
    }

def responder_node(state: State) -> dict:
    """Node 2: gives a final response."""
    print(f"  [responder] step_count = {state['step_count']}")
    return {
        "messages": [AIMessage(content=f"✅ Done! Processed in {state['step_count']} step(s). Goodbye!")],
        "step_count": state["step_count"] + 1,
    }

# ─── STEP 3: Build the graph ──────────────────────────────────
builder = StateGraph(State)
builder.add_node("greeter", greeter_node)
builder.add_node("responder", responder_node)

builder.add_edge(START, "greeter")        # entry → greeter
builder.add_edge("greeter", "responder")  # greeter → responder
builder.add_edge("responder", END)        # responder → exit

# ─── STEP 4: Compile & run ────────────────────────────────────
app = builder.compile()

if __name__ == "__main__":
    print("=" * 55)
    print("  Exercise 01 — Hello LangGraph (no LLM needed)")
    print("=" * 55)

    result = app.invoke({
        "messages": [HumanMessage(content="Hey LangGraph!")],
        "step_count": 0,
    })

    print("\n📊 Final state:")
    print(f"   steps taken : {result['step_count']}")
    print("\n💬 Message history:")
    for msg in result["messages"]:
        role = "🧑 Human" if isinstance(msg, HumanMessage) else "🤖 AI   "
        print(f"   {role}: {msg.content}")

    print("\n📝 What you learned:")
    print("   • State  = TypedDict with annotated reducer fields")
    print("   • Nodes  = plain Python functions → return partial state dict")
    print("   • Edges  = add_edge(source, target) wires the flow")
    print("   • compile() turns the builder into a runnable graph")
