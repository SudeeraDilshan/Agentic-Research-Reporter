import React, { useState, useMemo } from 'react';
import {
  FolderArchive,
  FolderOpen,
  Search,
  CheckCircle,
  Clock,
  Activity,
  Trash2,
  X,
  RefreshCw,
  Download,
  AlertTriangle,
  Play,
  Database
} from 'lucide-react';

export default function SessionManagerModal({
  isOpen,
  onClose,
  sessions = [],
  currentSessionId = '',
  onSelectSession,
  onDeleteSession,
  onClearAll,
  onRefresh
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'completed', 'waiting_human_approval', 'in_progress'
  const [deletingId, setDeletingId] = useState(null);
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Filtered session list
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const q = (s.query || '').toLowerCase();
      const tid = (s.thread_id || '').toLowerCase();
      const term = searchQuery.toLowerCase().trim();
      const matchesSearch = !term || q.includes(term) || tid.includes(term);

      if (!matchesSearch) return false;

      if (statusFilter === 'completed') return s.completed || s.status === 'completed';
      if (statusFilter === 'waiting') return s.status === 'waiting_human_approval';
      if (statusFilter === 'in_progress') return s.status === 'in_progress';
      return true;
    });
  }, [sessions, searchQuery, statusFilter]);

  // Counts for tabs
  const completedCount = sessions.filter(s => s.completed || s.status === 'completed').length;
  const waitingCount = sessions.filter(s => s.status === 'waiting_human_approval').length;
  const inProgressCount = sessions.filter(s => s.status === 'in_progress').length;

  if (!isOpen) return null;

  const handleDelete = async (tid, e) => {
    e.stopPropagation();
    if (window.confirm(`Delete session "${tid}" from SQLite checkpoints? This cannot be undone.`)) {
      setDeletingId(tid);
      try {
        await onDeleteSession(tid);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleClearAllConfirm = async () => {
    if (window.confirm("Are you sure you want to delete ALL saved research sessions from the SQLite database? This cannot be undone.")) {
      setIsClearingAll(true);
      try {
        await onClearAll();
      } finally {
        setIsClearingAll(false);
      }
    }
  };

  const handleDownload = (tid, e) => {
    e.stopPropagation();
    window.open(`/api/research/download/${tid}`, '_blank');
  };

  return (
    <div className="session-modal-backdrop" onClick={onClose}>
      <div className="session-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* ── MODAL HEADER ── */}
        <div className="session-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="session-modal-icon-badge">
              <FolderArchive size={22} color="#38bdf8" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Saved Research Sessions
                <span className="session-count-tag">{sessions.length} Saved</span>
              </h2>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                Persistent SQLite Checkpointer (`checkpoints.sqlite`) • Resume, inspect, or manage history
              </p>
            </div>
          </div>
          <button className="btn-modal-close" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* ── SEARCH & FILTER CONTROLS ── */}
        <div className="session-modal-toolbar">
          <div className="session-search-box">
            <Search size={15} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search by topic, question, or thread ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="session-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0 4px' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="session-filter-pills">
            <button
              className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All ({sessions.length})
            </button>
            <button
              className={`filter-pill ${statusFilter === 'completed' ? 'active' : ''}`}
              onClick={() => setStatusFilter('completed')}
            >
              <CheckCircle size={12} color={statusFilter === 'completed' ? '#fff' : '#10b981'} />
              Completed ({completedCount})
            </button>
            <button
              className={`filter-pill ${statusFilter === 'waiting' ? 'active' : ''}`}
              onClick={() => setStatusFilter('waiting')}
            >
              <Clock size={12} color={statusFilter === 'waiting' ? '#fff' : '#f59e0b'} />
              Needs Approval ({waitingCount})
            </button>
            <button
              className={`filter-pill ${statusFilter === 'in_progress' ? 'active' : ''}`}
              onClick={() => setStatusFilter('in_progress')}
            >
              <Activity size={12} color={statusFilter === 'in_progress' ? '#fff' : '#06b6d4'} />
              In Progress ({inProgressCount})
            </button>
          </div>
        </div>

        {/* ── SESSION CARDS LIST ── */}
        <div className="session-modal-list">
          {filteredSessions.length === 0 ? (
            <div className="session-empty-state">
              <Database size={40} color="#475569" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#cbd5e1' }}>
                {sessions.length === 0 ? 'No Saved Sessions Yet' : 'No Matching Sessions'}
              </div>
              <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px', maxWidth: '380px' }}>
                {sessions.length === 0
                  ? 'Start a research query above. Every run will be automatically checkpointed in SQLite.'
                  : `No saved sessions match "${searchQuery}". Try a different keyword.`}
              </div>
            </div>
          ) : (
            filteredSessions.map((s) => {
              const isActive = s.thread_id === currentSessionId;
              const isCompleted = s.completed || s.status === 'completed';
              const isWaiting = s.status === 'waiting_human_approval';
              const isRunning = s.status === 'in_progress';

              return (
                <div
                  key={s.thread_id}
                  className={`session-card ${isActive ? 'is-active-session' : ''}`}
                  onClick={() => onSelectSession(s.thread_id)}
                >
                  <div className="session-card-main">
                    <div className="session-card-top-row">
                      {/* Status badge */}
                      {isCompleted && (
                        <span className="session-badge badge-completed">
                          <CheckCircle size={12} /> Completed Report
                        </span>
                      )}
                      {isWaiting && (
                        <span className="session-badge badge-waiting">
                          <Clock size={12} /> Paused for HITL
                        </span>
                      )}
                      {isRunning && (
                        <span className="session-badge badge-running">
                          <Activity size={12} /> In Progress
                        </span>
                      )}
                      {!isCompleted && !isWaiting && !isRunning && (
                        <span className="session-badge badge-paused">
                          <Database size={12} /> Checkpointed
                        </span>
                      )}

                      {isActive && (
                        <span className="session-badge badge-current">
                          ● Currently Open
                        </span>
                      )}

                      <span className="session-card-id">{s.thread_id}</span>
                    </div>

                    <div className="session-card-query">
                      {s.query || 'Untitled Investigation'}
                    </div>

                    <div className="session-card-meta">
                      <span>📚 {s.source_count || 0} Sources cited</span>
                      <span>•</span>
                      <span>📋 {s.task_count || 3} Tasks planned</span>
                      {s.eval_score !== undefined && s.eval_score !== null && (
                        <>
                          <span>•</span>
                          <span>⭐ Score: {s.eval_score}/10</span>
                        </>
                      )}
                      {s.created_at && (
                        <>
                          <span>•</span>
                          <span>🕒 {s.created_at}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="session-card-actions">
                    <button
                      className={`btn-session-action ${isActive ? 'btn-active-open' : 'btn-open'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSession(s.thread_id);
                      }}
                      title="Load session into visualizer"
                    >
                      {isActive ? (
                        <>
                          <FolderOpen size={14} /> Open Now
                        </>
                      ) : (
                        <>
                          <Play size={13} /> Load
                        </>
                      )}
                    </button>

                    {isCompleted && (
                      <button
                        className="btn-session-action btn-download"
                        onClick={(e) => handleDownload(s.thread_id, e)}
                        title="Download Markdown Report"
                      >
                        <Download size={13} /> .MD
                      </button>
                    )}

                    <button
                      className="btn-session-action btn-delete"
                      disabled={deletingId === s.thread_id}
                      onClick={(e) => handleDelete(s.thread_id, e)}
                      title="Delete session from SQLite"
                    >
                      {deletingId === s.thread_id ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── MODAL FOOTER ── */}
        <div className="session-modal-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="btn-danger-outline"
              disabled={sessions.length === 0 || isClearingAll}
              onClick={handleClearAllConfirm}
              title="Delete all sessions in SQLite"
            >
              {isClearingAll ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              Clear All Sessions
            </button>

            <button
              className="btn-secondary-sm"
              onClick={onRefresh}
              title="Re-sync with SQLite database"
            >
              <RefreshCw size={14} /> Sync DB
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Showing {filteredSessions.length} of {sessions.length} sessions
            </span>
            <button className="btn-modal-done" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

