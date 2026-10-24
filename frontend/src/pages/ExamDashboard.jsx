import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function ExamDashboard() {
  const { examName } = useParams();
  const [tree, setTree] = useState(null);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.syllabusTree(), api.listPapers()])
      .then(([fullTree, allPapers]) => {
        const exam = fullTree.find((e) => e.name === examName);
        setTree(exam || null);
        setPapers(allPapers.filter((p) => p.examName === examName).slice(0, 8));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [examName]);

  if (loading) return <div className="skeleton" style={{ height: 320 }} />;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!tree) {
    return (
      <div className="card empty-state">
        <h3>"{examName}" not found</h3>
        <p>This exam doesn't exist in your bank yet.</p>
        <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: 14 }}>← Back to Exam Hub</Link>
      </div>
    );
  }

  const totalQuestions = tree.subjects.reduce(
    (sum, s) => sum + s.chapters.reduce((cSum, c) => cSum + c.questionCount, 0), 0
  );

  return (
    <div>
      <div className="page-header">
        <p className="eyebrow">Exam Hub</p>
        <h1 className="page-title">{examName} Dashboard</h1>
        <p className="page-sub">
          Everything below is scoped to {examName} only. <Link to="/dashboard" style={{ color: 'var(--gold-500)' }}>Switch exam</Link>
        </p>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{totalQuestions}</div>
          <div className="stat-label">Total questions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{tree.subjects.length}</div>
          <div className="stat-label">Subjects</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{papers.length}</div>
          <div className="stat-label">Recent papers</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
        <Link to={`/generate?exam=${encodeURIComponent(examName)}`} className="btn btn-primary">
          Generate {examName} Paper
        </Link>
        <Link to={`/upload?exam=${encodeURIComponent(examName)}`} className="btn btn-ghost">
          Upload {examName} Questions
        </Link>
        <Link to="/syllabus" className="btn btn-ghost">Syllabus Master</Link>
      </div>

      <div className="card card-pad" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 14 }}>Subjects &amp; chapters</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Subject</th><th>Chapters</th><th>Questions</th><th></th></tr></thead>
            <tbody>
              {tree.subjects.map((s) => {
                const subjTotal = s.chapters.reduce((sum, c) => sum + c.questionCount, 0);
                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td>{s.chapters.length}</td>
                    <td>{subjTotal}</td>
                    <td>
                      <Link
                        to={`/questions?exam=${encodeURIComponent(examName)}&subject=${encodeURIComponent(s.name)}`}
                        className="btn btn-ghost"
                        style={{ padding: '4px 10px', fontSize: 12.5 }}
                      >
                        Browse
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card card-pad">
        <h3 style={{ marginBottom: 14 }}>Recent {examName} papers</h3>
        {papers.length === 0 ? (
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>No papers generated for {examName} yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Title</th><th>Status</th><th>Questions</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {papers.map((p) => (
                  <tr key={p.id}>
                    <td>{p.title}</td>
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
