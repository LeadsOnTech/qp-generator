import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function ExamHub() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  

  
  async function handleDeleteExam(id, name) {
    if (!window.confirm(`Are you sure you want to permanently delete the exam "${name}"? This will delete ALL Questions, Subjects, Chapters, and Generated Papers associated with it.`)) return;
    try {
      await api.deleteExam(id);
      setExams(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete exam');
    }
  }
  
  useEffect(() => {
    api.listExams()
      .then(setExams)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <p className="eyebrow">Exam Hub</p>
        <h1 className="page-title">Which exam are you working on?</h1>
        <p className="page-sub">
          Each exam has its own dashboard, question counts, and saved paper pattern — NEET, JEE, and
          EAMCET data never mixes. <strong>To add a new exam (e.g. JEE or EAMCET), just upload a
          question set with that exam's name in the "Exam" column</strong> — it will appear as its own
          card here automatically, with its own separate syllabus.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="stat-grid">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 140 }} />)}
        </div>
      ) : exams.length === 0 ? (
        <div className="card empty-state">
          <h3>No exams yet</h3>
          <p>Upload a batch of questions (with an Exam column like "NEET") to get started — the exam will appear here automatically.</p>
          <Link to="/upload" className="btn btn-primary" style={{ marginTop: 14 }}>Upload Questions</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
          {exams.map((exam) => (
            <Link
              key={exam.id}
              to={`/exam/${encodeURIComponent(exam.name)}`}
              className="card card-pad"
              style={{ textDecoration: 'none', display: 'block', transition: 'box-shadow 0.15s ease' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <h2 style={{ fontSize: 24 }}>{exam.name}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    {exam.hasSavedPattern && <span className="badge badge-gold">Pattern saved</span>}
                    {isAdmin && (
                      <button 
                        className="btn-danger-ghost" 
                        style={{ padding: '2px 6px', fontSize: '12px' }}
                        onClick={(e) => { e.preventDefault(); handleDeleteExam(exam.id, exam.name); }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
              </div>
              <div style={{ display: 'flex', gap: 20, marginBottom: 4 }}>
                <div>
                  <div className="stat-value" style={{ fontSize: 26 }}>{exam.totalQuestions}</div>
                  <div className="stat-label">Questions</div>
                </div>
                <div>
                  <div className="stat-value" style={{ fontSize: 26 }}>{exam.subjectCount}</div>
                  <div className="stat-label">Subjects</div>
                </div>
                <div>
                  <div className="stat-value" style={{ fontSize: 26 }}>{exam.paperCount}</div>
                  <div className="stat-label">Papers made</div>
                </div>
              </div>
              <div style={{ marginTop: 14, fontSize: 13, color: 'var(--gold-500)', fontWeight: 600 }}>
                Open {exam.name} dashboard →
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
