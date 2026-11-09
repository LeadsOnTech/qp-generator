import { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api';

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

  if (loading) return <div className="skeleton" style={{ height: 400, borderRadius: 20 }} />;
  if (error) return <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span>⚠️</span><span>{error}</span></div>;
  if (!data) return null;

  const o = data.overall;
  const pct = (n) => (o.total ? Math.round((n / o.total) * 100) : 0);

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto' }}>
      {/* Executive Hero Banner */}
      <div className="studio-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="studio-badge">
              <span>📊</span>
              <span>Question Bank Intelligence &bull; Coverage Metrics</span>
            </div>
            <h1 className="studio-title">Bank Analytics</h1>
            <p className="studio-sub">
              Granular breakdown across 301 chapters, difficulty tiers, numerical problems, and PYQ historical years.
              Spot coverage gaps to ensure seamless, non-repeating paper generation.
            </p>
          </div>
        </div>

        <div className="studio-chips">
          <div className="studio-chip">
            <span>Indexed Questions:</span> <strong>{o.total?.toLocaleString() || 0}</strong>
          </div>
          <div className="studio-chip">
            <span>Easy Tier:</span> <strong style={{ color: '#4ADE80' }}>{o.EASY} ({pct(o.EASY)}%)</strong>
          </div>
          <div className="studio-chip">
            <span>Medium Tier:</span> <strong style={{ color: '#60A5FA' }}>{o.MEDIUM} ({pct(o.MEDIUM)}%)</strong>
          </div>
          <div className="studio-chip">
            <span>Hard Tier:</span> <strong style={{ color: '#FBBF24' }}>{o.HARD} ({pct(o.HARD)}%)</strong>
          </div>
          <div className="studio-chip">
            <span>Untagged:</span> <strong style={{ color: o.UNTAGGED > 0 ? '#F87171' : '#94A3B8' }}>{o.UNTAGGED}</strong>
          </div>
        </div>
      </div>

      {/* 5 Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{o.total?.toLocaleString()}</div>
          <div className="stat-label">Total Questions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#16A34A' }}>{o.EASY}</div>
          <div className="stat-label">Easy ({pct(o.EASY)}%)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#2563EB' }}>{o.MEDIUM}</div>
          <div className="stat-label">Medium ({pct(o.MEDIUM)}%)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#D97706' }}>{o.HARD}</div>
          <div className="stat-label">Hard ({pct(o.HARD)}%)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: o.UNTAGGED ? '#DC2626' : '#64748B' }}>{o.UNTAGGED}</div>
          <div className="stat-label">{o.UNTAGGED ? 'Untagged Attention' : '100% Tagged'}</div>
        </div>
      </div>

      {/* Coverage Warnings */}
      {data.coverageWarnings.length > 0 && (
        <div className="executive-card" style={{ borderLeft: '4px solid #D97706', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#92400E' }}>
              Coverage Recommendations ({data.coverageWarnings.length} Chapters)
            </h3>
          </div>
          <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 14px', lineHeight: 1.5 }}>
            These chapters have fewer than 15 questions in one or more difficulty levels. Adding questions to these topics will guarantee maximum rotation diversity for large multi-batch papers.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
            {data.coverageWarnings.slice(0, 12).map((w, i) => (
              <div key={i} style={{ background: '#FFFBEB', padding: '10px 14px', borderRadius: 10, border: '1px solid #FDE68A', fontSize: 12.5 }}>
                <div style={{ fontWeight: 700, color: '#92400E' }}>{w.chapter}</div>
                <div style={{ color: '#B45309', fontSize: 11.5, marginTop: 2 }}>{w.exam} &bull; {w.subject}</div>
                <div style={{ color: '#DC2626', fontWeight: 600, fontSize: 11, marginTop: 4 }}>Needs: {w.gaps.join(', ')}</div>
              </div>
            ))}
          </div>
          {data.coverageWarnings.length > 12 && (
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 12, fontWeight: 600 }}>
              + {data.coverageWarnings.length - 12} more chapters require additional question volume.
            </div>
          )}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="filter-strip">
        <div className="field" style={{ minWidth: 200, marginBottom: 0 }}>
          <label style={{ fontSize: 12, color: '#64748B' }}>Filter by Exam</label>
          <select value={examFilter} onChange={(e) => setExamFilter(e.target.value)}>
            {exams.map((ex) => (
              <option key={ex} value={ex}>{ex === 'ALL' ? 'All Entrance Exams' : ex}</option>
            ))}
          </select>
        </div>

        <div className="field" style={{ flex: 1, minWidth: 240, marginBottom: 0 }}>
          <label style={{ fontSize: 12, color: '#64748B' }}>Search Chapter or Subject</label>
          <input
            type="text"
            placeholder="Search e.g. 'Thermodynamics' or 'Organic'..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ alignSelf: 'flex-end', paddingBottom: 10, fontSize: 13, fontWeight: 700, color: '#2563EB' }}>
          {visibleChapters.length} Chapter{visibleChapters.length !== 1 ? 's' : ''} Listed
        </div>
      </div>

      {/* Per-Chapter Coverage Table */}
      <div className="table-wrap" style={{ marginBottom: 28 }}>
        <table>
          <thead>
            <tr>
              <th>Chapter</th>
              <th>Exam</th>
              <th>Subject</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th style={{ textAlign: 'right', color: '#16A34A' }}>Easy</th>
              <th style={{ textAlign: 'right', color: '#2563EB' }}>Medium</th>
              <th style={{ textAlign: 'right', color: '#D97706' }}>Hard</th>
              <th style={{ textAlign: 'right' }}>Untagged</th>
              <th style={{ textAlign: 'right' }}>Numerical (NVQ)</th>
            </tr>
          </thead>
          <tbody>
            {visibleChapters.map((c) => (
              <tr key={c.chapterId} style={c.syllabusStatus === 'REMOVED' ? { opacity: 0.55 } : undefined}>
                <td style={{ fontWeight: 700, color: '#0F172A' }}>
                  {c.chapter}
                  {c.syllabusStatus === 'REMOVED' && (
                    <span className="badge badge-danger" style={{ marginLeft: 8, fontSize: 10.5 }}>Excluded</span>
                  )}
                </td>
                <td style={{ fontWeight: 600, color: '#475569' }}>{c.exam}</td>
                <td style={{ color: '#64748B' }}>{c.subject}</td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: '#0F172A' }}>{c.total}</td>
                <td style={{ textAlign: 'right', color: '#16A34A', fontWeight: 700 }}>{c.EASY}</td>
                <td style={{ textAlign: 'right', color: '#2563EB', fontWeight: 700 }}>{c.MEDIUM}</td>
                <td style={{ textAlign: 'right', color: '#D97706', fontWeight: 700 }}>{c.HARD}</td>
                <td style={{ textAlign: 'right', color: c.UNTAGGED ? '#DC2626' : '#94A3B8', fontWeight: c.UNTAGGED ? 700 : 400 }}>
                  {c.UNTAGGED || '0'}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{c.types.NUMERICAL || 0}</td>
              </tr>
            ))}
            {visibleChapters.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', color: '#64748B', padding: 36 }}>
                  No chapters match your search query.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Previous-Year Questions By Exam Year */}
      <div className="executive-card">
        <h3 className="card-section-title" style={{ marginBottom: 6 }}>
          <span>📅</span> Previous-Year Questions (PYQ) Distribution
        </h3>
        <p className="card-section-sub" style={{ marginBottom: 18 }}>
          Historical questions classified by competitive exam session.
        </p>

        {data.byYear.length === 0 ? (
          <p style={{ color: '#64748B', fontSize: 13 }}>No historical year tags recorded yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.byYear.map((y) => {
              const maxCount = Math.max(...data.byYear.map((x) => x.count));
              return (
                <div key={y.year} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 110, fontSize: 13, fontWeight: y.year === 'Unspecified' ? 500 : 700, color: y.year === 'Unspecified' ? '#94A3B8' : '#0F172A' }}>
                    {y.year}
                  </div>
                  <div style={{ flex: 1, background: '#F1F5F9', borderRadius: 6, height: 24, overflow: 'hidden' }}>
                    <div style={{
                      width: `${(y.count / maxCount) * 100}%`,
                      background: 'linear-gradient(90deg, #3B82F6 0%, #2563EB 100%)',
                      height: '100%',
                      borderRadius: 6,
                      minWidth: 4,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <div style={{ width: 60, textAlign: 'right', fontSize: 13.5, fontWeight: 800, color: '#0F172A' }}>
                    {y.count} Qs
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
