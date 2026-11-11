import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
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
  Sliders
} from 'lucide-react';

const PRESETS = [
  "What are the latest architectures and breakthroughs in multi-agent LLM systems in 2025 and 2026?",
  "How are autonomous AI agents evaluated for safety and alignment in enterprise applications?",
  "Compare LangGraph vs CrewAI vs AutoGen for production multi-agent workflows in 2026"
];

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
    pollIntervalRef.current = setInterval(fetchStatus, 2500);

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
      // Trigger immediate refresh
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
  const values = statusData?.values || {};
  const isWaitingHITL = currentStatus === 'waiting_human_approval';

  const getStepClass = (stepIndex) => {
    const order = ['supervisor', 'research_worker', 'evaluator', 'human_approval', 'report_pipeline'];
    const currentIdx = order.indexOf(
      statusData?.next?.[0] || (currentStatus === 'completed' ? 'report_pipeline' : 'supervisor')
    );
    if (currentStatus === 'completed') return 'completed';
    if (currentIdx === stepIndex) return 'active';
    if (currentIdx > stepIndex) return 'completed';
    return '';
  };

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

      {/* ── WORKFLOW STEPPER ── */}
      {threadId && (
        <section className="stepper-container">
          <div className={`step-item ${getStepClass(0)}`}>
            <div className="step-dot">1</div>
            <span>Supervisor Planning</span>
          </div>
          <ArrowRight size={14} color="#475569" />
          <div className={`step-item ${getStepClass(1)}`}>
            <div className="step-dot">2</div>
            <span>Parallel MCP Tools</span>
          </div>
          <ArrowRight size={14} color="#475569" />
          <div className={`step-item ${getStepClass(2)}`}>
            <div className="step-dot">3</div>
            <span>Reflexion Evaluator</span>
          </div>
          <ArrowRight size={14} color="#475569" />
          <div className={`step-item ${getStepClass(3)}`}>
            <div className="step-dot">4</div>
            <span>Steerable HITL Gate</span>
          </div>
          <ArrowRight size={14} color="#475569" />
          <div className={`step-item ${getStepClass(4)}`}>
            <div className="step-dot">5</div>
            <span>Report Subgraph & Audit</span>
          </div>
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
