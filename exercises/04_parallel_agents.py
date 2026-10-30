import operator
from typing import TypedDict, Annotated, List
from langgraph.graph import StateGraph, START, END
from langgraph.types import Send                    
from langchain_core.messages import HumanMessage, SystemMessage

from config import get_llm

llm = get_llm()

class OverallState(TypedDict):
    """Shared state for the main graph."""
    topic: str
    aspects: List[str]                              # sub-topics to analyse in parallel
    reports: Annotated[List[str], operator.add]     # ← reducer: safely merges parallel writes
    final_summary: str

class WorkerState(TypedDict):
    """Private state for each parallel worker."""
    topic: str
    aspect: str                                     # this worker's assigned sub-topic

# ─── Supervisor — creates sub-tasks ───────────────────────────
def supervisor_node(state: OverallState) -> dict:
    """Decides what aspects to analyse in parallel."""
    print(f"  [supervisor] planning for topic: '{state['topic']}'")
    aspects = [
        f"benefits of {state['topic']}",
        f"challenges of {state['topic']}",
        f"future trends of {state['topic']}",
    ]
    print(f"  [supervisor] spawning {len(aspects)} parallel workers…")
    return {"aspects": aspects, "reports": []}

# ─── Fan-out function — returns Send objects for parallel exec ─
def distribute_to_workers(state: OverallState) -> List[Send]:
    """
    Returns a list of Send objects.
    Each Send() spawns one parallel execution of 'analyst_worker'
    with its own private WorkerState payload.
    """
    return [
        Send("analyst_worker", {"topic": state["topic"], "aspect": aspect})
        for aspect in state["aspects"]
    ]

# ─── Worker — runs N times in parallel, one per aspect ────────
def analyst_worker(state: WorkerState) -> dict:
    """Each parallel worker analyses ONE aspect independently."""
    print(f"  [worker] analysing: '{state['aspect']}'")
    system = SystemMessage(content=(
        "You are a specialist analyst. Write exactly 2 sentences about the "
        "given aspect. Be factual and concise."
    ))
    user_msg = HumanMessage(content=f"Aspect to analyse: {state['aspect']}")
    response = llm.invoke([system, user_msg])

    # ← returns a LIST so operator.add can accumulate from all parallel workers
    return {"reports": [f"[{state['aspect'].upper()}]\n{response.content}"]}

# ─── Aggregator — runs AFTER all workers finish ───────────────
def aggregator_node(state: OverallState) -> dict:
    """Merges all parallel reports into a final summary."""
    print(f"  [aggregator] merging {len(state['reports'])} reports…")
    combined = "\n\n".join(state["reports"])
    system = SystemMessage(content=(
        "You are an executive summariser. Given multiple analysis reports, "
        "write a concise executive summary in 3 sentences."
    ))
    user_msg = HumanMessage(content=f"Reports:\n{combined}")
    response = llm.invoke([system, user_msg])
    return {"final_summary": response.content}

# ─── Graph ────────────────────────────────────────────────────
builder = StateGraph(OverallState)
builder.add_node("supervisor", supervisor_node)
builder.add_node("analyst_worker", analyst_worker)  # called N times in parallel
builder.add_node("aggregator", aggregator_node)

builder.add_edge(START, "supervisor")

# ← KEY: conditional edges with Send API triggers parallel execution
builder.add_conditional_edges("supervisor", distribute_to_workers)

builder.add_edge("analyst_worker", "aggregator")    # fan-in: all workers → aggregator
builder.add_edge("aggregator", END)

app = builder.compile()

# ─── Run ──────────────────────────────────────────────────────
if __name__ == "__main__":
    topic = "artificial intelligence in healthcare"

    print("=" * 55)
    print("  Exercise 04 — Parallel Agents (Send API)")
    print(f"  Topic: {topic}")
    print("=" * 55)

    result = app.invoke({
        "topic": topic,
        "aspects": [],
        "reports": [],
        "final_summary": "",
    })

    print("\n📋 Individual Reports (generated in parallel):")
    for i, report in enumerate(result["reports"], 1):
        print(f"\n  [{i}] {report}")

    print("\n\n📊 Executive Summary (aggregated):")
    print(f"  {result['final_summary']}")

    print("\n📝 Key concepts used:")
    print("   • Send('node', payload) → triggers parallel execution")
    print("   • Annotated[list, operator.add] → safe parallel state merge")
    print("   • Superstep: all Send targets run simultaneously")
    print("   • Fan-in: all workers converge on aggregator node")
