"""
FastAPI Backend Server for Agentic Research Reporter.
Exposes REST APIs to drive the LangGraph multi-agent system,
powered by persistent SQLite checkpoints and live human steering.
Provides real-time active node tracking for the web interface.
"""

import sys
import uuid
import sqlite3
import datetime
import contextvars
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langgraph.types import Command

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
        sys.stderr.reconfigure(encoding="utf-8", line_buffering=True)
    except Exception:
        pass

from config import DEFAULT_MODEL
from project_multi_agent import app, DB_FILE, register_node_observer

server_app = FastAPI(
    title="Agentic Research Reporter API",
    description="Multi-Agent System with MCP Tools, Reflexion, Fact-Checking, and SQLite Persistence",
    version="3.1.0",
)

server_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Graph Node Taxonomy for Web Visualizer ─────────────────────

GRAPH_NODES = [
    {
        "id": "supervisor",
        "name": "Supervisor",
        "title": "Supervisor Planning",
        "phase": 1,
        "description": "Decomposing query into academic, industry, and ethical research tasks",
        "icon": "Layers"
    },
    {
        "id": "research_worker",
        "name": "MCP Workers",
        "title": "Parallel Research Workers",
        "phase": 2,
        "description": "Invoking MCP tools (Tavily & Academic Search) concurrently",
        "icon": "Search"
    },
    {
        "id": "evaluator",
        "name": "Evaluator",
        "title": "Reflexion Completeness Auditor",
        "phase": 3,
        "description": "Auditing evidence depth, completeness, and citations (Score /10)",
        "icon": "ShieldCheck"
    },
    {
        "id": "follow_up_worker",
        "name": "Follow-Up",
        "title": "Targeted Gap Filler",
        "phase": 3.5,
        "description": "Targeted investigation to resolve gaps identified by Evaluator",
        "icon": "RefreshCw"
    },
    {
        "id": "human_approval",
        "name": "HITL Gate",
        "title": "Human Review & Steering Gate",
        "phase": 4,
        "description": "Paused for human review — approve report or provide steering feedback",
        "icon": "Sliders"
    },
    {
        "id": "steering_worker",
        "name": "Steering",
        "title": "Human Steering Worker",
        "phase": 4.5,
        "description": "Gathering targeted evidence for custom user steering guidance",
        "icon": "Compass"
    },
    {
        "id": "draft_writer",
        "name": "Draft Writer",
        "title": "Report Draft Writer",
        "phase": 5.1,
        "description": "Synthesizing full report draft with in-text bracketed citations",
        "icon": "FileText"
    },
    {
        "id": "fact_checker",
        "name": "Fact-Checker",
        "title": "Adversarial Critic",
        "phase": 5.2,
        "description": "Auditing draft assertions against raw MCP evidence for hallucinations",
        "icon": "AlertTriangle"
    },
    {
        "id": "editor",
        "name": "Editor",
        "title": "Report Editor",
        "phase": 5.3,
        "description": "Refining report structure and resolving critique items",
        "icon": "CheckCircle"
    },
    {
        "id": "finaliser",
        "name": "Finaliser",
        "title": "Executive Summary & References",
        "phase": 5.4,
        "description": "Attaching executive overview and compiling verified source bibliography",
        "icon": "Sparkles"
    }
]

NODE_LOOKUP = {n["id"]: n for n in GRAPH_NODES}

# ── Active Thread Tracking ────────────────────────────────────

active_threads: Dict[str, Dict[str, Any]] = {}
current_thread_cv: contextvars.ContextVar[str] = contextvars.ContextVar("current_thread_cv", default="")


def _init_thread_state(thread_id: str, query: str = "") -> Dict[str, Any]:
    return {
        "thread_id": thread_id,
        "query": query,
        "is_processing": True,
        "error": None,
        "current_node": "supervisor",
        "current_node_details": {},
        "node_states": {n["id"]: "pending" for n in GRAPH_NODES},
        "timeline": [],
    }


