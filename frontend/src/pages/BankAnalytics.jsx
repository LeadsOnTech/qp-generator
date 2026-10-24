import { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api';

const NAVY = '#1e3a8a';

function StatCard({ label, value, sub, tone }) {
  const colors = {
    easy: '#15803d', medium: '#b45309', hard: '#b91c1c', default: NAVY,
  };
  return (
    <div className="card card-pad" style={{ flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: colors[tone] || colors.default }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>{label}</div>
      {sub != null && <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function BankAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [examFilter, setExamFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.bankAnalytics()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const exams = useMemo(() => {
    if (!data) return [];
    return ['ALL', ...Array.from(new Set(data.chapters.map((c) => c.exam)))];
  }, [data]);

  const visibleChapters = useMemo(() => {
    if (!data) return [];
    return data.chapters.filter((c) => {
      if (examFilter !== 'ALL' && c.exam !== examFilter) return false;
      if (search && !`${c.chapter} ${c.subject}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [data, examFilter, search]);

  if (loading) return <div className="skeleton" style={{ height: 300 }} />;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!data) return null;

  const o = data.overall;
  const pct = (n) => (o.total ? Math.round((n / o.total) * 100) : 0);

  return (
    <div>
      <div className="page-header">
        <p className="eyebrow" style={{ color: NAVY }}>Question Bank</p>
        <h1 className="page-title">Bank Analytics</h1>
        <p className="page-sub">
          Everything you've uploaded, broken down by chapter, difficulty, type and exam year —
          so you can see coverage at a glance and know where to add more.
        </p>
      </div>

      {/* Overall summary */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatCard label="Total questions" value={o.total} />
        <StatCard label="Easy" value={o.EASY} sub={`${pct(o.EASY)}%`} tone="easy" />
        <StatCard label="Medium" value={o.MEDIUM} sub={`${pct(o.MEDIUM)}%`} tone="medium" />
        <StatCard label="Hard" value={o.HARD} sub={`${pct(o.HARD)}%`} tone="hard" />
        <StatCard label="Untagged" value={o.UNTAGGED} sub={o.UNTAGGED ? 'tag these for better papers' : 'all tagged'} />
      </div>

      {/* Coverage warnings */}
      {data.coverageWarnings.length > 0 && (
        <div className="card card-pad" style={{ marginBottom: 20, borderLeft: '3px solid #b45309' }}>
          <h3 style={{ marginBottom: 6 }}>Chapters worth topping up</h3>
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 12 }}>
            These chapters are thin in one or more difficulty levels. For varied, non-repeating
            papers, aim for at least 15–20 questions per difficulty per chapter.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.coverageWarnings.slice(0, 12).map((w, i) => (
              <div key={i} style={{ fontSize: 13, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600 }}>{w.chapter}</span>
                <span style={{ color: 'var(--ink-soft)' }}>({w.exam} · {w.subject})</span>
                <span style={{ color: '#b45309' }}>{w.gaps.join(', ')}</span>
              </div>
            ))}
            {data.coverageWarnings.length > 12 && (
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>…and {data.coverageWarnings.length - 12} more</div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={examFilter} onChange={(e) => setExamFilter(e.target.value)} style={{ maxWidth: 200 }}>
          {exams.map((ex) => <option key={ex} value={ex}>{ex === 'ALL' ? 'All exams' : ex}</option>)}
        </select>
        <input type="text" placeholder="Search chapter or subject…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 260 }} />
        <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{visibleChapters.length} chapter{visibleChapters.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Per-chapter table */}
      <div className="table-wrap" style={{ marginBottom: 24 }}>
        <table>
          <thead>
            <tr>
              <th>Chapter</th><th>Exam</th><th>Subject</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th style={{ textAlign: 'right', color: '#15803d' }}>Easy</th>
              <th style={{ textAlign: 'right', color: '#b45309' }}>Medium</th>
              <th style={{ textAlign: 'right', color: '#b91c1c' }}>Hard</th>
              <th style={{ textAlign: 'right' }}>Untagged</th>
              <th style={{ textAlign: 'right' }}>Numerical</th>
            </tr>
          </thead>
          <tbody>
            {visibleChapters.map((c) => (
              <tr key={c.chapterId} style={c.syllabusStatus === 'REMOVED' ? { opacity: 0.5 } : undefined}>
                <td style={{ fontWeight: 600 }}>
                  {c.chapter}
                  {c.syllabusStatus === 'REMOVED' && <span className="badge badge-neutral" style={{ marginLeft: 6 }}>Removed</span>}
                </td>
                <td>{c.exam}</td>
                <td>{c.subject}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{c.total}</td>
                <td style={{ textAlign: 'right' }}>{c.EASY}</td>
                <td style={{ textAlign: 'right' }}>{c.MEDIUM}</td>
                <td style={{ textAlign: 'right' }}>{c.HARD}</td>
                <td style={{ textAlign: 'right', color: c.UNTAGGED ? '#b45309' : 'var(--ink-soft)' }}>{c.UNTAGGED}</td>
                <td style={{ textAlign: 'right' }}>{c.types.NUMERICAL || 0}</td>
              </tr>
            ))}
            {visibleChapters.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--ink-soft)', padding: 20 }}>No chapters match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* By exam year */}
      <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Previous-year questions by exam year</h3>
      <div className="card card-pad">
        {data.byYear.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)', fontSize: 13, margin: 0 }}>No year data yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.byYear.map((y) => {
              const maxCount = Math.max(...data.byYear.map((x) => x.count));
              return (
                <div key={y.year} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 90, fontSize: 13, fontWeight: y.year === 'Unspecified' ? 400 : 600, color: y.year === 'Unspecified' ? 'var(--ink-soft)' : 'inherit' }}>{y.year}</div>
                  <div style={{ flex: 1, background: 'var(--paper-dim)', borderRadius: 4, height: 22, position: 'relative' }}>
                    <div style={{ width: `${(y.count / maxCount) * 100}%`, background: NAVY, height: '100%', borderRadius: 4, minWidth: 2 }} />
                  </div>
                  <div style={{ width: 50, textAlign: 'right', fontSize: 13, fontWeight: 600 }}>{y.count}</div>
                </div>
              );
            })}
          </div>
        )}
        {data.byYear.some((y) => y.year === 'Unspecified') && (
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 12, marginBottom: 0 }}>
            "Unspecified" = questions uploaded without an ExamYear. Add an <strong>ExamYear</strong> or
            {' '}<strong>ExamSource</strong> column to your upload sheet to track these by year.
          </p>
        )}
      </div>
    </div>
  );
}
