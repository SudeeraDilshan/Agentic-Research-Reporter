import React, { useState } from 'react';
import {
  Layers,
  Search,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Compass,
  FileText,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Play,
  ArrowRight,
  Info,
  Clock,
  X
} from 'lucide-react';

export default function GraphVisualizer({
  currentNode = 'supervisor',
  nodeStates = {},
  workerStates = {},
  values = {},
  isWaitingHITL = false,
  isCompleted = false
}) {
  const [selectedNode, setSelectedNode] = useState(null);

  // Extract planned research tasks from supervisor or fallback to default 3 dimensions
  const tasks = (values.research_tasks && values.research_tasks.length > 0)
    ? values.research_tasks
    : [
        { id: 1, focus: "Academic & Scientific Foundations", tool_name: "search_academic_papers", search_query: "Theoretical foundations & architectures" },
        { id: 2, focus: "Industry State-of-the-Art & Production", tool_name: "tavily_search", search_query: "Framework implementations & production benchmarks" },
        { id: 3, focus: "Challenges, Safety & Future Trends", tool_name: "tavily_search", search_query: "Safety, ethics & future breakthroughs" }
      ];

  // Helper to determine single node state
  const getNodeState = (nodeId) => {
    if (isCompleted) return 'completed';
    if (currentNode === nodeId) return 'active';
    if (nodeId === 'human_approval' && isWaitingHITL) return 'active';
    return nodeStates[nodeId] || 'pending';
  };

  // Helper to determine state for EACH specific parallel worker
  const getWorkerState = (workerId) => {
    if (isCompleted) return 'completed';
    const wdata = workerStates[`worker_${workerId}`];
    if (wdata) {
      if (wdata.status === 'completed') return 'completed';
      if (wdata.status === 'staggering') return 'staggering';
      if (wdata.status === 'active' || wdata.status === 'synthesizing') return 'active';
    }
    if (currentNode === 'research_worker') {
      return workerId === 1 ? 'active' : 'staggering';
    }
    if (nodeStates['research_worker'] === 'completed') return 'completed';
    return 'pending';
  };

  // Node details for inspector drawer
  const getNodeDetails = (nodeId) => {
    if (String(nodeId).startsWith('worker_')) {
      const wId = parseInt(nodeId.replace('worker_', ''), 10);
      const task = tasks.find(t => t.id === wId) || { id: wId, focus: `Worker ${wId}`, tool_name: 'tavily_search', search_query: '' };
      const wdata = workerStates[nodeId] || {};
      const workerSources = (values.sources || []).filter(s => s.task_id === wId);

      return {
        title: `Worker ${wId}: ${task.focus}`,
        phase: `Phase 2 • Parallel Worker ${wId}`,
        desc: `Autonomous research worker executing in parallel. Invokes MCP tool '${task.tool_name}'.`,
        output: (
          <div>
            <div style={{ marginBottom: '8px', fontSize: '12px' }}>
              <span style={{ color: '#38bdf8', fontWeight: '600' }}>Tool:</span> <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: '4px', color: '#c4b5fd' }}>{task.tool_name}</code>
              <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>Query: "{task.search_query}"</div>
            </div>
            {workerSources.length > 0 ? (
              <div>
                <div style={{ fontSize: '11px', color: '#34d399', fontWeight: '700', marginBottom: '4px' }}>
                  ✓ {workerSources.length} Grounded Sources Retrieved by Worker {wId}:
                </div>
                {workerSources.map((s, idx) => (
                  <div key={idx} style={{ fontSize: '11px', color: '#94a3b8', padding: '2px 0' }}>
                    • <a href={s.url} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>{s.url}</a>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                {getWorkerState(wId) === 'staggering' ? '⏱️ Stagger delay active — awaiting LLM synthesis window...' : 'Pending search execution...'}
              </div>
            )}
          </div>
        )
      };
    }

    switch (nodeId) {
      case 'supervisor':
        return {
          title: 'Supervisor Planning Node',
          phase: 'Phase 1 • Planning',
          desc: `Decomposes query into exactly ${tasks.length} distinct research tasks via Pydantic structured output.`,
          output: (
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Dispatched {tasks.length} Parallel Tasks:</div>
              {tasks.map((t) => (
                <div key={t.id} style={{ background: '#1e293b', padding: '8px 12px', borderRadius: '6px', marginBottom: '6px', fontSize: '12px' }}>
                  <span style={{ color: '#38bdf8', fontWeight: '600' }}>Task {t.id}: {t.focus}</span>
                  <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>Tool: {t.tool_name} | Query: "{t.search_query}"</div>
                </div>
              ))}
            </div>
          )
        };
      case 'evaluator':
        return {
          title: 'Reflexion Completeness Evaluator',
          phase: 'Phase 3 • Self-Correction Audit',
          desc: 'Fan-in node collecting all worker findings. Audits factual depth, completeness, and citations.',
          output: values.evaluation_critique ? (
            <div>
              <div style={{ fontSize: '12px', color: values.is_sufficient ? '#34d399' : '#f59e0b', fontWeight: '700', marginBottom: '6px' }}>
                {values.is_sufficient ? '✓ Completeness Verified (Score ≥ 7/10)' : '⚠️ Gap Detected (Spawning Follow-Up)'}
              </div>
              <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>{values.evaluation_critique}</p>
            </div>
          ) : 'Awaiting parallel worker completion...'
        };
      case 'follow_up_worker':
        return {
          title: 'Targeted Gap-Filler Worker',
          phase: 'Phase 3b • Reflexion Loop',
          desc: 'Targeted research node spawned if Evaluator detects evidence gaps. Loops back into Evaluator.',
          output: values.follow_up_task ? (
            <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
              Refinement Query: "{values.follow_up_task.search_query}"
            </div>
          ) : 'No critical gaps detected — reflexion loop bypassed.'
        };
      case 'human_approval':
        return {
          title: 'Human Review & Steering Gate',
          phase: 'Phase 4 • Human-in-the-Loop',
          desc: 'LangGraph interrupt gate. Pauses execution for human review with dual paths: direct approval or steering.',
          output: (
            <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
              <div>Status: {isWaitingHITL ? '⏸️ Paused (Action Required)' : values.human_approved ? '✅ Approved' : 'Pending'}</div>
              {values.steering_feedback && (
                <div style={{ marginTop: '4px', color: '#38bdf8' }}>Custom Steering Guidance: "{values.steering_feedback}"</div>
              )}
            </div>
          )
        };
      case 'steering_worker':
        return {
          title: 'Human Steering Research Worker',
          phase: 'Phase 4b • Steerable Research',
          desc: 'Gathers targeted MCP evidence based on user steering guidance and merges into findings.',
          output: values.steering_feedback ? (
            <div style={{ fontSize: '12px', color: '#38bdf8' }}>
              Target Guidance Addressed: "{values.steering_feedback}"
            </div>
          ) : 'No custom steering requested — direct path taken.'
        };
      case 'draft_writer':
        return {
          title: 'Report Draft Writer (Subgraph Node 1)',
          phase: 'Phase 5a • Report Synthesis',
          desc: 'Drafts comprehensive structured research report preserving bracketed citations [1], [2].',
          output: values.draft_report ? (
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Draft written ({values.draft_report.length} chars). Passed to Fact-Checker Critic.</div>
          ) : 'Pending human approval...'
        };
      case 'fact_checker':
        return {
          title: 'Adversarial Fact-Checker Critic (Subgraph Node 2)',
          phase: 'Phase 5b • Adversarial Audit',
          desc: 'Compares draft assertions against raw MCP evidence to detect hallucinations or ungrounded claims.',
          output: values.fact_check_critique ? (
            <div style={{ maxHeight: '140px', overflowY: 'auto', fontSize: '12px', color: '#e2e8f0', background: '#1e1b4b', padding: '8px', borderRadius: '6px' }}>
              {values.fact_check_critique}
            </div>
          ) : 'Pending draft writer...'
        };
      case 'editor':
        return {
          title: 'Report Polisher & Editor (Subgraph Node 3)',
          phase: 'Phase 5c • Editorial Refinement',
          desc: 'Applies Fact-Checker critique corrections, ensures academic tone, and polishes report structure.',
          output: values.edited_report ? (
            <div style={{ fontSize: '12px', color: '#34d399' }}>✓ Fact-checker audit critique corrections incorporated.</div>
          ) : 'Pending critique...'
        };
      case 'finaliser':
        return {
          title: 'Report Finaliser (Subgraph Node 4)',
          phase: 'Phase 5d • Publication',
          desc: 'Attaches executive summary block and compiles verified reference bibliography from MCP sources.',
          output: values.final_report ? (
            <div style={{ fontSize: '12px', color: '#34d399' }}>✓ Final grounded report compiled with bibliography.</div>
          ) : 'Pending editorial review...'
        };
      default:
        return null;
    }
  };

  const selectedDetails = selectedNode ? getNodeDetails(selectedNode) : null;

  return (
    <div style={{ position: 'relative' }}>
      {/* ── SVG GRAPH DIAGRAM (MULTI-LANE PARALLEL WORKERS) ── */}
      <div style={{ width: '100%', overflowX: 'auto', background: '#090d16', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px 10px' }}>
        <svg viewBox="0 0 1120 650" style={{ width: '100%', minWidth: '1000px', height: 'auto', display: 'block' }}>
          <defs>
            <marker id="arrow-default" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#475569" />
            </marker>
            <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#38bdf8" />
            </marker>
            <marker id="arrow-completed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#34d399" />
            </marker>
            <marker id="arrow-reflexion" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#f59e0b" />
            </marker>

            <filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ══════════════════════════════════════════════════════════════
             SUBGRAPH CONTAINER BACKGROUND (Report Pipeline)
             ══════════════════════════════════════════════════════════════ */}
          <rect
            x="40"
            y="435"
            width="1040"
            height="180"
            rx="16"
            fill="rgba(30, 27, 75, 0.25)"
            stroke="rgba(139, 92, 246, 0.35)"
            strokeWidth="1.5"
            strokeDasharray="6 6"
          />
          <text x="60" y="460" fill="#a78bfa" fontSize="12" fontWeight="700" letterSpacing="0.8">
            REPORT SUBGRAPH (Draft Writer ➔ Adversarial Critic ➔ Editor ➔ Finaliser)
          </text>

          {/* ══════════════════════════════════════════════════════════════
             GRAPH EDGES (Directed Arrows & Multi-Lane Fan-out / Fan-in)
             ══════════════════════════════════════════════════════════════ */}

          {/* START -> Supervisor */}
          <line
            x1="90" y1="115" x2="160" y2="115"
            stroke={getNodeState('supervisor') === 'active' ? '#38bdf8' : getNodeState('supervisor') === 'completed' ? '#34d399' : '#475569'}
            strokeWidth={getNodeState('supervisor') === 'active' ? '2.5' : '1.8'}
            markerEnd={getNodeState('supervisor') === 'active' ? 'url(#arrow-active)' : getNodeState('supervisor') === 'completed' ? 'url(#arrow-completed)' : 'url(#arrow-default)'}
          />

          {/* ── PARALLEL FAN-OUT (Supervisor -> 3 Distinct Workers) ── */}
          {/* Branch to Worker 1 (Academic) */}
          <path
            d="M 320 115 C 365 115, 365 46, 410 46"
            fill="none"
            stroke={getWorkerState(1) === 'active' ? '#38bdf8' : getWorkerState(1) === 'completed' ? '#34d399' : '#475569'}
            strokeWidth={getWorkerState(1) === 'active' ? '2.5' : '1.8'}
            strokeDasharray={getWorkerState(1) === 'active' ? '5 5' : 'none'}
            className={getWorkerState(1) === 'active' ? 'edge-flow-active' : ''}
            markerEnd={getWorkerState(1) === 'active' ? 'url(#arrow-active)' : getWorkerState(1) === 'completed' ? 'url(#arrow-completed)' : 'url(#arrow-default)'}
          />

          {/* Branch to Worker 2 (Industry) */}
          <line
            x1="320" y1="115" x2="410" y2="115"
            stroke={getWorkerState(2) === 'active' ? '#38bdf8' : getWorkerState(2) === 'completed' ? '#34d399' : '#475569'}
            strokeWidth={getWorkerState(2) === 'active' ? '2.5' : '1.8'}
            strokeDasharray={getWorkerState(2) === 'active' ? '5 5' : 'none'}
            className={getWorkerState(2) === 'active' ? 'edge-flow-active' : ''}
            markerEnd={getWorkerState(2) === 'active' ? 'url(#arrow-active)' : getWorkerState(2) === 'completed' ? 'url(#arrow-completed)' : 'url(#arrow-default)'}
          />

          {/* Branch to Worker 3 (Ethics) */}
          <path
            d="M 320 115 C 365 115, 365 186, 410 186"
            fill="none"
            stroke={getWorkerState(3) === 'active' ? '#38bdf8' : getWorkerState(3) === 'completed' ? '#34d399' : '#475569'}
            strokeWidth={getWorkerState(3) === 'active' ? '2.5' : '1.8'}
            strokeDasharray={getWorkerState(3) === 'active' ? '5 5' : 'none'}
            className={getWorkerState(3) === 'active' ? 'edge-flow-active' : ''}
            markerEnd={getWorkerState(3) === 'active' ? 'url(#arrow-active)' : getWorkerState(3) === 'completed' ? 'url(#arrow-completed)' : 'url(#arrow-default)'}
          />
          <text x="365" y="100" fill="#38bdf8" fontSize="9" textAnchor="middle" fontWeight="700">Send API</text>

          {/* ── PARALLEL FAN-IN (3 Distinct Workers -> Evaluator) ── */}
          {/* Worker 1 -> Evaluator */}
          <path
            d="M 660 46 C 710 46, 710 115, 755 115"
            fill="none"
            stroke={getWorkerState(1) === 'completed' ? '#34d399' : '#475569'}
            strokeWidth="1.8"
            markerEnd={getWorkerState(1) === 'completed' ? 'url(#arrow-completed)' : 'url(#arrow-default)'}
          />

          {/* Worker 2 -> Evaluator */}
          <line
            x1="660" y1="115" x2="755" y2="115"
            stroke={getWorkerState(2) === 'completed' ? '#34d399' : '#475569'}
            strokeWidth="1.8"
            markerEnd={getWorkerState(2) === 'completed' ? 'url(#arrow-completed)' : 'url(#arrow-default)'}
          />

          {/* Worker 3 -> Evaluator */}
          <path
            d="M 660 186 C 710 186, 710 115, 755 115"
            fill="none"
            stroke={getWorkerState(3) === 'completed' ? '#34d399' : '#475569'}
            strokeWidth="1.8"
            markerEnd={getWorkerState(3) === 'completed' ? 'url(#arrow-completed)' : 'url(#arrow-default)'}
          />
          <text x="705" y="100" fill="#34d399" fontSize="9" textAnchor="middle" fontWeight="700">Fan-In</text>

          {/* Evaluator -> Follow-Up Worker (Reflexion down) */}
          <path
            d="M 845 155 L 845 210"
            fill="none"
            stroke={getNodeState('follow_up_worker') === 'active' ? '#f59e0b' : '#334155'}
            strokeWidth="1.8"
            markerEnd={getNodeState('follow_up_worker') === 'active' ? 'url(#arrow-reflexion)' : 'url(#arrow-default)'}
          />
          <text x="858" y="185" fill="#f59e0b" fontSize="10" fontWeight="600">If Gaps (&lt;7)</text>

          {/* Follow-Up Worker -> Evaluator (Reflexion Loop CURVE BACK) */}
          <path
            d="M 935 245 C 990 245, 990 115, 935 115"
            fill="none"
            stroke={getNodeState('follow_up_worker') === 'completed' ? '#34d399' : '#475569'}
            strokeWidth="1.8"
            strokeDasharray="4 4"
            markerEnd={getNodeState('follow_up_worker') === 'completed' ? 'url(#arrow-completed)' : 'url(#arrow-default)'}
          />
          <text x="995" y="180" fill="#f59e0b" fontSize="10" fontWeight="700">Reflexion Loop</text>

          {/* Evaluator -> Human Approval Gate (Down-Left) */}
          <path
            d="M 800 155 C 800 220, 545 220, 545 280"
            fill="none"
            stroke={getNodeState('human_approval') === 'active' ? '#38bdf8' : getNodeState('human_approval') === 'completed' ? '#34d399' : '#475569'}
            strokeWidth={getNodeState('human_approval') === 'active' ? '2.5' : '1.8'}
            markerEnd={getNodeState('human_approval') === 'active' ? 'url(#arrow-active)' : getNodeState('human_approval') === 'completed' ? 'url(#arrow-completed)' : 'url(#arrow-default)'}
          />
          <text x="650" y="235" fill="#34d399" fontSize="10" fontWeight="600">Sufficient (Score ≥ 7)</text>

          {/* Human Approval -> Steering Worker (Right branch) */}
          <line
            x1="660" y1="320" x2="750" y2="320"
            stroke={getNodeState('steering_worker') === 'active' ? '#38bdf8' : getNodeState('steering_worker') === 'completed' ? '#34d399' : '#475569'}
            strokeWidth="1.8"
            strokeDasharray="4 4"
            markerEnd={getNodeState('steering_worker') === 'active' ? 'url(#arrow-active)' : getNodeState('steering_worker') === 'completed' ? 'url(#arrow-completed)' : 'url(#arrow-default)'}
          />
          <text x="705" y="310" fill="#38bdf8" fontSize="10" textAnchor="middle" fontWeight="600">Steering Feedback</text>

          {/* Steering Worker -> Draft Writer (Down-Left into Subgraph) */}
          <path
            d="M 840 355 C 840 405, 200 400, 200 480"
            fill="none"
            stroke={getNodeState('steering_worker') === 'completed' ? '#34d399' : '#334155'}
            strokeWidth="1.8"
            markerEnd={getNodeState('steering_worker') === 'completed' ? 'url(#arrow-completed)' : 'url(#arrow-default)'}
          />

          {/* Human Approval -> Draft Writer (Direct Approve path) */}
          <path
            d="M 500 365 C 500 415, 160 410, 160 480"
            fill="none"
            stroke={getNodeState('draft_writer') === 'active' ? '#38bdf8' : (getNodeState('draft_writer') === 'completed' || isCompleted) ? '#34d399' : '#475569'}
            strokeWidth={getNodeState('draft_writer') === 'active' ? '2.5' : '1.8'}
            markerEnd={getNodeState('draft_writer') === 'active' ? 'url(#arrow-active)' : (getNodeState('draft_writer') === 'completed' || isCompleted) ? 'url(#arrow-completed)' : 'url(#arrow-default)'}
          />
          <text x="310" y="405" fill="#10b981" fontSize="10" fontWeight="700">Approve ('yes')</text>

          {/* Inside Subgraph: Draft Writer -> Fact Checker */}
          <line
            x1="250" y1="520" x2="330" y2="520"
            stroke={getNodeState('fact_checker') === 'active' ? '#38bdf8' : getNodeState('fact_checker') === 'completed' ? '#34d399' : '#475569'}
            strokeWidth="1.8"
            markerEnd={getNodeState('fact_checker') === 'active' ? 'url(#arrow-active)' : getNodeState('fact_checker') === 'completed' ? 'url(#arrow-completed)' : 'url(#arrow-default)'}
          />

          {/* Fact Checker -> Editor */}
          <line
            x1="510" y1="520" x2="590" y2="520"
            stroke={getNodeState('editor') === 'active' ? '#38bdf8' : getNodeState('editor') === 'completed' ? '#34d399' : '#475569'}
            strokeWidth="1.8"
            markerEnd={getNodeState('editor') === 'active' ? 'url(#arrow-active)' : getNodeState('editor') === 'completed' ? 'url(#arrow-completed)' : 'url(#arrow-default)'}
          />
          <text x="550" y="510" fill="#a78bfa" fontSize="9" textAnchor="middle" fontWeight="600">Critique Diff</text>

          {/* Editor -> Finaliser */}
          <line
            x1="760" y1="520" x2="830" y2="520"
            stroke={getNodeState('finaliser') === 'active' ? '#38bdf8' : getNodeState('finaliser') === 'completed' ? '#34d399' : '#475569'}
            strokeWidth="1.8"
            markerEnd={getNodeState('finaliser') === 'active' ? 'url(#arrow-active)' : getNodeState('finaliser') === 'completed' ? 'url(#arrow-completed)' : 'url(#arrow-default)'}
          />

          {/* Finaliser -> END */}
          <line
            x1="990" y1="520" x2="1030" y2="520"
            stroke={isCompleted ? '#34d399' : '#475569'}
            strokeWidth="1.8"
            markerEnd={isCompleted ? 'url(#arrow-completed)' : 'url(#arrow-default)'}
          />


          {/* ══════════════════════════════════════════════════════════════
             GRAPH NODES (Interactive Visual Boxes)
             ══════════════════════════════════════════════════════════════ */}

          {/* 1. START NODE */}
          <g transform="translate(30, 93)">
            <rect x="0" y="0" width="60" height="44" rx="22" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
            <text x="30" y="27" fill="#94a3b8" fontSize="12" fontWeight="700" textAnchor="middle">START</text>
          </g>

          {/* 2. SUPERVISOR NODE */}
          <g transform="translate(160, 75)" onClick={() => setSelectedNode('supervisor')} style={{ cursor: 'pointer' }}>
            <rect
              x="0" y="0" width="160" height="80" rx="12"
              fill={getNodeState('supervisor') === 'active' ? '#172554' : getNodeState('supervisor') === 'completed' ? '#062e24' : '#111827'}
              stroke={getNodeState('supervisor') === 'active' ? '#38bdf8' : getNodeState('supervisor') === 'completed' ? '#10b981' : '#334155'}
              strokeWidth={getNodeState('supervisor') === 'active' ? '2.5' : '1.5'}
              filter={getNodeState('supervisor') === 'active' ? 'url(#neon-glow)' : 'none'}
            />
            <text x="16" y="28" fill="#a78bfa" fontSize="10" fontWeight="700">PHASE 1</text>
            <text x="16" y="48" fill="#f8fafc" fontSize="13" fontWeight="700">🎯 Supervisor</text>
            <text x="16" y="66" fill="#94a3b8" fontSize="10">{tasks.length} Dimensions Planned</text>
            {getNodeState('supervisor') === 'active' && <circle cx="144" cy="24" r="5" fill="#38bdf8" />}
            {getNodeState('supervisor') === 'completed' && <text x="140" y="26" fill="#34d399" fontSize="11" fontWeight="700">✓</text>}
          </g>

          {/* ══════════════════════════════════════════════════════════════
             3. DEDICATED INDIVIDUAL PARALLEL WORKERS (3 LANES)
             ══════════════════════════════════════════════════════════════ */}

          {/* WORKER 1: Academic & Science */}
          <g transform="translate(410, 16)" onClick={() => setSelectedNode('worker_1')} style={{ cursor: 'pointer' }}>
            <rect
              x="0" y="0" width="250" height="60" rx="10"
              fill={getWorkerState(1) === 'active' ? '#172554' : getWorkerState(1) === 'completed' ? '#062e24' : '#111827'}
              stroke={getWorkerState(1) === 'active' ? '#38bdf8' : getWorkerState(1) === 'completed' ? '#10b981' : getWorkerState(1) === 'staggering' ? '#eab308' : '#334155'}
              strokeWidth={getWorkerState(1) === 'active' ? '2.5' : '1.5'}
              filter={getWorkerState(1) === 'active' ? 'url(#neon-glow)' : 'none'}
            />
            <text x="12" y="22" fill="#38bdf8" fontSize="11" fontWeight="700">🔬 Worker 1: Academic Foundations</text>
            <text x="12" y="40" fill="#94a3b8" fontSize="9.5">MCP: search_academic_papers (arXiv/Nature)</text>
            <text x="12" y="52" fill={getWorkerState(1) === 'completed' ? '#34d399' : getWorkerState(1) === 'active' ? '#38bdf8' : '#64748b'} fontSize="9" fontWeight="600">
              {getWorkerState(1) === 'completed' ? '✓ Synthesized with citations' : getWorkerState(1) === 'active' ? '● Researching live...' : 'Pending'}
            </text>
            {getWorkerState(1) === 'active' && <circle cx="236" cy="18" r="4" fill="#38bdf8" />}
            {getWorkerState(1) === 'completed' && <text x="230" y="22" fill="#34d399" fontSize="10" fontWeight="700">✓</text>}
          </g>

          {/* WORKER 2: Industry Implementations */}
          <g transform="translate(410, 85)" onClick={() => setSelectedNode('worker_2')} style={{ cursor: 'pointer' }}>
            <rect
              x="0" y="0" width="250" height="60" rx="10"
              fill={getWorkerState(2) === 'active' ? '#172554' : getWorkerState(2) === 'completed' ? '#062e24' : '#111827'}
              stroke={getWorkerState(2) === 'active' ? '#38bdf8' : getWorkerState(2) === 'completed' ? '#10b981' : getWorkerState(2) === 'staggering' ? '#eab308' : '#334155'}
              strokeWidth={getWorkerState(2) === 'active' ? '2.5' : '1.5'}
              filter={getWorkerState(2) === 'active' ? 'url(#neon-glow)' : 'none'}
            />
            <text x="12" y="22" fill="#38bdf8" fontSize="11" fontWeight="700">🔬 Worker 2: Industry Deployments</text>
            <text x="12" y="40" fill="#94a3b8" fontSize="9.5">MCP: tavily_search (Production frameworks)</text>
            <text x="12" y="52" fill={getWorkerState(2) === 'completed' ? '#34d399' : getWorkerState(2) === 'active' ? '#38bdf8' : getWorkerState(2) === 'staggering' ? '#eab308' : '#64748b'} fontSize="9" fontWeight="600">
              {getWorkerState(2) === 'completed' ? '✓ Synthesized with citations' : getWorkerState(2) === 'active' ? '● Synthesizing LLM...' : getWorkerState(2) === 'staggering' ? '⏱️ Stagger delay (4s)' : 'Pending'}
            </text>
            {getWorkerState(2) === 'active' && <circle cx="236" cy="18" r="4" fill="#38bdf8" />}
            {getWorkerState(2) === 'completed' && <text x="230" y="22" fill="#34d399" fontSize="10" fontWeight="700">✓</text>}
          </g>

          {/* WORKER 3: Future Directions & Ethics */}
          <g transform="translate(410, 156)" onClick={() => setSelectedNode('worker_3')} style={{ cursor: 'pointer' }}>
            <rect
              x="0" y="0" width="250" height="60" rx="10"
              fill={getWorkerState(3) === 'active' ? '#172554' : getWorkerState(3) === 'completed' ? '#062e24' : '#111827'}
              stroke={getWorkerState(3) === 'active' ? '#38bdf8' : getWorkerState(3) === 'completed' ? '#10b981' : getWorkerState(3) === 'staggering' ? '#eab308' : '#334155'}
              strokeWidth={getWorkerState(3) === 'active' ? '2.5' : '1.5'}
              filter={getWorkerState(3) === 'active' ? 'url(#neon-glow)' : 'none'}
            />
            <text x="12" y="22" fill="#38bdf8" fontSize="11" fontWeight="700">🔬 Worker 3: Challenges &amp; Ethics</text>
            <text x="12" y="40" fill="#94a3b8" fontSize="9.5">MCP: tavily_search (Safety &amp; Trends)</text>
            <text x="12" y="52" fill={getWorkerState(3) === 'completed' ? '#34d399' : getWorkerState(3) === 'active' ? '#38bdf8' : getWorkerState(3) === 'staggering' ? '#eab308' : '#64748b'} fontSize="9" fontWeight="600">
              {getWorkerState(3) === 'completed' ? '✓ Synthesized with citations' : getWorkerState(3) === 'active' ? '● Synthesizing LLM...' : getWorkerState(3) === 'staggering' ? '⏱️ Stagger delay (8s)' : 'Pending'}
            </text>
            {getWorkerState(3) === 'active' && <circle cx="236" cy="18" r="4" fill="#38bdf8" />}
            {getWorkerState(3) === 'completed' && <text x="230" y="22" fill="#34d399" fontSize="10" fontWeight="700">✓</text>}
          </g>


          {/* 4. REFLEXION EVALUATOR */}
          <g transform="translate(760, 75)" onClick={() => setSelectedNode('evaluator')} style={{ cursor: 'pointer' }}>
            <rect
              x="0" y="0" width="170" height="80" rx="12"
              fill={getNodeState('evaluator') === 'active' ? '#172554' : getNodeState('evaluator') === 'completed' ? '#062e24' : '#111827'}
              stroke={getNodeState('evaluator') === 'active' ? '#38bdf8' : getNodeState('evaluator') === 'completed' ? '#10b981' : '#334155'}
              strokeWidth={getNodeState('evaluator') === 'active' ? '2.5' : '1.5'}
              filter={getNodeState('evaluator') === 'active' ? 'url(#neon-glow)' : 'none'}
            />
            <text x="16" y="28" fill="#06b6d4" fontSize="10" fontWeight="700">PHASE 3 • GATE</text>
            <text x="16" y="48" fill="#f8fafc" fontSize="13" fontWeight="700">🔍 Evaluator Audit</text>
            <text x="16" y="66" fill="#94a3b8" fontSize="10">Reflexion Sufficiency (Score /10)</text>
            {getNodeState('evaluator') === 'active' && <circle cx="154" cy="24" r="5" fill="#38bdf8" />}
            {getNodeState('evaluator') === 'completed' && <text x="150" y="26" fill="#34d399" fontSize="11" fontWeight="700">✓</text>}
          </g>

          {/* 5. FOLLOW-UP WORKER (Reflexion Gap-Filler) */}
          <g transform="translate(760, 210)" onClick={() => setSelectedNode('follow_up_worker')} style={{ cursor: 'pointer' }}>
            <rect
              x="0" y="0" width="170" height="65" rx="10"
              fill={getNodeState('follow_up_worker') === 'active' ? '#451a03' : getNodeState('follow_up_worker') === 'completed' ? '#062e24' : '#111827'}
              stroke={getNodeState('follow_up_worker') === 'active' ? '#f59e0b' : getNodeState('follow_up_worker') === 'completed' ? '#10b981' : '#334155'}
              strokeWidth="1.5"
            />
            <text x="14" y="24" fill="#f59e0b" fontSize="10" fontWeight="700">REFLEXION LOOP</text>
            <text x="14" y="42" fill="#f8fafc" fontSize="12" fontWeight="700">🔄 Follow-Up Worker</text>
            <text x="14" y="56" fill="#94a3b8" fontSize="10">Targeted Gap Investigation</text>
          </g>

          {/* 6. HUMAN-IN-THE-LOOP APPROVAL / STEERING GATE */}
          <g transform="translate(435, 280)" onClick={() => setSelectedNode('human_approval')} style={{ cursor: 'pointer' }}>
            <rect
              x="0" y="0" width="220" height="85" rx="14"
              fill={getNodeState('human_approval') === 'active' ? '#422006' : getNodeState('human_approval') === 'completed' ? '#062e24' : '#111827'}
              stroke={getNodeState('human_approval') === 'active' ? '#f59e0b' : getNodeState('human_approval') === 'completed' ? '#10b981' : '#334155'}
              strokeWidth={getNodeState('human_approval') === 'active' ? '2.5' : '1.5'}
              filter={getNodeState('human_approval') === 'active' ? 'url(#neon-glow)' : 'none'}
            />
            <text x="16" y="28" fill="#fbbf24" fontSize="10" fontWeight="700">PHASE 4 • HITL GATE</text>
            <text x="16" y="48" fill="#f8fafc" fontSize="13" fontWeight="700">⏸️ Human Steering Gate</text>
            <text x="16" y="66" fill="#94a3b8" fontSize="10">Approve or Steer Guidance</text>
            {getNodeState('human_approval') === 'active' && <circle cx="200" cy="24" r="5" fill="#f59e0b" />}
            {getNodeState('human_approval') === 'completed' && <text x="196" y="26" fill="#34d399" fontSize="11" fontWeight="700">✓</text>}
          </g>

          {/* 7. STEERING WORKER */}
          <g transform="translate(755, 290)" onClick={() => setSelectedNode('steering_worker')} style={{ cursor: 'pointer' }}>
            <rect
              x="0" y="0" width="180" height="75" rx="10"
              fill={getNodeState('steering_worker') === 'active' ? '#172554' : getNodeState('steering_worker') === 'completed' ? '#062e24' : '#111827'}
              stroke={getNodeState('steering_worker') === 'active' ? '#38bdf8' : getNodeState('steering_worker') === 'completed' ? '#10b981' : '#334155'}
              strokeWidth="1.5"
            />
            <text x="14" y="26" fill="#38bdf8" fontSize="10" fontWeight="700">STEERABLE EXTENSION</text>
            <text x="14" y="44" fill="#f8fafc" fontSize="12" fontWeight="700">🧭 Steering Worker</text>
            <text x="14" y="62" fill="#94a3b8" fontSize="10">Custom Evidence Research</text>
          </g>

          {/* ══════════════════════════════════════════════════════════════
             SUBGRAPH NODES (Report Pipeline)
             ══════════════════════════════════════════════════════════════ */}

          {/* 8. Draft Writer */}
          <g transform="translate(80, 485)" onClick={() => setSelectedNode('draft_writer')} style={{ cursor: 'pointer' }}>
            <rect
              x="0" y="0" width="170" height="75" rx="10"
              fill={getNodeState('draft_writer') === 'active' ? '#172554' : getNodeState('draft_writer') === 'completed' ? '#062e24' : '#111827'}
              stroke={getNodeState('draft_writer') === 'active' ? '#38bdf8' : getNodeState('draft_writer') === 'completed' ? '#10b981' : '#334155'}
              strokeWidth={getNodeState('draft_writer') === 'active' ? '2.5' : '1.5'}
              filter={getNodeState('draft_writer') === 'active' ? 'url(#neon-glow)' : 'none'}
            />
            <text x="14" y="26" fill="#c4b5fd" fontSize="10" fontWeight="700">SUBGRAPH • 1</text>
            <text x="14" y="44" fill="#f8fafc" fontSize="12" fontWeight="700">✍️ Draft Writer</text>
            <text x="14" y="62" fill="#94a3b8" fontSize="10">In-depth Report Drafting</text>
            {getNodeState('draft_writer') === 'active' && <circle cx="150" cy="22" r="5" fill="#38bdf8" />}
          </g>

          {/* 9. Fact-Checker Critic */}
          <g transform="translate(330, 485)" onClick={() => setSelectedNode('fact_checker')} style={{ cursor: 'pointer' }}>
            <rect
              x="0" y="0" width="180" height="75" rx="10"
              fill={getNodeState('fact_checker') === 'active' ? '#172554' : getNodeState('fact_checker') === 'completed' ? '#062e24' : '#111827'}
              stroke={getNodeState('fact_checker') === 'active' ? '#38bdf8' : getNodeState('fact_checker') === 'completed' ? '#10b981' : '#334155'}
              strokeWidth={getNodeState('fact_checker') === 'active' ? '2.5' : '1.5'}
              filter={getNodeState('fact_checker') === 'active' ? 'url(#neon-glow)' : 'none'}
            />
            <text x="14" y="26" fill="#f43f5e" fontSize="10" fontWeight="700">SUBGRAPH • 2 (CRITIC)</text>
            <text x="14" y="44" fill="#f8fafc" fontSize="12" fontWeight="700">🕵️ Fact-Checker</text>
            <text x="14" y="62" fill="#94a3b8" fontSize="10">Adversarial Grounding Audit</text>
            {getNodeState('fact_checker') === 'active' && <circle cx="160" cy="22" r="5" fill="#38bdf8" />}
          </g>

          {/* 10. Editor */}
          <g transform="translate(590, 485)" onClick={() => setSelectedNode('editor')} style={{ cursor: 'pointer' }}>
            <rect
              x="0" y="0" width="170" height="75" rx="10"
              fill={getNodeState('editor') === 'active' ? '#172554' : getNodeState('editor') === 'completed' ? '#062e24' : '#111827'}
              stroke={getNodeState('editor') === 'active' ? '#38bdf8' : getNodeState('editor') === 'completed' ? '#10b981' : '#334155'}
              strokeWidth={getNodeState('editor') === 'active' ? '2.5' : '1.5'}
              filter={getNodeState('editor') === 'active' ? 'url(#neon-glow)' : 'none'}
            />
            <text x="14" y="26" fill="#c4b5fd" fontSize="10" fontWeight="700">SUBGRAPH • 3</text>
            <text x="14" y="44" fill="#f8fafc" fontSize="12" fontWeight="700">📝 Report Editor</text>
            <text x="14" y="62" fill="#94a3b8" fontSize="10">Applies Critique Corrections</text>
            {getNodeState('editor') === 'active' && <circle cx="150" cy="22" r="5" fill="#38bdf8" />}
          </g>

          {/* 11. Finaliser */}
          <g transform="translate(830, 485)" onClick={() => setSelectedNode('finaliser')} style={{ cursor: 'pointer' }}>
            <rect
              x="0" y="0" width="160" height="75" rx="10"
              fill={getNodeState('finaliser') === 'active' ? '#172554' : (getNodeState('finaliser') === 'completed' || isCompleted) ? '#062e24' : '#111827'}
              stroke={getNodeState('finaliser') === 'active' ? '#38bdf8' : (getNodeState('finaliser') === 'completed' || isCompleted) ? '#10b981' : '#334155'}
              strokeWidth={getNodeState('finaliser') === 'active' ? '2.5' : '1.5'}
              filter={getNodeState('finaliser') === 'active' ? 'url(#neon-glow)' : 'none'}
            />
            <text x="14" y="26" fill="#34d399" fontSize="10" fontWeight="700">SUBGRAPH • 4</text>
            <text x="14" y="44" fill="#f8fafc" fontSize="12" fontWeight="700">🏁 Finaliser</text>
            <text x="14" y="62" fill="#94a3b8" fontSize="10">Executive Summary &amp; Citations</text>
            {getNodeState('finaliser') === 'active' && <circle cx="140" cy="22" r="5" fill="#38bdf8" />}
          </g>

          {/* 12. END NODE */}
          <g transform="translate(1030, 503)">
            <rect x="0" y="0" width="50" height="44" rx="22" fill={isCompleted ? '#064e3b' : '#1e293b'} stroke={isCompleted ? '#10b981' : '#475569'} strokeWidth="1.5" />
            <text x="25" y="27" fill={isCompleted ? '#34d399' : '#94a3b8'} fontSize="11" fontWeight="700" textAnchor="middle">END</text>
          </g>
        </svg>
      </div>

      {/* ── INTERACTIVE NODE INSPECTOR MODAL / DRAWER ── */}
      {selectedDetails && (
        <div style={{
          marginTop: '16px',
          background: '#0f172a',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                {selectedDetails.phase}
              </span>
              <h4 style={{ fontSize: '15px', color: '#f8fafc', fontWeight: '700' }}>{selectedDetails.title}</h4>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>

          <p style={{ fontSize: '12.5px', color: '#94a3b8', marginBottom: '12px' }}>{selectedDetails.desc}</p>

          <div style={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
              Node State &amp; Captured Artifacts:
            </div>
            {selectedDetails.output}
          </div>
        </div>
      )}
    </div>
  );
}