def _on_node_event(node_name: str, event_type: str, details: Dict[str, Any]):
    """Callback registered with project_multi_agent to record live active nodes."""
    tid = current_thread_cv.get()
    if not tid or tid not in active_threads:
        if active_threads:
            tid = list(active_threads.keys())[-1]
        else:
            return

    thread_data = active_threads[tid]
    timestamp = datetime.datetime.now().strftime("%H:%M:%S")

    if event_type in ("started", "waiting"):
        thread_data["current_node"] = node_name
        thread_data["current_node_details"] = details
        thread_data["node_states"][node_name] = "active"
        thread_data["timeline"].append({
            "timestamp": timestamp,
            "node": node_name,
            "status": "active",
            "details": details,
        })
    elif event_type == "completed":
        thread_data["node_states"][node_name] = "completed"
        thread_data["timeline"].append({
            "timestamp": timestamp,
            "node": node_name,
            "status": "completed",
            "details": details,
        })


register_node_observer(_on_node_event)


# ── Schemas ───────────────────────────────────────────────────

class StartResearchRequest(BaseModel):
    query: str
    thread_id: Optional[str] = None


class ResumeResearchRequest(BaseModel):
    decision: str  # 'yes', 'no', or custom steering text


# ── Background Worker Helper ──────────────────────────────────

def _run_graph_invocation(thread_id: str, payload_or_command: Any):
    current_thread_cv.set(thread_id)
    thread_data = active_threads[thread_id]
    thread_data["is_processing"] = True
    thread_data["error"] = None
    config = {"configurable": {"thread_id": thread_id}}

    try:
        app.invoke(payload_or_command, config=config)
    except Exception as e:
        print(f"❌ Error in thread {thread_id}: {e}")
        thread_data["error"] = str(e)
    finally:
        thread_data["is_processing"] = False
        # If interrupted at human_approval, set active node appropriately
        snapshot = app.get_state(config)
        if snapshot and snapshot.next and "human_approval" in snapshot.next:
            thread_data["current_node"] = "human_approval"
            thread_data["node_states"]["human_approval"] = "active"
        elif snapshot and snapshot.values and snapshot.values.get("final_report"):
            thread_data["current_node"] = "completed"
            for k in thread_data["node_states"]:
                if thread_data["node_states"][k] == "active":
                    thread_data["node_states"][k] = "completed"


# ── API Endpoints ─────────────────────────────────────────────

@server_app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "default_model": DEFAULT_MODEL,
        "database": DB_FILE,
        "active_threads_count": len(active_threads),
    }


@server_app.get("/api/research/nodes")
def get_graph_nodes():
    """Returns the taxonomy of nodes in the multi-agent graph."""
    return {"nodes": GRAPH_NODES}


@server_app.post("/api/research/start")
def start_research(req: StartResearchRequest, background_tasks: BackgroundTasks):
    query = req.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    thread_id = req.thread_id or f"research_{uuid.uuid4().hex[:8]}"
    active_threads[thread_id] = _init_thread_state(thread_id, query)

    initial_state = {
        "query": query,
        "research_tasks": [],
        "research_findings": [],
        "sources": [],
        "iteration_count": 0,
        "is_sufficient": False,
        "evaluation_critique": "",
        "follow_up_task": None,
        "human_approved": False,
        "steering_feedback": None,
        "draft_report": "",
        "fact_check_critique": "",
        "edited_report": "",
        "final_report": "",
    }

    background_tasks.add_task(_run_graph_invocation, thread_id, initial_state)
    return {
        "thread_id": thread_id,
        "status": "started",
        "query": query,
    }


