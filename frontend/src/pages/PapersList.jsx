import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const TYPE_LABELS = {
  DPP: 'DPP', WEEKLY_TEST: 'Weekly Test', GRAND_TEST: 'Grand Test',
  MOCK_TEST: 'Mock Test', MODEL_PAPER: 'Model Paper',
};

export default function PapersList() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    api.listPapers()
      .then(setPapers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  
  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this paper? This action cannot be undone.")) return;
    setDeletingId(id);
    try {
      await api.deletePaper(id);
      setPapers(papers.filter(p => p.id !== id));
    } catch (err) {
      alert("Failed to delete: " + err.message);
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

  return (
    <div>
      <div className="page-header">
        <p className="eyebrow">Phase 3 — Paper Engine</p>
        <h1 className="page-title">Papers</h1>
        <p className="page-sub">
          Every paper ever generated — drafts you can still edit, and finalized papers you can
          re-download any time (with or without the answer key).
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="skeleton" style={{ height: 280 }} />
      ) : papers.length === 0 ? (
        <div className="card empty-state">
          <h3>No papers yet</h3>
          <p>Generate your first paper and it will appear here.</p>
          <Link to="/generate" className="btn btn-primary" style={{ marginTop: 14 }}>Generate Paper</Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Title</th><th>Type</th><th>Exam</th><th>Institute</th><th>Questions</th><th>Status</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              {papers.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.title}</td>
                  <td><span className="badge badge-neutral">{TYPE_LABELS[p.paperType] || p.paperType}</span></td>
                  <td>{p.examName}</td>
                  <td>{p.instituteName || '—'}</td>
                  <td>{p.questionCount}</td>
                  <td>
                    {p.status === 'FINALIZED'
                      ? <span className="badge badge-success">Finalized</span>
                      : <span className="badge badge-warn">Draft</span>}
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <Link to={`/papers/${p.id}`} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13, marginRight: 6 }}>
                      {p.status === 'DRAFT' ? 'Continue' : 'View'}
                    </Link>
                    {p.status === 'FINALIZED' && (
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '6px 12px', fontSize: 13 }}
                        disabled={downloadingId === p.id}
                        onClick={() => quickDownload(p.title, p.id)}
                      >
                        {downloadingId === p.id ? '…' : 'PDF'}
                      </button>
                    )}

                      <button
                        className="btn btn-ghost"
                        style={{ padding: '6px 12px', fontSize: 13, color: '#DC2626' }}
                        disabled={deletingId === p.id}
                        onClick={() => handleDelete(p.id)}
                      >
                        {deletingId === p.id ? '...' : 'Delete'}
                      </button>
                    </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
