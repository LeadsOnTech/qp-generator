import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';

const LEVELS = ['EASY', 'MEDIUM', 'HARD'];

function confidenceBadge(c) {
  if (c == null) return null;
  const pct = Math.round(c * 100);
  const cls = c >= 0.7 ? 'badge-success' : c >= 0.5 ? 'badge-warn' : 'badge-danger';
  return <span className={`badge ${cls}`}>{pct}% sure</span>;
}

export default function AiTagging() {
  const [queue, setQueue] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState({});

  const load = useCallback(() => {
    setLoading(true);
    api.reviewQueue(page)
      .then((res) => { setQueue(res.items); setTotal(res.total); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function runTagging() {
    setRunning(true);
    setMessage(null);
    setError(null);
    try {
      const res = await api.runTagging();
      setMessage(res.message);
      setPage(1);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  async function act(id, data) {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await api.reviewAction(id, data);
      setQueue((q) => q.filter((item) => item.id !== id));
      setTotal((t) => t - 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  async function acceptAll() {
    if (!window.confirm(`Accept all ${total} pending AI suggestions? You can still change any question's difficulty later in the Question Bank.`)) return;
    const res = await api.acceptAll();
    setMessage(`${res.accepted} suggestions accepted.`);
    setQueue([]);
    setTotal(0);
  }

  const totalPages = Math.max(Math.ceil(total / 25), 1);

  return (
    <div>
      <div className="page-header">
        <p className="eyebrow">Phase 2 — AI-Assisted Tagging</p>
        <h1 className="page-title">Difficulty Tagging</h1>
        <p className="page-sub">
          The engine suggests Easy / Medium / Hard for every untagged question — nothing is final
          until you accept it. Lowest-confidence suggestions are shown first, so your attention
          goes where it matters most. Accepted tags can always be changed later in the Question Bank.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={runTagging} disabled={running}>
          {running ? 'Tagging in progress…' : 'Run tagging on untagged questions'}
        </button>
        {total > 0 && (
          <button className="btn btn-ghost" onClick={acceptAll}>
            Accept all {total} suggestions
          </button>
        )}
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="skeleton" style={{ height: 320 }} />
      ) : queue.length === 0 ? (
        <div className="card empty-state">
          <h3>Review queue is empty</h3>
          <p>
            Either every question is already tagged, or you haven't run tagging yet.
            Upload questions without a Difficulty column, then press "Run tagging" above.
          </p>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Subject / Chapter</th>
                  <th>AI Suggestion</th>
                  <th>Why</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((q) => (
                  <tr key={q.id}>
                    <td className="q-text">{q.questionText}</td>
                    <td style={{ fontSize: 12.5 }}>{q.subject}<br /><span style={{ color: 'var(--ink-soft)' }}>{q.chapter}</span></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                        <span className="badge badge-gold">{q.aiSuggestedDifficulty}</span>
                        {confidenceBadge(q.aiConfidence)}
                        <span className="badge badge-neutral">{q.aiEngine === 'CLAUDE' ? 'Claude AI' : 'Rule engine'}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--ink-soft)', maxWidth: 220, lineHeight: 1.4 }}>
                      {q.aiRationale}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '6px 14px', fontSize: 13 }}
                          disabled={busy[q.id]}
                          onClick={() => act(q.id, { action: 'accept' })}
                        >
                          Accept {q.aiSuggestedDifficulty}
                        </button>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {LEVELS.filter((l) => l !== q.aiSuggestedDifficulty).map((l) => (
                            <button
                              key={l}
                              className="btn btn-ghost"
                              style={{ padding: '5px 10px', fontSize: 12 }}
                              disabled={busy[q.id]}
                              onClick={() => act(q.id, { action: 'override', difficulty: l })}
                            >
                              {l.charAt(0) + l.slice(1).toLowerCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              {total} pending review — page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
