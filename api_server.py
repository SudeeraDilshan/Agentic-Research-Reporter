"""
FastAPI Backend Server for Agentic Research Reporter.
Exposes REST APIs to drive the LangGraph multi-agent system,
powered by persistent SQLite checkpoints and live human steering.
"""

import sys
import uuid
import sqlite3
import threading
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, BackgroundTasks, HTTPException
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
from project_multi_agent import app, DB_FILE

server_app = FastAPI(
    title="Agentic Research Reporter API",
    description="Multi-Agent System with MCP Tools, Reflexion, Fact-Checking, and SQLite Persistence",
    version="3.0.0",
)

# Enable CORS for React Vite development server (default port 5173 / 3000)
server_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active execution tracking in memory (background thread management)
active_threads: Dict[str, Dict[str, Any]] = {}
thread_locks: Dict[str, threading.Lock] = {}


# ── Schemas ───────────────────────────────────────────────────

class StartResearchRequest(BaseModel):
    query: str
    thread_id: Optional[str] = None


class ResumeResearchRequest(BaseModel):
    decision: str  # 'yes', 'no', or steering guidance (e.g. "Focus on HIPAA and cost")


# ── Background Worker Helper ──────────────────────────────────

def _run_graph_invocation(thread_id: str, payload_or_command: Any):
    config = {"configurable": {"thread_id": thread_id}}
    active_threads[thread_id]["is_processing"] = True
    active_threads[thread_id]["error"] = None
    try:
        app.invoke(payload_or_command, config=config)
    except Exception as e:
        print(f"❌ Error in thread {thread_id}: {e}")
        active_threads[thread_id]["error"] = str(e)
    finally:
        active_threads[thread_id]["is_processing"] = False


# ── API Endpoints ─────────────────────────────────────────────

@server_app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "default_model": DEFAULT_MODEL,
        "database": DB_FILE,
    }


@server_app.post("/api/research/start")
def start_research(req: StartResearchRequest, background_tasks: BackgroundTasks):
    query = req.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    thread_id = req.thread_id or f"research_{uuid.uuid4().hex[:8]}"

    active_threads[thread_id] = {
        "is_processing": True,
        "error": None,
        "query": query,
    }

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

    if not state_snapshot or not state_snapshot.values:
        # Check if it was just initiated and is spinning up
        tracking = active_threads.get(thread_id, {})
        return {
            "thread_id": thread_id,
            "status": "starting" if tracking.get("is_processing") else "not_found",
            "is_processing": tracking.get("is_processing", False),
            "values": {},
            "next": [],
            "interrupt": None,
            "error": tracking.get("error"),
        }

    values = state_snapshot.values
    next_nodes = list(state_snapshot.next) if state_snapshot.next else []
    tracking = active_threads.get(thread_id, {})
    is_processing = tracking.get("is_processing", False)

    # Check for HITL interrupt payload
    interrupt_data = None
    if state_snapshot.tasks:
        for t in state_snapshot.tasks:
            if hasattr(t, "interrupts") and t.interrupts:
                interrupt_data = t.interrupts[0].value
                break

    # Determine overall high-level workflow stage
    if is_processing:
        if "steering_worker" in next_nodes:
            status = "steering_research"
        elif "report_pipeline" in next_nodes:
            status = "generating_report"
        else:
            status = "investigating"
    elif interrupt_data or "human_approval" in next_nodes:
        status = "waiting_human_approval"
    elif values.get("final_report"):
        status = "completed"
    elif values.get("human_approved") is False:
        status = "cancelled"
    else:
        status = "paused" if next_nodes else "idle"

    return {
        "thread_id": thread_id,
        "status": status,
        "is_processing": is_processing,
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

    tracking = active_threads.setdefault(thread_id, {})
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
    except Exception as e:
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api_server:server_app", host="127.0.0.1", port=8000, reload=True)

