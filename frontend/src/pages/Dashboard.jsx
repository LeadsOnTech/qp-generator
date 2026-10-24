import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [batches, setBatches] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  
  async function handleDeleteBatch(id) {
    if (!window.confirm("Are you sure you want to remove this upload log from the list?")) return;
    try {
      await api.deleteUploadBatch(id);
      setBatches(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      alert("Failed to delete upload log");
    }
  }
  
  useEffect(() => {
    Promise.all([api.questionStats(), api.uploadBatches()])
      .then(([s, b]) => {
        setStats(s);
        setBatches(b.slice(0, 5));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const difficultyCount = (label) =>
    stats?.byDifficulty?.find((d) => d.difficulty === label)?.count ?? 0;

  return (
    <div>
      <div className="page-header">
        <p className="eyebrow">All Exams — Combined View</p>
        <h1 className="page-title">Overview</h1>
        <p className="page-sub">
          A snapshot of your Verified Bank — total questions, tagging progress, and what's been
          excluded automatically by the Syllabus Master.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger">
          Couldn't reach the backend at the configured API URL. Make sure the server is running
          (<code>npm run dev</code> in <code>/backend</code>). Details: {error}
        </div>
      )}

      {loading ? (
        <div className="stat-grid">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 96 }} />)}
        </div>
      ) : stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total active questions</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.untagged}</div>
            <div className="stat-label">Awaiting difficulty tag</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.excludedByRemovedSyllabus}</div>
            <div className="stat-label">Excluded — removed syllabus</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {difficultyCount('EASY')} / {difficultyCount('MEDIUM')} / {difficultyCount('HARD')}
            </div>
            <div className="stat-label">Easy / Medium / Hard tagged</div>
          </div>
        </div>
      )}

      <div className="card card-pad" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 14 }}>Recent uploads</h3>
        {batches.length === 0 ? (
          <div className="empty-state">
            <h3>No uploads yet</h3>
            <p>Upload your first batch of typed questions to get started.</p>
            <Link to="/upload" className="btn btn-primary" style={{ marginTop: 14 }}>
              Go to Upload
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>File</th><th>Rows</th><th>Success</th><th>Errors</th><th>Uploaded</th><th></th></tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td>{b.fileName}</td>
                    <td>{b.totalRows}</td>
                    <td><span className="badge badge-success">{b.successCount}</span></td>
                    <td>
                      {b.errorCount > 0
                        ? <span className="badge badge-danger">{b.errorCount}</span>
                        : <span className="badge badge-neutral">0</span>}
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {new Date(b.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <button className="btn-danger-ghost" style={{padding: '2px 6px', fontSize: '12px'}} onClick={() => handleDeleteBatch(b.id)}>Delete</button>
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
