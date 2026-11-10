import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [batches, setBatches] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  async function handleDeleteBatch(id) {
    if (!window.confirm('Are you sure you want to remove this upload log from the list?')) return;
    try {
      await api.deleteUploadBatch(id);
      setBatches(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      alert('Failed to delete upload log');
    }
  }

  useEffect(() => {
    Promise.all([api.questionStats(), api.uploadBatches()])
      .then(([s, b]) => {
        setStats(s);
        setBatches(b.slice(0, 6));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const difficultyCount = (label) =>
    stats?.byDifficulty?.find((d) => d.difficulty === label)?.count ?? 0;

  return (
    <div style={{ width: '100%', paddingBottom: 48 }}>
      {/* Executive Hero */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #1E1B4B 100%)',
          borderRadius: 24,
          padding: '36px 36px 30px 36px',
          color: '#FFFFFF',
          marginBottom: 32,
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 999, background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.15)', marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38BDF8', display: 'inline-block', boxShadow: '0 0 8px #38BDF8' }} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#E2E8F0' }}>
                System-Wide Intelligence
              </span>
            </div>

            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.025em', color: '#FFFFFF', margin: '0 0 8px 0', lineHeight: 1.2 }}>
              Question Bank Master Overview
            </h1>

            <p style={{ fontSize: 15, color: '#94A3B8', margin: 0, maxWidth: 640 }}>
              Consolidated metrics across all state and national entrance exams. Track verified pool health, difficulty tags, and syllabus governance.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/upload" className="btn btn-primary" style={{ padding: '11px 20px', borderRadius: 12, fontWeight: 700 }}>
              <span>⇧</span> Upload Batch
            </Link>
            <Link to="/dashboard" className="btn btn-secondary" style={{ padding: '11px 18px', borderRadius: 12, fontWeight: 600 }}>
              <span>◆</span> Exam Hub
            </Link>
          </div>
        </div>

        {/* Status Line */}
        <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#94A3B8' }}>
            Database Engine: <strong style={{ color: '#38BDF8' }}>PostgreSQL 16 (Enterprise MVCC)</strong>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ fontSize: 12, color: '#34D399', background: 'rgba(52, 211, 153, 0.1)', padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(52, 211, 153, 0.2)' }}>
              🟢 Live Bank
            </span>
            <span style={{ fontSize: 12, color: '#A78BFA', background: 'rgba(167, 139, 250, 0.1)', padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(167, 139, 250, 0.2)' }}>
              🔒 Zero File Lock
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 24 }}>
          Could not retrieve stats: {error}
        </div>
      )}

      {/* 4-KPI Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 32 }}>
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 18 }} />)}
        </div>
      ) : stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 32 }}>
          <div className="stat-card">
            <div className="stat-label">Total Active Questions</div>
            <div className="stat-value" style={{ color: '#0F172A', marginTop: 4 }}>
              {(stats.total || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginTop: 8 }}>
              ✓ Verified &amp; Ready for Paper Generation
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Awaiting Difficulty Tag</div>
            <div className="stat-value" style={{ color: stats.untagged > 0 ? '#D97706' : '#059669', marginTop: 4 }}>
              {stats.untagged}
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>
              <Link to="/tagging" style={{ color: '#4F46E5', fontWeight: 700 }}>Launch AI Auto-Tagger →</Link>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Excluded (Removed Syllabus)</div>
            <div className="stat-value" style={{ color: '#64748B', marginTop: 4 }}>
              {stats.excludedByRemovedSyllabus || 0}
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>
              <Link to="/syllabus" style={{ color: '#4F46E5', fontWeight: 700 }}>Inspect Syllabus Master →</Link>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Easy / Medium / Hard Mix</div>
            <div className="stat-value" style={{ fontSize: 22, color: '#0F172A', marginTop: 8 }}>
              <span style={{ color: '#059669' }}>{difficultyCount('EASY').toLocaleString()}</span>
              <span style={{ color: '#94A3B8', margin: '0 6px' }}>/</span>
              <span style={{ color: '#D97706' }}>{difficultyCount('MEDIUM').toLocaleString()}</span>
              <span style={{ color: '#94A3B8', margin: '0 6px' }}>/</span>
              <span style={{ color: '#DC2626' }}>{difficultyCount('HARD').toLocaleString()}</span>
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>
              Taxonomy Breakdown
            </div>
          </div>
        </div>
      )}

      {/* Quick Admin Actions */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
        <Link to="/dashboard" className="btn btn-primary" style={{ padding: '10px 18px' }}>
          ◆ Exam Hub
        </Link>
        <Link to="/questions" className="btn btn-ghost" style={{ padding: '10px 18px' }}>
          ▤ Question Bank
        </Link>
        <Link to="/upload" className="btn btn-ghost" style={{ padding: '10px 18px' }}>
          ⇧ Upload Questions
        </Link>
        <Link to="/syllabus" className="btn btn-ghost" style={{ padding: '10px 18px' }}>
          ✓ Syllabus Master
        </Link>
        <Link to="/tagging" className="btn btn-ghost" style={{ padding: '10px 18px' }}>
          ✦ AI Tagging
        </Link>
        <Link to="/checks" className="btn btn-ghost" style={{ padding: '10px 18px' }}>
          ⛨ Quality Checks
        </Link>
      </div>

      {/* Recent Uploads Table Card */}
      <div className="card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>Recent Question Batch Ingestions</h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Log of uploaded files, total rows parsed, and validation results.</p>
          </div>
          <Link to="/upload" style={{ fontSize: 13, fontWeight: 700, color: '#2563EB', textDecoration: 'none' }}>
            + Upload New Batch →
          </Link>
        </div>

        {batches.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>No batch uploads recorded yet</h3>
            <p style={{ color: '#64748B', fontSize: 14, maxWidth: 400, margin: '0 auto 16px auto' }}>
              Upload your first Word or Excel batch to populate questions.
            </p>
            <Link to="/upload" className="btn btn-primary">Go to Upload</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Batch File</th>
                  <th>Total Rows</th>
                  <th>Ingested (Success)</th>
                  <th>Validation Errors</th>
                  <th>Uploaded Date</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 600, color: '#0F172A' }}>{b.fileName}</td>
                    <td><strong>{b.totalRows}</strong></td>
                    <td>
                      <span className="badge badge-success">✓ {b.successCount}</span>
                    </td>
                    <td>
                      {b.errorCount > 0 ? (
                        <span className="badge badge-danger">{b.errorCount} errors</span>
                      ) : (
                        <span className="badge badge-neutral">0 errors</span>
                      )}
                    </td>
                    <td style={{ fontSize: 13, color: '#64748B' }}>
                      {new Date(b.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn-danger-ghost"
                        onClick={() => handleDeleteBatch(b.id)}
                      >
                        Remove Log
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
