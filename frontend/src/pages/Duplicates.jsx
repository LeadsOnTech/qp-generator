import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Duplicates() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    api.duplicates()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function remove(id) {
    if (!window.confirm('Remove this copy from the bank? (Soft-deleted — kept for audit, excluded from papers.)')) return;
    await api.deleteQuestion(id);
    load();
  }

  async function removeBulk() {
    if (!window.confirm(`Are you sure you want to remove ALL ${data.totalDuplicates} extra copies at once? (The oldest original will be kept for each).`)) return;
    setLoading(true);
    await api.removeBulkDuplicates();
    load();
  }

  return (
    <div>
      <div className="page-header">
        <p className="eyebrow">Phase 2 — Bank Hygiene</p>
        <h1 className="page-title">Duplicate Detection</h1>
        <p className="page-sub">
          Questions with identical text (ignoring capitalisation, punctuation, and spacing) are
          grouped here — usually the same question uploaded from two different files. Keep one copy,
          remove the rest. This check is code-based and exact, so there are no false alarms.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="skeleton" style={{ height: 240 }} />
      ) : !data || data.groupCount === 0 ? (
        <div className="card empty-state">
          <h3>No duplicates found</h3>
          <p>Your bank is clean — every active question has unique text.</p>
        </div>
      ) : (
        <>
          <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              Found <strong>{data.groupCount}</strong> duplicated question{data.groupCount !== 1 ? 's' : ''} —{' '}
              <strong>{data.totalDuplicates}</strong> extra cop{data.totalDuplicates !== 1 ? 'ies' : 'y'} that can be removed.
            </div>
            <button className="btn btn-primary" onClick={removeBulk} style={{ padding: '6px 14px', fontSize: 13, background: '#ef4444', border: 'none' }}>
              Remove all {data.totalDuplicates} extra copies
            </button>
          </div>

          {data.groups.map((group, gi) => (
            <div key={gi} className="card card-pad" style={{ marginBottom: 18 }}>
              <p style={{ fontWeight: 600, marginTop: 0, marginBottom: 12, lineHeight: 1.45 }}>
                {group[0].questionText}
              </p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Copy</th><th>Chapter</th><th>Difficulty</th><th>From file</th><th>Added</th><th></th></tr>
                  </thead>
                  <tbody>
                    {group.map((q, qi) => (
                      <tr key={q.id}>
                        <td>
                          {qi === 0
                            ? <span className="badge badge-success">Original (oldest)</span>
                            : <span className="badge badge-danger">Duplicate</span>}
                        </td>
                        <td>{q.subject} — {q.chapter}</td>
                        <td><span className="badge badge-neutral">{q.difficulty}</span></td>
                        <td className="mono" style={{ fontSize: 12 }}>
                          {q.sourceFileName || '—'}{q.sourceRow ? ` (row ${q.sourceRow})` : ''}
                        </td>
                        <td className="mono" style={{ fontSize: 12 }}>{new Date(q.createdAt).toLocaleDateString()}</td>
                        <td>
                          {qi > 0 && (
                            <button className="btn-danger-ghost" onClick={() => remove(q.id)}>Remove copy</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
