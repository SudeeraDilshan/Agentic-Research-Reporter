import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import GraphVisualizer from './GraphVisualizer.jsx';
import {
  Sparkles,
  Search,
  CheckCircle,
  AlertTriangle,
  Play,
  ArrowRight,
  Database,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Clock,
  Compass,
  FileText,
  Layers,
  Sliders,
  Activity,
  Terminal,
  Cpu
} from 'lucide-react';

const PRESETS = [
  "What are the latest architectures and breakthroughs in multi-agent LLM systems in 2025 and 2026?",
  "How are autonomous AI agents evaluated for safety and alignment in enterprise applications?",
  "Compare LangGraph vs CrewAI vs AutoGen for production multi-agent workflows in 2026"
];

// Helper to map icon string to Lucide component
const getIconComponent = (iconName, size = 16, color) => {
  switch (iconName) {
    case 'Layers': return <Layers size={size} color={color} />;
    case 'Search': return <Search size={size} color={color} />;
    case 'ShieldCheck': return <ShieldCheck size={size} color={color} />;
    case 'RefreshCw': return <RefreshCw size={size} color={color} />;
    case 'Sliders': return <Sliders size={size} color={color} />;
    case 'Compass': return <Compass size={size} color={color} />;
    case 'FileText': return <FileText size={size} color={color} />;
    case 'AlertTriangle': return <AlertTriangle size={size} color={color} />;
    case 'CheckCircle': return <CheckCircle size={size} color={color} />;
    case 'Sparkles': return <Sparkles size={size} color={color} />;
    default: return <Cpu size={size} color={color} />;
  }
};

