# Combines ALL concepts:
#   ✅ State with reducers
#   ✅ Parallel agents via Send API
#   ✅ Supervisor + conditional routing
#   ✅ Subgraph (report writing pipeline)
#   ✅ Checkpointing (MemorySaver)
#   ✅ Human-in-the-Loop (interrupt)

# Flow:
#   User query
#     → supervisor (plans parallel research tasks)
#     → [worker_1 | worker_2 | worker_3]   (parallel!)
#     → human approval gate (interrupt)
#     → report_subgraph (draft → edit → finalise)
#     → END

import operator
from typing import TypedDict, Annotated, List
from langgraph.graph import StateGraph, START, END
from langgraph.types import Send, interrupt, Command
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage, SystemMessage

from config import get_llm

llm = get_llm()

class MainState(TypedDict):
    """Root state shared across the whole system."""
    query: str                                        # original user request
    research_tasks: List[str]                         # sub-tasks from supervisor
    research_findings: Annotated[List[str], operator.add]  # parallel-safe accumulation
    human_approved: bool                              # HITL gate result
    draft_report: str                                 # from report subgraph
    edited_report: str
    final_report: str

class ResearchWorkerState(TypedDict):
    """Private state for each parallel research worker."""
    query: str
    task: str

class ReportState(TypedDict):
    """State for the report-writing subgraph."""
    query: str
    findings: List[str]
    draft: str
    edited: str
    final: str


# ══════════════════════════════════════════════════════════════
# MAIN GRAPH NODES
# ══════════════════════════════════════════════════════════════

# ── 1. Supervisor: Plans parallel research tasks ───────────────
def supervisor_node(state: MainState) -> dict:
    print("\n🎯 [Supervisor] Planning research tasks…")
    system = SystemMessage(content=(
        "You are a research supervisor. Given a query, break it into exactly 3 "
        "distinct, parallel research tasks. Return ONLY a numbered list:\n"
        "1. <task>\n2. <task>\n3. <task>"
    ))
    response = llm.invoke([system, HumanMessage(content=state["query"])])

    # Parse tasks from numbered list
    lines = [l.strip() for l in response.content.strip().split("\n") if l.strip()]
    tasks = [l.split(".", 1)[-1].strip() for l in lines if l[0].isdigit()][:3]
    print(f"   Tasks planned: {tasks}")
    return {"research_tasks": tasks, "research_findings": []}

# ── 2. Fan-out: dispatch parallel workers ─────────────────────
def dispatch_workers(state: MainState) -> List[Send]:
    print(f"\n🚀 [Dispatcher] Spawning {len(state['research_tasks'])} parallel workers…")
    return [
        Send("research_worker", {"query": state["query"], "task": task})
        for task in state["research_tasks"]
    ]

# ── 3. Research Worker (runs N times in parallel) ─────────────
def research_worker(state: ResearchWorkerState) -> dict:
    print(f"  🔬 [Worker] Task: '{state['task']}'")
    system = SystemMessage(content=(
        "You are a specialist researcher. Investigate the given task related to "
        "the overall query. Provide key findings in 3 bullet points. Be concise."
    ))
    prompt = HumanMessage(content=(
        f"Overall query: {state['query']}\n"
        f"Your specific task: {state['task']}"
    ))
    response = llm.invoke([system, prompt])
    finding = f"[TASK: {state['task']}]\n{response.content}"
    print(f"  ✅ [Worker] Done: '{state['task'][:40]}…'")
    return {"research_findings": [finding]}  # operator.add merges these

# ── 4. Human-in-the-Loop approval gate ────────────────────────
def human_approval_node(state: MainState) -> dict:
    print("\n⏸️  [HITL] Pausing for human approval…")
    
    # Show findings summary to human
    summary_lines = [f"  • {f.splitlines()[0]}" for f in state["research_findings"]]
    summary = "\n".join(summary_lines)
    
    # interrupt() suspends graph and surfaces data to the caller
    decision = interrupt({
        "message": "Research complete! Please review the findings before report generation.",
        "findings_preview": summary,
        "question": "Approve report generation? (yes/no)",
    })
    
    approved = str(decision).strip().lower() in ("yes", "y", "approve", "ok", "1", "true")
    print(f"  {'✅ Approved' if approved else '❌ Rejected'} by human.")
    return {"human_approved": approved}

# ── 5. Gate: route based on human decision ────────────────────
def approval_router(state: MainState) -> str:
    return "report_pipeline" if state["human_approved"] else END


# ══════════════════════════════════════════════════════════════
# REPORT SUBGRAPH (Modular sub-workflow)
# ══════════════════════════════════════════════════════════════

def draft_writer(state: ReportState) -> dict:
    print("\n  ✍️  [Draft Writer] Writing draft…")
    findings_text = "\n\n".join(state["findings"])
    system = SystemMessage(content=(
        "You are a report writer. Using the research findings provided, "
        "write a structured draft report with sections: Overview, Key Findings, Conclusion. "
        "Be comprehensive but concise."
    ))
    prompt = HumanMessage(content=(
        f"Query: {state['query']}\n\nResearch Findings:\n{findings_text}"
    ))
    response = llm.invoke([system, prompt])
    return {"draft": response.content}

