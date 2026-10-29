import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';

const SUBJECTS = ['Physics', 'Chemistry', 'Biology', 'Reasoning', 'English'];

export default function QualityChecks() {
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ questionText: '', optionA: '', optionB: '', optionC: '', optionD: '', correctOption: '' });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.checksStats(), api.checksReview(page, subjectFilter)])
      .then(([s, q]) => { setStats(s); setQueue(q.items); setTotal(q.total); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, subjectFilter]);

  useEffect(() => { load(); }, [load]);

  async function run() {
    setRunning(true);
    setMessage(null);
    setError(null);
    try {
      const res = await api.runChecks();
      setMessage(res.message);
      setPage(1);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  async function act(id, payload) {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await api.checksReviewAction(id, payload);
      setQueue((q) => q.filter((item) => item.id !== id));
      setTotal((t) => t - 1);
      setStats((s) => s ? { ...s, flagged: s.flagged - 1 } : s);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  function startEdit(q) {
    setEditingId(q.id);
    setEditForm({
      questionText: q.questionText,
      optionA: q.options.A,
      optionB: q.options.B,
      optionC: q.options.C,
      optionD: q.options.D,
      correctOption: q.correctOption,
    });
  }

  function handleFieldChange(field, value) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

  async function saveEdit(id) {
    setBusy((b) => ({ ...b, [id]: true }));
    setError(null);
    try {
      await api.checksReviewAction(id, {
        action: 'edit',
        data: editForm,
      });
      setQueue((q) => q.filter((item) => item.id !== id));
      setTotal((t) => t - 1);
      setStats((s) => s ? { ...s, flagged: s.flagged - 1, unchecked: s.unchecked + 1 } : s);
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  function cancelEdit() {
    setEditingId(null);
  }

  const totalPages = Math.max(Math.ceil(total / 25), 1);

  return (
    <div>
      <div className="page-header">
        <p className="eyebrow">Phase 4 — Subject Specialists</p>
        <h1 className="page-title">Quality Checks</h1>
        <p className="page-sub">
          Five specialist checkers — Physics, Chemistry, Biology, Reasoning, English — each verify
          questions in their own subject. A flagged question is never deleted and never put on a
          paper until you Approve it or Remove it. Papers automatically skip flagged questions.
        </p>
      </div>

      {stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.unchecked}</div>
            <div className="stat-label">Awaiting check</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.passed}</div>
            <div className="stat-label">Passed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.flagged}</div>
            <div className="stat-label">Flagged — needs review</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={run} disabled={running}>
          {running ? 'Checking in progress…' : 'Run specialist checks'}
        </button>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="filter-bar">
        <div className="field">
          <label>Filter by subject</label>
          <select value={subjectFilter} onChange={(e) => { setSubjectFilter(e.target.value); setPage(1); }}>
            <option value="">All subjects</option>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 320 }} />
      ) : queue.length === 0 ? (
        <div className="card empty-state">
          <h3>No questions pending review</h3>
          <p>
            {stats && stats.unchecked > 0
              ? `You have ${stats.unchecked} question(s) awaiting quality check. Click "Run specialist checks" above to analyze them.`
              : 'All checked questions have passed quality validation! If any question has errors or data issues, it will be flagged and appear here for your review.'}
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
                  <th>Options</th>
                  <th>Issues found</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((q) => (
                  <tr key={q.id}>
                    {editingId === q.id ? (
                      <>
                        <td>
                          <textarea
                            style={{
                              width: '100%',
                              minHeight: 120,
                              padding: '8px 12px',
                              border: '1px solid var(--line)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '13px',
                              fontFamily: 'inherit',
                              lineHeight: '1.4',
                              resize: 'vertical'
                            }}
                            value={editForm.questionText}
                            onChange={(e) => handleFieldChange('questionText', e.target.value)}
                          />
                        </td>
                        <td style={{ fontSize: 12.5 }}>
                          <span className="badge badge-gold">{q.subject}</span><br />
                          <span style={{ color: 'var(--ink-soft)' }}>{q.chapter}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 180 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 'bold', width: 14 }}>A:</span>
                              <input
                                type="text"
                                style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', fontSize: '12.5px' }}
                                value={editForm.optionA}
                                onChange={(e) => handleFieldChange('optionA', e.target.value)}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 'bold', width: 14 }}>B:</span>
                              <input
                                type="text"
                                style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', fontSize: '12.5px' }}
                                value={editForm.optionB}
                                onChange={(e) => handleFieldChange('optionB', e.target.value)}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 'bold', width: 14 }}>C:</span>
                              <input
                                type="text"
                                style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', fontSize: '12.5px' }}
                                value={editForm.optionC}
                                onChange={(e) => handleFieldChange('optionC', e.target.value)}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 'bold', width: 14 }}>D:</span>
                              <input
                                type="text"
                                style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', fontSize: '12.5px' }}
                                value={editForm.optionD}
                                onChange={(e) => handleFieldChange('optionD', e.target.value)}
                              />
                            </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                <span style={{ fontSize: 12, fontWeight: 'bold' }}>Correct Option:</span>
                                {q.questionType !== 'MCQ' ? (
                                  <input
                                    type="text"
                                    style={{ padding: '4px 8px', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', fontSize: '12.5px', background: '#fff', width: '150px' }}
                                    value={editForm.correctOption}
                                    onChange={(e) => handleFieldChange('correctOption', e.target.value)}
                                  />
                                ) : (
                                  <select
                                    style={{ padding: '4px 8px', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', fontSize: '12.5px', background: '#fff' }}
                                    value={editForm.correctOption}
                                    onChange={(e) => handleFieldChange('correctOption', e.target.value)}
                                  >
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                    <option value="C">C</option>
                                    <option value="D">D</option>
                                  </select>
                                )}
                              </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 12.5, maxWidth: 260 }}>
                          {q.issues.map((issue, i) => (
                            <div key={i} className="badge badge-danger" style={{ display: 'block', marginBottom: 4, lineHeight: 1.4, whiteSpace: 'normal' }}>
                              {issue}
                            </div>
                          ))}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '6px 14px', fontSize: 13, justifyContent: 'center' }}
                              disabled={busy[q.id]}
                              onClick={() => saveEdit(q.id)}
                            >
                              Save
                            </button>
                            <button
                              className="btn btn-ghost"
                              style={{ padding: '6px 14px', fontSize: 13, justifyContent: 'center' }}
                              disabled={busy[q.id]}
                              onClick={cancelEdit}
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="q-text" style={{ whiteSpace: 'pre-wrap' }}>{q.questionText}</td>
                        <td style={{ fontSize: 12.5 }}>
                          <span className="badge badge-gold">{q.subject}</span><br />
                          <span style={{ color: 'var(--ink-soft)' }}>{q.chapter}</span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                          A) {q.options.A}<br />B) {q.options.B}<br />C) {q.options.C}<br />D) {q.options.D}
                          <br /><strong>Marked: {q.correctOption}</strong>
                        </td>
                        <td style={{ fontSize: 12.5, maxWidth: 260 }}>
                          {q.issues.map((issue, i) => (
                            <div key={i} className="badge badge-danger" style={{ display: 'block', marginBottom: 4, lineHeight: 1.4, whiteSpace: 'normal' }}>
                              {issue}
                            </div>
                          ))}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '6px 14px', fontSize: 13 }}
                              disabled={busy[q.id]}
                              onClick={() => act(q.id, { action: 'approve' })}
                            >
                              Approve & Add to Question Bank
                            </button>
                            <button
                              className="btn btn-ghost"
                              style={{ padding: '6px 14px', fontSize: 13 }}
                              disabled={busy[q.id]}
                              onClick={() => startEdit(q)}
                            >
                              Edit Question
                            </button>
                            <button
                              className="btn-danger-ghost"
                              disabled={busy[q.id]}
                              onClick={() => act(q.id, { action: 'remove' })}
                            >
                              Remove from bank
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              {total} flagged — page {page} of {totalPages}
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
