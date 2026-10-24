import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function InstituteDashboard() {
  const { user } = useAuth();
  const [institute, setInstitute] = useState(null);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.myInstitute(), api.listPapers()])
      .then(([inst, allPapers]) => {
        setInstitute(inst);
        setPapers(allPapers.slice(0, 8));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="skeleton" style={{ height: 320, margin: 40 }} />;

  const credits = institute?.creditBalance ?? 0;
  const isTrial = institute?.isTrial;
  // Three tiers, exactly as specified: an early nudge at 200, a firmer one
  // at 100, and a final call once it's down to a critical 20 or fewer.
  const tier = credits <= 20 ? 'final' : credits <= 100 ? 'firm' : credits <= 200 ? 'early' : null;

  const rechargeAction = isTrial
    ? 'Contact us to subscribe and keep generating papers.'
    : 'Recharge to keep generating papers without interruption.';

  return (
    <div>
      <div className="page-header">
        <p className="eyebrow">Welcome back</p>
        <h1 className="page-title">{institute?.name || 'Your Institute'}</h1>
        <p className="page-sub">Signed in as {user?.email}</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {tier === 'final' && (
        <div className="alert alert-danger">
          <strong>Only {credits} credit{credits !== 1 ? 's' : ''} left.</strong> {rechargeAction}
        </div>
      )}
      {tier === 'firm' && (
        <div className="alert alert-danger" style={{ background: 'var(--warn-bg)', color: 'var(--warn)', border: '1px solid #f0dca8' }}>
          <strong>{credits} credits remaining.</strong> {rechargeAction}
        </div>
      )}
      {tier === 'early' && (
        <div className="alert alert-success" style={{ background: 'var(--paper-dim)', color: 'var(--ink-soft)', border: '1px solid var(--line)' }}>
          <strong>{credits} credits remaining.</strong> Each question in a generated paper uses 1 credit — plan ahead if you have a busy week coming up.
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{credits}</div>
          <div className="stat-label">Credits remaining</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{papers.length}</div>
          <div className="stat-label">Papers generated</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        <Link to="/generate" className="btn btn-primary">Generate a Paper</Link>
        <Link to="/papers" className="btn btn-ghost">All My Papers</Link>
        <Link to="/my-institute" className="btn btn-ghost">Edit My Institute Profile</Link>
        <Link to="/questions" className="btn btn-ghost">Browse Question Bank</Link>
      </div>

      <div className="card card-pad">
        <h3 style={{ marginBottom: 14 }}>Recent papers</h3>
        {papers.length === 0 ? (
          <div className="empty-state">
            <h3>No papers yet</h3>
            <p>Generate your first paper to get started.</p>
            <Link to="/generate" className="btn btn-primary" style={{ marginTop: 14 }}>Generate Paper</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Title</th><th>Exam</th><th>Status</th><th>Questions</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {papers.map((p) => (
                  <tr key={p.id}>
                    <td>{p.title}</td>
                    <td>{p.examName}</td>
                    <td>{p.status === 'FINALIZED' ? <span className="badge badge-success">Finalized</span> : <span className="badge badge-warn">Draft</span>}</td>
                    <td>{p.questionCount}</td>
                    <td className="mono" style={{ fontSize: 12 }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td><Link to={`/papers/${p.id}`} className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12.5 }}>View</Link></td>
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