def editor_node(state: ReportState) -> dict:
    print("  📝 [Editor] Polishing draft…")
    system = SystemMessage(content=(
        "You are a professional editor. Improve the draft report: "
        "fix grammar, improve clarity, ensure logical flow, and add smooth transitions. "
        "Keep all original content — only improve the writing quality."
    ))
    prompt = HumanMessage(content=f"Draft to edit:\n{state['draft']}")
    response = llm.invoke([system, prompt])
    return {"edited": response.content}

def finaliser_node(state: ReportState) -> dict:
    print("  🏁 [Finaliser] Adding executive summary…")
    system = SystemMessage(content=(
        "You are a senior editor. Add a professional executive summary (3 sentences) "
        "at the top of the report. Keep the rest of the report intact."
    ))
    prompt = HumanMessage(content=f"Report to finalise:\n{state['edited']}")
    response = llm.invoke([system, prompt])
    return {"final": response.content}

# Build Report Subgraph
report_builder = StateGraph(ReportState)
report_builder.add_node("draft_writer", draft_writer)
report_builder.add_node("editor", editor_node)
report_builder.add_node("finaliser", finaliser_node)
report_builder.add_edge(START, "draft_writer")
report_builder.add_edge("draft_writer", "editor")
report_builder.add_edge("editor", "finaliser")
report_builder.add_edge("finaliser", END)
report_subgraph = report_builder.compile()  # ← compiled subgraph

# Adapter: bridges MainState ↔ ReportState
def run_report_pipeline(state: MainState) -> dict:
    print("\n📄 [Report Pipeline] Starting subgraph…")
    report_state = report_subgraph.invoke({
        "query": state["query"],
        "findings": state["research_findings"],
        "draft": "",
        "edited": "",
        "final": "",
    })
    return {
        "draft_report": report_state["draft"],
        "edited_report": report_state["edited"],
        "final_report": report_state["final"],
    }

# ══════════════════════════════════════════════════════════════
# MAIN GRAPH ASSEMBLY
# ══════════════════════════════════════════════════════════════

main_builder = StateGraph(MainState)
main_builder.add_node("supervisor", supervisor_node)
main_builder.add_node("research_worker", research_worker)    # fan-out target
main_builder.add_node("human_approval", human_approval_node)
main_builder.add_node("report_pipeline", run_report_pipeline)  # subgraph adapter

main_builder.add_edge(START, "supervisor")
main_builder.add_conditional_edges("supervisor", dispatch_workers, ["research_worker"])  # parallel fan-out
main_builder.add_edge("research_worker", "human_approval")          # fan-in
main_builder.add_conditional_edges("human_approval", approval_router, {
    "report_pipeline": "report_pipeline",
    END: END,
})
main_builder.add_edge("report_pipeline", END)

# ← BOTH checkpointer (for HITL) and thread config required
checkpointer = MemorySaver()
app = main_builder.compile(checkpointer=checkpointer)


# ══════════════════════════════════════════════════════════════
# RUN
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    query = "What are the key impacts of generative AI on the future of work?"

    print("=" * 60)
    print("  🤖 Agentic Research Reporter")
    print(f"  Query: {query}")
    print("=" * 60)

    thread = {"configurable": {"thread_id": "research-session-001"}}

    # ── Phase 1: Run until HITL interrupt ─────────────────────
    print("\n--- PHASE 1: Research (runs until human gate) ---")
    result = app.invoke(
        {
            "query": query,
            "research_tasks": [],
            "research_findings": [],
            "human_approved": False,
            "draft_report": "",
            "edited_report": "",
            "final_report": "",
        },
        config=thread,
    )

    # Check if we hit the interrupt
    if "__interrupt__" in (result or {}):
        interrupt_data = result["__interrupt__"][0].value
        print("\n" + "=" * 60)
        print("  ⏸️  HUMAN APPROVAL REQUIRED")
        print("=" * 60)
        print(f"\n  {interrupt_data['message']}")
        print(f"\n  Research Preview:\n{interrupt_data['findings_preview']}")
        print(f"\n  {interrupt_data['question']}")
        
        # Simulate human decision (in a real app this comes from UI)
        human_input = input("\n  Your decision (yes/no): ").strip()
        
        # ── Phase 2: Resume after human approval ──────────────
        print("\n--- PHASE 2: Resuming after human input ---")
        final_result = app.invoke(Command(resume=human_input), config=thread)
    else:
        # Graph completed without interrupt (human_approved=False)
        final_result = result

    # ── Output ────────────────────────────────────────────────
    print("\n" + "=" * 60)
    if final_result.get("final_report"):
        print("  ✅ FINAL REPORT")
        print("=" * 60)
        print(final_result["final_report"])
    else:
        print("  ❌ Report generation was not approved.")
    print("=" * 60)
    print("\n✅ All LangGraph concepts demonstrated:")
    print("   ✅ State with operator.add reducer")
    print("   ✅ Parallel workers via Send API")
    print("   ✅ Supervisor + conditional routing")
    print("   ✅ Human-in-the-Loop (interrupt/resume)")
    print("   ✅ Subgraph (report writing pipeline)")
    print("   ✅ Checkpointing (MemorySaver)")
