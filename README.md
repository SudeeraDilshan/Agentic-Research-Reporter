# 🧠 Multi-Agent Orchestration with LangGraph

A hands-on, progressive curriculum and capstone project for mastering **LangGraph** and building **multi-agent architectures** where agents run sequentially, in parallel (fan-out/fan-in), and under intelligent supervision.

Powered by [OpenRouter](https://openrouter.ai) with support for free and frontier models.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Architecture & Mental Model](#-architecture--mental-model)
- [Quick Start](#-quick-start)
- [Project Structure & Learning Path](#-project-structure--learning-path)
  - [Exercise 01: Hello LangGraph](#01---hello-langgraph-no-llm-needed)
  - [Exercise 02: Two-Agent Chain](#02---two-agent-chain-openrouter-llm)
  - [Exercise 03: Conditional Routing](#03---conditional-routing)
  - [Exercise 04: Parallel Agents (Send API)](#04---parallel-agents-send-api-fan-outfan-in)
  - [Exercise 05: Checkpointing & Memory](#05---checkpointing--multi-turn-memory)
  - [Exercise 06: Supervisor Pattern](#06---supervisor-pattern-llm-orchestrator)
  - [Capstone: Multi-Agent Research System](#-capstone-project-multi_agent_systempy)
- [Core LangGraph Concepts Reference](#-core-langgraph-concepts-reference)
- [Switching LLM Models](#-switching-llm-models)
- [Troubleshooting](#-troubleshooting)

---

## 🚀 Overview

Traditional LLM chains (like `prompt | llm | parser`) are strictly linear. Real-world agentic workflows require:
- **Cycles & Loops**: Retrying, self-reflection, and back-and-forth collaboration.
- **Parallel Execution**: Running multiple specialized agents concurrently (e.g., analyzing 3 angles at once).
- **Persistent State**: Threaded conversation memory and time-travel debugging.
- **Human-in-the-Loop (HITL)**: Pausing execution for human inspection/approval before risky actions.

This repository takes you from zero to building production-grade multi-agent orchestrations using LangGraph.

---

## 🧩 Architecture & Mental Model

Think of LangGraph as a **state-machine workspace**:

```
                       ┌──────────────────────────────────────────┐
                       │          SHARED STATE (TypedDict)        │
                       │  { messages: [...], findings: [...] }    │
                       └──────────────────────────────────────────┘
                                   ▲                  ▲
                      reads / writes                  reads / writes
                                   │                  │
                ┌──────────────────┴──┐            ┌──┴──────────────────┐
                │   Researcher Agent  │            │     Coder Agent     │
                │        (Node)       │            │       (Node)        │
                └─────────────────────┘            └─────────────────────┘
                                   │                  │
                                   ▼                  ▼
                       ┌──────────────────────────────────────────┐
                       │               EDGES / ROUTER             │
                       │     (Controls who executes next)         │
                       └──────────────────────────────────────────┘
```

- **State**: Central data structure defining the shared memory.
- **Nodes**: Plain Python functions representing workers/agents.
- **Edges**: Pathways determining execution order (fixed, conditional, or parallel).

---

## ⚡ Quick Start

### 1. Clone & Enter Directory
```powershell
cd "d:\Aca\4th year\projects\multi agent system"
```

### 2. Create and Activate Virtual Environment
```powershell
python -m venv venv
.\venv\Scripts\activate
```

### 3. Install Dependencies
```powershell
.\venv\Scripts\pip install -r requirements.txt
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
copy .env.example .env
```
Open `.env` and set your OpenRouter API key:
```env
OPENROUTER_API_KEY=sk-or-v1-your-actual-api-key-here
DEFAULT_MODEL=nvidia/nemotron-3.5-lightning:free
```

### 5. Verify Setup
```powershell
.\venv\Scripts\python config.py
```
Expected output:
```text
✅  Model : nvidia/nemotron-3.5-lightning:free
   Testing OpenRouter connection …
   Response: OpenRouter OK!
```

---

## 📂 Project Structure & Learning Path

| File | Primary Concepts | Type |
|------|------------------|------|
| [`config.py`](config.py) | Central `ChatOpenRouter` factory, UTF-8 console setup | Config |
| [`01_hello_langgraph.py`](01_hello_langgraph.py) | `StateGraph`, `TypedDict`, `Nodes`, `Edges`, `compile()` | Exercise |
| [`02_two_agent_llm.py`](02_two_agent_llm.py) | `ChatOpenRouter`, `SystemMessage`, `add_messages` | Exercise |
| [`03_conditional_routing.py`](03_conditional_routing.py) | `add_conditional_edges`, dynamic router functions | Exercise |
| [`04_parallel_agents.py`](04_parallel_agents.py) | `Send` API, supersteps, `operator.add` reducers | Exercise |
| [`05_checkpointing.py`](05_checkpointing.py) | `MemorySaver`, `thread_id`, session isolation | Exercise |
| [`06_supervisor_pattern.py`](06_supervisor_pattern.py) | Supervisor node, multi-turn loops, `FINISH` signal | Exercise |
| [`project_multi_agent.py`](project_multi_agent.py) | **Full Capstone**: Parallel fan-out + HITL + Subgraph | Project |

---

### 01 - Hello LangGraph (No LLM Needed)
- **File**: `01_hello_langgraph.py`
- **Concept**: Learn the foundational skeleton of LangGraph without burning any API tokens.
- **Flow**: `START` → `greeter_node` → `responder_node` → `END`
- **Run**:
  ```powershell
  .\venv\Scripts\python 01_hello_langgraph.py
  ```

---

### 02 - Two-Agent Chain (OpenRouter LLM)
- **File**: `02_two_agent_llm.py`
- **Concept**: Connect real LLMs to nodes using `ChatOpenRouter`. Agent A (`researcher`) collects facts and hands them off to Agent B (`summariser`) via the shared message state.
- **Flow**: `START` → `researcher` → `summariser` → `END`
- **Run**:
  ```powershell
  .\venv\Scripts\python 02_two_agent_llm.py
  ```

---

### 03 - Conditional Routing
- **File**: `03_conditional_routing.py`
- **Concept**: Dynamic decision making using `add_conditional_edges`. A classifier agent determines user intent (`research`, `code`, or `write`) and routes dynamically to the appropriate specialist.
- **Flow**:
  ```
                     ┌──> researcher ──┐
  START ──> classifier ──┼──> coder      ──┼──> END
                     └──> writer     ──┘
  ```
- **Run**:
  ```powershell
  .\venv\Scripts\python 03_conditional_routing.py
  ```

---

### 04 - Parallel Agents (Send API Fan-Out/Fan-In)
- **File**: `04_parallel_agents.py`
- **Concept**: Run multiple agents **simultaneously** in the same superstep using LangGraph's `Send` API. Outputs are safely collected using an `operator.add` reducer before converging on an aggregator.
- **Flow**:
  ```
                        ┌──> [Worker 1: Benefits]    ──┐
  START ──> supervisor ─┼──> [Worker 2: Challenges]  ──┼──> aggregator ──> END
                        └──> [Worker 3: Future]      ──┘
                                (All run in parallel!)
  ```
- **Run**:
  ```powershell
  .\venv\Scripts\python 04_parallel_agents.py
  ```

---

### 05 - Checkpointing & Multi-Turn Memory
- **File**: `05_checkpointing.py`
- **Concept**: State persistence using `MemorySaver`. LangGraph tracks state checkpoints per `thread_id`, enabling isolated user sessions and time-travel debugging.
- **Run**:
  ```powershell
  .\venv\Scripts\python 05_checkpointing.py
  ```

---

### 06 - Supervisor Pattern (LLM Orchestrator)
- **File**: `06_supervisor_pattern.py`
- **Concept**: An LLM supervisor orchestrates multiple workers in a loop, deciding dynamically whether to consult a specialist or conclude the interaction.
- **Flow**:
  ```
              ┌──────────────────────────┐
              ▼                          │
  START ──> supervisor ──┬──> researcher ┘
                         ├──> analyst    ┘
                         └──> END (when done)
  ```
- **Run**:
  ```powershell
  .\venv\Scripts\python 06_supervisor_pattern.py
  ```

---

### 🏆 Capstone Project (`project_multi_agent.py`)

A full end-to-end research and report generation pipeline combining **all** advanced patterns:

```
                                  [User Query]
                                       │
                                       ▼
                            🎯 Supervisor Node
                          (Plans 3 distinct tasks)
                                       │
                                       ▼  (Send API Fan-Out)
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
  🔬 Research Worker 1          🔬 Research Worker 2          🔬 Research Worker 3
 (Analyzes Task 1)             (Analyzes Task 2)             (Analyzes Task 3)
         └─────────────────────────────┬─────────────────────────────┘
                                       │  (operator.add Fan-In)
                                       ▼
                            ⏸️ Human Approval Gate
                            (interrupt() suspends graph)
                                       │
                    ┌──────────────────┴──────────────────┐
           [Approved: "yes"]                     [Rejected: "no"]
                    │                                     │
                    ▼                                     ▼
        📄 Report Pipeline (Subgraph)                   END
     ┌────────────────────────────────────┐
     │ draft_writer → editor → finaliser  │
     └────────────────────────────────────┘
                    │
                    ▼
                   END
```

#### Run the Capstone:
```powershell
.\venv\Scripts\python project_multi_agent.py
```

When prompted at the approval gate:
```text
  ⏸️  HUMAN APPROVAL REQUIRED
  Research complete! Please review the findings before report generation.
  Approve report generation? (yes/no): yes
```
Type `yes` and press Enter to resume execution through the report pipeline subgraph!

---

## 📚 Core LangGraph Concepts Reference

### 1. State & Reducers
```python
from typing import TypedDict, Annotated, List
from langgraph.graph.message import add_messages
import operator

class MultiAgentState(TypedDict):
    # Appends new messages rather than overwriting
    messages: Annotated[list, add_messages]
    
    # Appends items from parallel workers safely
    findings: Annotated[List[str], operator.add]
    
    # Overwritten on each step
    current_agent: str
```

### 2. Parallel Fan-Out with `Send`
```python
from langgraph.types import Send

def fan_out_tasks(state: MultiAgentState):
    # Creates N simultaneous executions of worker_node
    return [
        Send("worker_node", {"task": item})
        for item in state["tasks"]
    ]

builder.add_conditional_edges("supervisor", fan_out_tasks)
```

### 3. Human-in-the-Loop (`interrupt` & `Command`)
```python
from langgraph.types import interrupt, Command

def human_gate(state: MultiAgentState):
    # Pauses graph and sends payload to caller
    decision = interrupt({"prompt": "Approve action?", "data": state["findings"]})
    return {"approved": decision == "yes"}

# Resume graph from external code:
app.invoke(Command(resume="yes"), config=thread_config)
```

### 4. Checkpointers & Threads
```python
from langgraph.checkpoint.memory import MemorySaver

checkpointer = MemorySaver()
app = builder.compile(checkpointer=checkpointer)

# Isolated conversation contexts:
config = {"configurable": {"thread_id": "session-123"}}
app.invoke(inputs, config=config)
```

---

## 🔄 Switching LLM Models

All exercises import the model from `config.py`. To switch models across the entire codebase, simply update `DEFAULT_MODEL` in your `.env` file:

```env
# Free models on OpenRouter:
DEFAULT_MODEL=nvidia/nemotron-3.5-lightning:free
DEFAULT_MODEL=minimax/minimax-m3.1-flash:free
DEFAULT_MODEL=liquid/lfm-2.5-2.6b:free
DEFAULT_MODEL=nvidia/nemotron-3-super-120b-a12b:free

# High-capability frontier models:
DEFAULT_MODEL=anthropic/claude-3.5-sonnet
DEFAULT_MODEL=openai/gpt-4o-mini
DEFAULT_MODEL=google/gemini-2.0-flash-exp:free
```

---

## 🛠️ Troubleshooting

- **`NotFoundResponseError` (Model unavailable for free)**:
  OpenRouter occasionally changes which models have the `:free` suffix. Run:
  ```powershell
  .\venv\Scripts\python -c "import requests; r = requests.get('https://openrouter.ai/api/v1/models').json(); print([m['id'] for m in r['data'] if ':free' in m['id']])"
  ```
  Pick an active model and update `DEFAULT_MODEL` in `.env`.

- **Windows Console UnicodeEncodeError**:
  `config.py` already includes automatic `sys.stdout.reconfigure(encoding='utf-8')`. If running arbitrary commands, you can set:
  ```powershell
  $env:PYTHONIOENCODING="utf-8"
  ```

---

## 📜 License

MIT License. Free to use, adapt, and build upon for study and commercial projects.
