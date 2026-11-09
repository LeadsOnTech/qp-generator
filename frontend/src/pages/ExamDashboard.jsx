import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

const EXAM_THEMES = {
  'AP EAPCET': {
    category: 'Engineering & Agriculture Entrance',
    gradient: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
    badge: 'Andhra Pradesh CET',
    icon: '📐'
  },
  'TG EAPCET': {
    category: 'Telangana Engineering & Tech Entrance',
    gradient: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
    badge: 'Telangana CET',
    icon: '⚡'
  },
  'KCET': {
    category: 'Karnataka State Entrance',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)',
    badge: 'Karnataka CET',
    icon: '🔬'
  },
  'NEET': {
    category: 'National Medical Entrance (UG)',
    gradient: 'linear-gradient(135deg, #E11D48 0%, #F43F5E 100%)',
    badge: 'Medical (NTA)',
    icon: '🩺'
  },
  'JEE': {
    category: 'National Engineering Entrance',
    gradient: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)',
    badge: 'Engineering (NTA)',
    icon: '⚛️'
  }
};

export default function ExamDashboard() {
  const { examName } = useParams();
  const [tree, setTree] = useState(null);
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const theme = EXAM_THEMES[examName] || {
    category: 'Entrance Examination Workspace',
    gradient: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
    badge: 'Standard Entrance',
    icon: '📚'
  };

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

  if (loading) {
    return (
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 200, borderRadius: 24, marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 24 }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 18 }} />)}
        </div>
      </div>
    );
  }

  if (error) return <div className="alert alert-danger">{error}</div>;

  if (!tree) {
    return (
      <div className="card empty-state" style={{ maxWidth: 600, margin: '60px auto', padding: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A' }}>Exam "{examName}" Not Found</h3>
        <p style={{ color: '#64748B', fontSize: 15, margin: '8px 0 24px 0' }}>This exam blueprint does not exist in your active curriculum database.</p>
        <Link to="/dashboard" className="btn btn-primary">← Return to Exam Hub</Link>
      </div>
    );
  }

  const totalQuestions = tree.subjects.reduce(
    (sum, s) => sum + s.chapters.reduce((cSum, c) => cSum + c.questionCount, 0), 0
  );

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', paddingBottom: 48 }}>
      {/* Executive Hero */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 55%, #1E1B4B 100%)',
          borderRadius: 24,
          padding: '36px 36px 30px 36px',
          color: '#FFFFFF',
          marginBottom: 32,
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24, position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 700 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 999, background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.15)', marginBottom: 12 }}>
              <span style={{ fontSize: 14 }}>{theme.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#E2E8F0' }}>
                {theme.badge} Workspace
              </span>
            </div>

            <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.025em', color: '#FFFFFF', margin: '0 0 8px 0', lineHeight: 1.2 }}>
              {examName} Command Center
            </h1>

            <p style={{ fontSize: 15, color: '#94A3B8', margin: 0 }}>
              Curriculum, question bank, difficulty ratios, and test papers are strictly isolated to <strong>{examName}</strong>.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <Link
              to={`/generate?exam=${encodeURIComponent(examName)}`}
              className="btn btn-primary"
              style={{ padding: '12px 22px', borderRadius: 12, fontWeight: 700 }}
            >
              <span>✎</span> Generate {examName} Paper
            </Link>
            <Link
              to="/dashboard"
              className="btn btn-secondary"
              style={{ padding: '12px 18px', borderRadius: 12, fontWeight: 600 }}
            >
              <span>◆</span> Switch Exam
            </Link>
          </div>
        </div>

        {/* Quick Nav Ribbon */}
        <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#94A3B8' }}>
            Curriculum: <strong style={{ color: '#F8FAFC' }}>{theme.category}</strong>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link to={`/upload?exam=${encodeURIComponent(examName)}`} style={{ color: '#38BDF8', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              ⇧ Upload {examName} Questions →
            </Link>
            <Link to="/syllabus" style={{ color: '#A78BFA', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              ✓ Edit Syllabus Master →
            </Link>
          </div>
        </div>
      </div>

      {/* 3-Tile Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 32 }}>
        <div className="stat-card">
          <div className="stat-label">Verified Question Pool</div>
          <div className="stat-value" style={{ color: '#0F172A', marginTop: 4 }}>
            {totalQuestions.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginTop: 8 }}>
            ✓ Mapped to {examName} Syllabus
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Active Subjects</div>
          <div className="stat-value" style={{ color: '#0F172A', marginTop: 4 }}>
            {tree.subjects.length}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>
            {tree.subjects.map(s => s.name).join(', ')}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Generated Papers Archive</div>
          <div className="stat-value" style={{ color: '#0F172A', marginTop: 4 }}>
            {papers.length}
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>
            Ready for Print, Export &amp; CBT
          </div>
        </div>
      </div>

      {/* Subjects & Chapters Breakdown */}
      <div className="card card-pad" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>Syllabus &amp; Question Distribution</h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Subject-level breakdown of active chapters and questions.</p>
          </div>
          <Link
            to={`/questions?exam=${encodeURIComponent(examName)}`}
            style={{ fontSize: 13, fontWeight: 700, color: '#2563EB', textDecoration: 'none' }}
          >
            Browse All {examName} Questions →
          </Link>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Subject Name</th>
                <th>Total Chapters</th>
                <th>Mapped Questions</th>
                <th>Curriculum Coverage</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tree.subjects.map((s) => {
                const subjTotal = s.chapters.reduce((sum, c) => sum + c.questionCount, 0);
                const percent = totalQuestions > 0 ? Math.round((subjTotal / totalQuestions) * 100) : 0;
                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700, color: '#0F172A', fontSize: 15 }}>
                      {s.name}
                    </td>
                    <td>
                      <strong>{s.chapters.length}</strong> <span style={{ color: '#64748B', fontSize: 12 }}>chapters</span>
                    </td>
                    <td>
                      <strong style={{ fontSize: 15 }}>{subjTotal.toLocaleString()}</strong> <span style={{ color: '#64748B', fontSize: 12 }}>questions</span>
                    </td>
                    <td style={{ width: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, height: 6, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, #3B82F6, #6366F1)', borderRadius: 999 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', minWidth: 32 }}>{percent}%</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`/questions?exam=${encodeURIComponent(examName)}&subject=${encodeURIComponent(s.name)}`}
                        className="btn btn-ghost"
                        style={{ padding: '6px 14px', fontSize: 13, borderRadius: 8 }}
                      >
                        Inspect Bank →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Papers for this Exam */}
      <div className="card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>Recent {examName} Papers</h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Generated blueprints ready for export or CBT launch.</p>
          </div>
          <Link to={`/generate?exam=${encodeURIComponent(examName)}`} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
            + Create New Paper
          </Link>
        </div>

        {papers.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 36, marginBottom: 8 }}>📝</div>
            <h4 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>No papers generated for {examName} yet</h4>
            <p style={{ color: '#64748B', fontSize: 13, margin: '0 auto 16px auto', maxWidth: 360 }}>
              Use the automated question builder to generate a paper following the official {examName} blueprint.
            </p>
            <Link to={`/generate?exam=${encodeURIComponent(examName)}`} className="btn btn-primary" style={{ fontSize: 13 }}>
              Generate First {examName} Paper
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Questions</th>
                  <th>Date Created</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {papers.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600, color: '#0F172A' }}>{p.title}</td>
                    <td>
                      {p.status === 'FINALIZED' ? (
                        <span className="badge badge-success">Finalized</span>
                      ) : (
                        <span className="badge badge-warn">Draft</span>
                      )}
                    </td>
                    <td><strong>{p.questionCount}</strong> items</td>
                    <td style={{ color: '#64748B', fontSize: 13 }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Link to={`/papers/${p.id}`} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12.5, borderRadius: 8 }}>
                        Preview →
                      </Link>
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
