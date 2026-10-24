import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD', 'UNTAGGED'];
const TYPES = [
  { key: 'MCQ', label: 'MCQ' },
  { key: 'ASSERTION_REASON', label: 'Assertion-Reason' },
  { key: 'MATCH_FOLLOWING', label: 'Match the Following' },
  { key: 'STATEMENT_I_II', label: 'Statement I/II' },
  { key: 'NUMERICAL', label: 'Numerical' },
  { key: 'NVQ', label: 'NVQ' },
  { key: 'DIAGRAM_BASED', label: 'Diagram-based' },
];

export default function ChapterAnalytics() {
  const { chapterId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.chapterAnalytics(chapterId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [chapterId]);

  if (loading) return <div className="skeleton" style={{ height: 320 }} />;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return null;

  const rowTotal = (type) => DIFFICULTIES.reduce((sum, d) => sum + (data.grid[type]?.[d] || 0), 0);
  const colTotal = (diff) => TYPES.reduce((sum, t) => sum + (data.grid[t.key]?.[diff] || 0), 0);

  return (
    <div>
      <div className="page-header">
        <p className="eyebrow">Phase 4 — Chapter Analytics</p>
        <h1 className="page-title">{data.chapter.name}</h1>
        <p className="page-sub">
          {data.exam} · {data.subject} · {data.total} active question{data.total !== 1 ? 's' : ''}
          {data.flaggedCount > 0 && (
            <span style={{ color: 'var(--danger)' }}> · {data.flaggedCount} currently flagged (excluded until reviewed)</span>
          )}
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <Link to="/syllabus" className="btn btn-ghost">← Back to Syllabus Master</Link>
      </div>

      {data.total === 0 ? (
        <div className="card empty-state">
          <h3>No questions yet in this chapter</h3>
          <p>Upload questions tagged to this chapter to see the breakdown here.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Question Type</th>
                {DIFFICULTIES.map((d) => <th key={d}>{d}</th>)}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {TYPES.map((t) => (
                <tr key={t.key}>
                  <td style={{ fontWeight: 600 }}>{t.label}</td>
                  {DIFFICULTIES.map((d) => {
                    const count = data.grid[t.key]?.[d] || 0;
                    return (
                      <td key={d}>
                        {count > 0 ? (
                          <span className={`badge ${d === 'HARD' ? 'badge-danger' : d === 'MEDIUM' ? 'badge-warn' : d === 'EASY' ? 'badge-success' : 'badge-neutral'}`}>
                            {count}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--line)' }}>—</span>
                        )}
                      </td>
                    );
                  })}
                  <td style={{ fontWeight: 700 }}>{rowTotal(t.key)}</td>
                </tr>
              ))}
              <tr style={{ background: 'var(--paper-dim)' }}>
                <td style={{ fontWeight: 700 }}>Total</td>
                {DIFFICULTIES.map((d) => <td key={d} style={{ fontWeight: 700 }}>{colTotal(d)}</td>)}
                <td style={{ fontWeight: 700 }}>{data.total}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="card card-pad" style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 15, marginBottom: 10 }}>Reading this table</h3>
        <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6, margin: 0 }}>
          Each cell shows how many active, non-flagged questions exist for that combination of type
          and difficulty. Before promising a client "20 Hard Numerical questions from this chapter,"
          check this grid first — it tells you exactly what's available without any guesswork.
        </p>
      </div>
    </div>
  );
}