@server_app.get("/api/research/status/{thread_id}")
def get_research_status(thread_id: str):
    config = {"configurable": {"thread_id": thread_id}}
    state_snapshot = app.get_state(config)
    tracking = active_threads.get(thread_id, {})

    if not state_snapshot or not state_snapshot.values:
        return {
            "thread_id": thread_id,
            "status": "starting" if tracking.get("is_processing") else "not_found",
            "is_processing": tracking.get("is_processing", False),
            "current_node": tracking.get("current_node", "supervisor"),
            "current_node_meta": NODE_LOOKUP.get(tracking.get("current_node", "supervisor")),
            "current_node_details": tracking.get("current_node_details", {}),
            "node_states": tracking.get("node_states", {n["id"]: "pending" for n in GRAPH_NODES}),
            "timeline": tracking.get("timeline", []),
            "graph_nodes": GRAPH_NODES,
            "values": {},
            "next": [],
            "interrupt": None,
            "error": tracking.get("error"),
        }

    values = state_snapshot.values
    next_nodes = list(state_snapshot.next) if state_snapshot.next else []
    is_processing = tracking.get("is_processing", False)

    # Check for HITL interrupt payload
    interrupt_data = None
    if state_snapshot.tasks:
        for t in state_snapshot.tasks:
            if hasattr(t, "interrupts") and t.interrupts:
                interrupt_data = t.interrupts[0].value
                break

    # Determine overall status
    if interrupt_data or "human_approval" in next_nodes:
        status = "waiting_human_approval"
        current_node = "human_approval"
    elif is_processing:
        status = "processing"
        current_node = tracking.get("current_node", next_nodes[0] if next_nodes else "supervisor")
    elif values.get("final_report"):
        status = "completed"
        current_node = "finaliser"
    elif values.get("human_approved") is False:
        status = "cancelled"
        current_node = "human_approval"
    else:
        status = "idle"
        current_node = next_nodes[0] if next_nodes else "completed"

    node_states = tracking.get("node_states", {n["id"]: "pending" for n in GRAPH_NODES})
    if status == "waiting_human_approval":
        node_states["human_approval"] = "active"
    elif status == "completed":
        for k in node_states:
            if node_states[k] == "active":
                node_states[k] = "completed"

    return {
        "thread_id": thread_id,
        "status": status,
        "is_processing": is_processing,
        "current_node": current_node,
        "current_node_meta": NODE_LOOKUP.get(current_node),
        "current_node_details": tracking.get("current_node_details", {}),
        "node_states": node_states,
        "timeline": tracking.get("timeline", []),
        "graph_nodes": GRAPH_NODES,
        "next": next_nodes,
        "interrupt": interrupt_data,
        "values": values,
        "error": tracking.get("error"),
    }


@server_app.post("/api/research/resume/{thread_id}")
def resume_research(thread_id: str, req: ResumeResearchRequest, background_tasks: BackgroundTasks):
    config = {"configurable": {"thread_id": thread_id}}
    state_snapshot = app.get_state(config)

    if not state_snapshot or not state_snapshot.values:
        raise HTTPException(status_code=404, detail="Thread session not found")

    tracking = active_threads.setdefault(thread_id, _init_thread_state(thread_id))
    if tracking.get("is_processing"):
        raise HTTPException(status_code=409, detail="Thread is already executing a task")

    decision = req.decision.strip()
    if not decision:
        raise HTTPException(status_code=400, detail="Decision cannot be empty")

    background_tasks.add_task(_run_graph_invocation, thread_id, Command(resume=decision))
    return {
        "thread_id": thread_id,
        "status": "resuming",
        "decision": decision,
    }


@server_app.get("/api/research/threads")
def list_threads():
    """Lists saved research sessions from SQLite database."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT DISTINCT thread_id FROM checkpoints ORDER BY checkpoint_id DESC LIMIT 50")
        rows = cursor.fetchall()
        thread_ids = [r[0] for r in rows if r[0]]
    except Exception:
        thread_ids = []
    finally:
        conn.close()

    sessions = []
    for tid in thread_ids:
        try:
            snapshot = app.get_state({"configurable": {"thread_id": tid}})
            if snapshot and snapshot.values:
                q = snapshot.values.get("query", "Untitled Query")
                has_report = bool(snapshot.values.get("final_report"))
                sessions.append({
                    "thread_id": tid,
                    "query": q,
                    "completed": has_report,
                    "source_count": len(snapshot.values.get("sources", [])),
                })
        except Exception:
            continue

    return {"threads": sessions}


@server_app.get("/api/research/download/{thread_id}")
def download_report(thread_id: str):
    """Returns the full final report as a downloadable Markdown attachment."""
    config = {"configurable": {"thread_id": thread_id}}
    state_snapshot = app.get_state(config)
    if not state_snapshot or not state_snapshot.values or not state_snapshot.values.get("final_report"):
        raise HTTPException(status_code=404, detail="No completed report found for this session")

    report_text = state_snapshot.values["final_report"]
    query = state_snapshot.values.get("query", "report")
    safe_name = "".join(c for c in query if c.isalnum() or c in ("-", "_")).rstrip()[:30] or "report"
    filename = f"Research_Report_{safe_name}.md"

    return PlainTextResponse(
        content=report_text,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api_server:server_app", host="127.0.0.1", port=8000, reload=True)
