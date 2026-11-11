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
  X
} from 'lucide-react';

export default function GraphVisualizer({
  currentNode = 'supervisor',
  nodeStates = {},
  values = {},
  isWaitingHITL = false,
  isCompleted = false
}) {
  const [selectedNode, setSelectedNode] = useState(null);

  // Helper to determine node state
  const getNodeState = (nodeId) => {
    if (isCompleted) return 'completed';
    if (currentNode === nodeId) return 'active';
    if (nodeId === 'human_approval' && isWaitingHITL) return 'active';
    return nodeStates[nodeId] || 'pending';
  };

  // Node details for inspector drawer
  const getNodeDetails = (nodeId) => {
    switch (nodeId) {
      case 'supervisor':
        return {
          title: 'Supervisor Planning Node',
          phase: 'Phase 1 • Planning',
          desc: 'Decomposes query into 3 distinct scientific dimensions and assigns optimized MCP tools.',
          output: values.research_tasks ? (
            <div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Planned Dimensions:</div>
              {values.research_tasks.map((t) => (
                <div key={t.id} style={{ background: '#1e293b', padding: '8px 12px', borderRadius: '6px', marginBottom: '6px', fontSize: '12px' }}>
                  <span style={{ color: '#38bdf8', fontWeight: '600' }}>Task {t.id}: {t.focus}</span>
                  <div style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>Tool: {t.tool_name} | Query: "{t.search_query}"</div>
                </div>
              ))}
            </div>
          ) : 'Awaiting execution...'
        };
      case 'research_worker':
        return {
          title: 'Parallel MCP Research Workers',
          phase: 'Phase 2 • Grounded Research',
          desc: 'Spawns 3 simultaneous workers via LangGraph Send API. Calls Tavily & Academic Search MCP tools.',
          output: values.sources ? (
            <div>
              <div style={{ fontSize: '12px', color: '#34d399', marginBottom: '6px' }}>✓ {values.sources.length} Grounded Sources Verified</div>
              <div style={{ maxHeight: '140px', overflowY: 'auto' }}>
                {values.sources.map((s, idx) => (
                  <div key={idx} style={{ fontSize: '11.5px', color: '#cbd5e1', padding: '3px 0' }}>
                    [{idx + 1}] <a href={s.url} target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>{s.url}</a>
                  </div>
                ))}
              </div>
            </div>
          ) : 'Awaiting worker completion...'
        };
      case 'evaluator':
        return {
          title: 'Reflexion Completeness Evaluator',
          phase: 'Phase 3 • Self-Correction Audit',
          desc: 'Pydantic structured audit assessing factual depth and citations. Routes to gap-filler or human review.',
          output: values.evaluation_critique ? (
            <div>
              <div style={{ fontSize: '12px', color: values.is_sufficient ? '#34d399' : '#f59e0b', fontWeight: '700', marginBottom: '6px' }}>
                {values.is_sufficient ? '✓ Sufficient Evidence (Score ≥ 7)' : '⚠️ Gap Detected (Spawning Follow-Up)'}
              </div>
              <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.5' }}>{values.evaluation_critique}</p>
            </div>
          ) : 'Awaiting evaluation...'
        };
      case 'follow_up_worker':
        return {
          title: 'Targeted Gap-Filler Worker',
          phase: 'Phase 3b • Reflexion Loop',
          desc: 'Investigates missing evidence identified by Evaluator and loops back into evaluation audit.',
          output: values.follow_up_task ? (
            <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
              Refinement Query: "{values.follow_up_task.search_query}"
            </div>
          ) : 'No gaps detected — loop bypassed.'
        };
      case 'human_approval':
        return {
          title: 'Human Review & Steering Gate',
          phase: 'Phase 4 • Human-in-the-Loop',
          desc: 'LangGraph interrupt gate. Pauses execution for human review with dual paths: direct approval or steering.',
          output: (
            <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
              <div>Status: {isWaitingHITL ? '⏸️ Paused (Action Needed)' : values.human_approved ? '✅ Approved' : 'Pending'}</div>
              {values.steering_feedback && (
                <div style={{ marginTop: '4px', color: '#38bdf8' }}>Steering Guidance: "{values.steering_feedback}"</div>
              )}
            </div>
          )
        };
      case 'steering_worker':
        return {
          title: 'Human Steering Research Worker',
          phase: 'Phase 4b • Steerable Research',
          desc: 'Gathers targeted MCP evidence based strictly on custom guidance provided during HITL review.',
          output: values.steering_feedback ? (
            <div style={{ fontSize: '12px', color: '#38bdf8' }}>
              Addressed Guidance: "{values.steering_feedback}"
            </div>
          ) : 'No custom steering requested — direct path taken.'
        };
      case 'draft_writer':
        return {
          title: 'Report Draft Writer (Subgraph Node 1)',
          phase: 'Phase 5a • Subgraph Synthesis',
          desc: 'Synthesizes gathered findings into a multi-section structured report preserving bracketed citations.',
          output: values.draft_report ? (
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Draft written ({values.draft_report.length} chars). Sent to Fact-Checker Critic.</div>
          ) : 'Pending report pipeline...'
        };
      case 'fact_checker':
        return {
          title: 'Adversarial Fact-Checker Critic (Subgraph Node 2)',
          phase: 'Phase 5b • Adversarial Audit',
          desc: 'Audits every claim in draft against raw MCP evidence to detect hallucinations or ungrounded assertions.',
          output: values.fact_check_critique ? (
            <div style={{ maxHeight: '140px', overflowY: 'auto', fontSize: '12px', color: '#e2e8f0', background: '#1e1b4b', padding: '8px', borderRadius: '6px' }}>
              {values.fact_check_critique}
            </div>
          ) : 'Pending draft...'
        };
      case 'editor':
        return {
          title: 'Report Polisher & Editor (Subgraph Node 3)',
          phase: 'Phase 5c • Editorial Refinement',
          desc: 'Applies Fact-Checker critique corrections, ensures academic tone, and verifies in-text citations.',
          output: values.edited_report ? (
            <div style={{ fontSize: '12px', color: '#34d399' }}>✓ Critique corrections incorporated into polished version.</div>
          ) : 'Pending critique...'
        };
      case 'finaliser':
        return {
          title: 'Report Finaliser (Subgraph Node 4)',
          phase: 'Phase 5d • Publication',
          desc: 'Prepends executive summary block and compiles verified reference bibliography from MCP sources.',
          output: values.final_report ? (
            <div style={{ fontSize: '12px', color: '#34d399' }}>✓ Final grounded report ready for publication.</div>
          ) : 'Pending editorial review...'
        };
      default:
        return null;
    }
  };

  const selectedDetails = selectedNode ? getNodeDetails(selectedNode) : null;

  return (
    <div style={{ position: 'relative' }}>
      {/* ── SVG GRAPH DIAGRAM ── */}
      <div style={{ width: '100%', overflowX: 'auto', background: '#090d16', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', padding: '20px 10px' }}>
        <svg viewBox="0 0 1100 640" style={{ width: '100%', minWidth: '950px', height: 'auto', display: 'block' }}>
          <defs>
            {/* Arrow Marker Definitions */}
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

            {/* Glowing filter for active node */}
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
            y="430"
            width="1020"
            height="180"
            rx="16"
            fill="rgba(30, 27, 75, 0.25)"
            stroke="rgba(139, 92, 246, 0.35)"
            strokeWidth="1.5"
            strokeDasharray="6 6"
          />
          <text x="60" y="456" fill="#a78bfa" fontSize="12" fontWeight="700" letterSpacing="0.8">
            REPORT SUBGRAPH (Draft ➔ Adversarial Critic ➔ Editor ➔ Finaliser)
          </text>

          {/* ══════════════════════════════════════════════════════════════
             GRAPH EDGES (Directed Arrows & Reflexion Curves)
             ══════════════════════════════════════════════════════════════ */}

          {/* START -> Supervisor */}
          <line
            x1="100" y1="70" x2="170" y2="70"
            stroke={getNodeState('supervisor') === 'active' ? '#38bdf8' : getNodeState('supervisor') === 'completed' ? '#34d399' : '#475569'}
            strokeWidth={getNodeState('supervisor') === 'active' ? '2.5' : '1.8'}
            markerEnd={getNodeState('supervisor') === 'active' ? 'url(#arrow-active)' : getNodeState('supervisor') === 'completed' ? 'url(#arrow-completed)' : 'url(#arrow-default)'}
          />

          {/* Supervisor -> Research Workers */}
          <line
            x1="330" y1="70" x2="430" y2="70"
            stroke={getNodeState('research_worker') === 'active' ? '#38bdf8' : getNodeState('research_worker') === 'completed' ? '#34d399' : '#475569'}
            strokeWidth={getNodeState('research_worker') === 'active' ? '2.5' : '1.8'}
            strokeDasharray={getNodeState('research_worker') === 'active' ? '5 5' : 'none'}
            className={getNodeState('research_worker') === 'active' ? 'edge-flow-active' : ''}
            markerEnd={getNodeState('research_worker') === 'active' ? 'url(#arrow-active)' : getNodeState('research_worker') === 'completed' ? 'url(#arrow-completed)' : 'url(#arrow-default)'}
          />
          <text x="380" y="60" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="600">Send API (×3)</text>

          {/* Research Workers -> Evaluator */}
          <line
            x1="610" y1="70" x2="730" y2="70"
            stroke={getNodeState('evaluator') === 'active' ? '#38bdf8' : getNodeState('evaluator') === 'completed' ? '#34d399' : '#475569'}
            strokeWidth={getNodeState('evaluator') === 'active' ? '2.5' : '1.8'}
            markerEnd={getNodeState('evaluator') === 'active' ? 'url(#arrow-active)' : getNodeState('evaluator') === 'completed' ? 'url(#arrow-completed)' : 'url(#arrow-default)'}
          />
          <text x="670" y="60" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="600">Fan-In Merged</text>

          {/* Evaluator -> Follow-Up Worker (Reflexion down) */}
          <path
            d="M 810 115 L 810 175"
            fill="none"
            stroke={getNodeState('follow_up_worker') === 'active' ? '#f59e0b' : '#334155'}
            strokeWidth="1.8"
            markerEnd={getNodeState('follow_up_worker') === 'active' ? 'url(#arrow-reflexion)' : 'url(#arrow-default)'}
          />
          <text x="825" y="145" fill="#f59e0b" fontSize="10" fontWeight="600">If Gaps (&lt;7)</text>

          {/* Follow-Up Worker -> Evaluator (Reflexion Loop CURVE BACK) */}
          <path
            d="M 890 215 C 960 215, 960 70, 895 70"
            fill="none"
            stroke={getNodeState('follow_up_worker') === 'completed' ? '#34d399' : '#475569'}
            strokeWidth="1.8"
            strokeDasharray="4 4"
            markerEnd={getNodeState('follow_up_worker') === 'completed' ? 'url(#arrow-completed)' : 'url(#arrow-default)'}
          />
          <text x="965" y="140" fill="#f59e0b" fontSize="10" fontWeight="700">Reflexion Loop</text>

          {/* Evaluator -> Human Approval Gate (Down-Left) */}
          <path
            d="M 770 115 C 770 180, 560 180, 560 250"
            fill="none"
            stroke={getNodeState('human_approval') === 'active' ? '#38bdf8' : getNodeState('human_approval') === 'completed' ? '#34d399' : '#475569'}
            strokeWidth={getNodeState('human_approval') === 'active' ? '2.5' : '1.8'}
            markerEnd={getNodeState('human_approval') === 'active' ? 'url(#arrow-active)' : getNodeState('human_approval') === 'completed' ? 'url(#arrow-completed)' : 'url(#arrow-default)'}
          />
          <text x="640" y="180" fill="#34d399" fontSize="10" fontWeight="600">Sufficient (Score ≥ 7)</text>

          {/* Human Approval -> Steering Worker (Right branch) */}
          <line
            x1="650" y1="290" x2="740" y2="290"
            stroke={getNodeState('steering_worker') === 'active' ? '#38bdf8' : getNodeState('steering_worker') === 'completed' ? '#34d399' : '#475569'}
            strokeWidth="1.8"
            strokeDasharray="4 4"
            markerEnd={getNodeState('steering_worker') === 'active' ? 'url(#arrow-active)' : getNodeState('steering_worker') === 'completed' ? 'url(#arrow-completed)' : 'url(#arrow-default)'}
          />
          <text x="695" y="280" fill="#38bdf8" fontSize="10" textAnchor="middle" fontWeight="600">Custom Guidance</text>

          {/* Steering Worker -> Draft Writer (Down-Left into Subgraph) */}
          <path
            d="M 830 335 C 830 390, 200 380, 200 480"
            fill="none"
            stroke={getNodeState('steering_worker') === 'completed' ? '#34d399' : '#334155'}
            strokeWidth="1.8"
            markerEnd={getNodeState('steering_worker') === 'completed' ? 'url(#arrow-completed)' : 'url(#arrow-default)'}
          />

          {/* Human Approval -> Draft Writer (Direct Approve path) */}
          <path
            d="M 520 335 C 520 400, 160 410, 160 480"
            fill="none"
            stroke={getNodeState('draft_writer') === 'active' ? '#38bdf8' : (getNodeState('draft_writer') === 'completed' || isCompleted) ? '#34d399' : '#475569'}
            strokeWidth={getNodeState('draft_writer') === 'active' ? '2.5' : '1.8'}
            markerEnd={getNodeState('draft_writer') === 'active' ? 'url(#arrow-active)' : (getNodeState('draft_writer') === 'completed' || isCompleted) ? 'url(#arrow-completed)' : 'url(#arrow-default)'}
          />
          <text x="320" y="380" fill="#10b981" fontSize="10" fontWeight="700">Approved ('yes')</text>

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
          <g transform="translate(40, 48)">
            <rect x="0" y="0" width="60" height="44" rx="22" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
            <text x="30" y="27" fill="#94a3b8" fontSize="12" fontWeight="700" textAnchor="middle">START</text>
          </g>

          {/* 2. SUPERVISOR NODE */}
          <g transform="translate(170, 30)" onClick={() => setSelectedNode('supervisor')} style={{ cursor: 'pointer' }}>
            <rect
              x="0" y="0" width="160" height="80" rx="12"
              fill={getNodeState('supervisor') === 'active' ? '#172554' : getNodeState('supervisor') === 'completed' ? '#062e24' : '#111827'}
              stroke={getNodeState('supervisor') === 'active' ? '#38bdf8' : getNodeState('supervisor') === 'completed' ? '#10b981' : '#334155'}
              strokeWidth={getNodeState('supervisor') === 'active' ? '2.5' : '1.5'}
              filter={getNodeState('supervisor') === 'active' ? 'url(#neon-glow)' : 'none'}
            />
            <text x="16" y="28" fill="#a78bfa" fontSize="10" fontWeight="700">PHASE 1</text>
            <text x="16" y="48" fill="#f8fafc" fontSize="13" fontWeight="700">🎯 Supervisor</text>
            <text x="16" y="66" fill="#94a3b8" fontSize="10">Pydantic Plan &amp; MCP Routing</text>
            {getNodeState('supervisor') === 'active' && <circle cx="144" cy="24" r="5" fill="#38bdf8" />}
            {getNodeState('supervisor') === 'completed' && <text x="140" y="26" fill="#34d399" fontSize="11" fontWeight="700">✓</text>}
          </g>

          {/* 3. PARALLEL MCP WORKERS */}
          <g transform="translate(430, 30)" onClick={() => setSelectedNode('research_worker')} style={{ cursor: 'pointer' }}>
            <rect
              x="0" y="0" width="180" height="80" rx="12"
              fill={getNodeState('research_worker') === 'active' ? '#172554' : getNodeState('research_worker') === 'completed' ? '#062e24' : '#111827'}
              stroke={getNodeState('research_worker') === 'active' ? '#38bdf8' : getNodeState('research_worker') === 'completed' ? '#10b981' : '#334155'}
              strokeWidth={getNodeState('research_worker') === 'active' ? '2.5' : '1.5'}
              filter={getNodeState('research_worker') === 'active' ? 'url(#neon-glow)' : 'none'}
            />
            <text x="16" y="28" fill="#38bdf8" fontSize="10" fontWeight="700">PHASE 2 • PARALLEL</text>
            <text x="16" y="48" fill="#f8fafc" fontSize="13" fontWeight="700">🔬 MCP Workers (×3)</text>
            <text x="16" y="66" fill="#94a3b8" fontSize="10">Tavily &amp; Academic Search</text>
            {getNodeState('research_worker') === 'active' && <circle cx="164" cy="24" r="5" fill="#38bdf8" />}
            {getNodeState('research_worker') === 'completed' && <text x="160" y="26" fill="#34d399" fontSize="11" fontWeight="700">✓</text>}
          </g>

          {/* 4. REFLEXION EVALUATOR */}
          <g transform="translate(730, 30)" onClick={() => setSelectedNode('evaluator')} style={{ cursor: 'pointer' }}>
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
          <g transform="translate(730, 175)" onClick={() => setSelectedNode('follow_up_worker')} style={{ cursor: 'pointer' }}>
            <rect
              x="0" y="0" width="160" height="70" rx="10"
              fill={getNodeState('follow_up_worker') === 'active' ? '#451a03' : getNodeState('follow_up_worker') === 'completed' ? '#062e24' : '#111827'}
              stroke={getNodeState('follow_up_worker') === 'active' ? '#f59e0b' : getNodeState('follow_up_worker') === 'completed' ? '#10b981' : '#334155'}
              strokeWidth="1.5"
            />
            <text x="14" y="26" fill="#f59e0b" fontSize="10" fontWeight="700">REFLEXION LOOP</text>
            <text x="14" y="44" fill="#f8fafc" fontSize="12" fontWeight="700">🔄 Follow-Up Worker</text>
            <text x="14" y="60" fill="#94a3b8" fontSize="10">Targeted Gap Investigation</text>
          </g>

          {/* 6. HUMAN-IN-THE-LOOP APPROVAL / STEERING GATE */}
          <g transform="translate(450, 250)" onClick={() => setSelectedNode('human_approval')} style={{ cursor: 'pointer' }}>
            <rect
              x="0" y="0" width="200" height="85" rx="14"
              fill={getNodeState('human_approval') === 'active' ? '#422006' : getNodeState('human_approval') === 'completed' ? '#062e24' : '#111827'}
              stroke={getNodeState('human_approval') === 'active' ? '#f59e0b' : getNodeState('human_approval') === 'completed' ? '#10b981' : '#334155'}
              strokeWidth={getNodeState('human_approval') === 'active' ? '2.5' : '1.5'}
              filter={getNodeState('human_approval') === 'active' ? 'url(#neon-glow)' : 'none'}
            />
            <text x="16" y="28" fill="#fbbf24" fontSize="10" fontWeight="700">PHASE 4 • HITL GATE</text>
            <text x="16" y="48" fill="#f8fafc" fontSize="13" fontWeight="700">⏸️ Human Steering Gate</text>
            <text x="16" y="66" fill="#94a3b8" fontSize="10">Approve or Steer Guidance</text>
            {getNodeState('human_approval') === 'active' && <circle cx="180" cy="24" r="5" fill="#f59e0b" />}
            {getNodeState('human_approval') === 'completed' && <text x="176" y="26" fill="#34d399" fontSize="11" fontWeight="700">✓</text>}
          </g>

          {/* 7. STEERING WORKER */}
          <g transform="translate(740, 255)" onClick={() => setSelectedNode('steering_worker')} style={{ cursor: 'pointer' }}>
            <rect
              x="0" y="0" width="160" height="75" rx="10"
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
          <g transform="translate(80, 480)" onClick={() => setSelectedNode('draft_writer')} style={{ cursor: 'pointer' }}>
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
          <g transform="translate(330, 480)" onClick={() => setSelectedNode('fact_checker')} style={{ cursor: 'pointer' }}>
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
          <g transform="translate(590, 480)" onClick={() => setSelectedNode('editor')} style={{ cursor: 'pointer' }}>
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
          <g transform="translate(830, 480)" onClick={() => setSelectedNode('finaliser')} style={{ cursor: 'pointer' }}>
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
          <g transform="translate(1030, 498)">
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

