import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const TYPE_LABELS = {
  DPP: 'DPP',
  WEEKLY_TEST: 'Weekly Test',
  GRAND_TEST: 'Grand Test',
  MOCK_TEST: 'Mock Test',
  MODEL_PAPER: 'Model Paper',
};

const EXAM_THEMES = {
  'NEET': { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
  'AP EAPCET': { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
  'TG EAPCET': { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE' },
  'KCET': { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' },
  'JEE MAIN': { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
};

export default function PapersList() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'FINALIZED' | 'DRAFT'
  const [examFilter, setExamFilter] = useState('ALL');

  useEffect(() => {
    api.listPapers()
      .then(setPapers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this paper? This action cannot be undone.')) return;
    setDeletingId(id);
    try {
      await api.deletePaper(id);
      setPapers((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function quickDownload(paperTitle, paperId) {
    setDownloadingId(paperId);
    try {
      const safeName = (paperTitle || 'question-paper').replace(/[^a-z0-9]+/gi, '_');
      await api.downloadPaperPdf(paperId, false, `${safeName}.pdf`);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingId(null);
    }
  }

  // Filtered papers
  const filteredPapers = useMemo(() => {
    return papers.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (examFilter !== 'ALL' && p.examName !== examFilter) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesTitle = (p.title || '').toLowerCase().includes(query);
        const matchesExam = (p.examName || '').toLowerCase().includes(query);
        const matchesInst = (p.instituteName || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesExam && !matchesInst) return false;
      }
      return true;
    });
  }, [papers, search, statusFilter, examFilter]);

  // Aggregate stats
  const totalCount = papers.length;
  const finalizedCount = papers.filter((p) => p.status === 'FINALIZED').length;
  const draftCount = papers.filter((p) => p.status === 'DRAFT').length;
  const totalQuestionsSum = papers.reduce((sum, p) => sum + (p.questionCount || 0), 0);
  const uniqueExams = Array.from(new Set(papers.map((p) => p.examName).filter(Boolean)));

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto' }}>
      {/* Executive Hero Banner */}
      <div className="studio-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="studio-badge">
              <span>📄</span>
              <span>Question Papers &bull; Repository</span>
            </div>
            <h1 className="studio-title">Papers Archive</h1>
            <p className="studio-sub">
              Access every generated paper across entrance exams. Finalized papers can be reprinted or downloaded as watermarked PDFs anytime.
            </p>
          </div>
          <Link
            to="/generate"
            className="btn btn-primary"
            style={{ padding: '12px 24px', fontSize: 14.5, fontWeight: 700 }}
          >
            <span>+</span> Generate New Paper
          </Link>
        </div>

        {/* Live Metrics Ribbon */}
        <div className="studio-chips">
          <div className="studio-chip">
            <span>Total Papers:</span> <strong>{totalCount}</strong>
          </div>
          <div className="studio-chip">
            <span>Finalized:</span> <strong style={{ color: '#4ADE80' }}>{finalizedCount}</strong>
          </div>
          <div className="studio-chip">
            <span>Drafts:</span> <strong style={{ color: '#FBBF24' }}>{draftCount}</strong>
          </div>
          <div className="studio-chip">
            <span>Questions Distributed:</span> <strong>{totalQuestionsSum.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="filter-strip">
        <div className="field" style={{ flex: 1, minWidth: 240, marginBottom: 0 }}>
          <label style={{ fontSize: 12, color: '#64748B' }}>Search Papers</label>
          <input
            type="text"
            placeholder="Search by paper title, exam, or institute..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="field" style={{ minWidth: 160, marginBottom: 0 }}>
          <label style={{ fontSize: 12, color: '#64748B' }}>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses ({totalCount})</option>
            <option value="FINALIZED">Finalized ({finalizedCount})</option>
            <option value="DRAFT">Drafts ({draftCount})</option>
          </select>
        </div>

        {uniqueExams.length > 0 && (
          <div className="field" style={{ minWidth: 160, marginBottom: 0 }}>
            <label style={{ fontSize: 12, color: '#64748B' }}>Exam</label>
            <select value={examFilter} onChange={(e) => setExamFilter(e.target.value)}>
              <option value="ALL">All Exams</option>
              {uniqueExams.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
        )}

        {(search || statusFilter !== 'ALL' || examFilter !== 'ALL') && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '10px 16px', fontSize: 13 }}
            onClick={() => { setSearch(''); setStatusFilter('ALL'); setExamFilter('ALL'); }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Papers Table */}
      {loading ? (
        <div className="skeleton" style={{ height: 320, borderRadius: 20 }} />
      ) : filteredPapers.length === 0 ? (
        <div className="executive-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>📑</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
            {papers.length === 0 ? 'No papers created yet' : 'No papers match your filters'}
          </h3>
          <p style={{ fontSize: 14, color: '#64748B', maxWidth: 440, margin: '0 auto 20px' }}>
            {papers.length === 0
              ? 'Use the Question Paper Studio to generate your first examination paper with real historical weightages.'
              : 'Try clearing your search keyword or selecting a different status filter.'}
          </p>
          {papers.length === 0 && (
            <Link to="/generate" className="btn btn-primary">
              Generate Your First Paper &rarr;
            </Link>
          )}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title &amp; Type</th>
                <th>Entrance Exam</th>
                <th>Letterhead Institute</th>
                <th>Questions</th>
                <th>Status</th>
                <th>Generated On</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPapers.map((p) => {
                const theme = EXAM_THEMES[p.examName] || { bg: '#F1F5F9', text: '#334155', border: '#E2E8F0' };
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>{p.title}</div>
                      <div style={{ marginTop: 4 }}>
                        <span style={{
                          display: 'inline-block',
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: '#F1F5F9',
                          color: '#475569',
                          border: '1px solid #E2E8F0'
                        }}>
                          {TYPE_LABELS[p.paperType] || p.paperType}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 9999,
                        background: theme.bg,
                        color: theme.text,
                        border: `1px solid ${theme.border}`,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: theme.text }} />
                        {p.examName}
                      </span>
                    </td>

                    <td style={{ color: '#475569', fontSize: 13 }}>
                      {p.instituteName || <span style={{ color: '#94A3B8' }}>Default Branding</span>}
                    </td>

                    <td>
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>
                        {p.questionCount}
                      </span>
                      <span style={{ fontSize: 12, color: '#64748B', marginLeft: 4 }}>Qs</span>
                    </td>

                    <td>
                      {p.status === 'FINALIZED' ? (
                        <span className="badge badge-success">● Finalized</span>
                      ) : (
                        <span className="badge badge-warn">⏳ Draft</span>
                      )}
                    </td>

                    <td className="mono" style={{ fontSize: 12, color: '#64748B' }}>
                      {new Date(p.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Link
                        to={`/papers/${p.id}`}
                        className="btn btn-ghost"
                        style={{ padding: '6px 14px', fontSize: 12.5, marginRight: 6 }}
                      >
                        {p.status === 'DRAFT' ? 'Edit & Preview' : 'View Studio'}
                      </Link>

                      {p.status === 'FINALIZED' && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: 12.5, marginRight: 6 }}
                          disabled={downloadingId === p.id}
                          onClick={() => quickDownload(p.title, p.id)}
                          title="Download Watermarked PDF"
                        >
                          {downloadingId === p.id ? '…' : '📥 PDF'}
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn-danger-ghost"
                        style={{ padding: '6px 10px', fontSize: 12 }}
                        disabled={deletingId === p.id}
                        onClick={() => handleDelete(p.id)}
                        title="Delete paper"
                      >
                        {deletingId === p.id ? '…' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
