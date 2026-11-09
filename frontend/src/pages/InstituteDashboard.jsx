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

  if (loading) {
    return (
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 200, borderRadius: 24, marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 24 }}>
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 18 }} />)}
        </div>
      </div>
    );
  }

  const credits = institute?.creditBalance ?? 0;
  const isTrial = institute?.isTrial;
  const tier = credits <= 20 ? 'final' : credits <= 100 ? 'firm' : credits <= 200 ? 'early' : null;

  const rechargeAction = isTrial
    ? 'Contact us to subscribe and keep generating papers.'
    : 'Recharge to keep generating papers without interruption.';

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', paddingBottom: 48 }}>
      {/* Executive Welcome Hero */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 55%, #1E1B4B 100%)',
          borderRadius: 24,
          padding: '36px 36px 32px 36px',
          color: '#FFFFFF',
          marginBottom: 32,
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div 
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24, position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 680 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 999, background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.15)', marginBottom: 14 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 8px #10B981' }} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#E2E8F0' }}>
                Institutional Portal
              </span>
            </div>

            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.025em', color: '#FFFFFF', margin: '0 0 8px 0', lineHeight: 1.2 }}>
              {institute?.name || 'Your Institute'}
            </h1>

            <p style={{ fontSize: 15, color: '#94A3B8', margin: 0 }}>
              Curate examination blueprints, print branded papers with custom watermarks, and schedule CBT tests for enrolled students.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <Link
              to="/generate"
              className="btn btn-primary"
              style={{ padding: '12px 22px', borderRadius: 12, fontWeight: 700, fontSize: 14 }}
            >
              <span>✎</span> Generate a Paper
            </Link>
            <Link
              to="/recharge"
              className="btn btn-secondary"
              style={{ padding: '12px 20px', borderRadius: 12, fontWeight: 600, fontSize: 14 }}
            >
              <span>💳</span> Recharge Credits
            </Link>
          </div>
        </div>

        {/* Quick User Identity Ribbon */}
        <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 13, color: '#94A3B8' }}>
            Signed in as <strong style={{ color: '#F8FAFC' }}>{user?.email}</strong>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#38BDF8', background: 'rgba(56, 189, 248, 0.1)', padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              ⚡ High-Speed PostgreSQL
            </span>
            <span style={{ fontSize: 12, color: '#34D399', background: 'rgba(52, 211, 153, 0.1)', padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(52, 211, 153, 0.2)' }}>
              🛡️ Verified Institution
            </span>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: 24 }}>{error}</div>}

      {/* Credit Nudges */}
      {tier === 'final' && (
        <div className="alert alert-danger" style={{ marginBottom: 24 }}>
          <strong>⚠️ Only {credits} credit{credits !== 1 ? 's' : ''} left!</strong> {rechargeAction}
        </div>
      )}
      {tier === 'firm' && (
        <div className="alert alert-danger" style={{ background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A', marginBottom: 24 }}>
          <strong>⚠️ {credits} credits remaining.</strong> {rechargeAction}
        </div>
      )}
      {tier === 'early' && (
        <div className="alert alert-success" style={{ background: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0', marginBottom: 24 }}>
          <strong>ℹ️ {credits} credits remaining.</strong> Each question in a generated paper uses 1 credit — plan ahead if you have high exam volume this week.
        </div>
      )}

      {/* 4-Tile KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 32 }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Credit Balance</div>
              <div className="stat-value" style={{ color: credits < 100 ? '#E11D48' : '#0F172A', marginTop: 4 }}>
                {credits.toLocaleString()}
              </div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              💳
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: '#64748B' }}>
            1 Question = 1 Credit • <Link to="/recharge" style={{ color: '#4F46E5', fontWeight: 700 }}>Top Up →</Link>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Papers Created</div>
              <div className="stat-value" style={{ color: '#0F172A', marginTop: 4 }}>
                {papers.length}
              </div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              📑
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: '#64748B' }}>
            Ready for Print &amp; CBT Export
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Available Question Bank</div>
              <div className="stat-value" style={{ color: '#0F172A', marginTop: 4 }}>
                19,079
              </div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              📚
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: '#64748B' }}>
            NEET, JEE, AP &amp; TG EAPCET, KCET
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Institution License</div>
              <div className="stat-value" style={{ fontSize: 20, color: '#059669', marginTop: 8 }}>
                {isTrial ? 'Trial Account' : 'Active Plan'}
              </div>
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              ⭐
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: '#64748B' }}>
            <Link to="/subscriptions" style={{ color: '#4F46E5', fontWeight: 700 }}>Manage Modules →</Link>
          </div>
        </div>
      </div>

      {/* Quick Launchpad Navigation */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
        <Link to="/generate" className="btn btn-primary" style={{ padding: '10px 18px' }}>
          ✎ Generate Paper
        </Link>
        <Link to="/papers" className="btn btn-ghost" style={{ padding: '10px 18px' }}>
          ▣ All My Papers
        </Link>
        <Link to="/subscriptions" className="btn btn-ghost" style={{ padding: '10px 18px', borderColor: '#C7D2FE', color: '#4F46E5', fontWeight: 700 }}>
          🏷️ Plans &amp; Modules
        </Link>
        <Link to="/website-builder" className="btn btn-ghost" style={{ padding: '10px 18px' }}>
          🌐 College Website Builder
        </Link>
        <Link to="/my-institute" className="btn btn-ghost" style={{ padding: '10px 18px' }}>
          🏛️ Institute Profile
        </Link>
        <Link to="/questions" className="btn btn-ghost" style={{ padding: '10px 18px' }}>
          ▤ Question Bank
        </Link>
      </div>

      {/* Recent Papers Card */}
      <div className="card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>Recent Examination Papers</h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Latest test papers generated for your college.</p>
          </div>
          <Link to="/papers" style={{ fontSize: 13, fontWeight: 700, color: '#2563EB', textDecoration: 'none' }}>
            View All Papers →
          </Link>
        </div>

        {papers.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>No papers generated yet</h3>
            <p style={{ color: '#64748B', fontSize: 14, maxWidth: 400, margin: '0 auto 16px auto' }}>
              Create your first question paper using the automated blueprint generator.
            </p>
            <Link to="/generate" className="btn btn-primary">Generate First Paper</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Paper Title</th>
                  <th>Exam Category</th>
                  <th>Status</th>
                  <th>Questions</th>
                  <th>Created Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {papers.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600, color: '#0F172A' }}>{p.title}</td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontWeight: 600 }}>
                        {p.examName}
                      </span>
                    </td>
                    <td>
                      {p.status === 'FINALIZED' ? (
                        <span className="badge badge-success">Finalized</span>
                      ) : (
                        <span className="badge badge-warn">Draft</span>
                      )}
                    </td>
                    <td>
                      <strong>{p.questionCount}</strong> <span style={{ color: '#64748B', fontSize: 12 }}>items</span>
                    </td>
                    <td style={{ fontSize: 13, color: '#64748B' }}>
                      {new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link 
                        to={`/papers/${p.id}`} 
                        className="btn btn-ghost" 
                        style={{ padding: '6px 14px', fontSize: 13, borderRadius: 8 }}
                      >
                        Open Paper →
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