export default function App() {
  const [query, setQuery] = useState('');
  const [threadId, setThreadId] = useState('');
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [steeringText, setSteeringText] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [activeTab, setActiveTab] = useState('final');
  const [pastSessions, setPastSessions] = useState([]);
  const [serverHealth, setServerHealth] = useState(null);
  const [showTimeline, setShowTimeline] = useState(false);

  const pollIntervalRef = useRef(null);

  // 1. Initial health and past session load
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setServerHealth(data))
      .catch(err => console.error("Health check error:", err));

    loadPastSessions();
  }, []);

  const loadPastSessions = () => {
    fetch('/api/research/threads')
      .then(res => res.json())
      .then(data => {
        if (data.threads) setPastSessions(data.threads);
      })
      .catch(err => console.error("Failed to fetch sessions:", err));
  };

  // 2. Polling status for active thread
  useEffect(() => {
    if (!threadId) return;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/research/status/${threadId}`);
        const data = await res.json();
        setStatusData(data);

        // If completed or stopped, stop polling
        if (data.status === 'completed' || data.status === 'cancelled') {
          setLoading(false);
          loadPastSessions();
        }
      } catch (err) {
        console.error("Status polling error:", err);
      }
    };

    fetchStatus();
    pollIntervalRef.current = setInterval(fetchStatus, 2000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [threadId]);

  // 3. Start New Research
  const handleStartResearch = async (targetQuery = query) => {
    if (!targetQuery.trim()) return;
    setLoading(true);
    setStatusData(null);

    try {
      const res = await fetch('/api/research/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: targetQuery.trim() }),
      });
      const data = await res.json();
      setThreadId(data.thread_id);
    } catch (err) {
      console.error("Start research error:", err);
      setLoading(false);
    }
  };

  // 4. Submit Approval or Steering Guidance
  const handleResume = async (decision) => {
    if (!threadId || submittingAction) return;
    setSubmittingAction(true);

    try {
      await fetch(`/api/research/resume/${threadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      setSteeringText('');
      const res = await fetch(`/api/research/status/${threadId}`);
      const data = await res.json();
      setStatusData(data);
    } catch (err) {
      console.error("Resume error:", err);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Helpers
  const currentStatus = statusData?.status || 'idle';
  const currentNode = statusData?.current_node || 'supervisor';
  const nodeMeta = statusData?.current_node_meta || {};
  const nodeStates = statusData?.node_states || {};
  const graphNodes = statusData?.graph_nodes || [];
  const values = statusData?.values || {};
  const timeline = statusData?.timeline || [];
  const isWaitingHITL = currentStatus === 'waiting_human_approval' || currentNode === 'human_approval';
  const isCompleted = currentStatus === 'completed' || values.final_report;

  return (
    <div className="app-container">
      {/* ── HEADER ── */}
      <header className="app-header">
        <div>
          <h1 className="brand-title">
            <Sparkles size={26} color="#8b5cf6" />
            Agentic Research Reporter
            <span className="brand-badge">Phase 3 • Full-Stack</span>
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>
            Autonomous Multi-Agent System with MCP Tools, Reflexion & SQLite Checkpoints
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {serverHealth && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#34d399' }}>
              <Database size={14} />
              <span>SQLite Persistent ({serverHealth.database})</span>
            </div>
          )}

          {pastSessions.length > 0 && (
            <select
              style={{
                background: '#1f2937',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#e2e8f0',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              value={threadId}
              onChange={(e) => setThreadId(e.target.value)}
            >
              <option value="">Switch Saved Session ({pastSessions.length})</option>
              {pastSessions.map((s) => (
                <option key={s.thread_id} value={s.thread_id}>
                  {s.completed ? '✅' : '⏳'} {s.query.substring(0, 45)}… ({s.source_count} sources)
                </option>
              ))}
            </select>
          )}
        </div>
      </header>

      {/* ── QUERY CONTROL PANEL ── */}
      <section className="control-panel">
        <div className="query-input-group">
          <input
            type="text"
            className="query-input"
            placeholder="Enter research topic, question, or technology to investigate…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStartResearch()}
            disabled={loading}
          />
          <button
            className="btn-primary"
            onClick={() => handleStartResearch()}
            disabled={loading || !query.trim()}
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
            <span>{loading ? 'Investigating…' : 'Run Multi-Agent Research'}</span>
          </button>
        </div>

        <div className="preset-pills">
          <span style={{ fontSize: '12px', color: '#64748b', alignSelf: 'center' }}>Presets:</span>
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              className="preset-pill"
              onClick={() => {
                setQuery(p);
                handleStartResearch(p);
              }}
            >
              {p.substring(0, 50)}…
            </button>
          ))}
        </div>
      </section>

      {/* ── 🌟 PROMINENT CURRENTLY ACTIVE NODE HERO BAR ── */}
      {threadId && (
        <section className={`active-node-hero ${isWaitingHITL ? 'waiting-hitl' : isCompleted ? 'completed' : ''}`}>
          <div className="active-node-badge">
            <div className="pulse-indicator">
              <span className="pulse-dot" style={{
                background: isWaitingHITL ? '#f59e0b' : isCompleted ? '#10b981' : '#38bdf8'
              }} />
              {!isCompleted && (
                <span className="pulse-ring" style={{
                  borderColor: isWaitingHITL ? '#f59e0b' : '#38bdf8'
                }} />
              )}
            </div>

            <div>
              <div className="active-node-title">
                {isCompleted ? (
                  <>
                    <CheckCircle size={20} color="#10b981" />
                    <span>Workflow Completed — Grounded Report Ready</span>
                  </>
                ) : isWaitingHITL ? (
                  <>
                    <Sliders size={20} color="#f59e0b" />
                    <span>Currently Active Node: Human-in-the-Loop Review Gate</span>
                  </>
                ) : (
                  <>
                    <Activity size={20} color="#38bdf8" />
                    <span>Currently Active Node: {nodeMeta.title || currentNode}</span>
                  </>
                )}
              </div>

              <div className="active-node-desc">
                {isCompleted
                  ? "All 5 workflow phases completed. Executive report with grounded citations finalized below."
                  : isWaitingHITL
                  ? "Graph paused at approval gate. You can approve directly or type custom steering instructions to refine."
                  : nodeMeta.description || "Agent is executing this cognitive step in the graph..."}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#e2e8f0',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onClick={() => setShowTimeline(!showTimeline)}
            >
              <Terminal size={14} />
              <span>{showTimeline ? 'Hide Node Log' : `View Node Log (${timeline.length})`}</span>
            </button>

            <span style={{
              background: isWaitingHITL ? 'rgba(245, 158, 11, 0.2)' : isCompleted ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
              color: isWaitingHITL ? '#fbbf24' : isCompleted ? '#34d399' : '#38bdf8',
              border: `1px solid ${isWaitingHITL ? 'rgba(245, 158, 11, 0.4)' : isCompleted ? 'rgba(16, 185, 129, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`,
              padding: '5px 12px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {isCompleted ? 'Finished' : isWaitingHITL ? 'Action Needed' : 'Running'}
            </span>
          </div>
        </section>
      )}

      {/* ── 🗺️ TOTAL GRAPH TOPOLOGY & REAL-TIME ACTIVE NODE HIGHLIGHT ── */}
      {threadId && (
        <section className="graph-visualizer-section">
          <div className="graph-section-header">
            <div>
              <h3 className="graph-section-title">
                <Cpu size={18} color="#38bdf8" />
                LangGraph Multi-Agent Architecture &amp; Real-Time Execution Flow
              </h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                Complete Topology • Cyan = Active Executing Node • Green = Completed • Orange = Reflexion Loop • Click any node to inspect artifacts
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', padding: '4px 10px', borderRadius: '6px', fontWeight: '600' }}>
                Active: {currentNode}
              </span>
            </div>
          </div>

          <GraphVisualizer
            currentNode={currentNode}
            nodeStates={nodeStates}
            values={values}
            isWaitingHITL={isWaitingHITL}
            isCompleted={isCompleted}
          />

          {/* Toggleable Live Timeline */}
          {showTimeline && timeline.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>
                Real-Time Node Execution Timeline:
              </div>
              <div className="timeline-feed">
                {timeline.map((entry, idx) => (
                  <div key={idx} className="timeline-entry">
                    <span className="timeline-time">[{entry.timestamp}]</span>
                    <span className="timeline-node">
                      {entry.status === 'active' ? '▶ Started' : '✓ Completed'} {entry.node}
                    </span>
                    <span style={{ color: '#94a3b8' }}>
                      {entry.details?.focus ? `(${entry.details.focus})` : ''}
                      {entry.details?.tool ? `via MCP:${entry.details.tool}` : ''}
                      {entry.details?.sources_count ? `(${entry.details.sources_count} sources verified)` : ''}
                      {entry.details?.score ? `(Score: ${entry.details.score}/10)` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── STEERABLE HITL APPROVAL BANNER ── */}
      {isWaitingHITL && (
        <section className="hitl-banner">
          <div className="hitl-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="hitl-badge">Action Required</span>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#f8fafc' }}>
                Human-in-the-Loop Review & Steerable Refinement
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
              {values.sources?.length || 0} Grounded Sources Verified
            </span>
          </div>

          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '10px' }}>
            Review the synthesized findings below. You can either directly approve report generation or provide
            steering guidance to investigate specific angles before finalizing.
          </p>

          <div className="hitl-preview">
            {values.research_findings?.join('\n\n') || "No findings recorded yet."}
          </div>

          <div className="hitl-actions">
            <button
              className="btn-approve"
              onClick={() => handleResume('yes')}
              disabled={submittingAction}
            >
              <CheckCircle size={16} />
              <span>Approve & Write Report</span>
            </button>

            <div className="steering-input-wrapper">
              <input
                type="text"
                className="steering-input"
                placeholder="Or steer research (e.g. 'Focus on enterprise ROI and cybersecurity implications')…"
                value={steeringText}
                onChange={(e) => setSteeringText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && steeringText.trim() && handleResume(steeringText.trim())}
                disabled={submittingAction}
              />
              <button
                className="btn-steer"
                onClick={() => handleResume(steeringText.trim())}
                disabled={submittingAction || !steeringText.trim()}
              >
                <Compass size={16} />
                <span>Steer & Refine</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── AGENT DASHBOARD GRID ── */}
      {threadId && (
        <div className="dashboard-grid">
          {/* Card 1: Supervisor Plan */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Layers size={18} color="#8b5cf6" />
                Supervisor Decomposition
              </h3>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                {values.research_tasks?.length || 0} Dimensions
              </span>
            </div>

            {values.research_tasks && values.research_tasks.length > 0 ? (
              values.research_tasks.map((task) => (
                <div key={task.id} className="task-item">
                  <div className="task-focus">{task.focus}</div>
                  <div className="task-meta">
                    <span className="task-tool-tag">MCP: {task.tool_name}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Query: "{task.search_query}"
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: '#64748b', fontSize: '13px' }}>Awaiting supervisor planning…</p>
            )}
          </div>

          {/* Card 2: Reflexion Evaluator */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <ShieldCheck size={18} color="#06b6d4" />
                Reflexion & Completeness Audit
              </h3>
              {values.iteration_count !== undefined && (
                <span style={{ fontSize: '11px', color: '#38bdf8' }}>
                  Cycle {values.iteration_count}
                </span>
              )}
            </div>

            {values.evaluation_critique ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{
                    background: values.is_sufficient ? 'rgba(52, 211, 153, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                    color: values.is_sufficient ? '#34d399' : '#f43f5e',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    {values.is_sufficient ? 'COMPLETENESS VERIFIED' : 'GAPS IDENTIFIED'}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
                  {values.evaluation_critique}
                </p>
              </div>
            ) : (
              <p style={{ color: '#64748b', fontSize: '13px' }}>Awaiting evaluation audit…</p>
            )}
          </div>
        </div>
      )}

      {/* ── REPORT & AUDIT VIEWER ── */}
      {values.final_report && (
        <section className="report-viewer">
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '24px' }}>
            <button
              style={{
                background: activeTab === 'final' ? 'var(--accent-purple)' : 'transparent',
                color: activeTab === 'final' ? '#fff' : '#94a3b8',
                border: 'none',
                fontWeight: '600',
                fontSize: '13px',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
              onClick={() => setActiveTab('final')}
            >
              Final Grounded Report
            </button>

            <button
              style={{
                background: activeTab === 'critique' ? 'var(--accent-purple)' : 'transparent',
                color: activeTab === 'critique' ? '#fff' : '#94a3b8',
                border: 'none',
                fontWeight: '600',
                fontSize: '13px',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
              onClick={() => setActiveTab('critique')}
            >
              Fact-Checker Critic Audit
            </button>

            <button
              style={{
                background: activeTab === 'sources' ? 'var(--accent-purple)' : 'transparent',
                color: activeTab === 'sources' ? '#fff' : '#94a3b8',
                border: 'none',
                fontWeight: '600',
                fontSize: '13px',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
              onClick={() => setActiveTab('sources')}
            >
              MCP Citations ({values.sources?.length || 0})
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'final' && (
            <div className="markdown-body">
              <ReactMarkdown>{values.final_report}</ReactMarkdown>
            </div>
          )}

          {activeTab === 'critique' && (
            <div style={{ background: '#1e1b4b', padding: '20px', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              <h4 style={{ fontSize: '15px', color: '#c4b5fd', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} /> Adversarial Fact-Checker Report Audit
              </h4>
              <p style={{ color: '#e2e8f0', fontSize: '13.5px', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                {values.fact_check_critique || "Audit completed without anomalies."}
              </p>
            </div>
          )}

          {activeTab === 'sources' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {values.sources && values.sources.map((s, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#1f2937',
                    padding: '10px 14px',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#a78bfa', fontWeight: '700' }}>[{idx + 1}]</span>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#38bdf8', fontSize: '13px', textDecoration: 'none' }}
                    >
                      {s.url}
                    </a>
                  </div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {s.focus || `Task ${s.task_id}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
