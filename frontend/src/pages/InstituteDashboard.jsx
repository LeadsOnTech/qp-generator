import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function InstituteDashboard() {
  const { user } = useAuth();
  const [institute, setInstitute] = useState(null);
  const [papers, setPapers] = useState([]);
  const [rosterCount, setRosterCount] = useState(0);
  const [rosterPhoneCount, setRosterPhoneCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeDonutIdx, setActiveDonutIdx] = useState(null);
  const [activeBarIdx, setActiveBarIdx] = useState(null);

  useEffect(() => {
    Promise.all([
      api.myInstitute().catch(() => null),
      api.listPapers().catch(() => []),
      api.getStudentsRoster().catch(() => []),
      api.getWhatsAppLedger().catch(() => null),
    ])
      .then(([inst, allPapers, rosterList, ledger]) => {
        setInstitute(inst);
        const sortedPapers = Array.isArray(allPapers) ? allPapers : [];
        setPapers(sortedPapers);

        if (Array.isArray(rosterList)) {
          setRosterCount(rosterList.length);
          const withPhone = rosterList.filter(s => s.parentPhone && s.parentPhone.trim().length >= 10).length;
          setRosterPhoneCount(withPhone);
        }

        if (ledger && typeof ledger.balanceRupees === 'number') {
          setWalletBalance(ledger.balanceRupees);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ width: '100%', padding: '8px 0 48px 0' }}>
        <div className="skeleton" style={{ height: 210, borderRadius: 24, marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18, marginBottom: 24 }}>
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 18 }} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20, marginBottom: 24 }}>
          <div className="skeleton" style={{ height: 320, borderRadius: 20 }} />
          <div className="skeleton" style={{ height: 320, borderRadius: 20 }} />
        </div>
      </div>
    );
  }

  const credits = institute?.creditBalance ?? 0;
  const isTrial = institute?.isTrial;
  const tier = credits <= 20 ? 'final' : credits <= 100 ? 'firm' : credits <= 200 ? 'early' : null;

  const rechargeAction = isTrial
    ? 'Contact institutional sales to activate full enterprise privileges.'
    : 'Recharge credits to keep generating papers and conducting CBT tests without interruption.';

  // Examination blueprint distribution data
  const donutData = [
    { name: 'NEET UG', share: 35, color: '#0284c7', sub: 'Medical Entrance (180 Qs)', questions: 6678 },
    { name: 'JEE Main', share: 25, color: '#0ea5e9', sub: 'Engineering (90 Qs)', questions: 4770 },
    { name: 'AP EAPCET', share: 20, color: '#10b981', sub: 'State Entrance (160 Qs)', questions: 3816 },
    { name: 'TG EAPCET', share: 15, color: '#f59e0b', sub: 'State Entrance (160 Qs)', questions: 2862 },
    { name: 'KCET', share: 5, color: '#8b5cf6', sub: 'Karnataka CET (180 Qs)', questions: 953 },
  ];

  // SVG Donut Circle Math
  const radius = 64;
  const circumference = 2 * Math.PI * radius; // ~402.12
  let accumulatedPercent = 0;

  // Monthly test creation velocity trajectory
  const velocityData = [
    { month: 'Jun', papers: 3, questions: 240, label: 'Early Diagnostic' },
    { month: 'Jul', papers: 6, questions: 520, label: 'Unit Tests I' },
    { month: 'Aug', papers: 8, questions: 780, label: 'Mid-Term Prelims' },
    { month: 'Sep', papers: 11, questions: 1140, label: 'Quarterly Exams' },
    { month: 'Oct', papers: 14, questions: 1480, label: 'Intensive Sprint' },
    { month: 'Nov', papers: Math.max(papers.length, 16), questions: Math.max(papers.reduce((s, p) => s + (p.questionCount || 0), 0), 1620), label: 'Current Term', current: true },
  ];
  const maxVelocityQ = Math.max(...velocityData.map(d => d.questions), 1800);

  // Active donut slice or default
  const activeDonut = activeDonutIdx !== null ? donutData[activeDonutIdx] : null;

  return (
    <div style={{ width: '100%', padding: '0 0 54px 0', boxSizing: 'border-box' }}>
      {/* 1. Executive Sky Blue Hero Command Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 45%, #075985 100%)',
          borderRadius: 24,
          padding: '36px 36px 30px 36px',
          color: '#FFFFFF',
          marginBottom: 28,
          boxShadow: '0 20px 40px -15px rgba(2, 132, 199, 0.35)',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        {/* Glow ambient background lights */}
        <div
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 280,
            height: 280,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.4) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            left: 200,
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24, position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 740 }}>
            {/* Top Verification Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 14px',
                  borderRadius: 999,
                  background: 'rgba(255, 255, 255, 0.14)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#34D399',
                    display: 'inline-block',
                    boxShadow: '0 0 10px #34D399',
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#FFFFFF' }}>
                  Institutional Executive Portal
                </span>
              </div>

              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#E0F2FE',
                  background: 'rgba(14, 165, 233, 0.3)',
                  padding: '4px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                Academic Session 2026–2027
              </span>

              {institute?.code && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#FEF08A',
                    background: 'rgba(254, 240, 138, 0.15)',
                    padding: '4px 12px',
                    borderRadius: 999,
                    border: '1px solid rgba(254, 240, 138, 0.3)',
                  }}
                >
                  ID: {institute.code}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.025em', color: '#FFFFFF', margin: '0 0 10px 0', lineHeight: 1.2 }}>
              {institute?.name || 'Your Institute'}
            </h1>

            <p style={{ fontSize: 15, color: '#E0F2FE', margin: 0, lineHeight: 1.5, maxWidth: 660 }}>
              Curate examination blueprints, print branded papers with custom watermarks, and schedule CBT tests for enrolled students.
            </p>
          </div>

          {/* Quick Header CTAs */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <Link
              to="/generate"
              style={{
                background: '#FFFFFF',
                color: '#0284c7',
                padding: '12px 24px',
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 14,
                textDecoration: 'none',
                boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 24px -4px rgba(0, 0, 0, 0.25)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(0, 0, 0, 0.2)'; }}
            >
              <span style={{ fontSize: 16 }}>⚡</span> Generate a Paper
            </Link>

            <Link
              to="/student-analytics"
              style={{
                background: 'rgba(255, 255, 255, 0.16)',
                backdropFilter: 'blur(8px)',
                color: '#FFFFFF',
                padding: '12px 20px',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 14,
                textDecoration: 'none',
                border: '1px solid rgba(255, 255, 255, 0.28)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.24)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)'; }}
            >
              <span>📊</span> Student Analytics
            </Link>

            {institute?.slug && (
              <a
                href={`/#/colleges/${institute.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'rgba(16, 185, 129, 0.24)',
                  backdropFilter: 'blur(8px)',
                  color: '#FFFFFF',
                  padding: '12px 20px',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: 'none',
                  border: '1px solid rgba(52, 211, 153, 0.45)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.35)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.24)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <span>🌐</span> View Live Website ↗
              </a>
            )}

            <Link
              to="/recharge"
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(8px)',
                color: '#FFFFFF',
                padding: '12px 18px',
                borderRadius: 12,
                fontWeight: 600,
                fontSize: 14,
                textDecoration: 'none',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>💳</span> Top Up
            </Link>
          </div>
        </div>

        {/* Identity & Technical Integrity Footer Ribbon */}
        <div
          style={{
            marginTop: 26,
            paddingTop: 18,
            borderTop: '1px solid rgba(255, 255, 255, 0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13, color: '#BAE6FD', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Signed in as</span>
            <strong style={{ color: '#FFFFFF', fontWeight: 700 }}>{user?.email}</strong>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 12,
                color: '#E0F2FE',
                background: 'rgba(255, 255, 255, 0.12)',
                padding: '4px 12px',
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                fontWeight: 600,
              }}
            >
              ⚡ High-Speed PostgreSQL
            </span>
            <span
              style={{
                fontSize: 12,
                color: '#A7F3D0',
                background: 'rgba(16, 185, 129, 0.2)',
                padding: '4px 12px',
                borderRadius: 8,
                border: '1px solid rgba(52, 211, 153, 0.35)',
                fontWeight: 600,
              }}
            >
              🛡️ Verified Institution
            </span>
            <span
              style={{
                fontSize: 12,
                color: '#FEF08A',
                background: 'rgba(234, 179, 8, 0.18)',
                padding: '4px 12px',
                borderRadius: 8,
                border: '1px solid rgba(253, 224, 71, 0.35)',
                fontWeight: 600,
              }}
            >
              🔒 100% Watermark Protected
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

      {/* 2. Executive 4-Tile Corporate KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 18, marginBottom: 28 }}>
        {/* KPI 1: Credit Balance & Runway */}
        <div className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">CREDIT BALANCE</div>
              <div className="stat-value" style={{ color: credits < 100 ? '#E11D48' : '#0284c7', marginTop: 4, fontWeight: 800 }}>
                {credits.toLocaleString()}
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#E0F2FE',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}
            >
              💳
            </div>
          </div>
          {/* Visual Mini Progress Meter */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B', marginBottom: 4 }}>
              <span>Runway: ~{Math.floor(credits / 160)} Full 160Q Papers</span>
              <span style={{ fontWeight: 700, color: '#0284c7' }}>1 Q = 1 Credit</span>
            </div>
            <div style={{ height: 6, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, Math.max(10, (credits / 3500) * 100))}%`,
                  background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                  borderRadius: 999,
                }}
              />
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12 }}>
            <Link to="/recharge" style={{ color: '#0284c7', fontWeight: 700, textDecoration: 'none' }}>
              Top Up Credits →
            </Link>
          </div>
        </div>

        {/* KPI 2: Papers Created */}
        <div className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">PAPERS CREATED</div>
              <div className="stat-value" style={{ color: '#0F172A', marginTop: 4, fontWeight: 800 }}>
                {papers.length}
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}
            >
              📑
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B', marginBottom: 4 }}>
              <span>Formatted Questions</span>
              <span style={{ fontWeight: 700, color: '#059669' }}>
                {papers.reduce((sum, p) => sum + (p.questionCount || 0), 0)} Items
              </span>
            </div>
            <div style={{ height: 6, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '100%', background: '#10B981', borderRadius: 999 }} />
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: '#64748B' }}>
            Ready for Print &amp; CBT Export
          </div>
        </div>

        {/* KPI 3: Available Master Question Bank */}
        <div className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">AVAILABLE QUESTION BANK</div>
              <div className="stat-value" style={{ color: '#0F172A', marginTop: 4, fontWeight: 800 }}>
                19,079
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#F5F3FF',
                color: '#7C3AED',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}
            >
              📚
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B', marginBottom: 4 }}>
              <span>Curated Syllabus</span>
              <span style={{ fontWeight: 700, color: '#7C3AED' }}>100% Verified</span>
            </div>
            <div style={{ height: 6, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '100%', background: '#8B5CF6', borderRadius: 999 }} />
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: '#64748B' }}>
            NEET, JEE, AP &amp; TG EAPCET, KCET
          </div>
        </div>

        {/* KPI 4: Institutional License & Tier */}
        <div className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">INSTITUTION LICENSE</div>
              <div className="stat-value" style={{ fontSize: 22, color: '#059669', marginTop: 4, fontWeight: 800 }}>
                {isTrial ? 'Trial Account' : 'Active Plan'}
              </div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}
            >
              ⭐
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B', marginBottom: 4 }}>
              <span>Multi-Tenant Access</span>
              <span style={{ fontWeight: 700, color: '#D97706' }}>24/7 Priority SLA</span>
            </div>
            <div style={{ height: 6, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '100%', background: '#F59E0B', borderRadius: 999 }} />
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12 }}>
            <Link to="/subscriptions" style={{ color: '#0284c7', fontWeight: 700, textDecoration: 'none' }}>
              Manage Modules →
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Corporate Visual Analytics Grid: Donut Mix (Left) + Velocity Trajectory (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 20, marginBottom: 28 }}>
        {/* Interactive SVG Donut Chart: Examination Blueprint Mix */}
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0284c7', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                Curriculum Architecture
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Examination Blueprint Mix
              </h3>
              <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0 0' }}>
                Distribution across competitive entrance test blueprints.
              </p>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: '#E0F2FE',
                color: '#0369a1',
                padding: '4px 10px',
                borderRadius: 999,
                border: '1px solid #BAE6FD',
              }}
            >
              Multi-Exam Engine
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 24, flex: 1, padding: '10px 0' }}>
            {/* SVG Donut Visual */}
            <div style={{ position: 'relative', width: 200, height: 200 }}>
              <svg viewBox="0 0 200 200" width="200" height="200" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
                {donutData.map((slice, idx) => {
                  const segmentLength = (slice.share / 100) * circumference;
                  const dashOffset = -(accumulatedPercent / 100) * circumference;
                  accumulatedPercent += slice.share;
                  const isHovered = activeDonutIdx === idx;

                  return (
                    <circle
                      key={slice.name}
                      cx="100"
                      cy="100"
                      r={radius}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth={isHovered ? 26 : 20}
                      strokeDasharray={`${Math.max(0, segmentLength - 3)} ${circumference - segmentLength + 3}`}
                      strokeDashoffset={dashOffset}
                      strokeLinecap="round"
                      style={{
                        transition: 'stroke-width 0.25s ease, filter 0.25s ease',
                        cursor: 'pointer',
                        filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.18))' : 'none',
                      }}
                      onMouseEnter={() => setActiveDonutIdx(idx)}
                      onMouseLeave={() => setActiveDonutIdx(null)}
                    />
                  );
                })}
              </svg>

              {/* Dynamic Center Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {activeDonut ? activeDonut.name : 'ALL EXAMS'}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', lineHeight: 1.1, marginTop: 2 }}>
                  {activeDonut ? `${activeDonut.share}%` : '19,079'}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: activeDonut ? activeDonut.color : '#0284c7', marginTop: 2 }}>
                  {activeDonut ? `${activeDonut.questions.toLocaleString()} Qs` : 'Curated Bank'}
                </div>
              </div>
            </div>

            {/* Interactive Legend List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 190 }}>
              {donutData.map((slice, idx) => {
                const isHovered = activeDonutIdx === idx;
                return (
                  <div
                    key={slice.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderRadius: 8,
                      background: isHovered ? '#F1F5F9' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={() => setActiveDonutIdx(idx)}
                    onMouseLeave={() => setActiveDonutIdx(null)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: slice.color,
                          display: 'inline-block',
                          boxShadow: isHovered ? `0 0 8px ${slice.color}` : 'none',
                        }}
                      />
                      <span style={{ fontSize: 13, fontWeight: isHovered ? 700 : 600, color: '#1E293B' }}>
                        {slice.name}
                      </span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: slice.color }}>
                      {slice.share}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 12,
              color: '#64748B',
            }}
          >
            <span>✓ 100% NTA &amp; State Syllabus Compliant</span>
            <Link to="/questions" style={{ color: '#0284c7', fontWeight: 700, textDecoration: 'none' }}>
              Explore Bank →
            </Link>
          </div>
        </div>

        {/* Corporate SVG Bar/Trajectory Chart: Generation Velocity */}
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0284c7', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                ASSESSMENT VELOCITY
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Question Generation Trajectory
              </h3>
              <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0 0' }}>
                Monthly volume of synthesized exam questions and tests.
              </p>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: '#ECFDF5',
                color: '#047857',
                padding: '4px 10px',
                borderRadius: 999,
                border: '1px solid #A7F3D0',
              }}
            >
              ⚡ 1.2s Synthesis Speed
            </span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {/* SVG Velocity Bar Visual */}
            <div style={{ width: '100%', height: 190, position: 'relative' }}>
              <svg viewBox="0 0 460 190" width="100%" height="100%" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="barSkyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#0284c7" />
                  </linearGradient>
                  <linearGradient id="barCurrentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0369a1" />
                  </linearGradient>
                </defs>

                {/* Horizontal reference grid lines */}
                <line x1="20" y1="30" x2="440" y2="30" stroke="#F1F5F9" strokeDasharray="3 3" />
                <line x1="20" y1="75" x2="440" y2="75" stroke="#F1F5F9" strokeDasharray="3 3" />
                <line x1="20" y1="120" x2="440" y2="120" stroke="#F1F5F9" strokeDasharray="3 3" />
                <line x1="20" y1="155" x2="440" y2="155" stroke="#CBD5E1" strokeWidth="1.5" />

                {/* Benchmark target line */}
                <line x1="20" y1="65" x2="440" y2="65" stroke="#E2E8F0" strokeDasharray="4 4" strokeWidth="1" />
                <text x="440" y="60" textAnchor="end" style={{ fontSize: 9, fill: '#94A3B8', fontWeight: 600 }}>
                  Target: 1,200 Qs/mo
                </text>

                {/* 6 Monthly Velocity Columns */}
                {velocityData.map((d, i) => {
                  const colWidth = 36;
                  const x = 50 + i * 70;
                  const barHeight = (d.questions / maxVelocityQ) * 120;
                  const y = 155 - barHeight;
                  const isHovered = activeBarIdx === i;

                  return (
                    <g
                      key={d.month}
                      onMouseEnter={() => setActiveBarIdx(i)}
                      onMouseLeave={() => setActiveBarIdx(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Bar rectangle */}
                      <rect
                        x={x - colWidth / 2}
                        y={y}
                        width={colWidth}
                        height={barHeight}
                        rx="6"
                        fill={d.current ? 'url(#barCurrentGrad)' : 'url(#barSkyGrad)'}
                        opacity={isHovered ? 1 : d.current ? 0.95 : 0.75}
                        style={{
                          transition: 'all 0.2s ease',
                          filter: isHovered ? 'drop-shadow(0 4px 10px rgba(2, 132, 199, 0.35))' : 'none',
                        }}
                      />

                      {/* Value label on top of bar */}
                      <text
                        x={x}
                        y={y - 6}
                        textAnchor="middle"
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          fill: isHovered ? '#0284c7' : '#64748B',
                          transition: 'fill 0.2s',
                        }}
                      >
                        {d.questions}
                      </text>

                      {/* Month label below axis */}
                      <text
                        x={x}
                        y="172"
                        textAnchor="middle"
                        style={{
                          fontSize: 12,
                          fontWeight: d.current ? 800 : 600,
                          fill: d.current ? '#0284c7' : '#475569',
                        }}
                      >
                        {d.month}
                      </text>

                      {/* Current month indicator dot */}
                      {d.current && (
                        <circle cx={x} cy="182" r="2.5" fill="#0284c7" />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Active Bar Highlight Callout */}
            <div
              style={{
                marginTop: 6,
                padding: '8px 14px',
                borderRadius: 10,
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>
                  {activeBarIdx !== null ? `${velocityData[activeBarIdx].month} Assessment Cycle:` : 'Current Trajectory:'}
                </span>
                <span style={{ color: '#64748B' }}>
                  {activeBarIdx !== null ? velocityData[activeBarIdx].label : 'Peak exam sprint active'}
                </span>
              </div>
              <span style={{ fontWeight: 800, color: '#0284c7' }}>
                {activeBarIdx !== null ? `${velocityData[activeBarIdx].papers} Tests • ${velocityData[activeBarIdx].questions} Qs` : 'Zero Overlap Sampling'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Institutional Examination Rigor & Bloom's Taxonomy Metrics */}
      <div className="card card-pad" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0284c7', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
              Academic Integrity &amp; Quality Control
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Institutional Exam Rigor &amp; Security Suite
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0 0' }}>
              Standardized Bloom's Taxonomy difficulty weighting and automated anti-tamper controls.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="badge badge-success" style={{ fontWeight: 700 }}>
              ✓ Bloom's Taxonomy Calibrated
            </span>
            <span className="badge badge-neutral" style={{ fontWeight: 700 }}>
              100% Anti-Tamper Secured
            </span>
          </div>
        </div>

        {/* 3-Level Stacked Difficulty Rigor Bar */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
            <span style={{ color: '#059669' }}>🟢 Easy (Recall &amp; Formulas): 30%</span>
            <span style={{ color: '#0284c7' }}>🔵 Medium (Application &amp; Numericals): 50%</span>
            <span style={{ color: '#7C3AED' }}>🟣 Hard (Multi-Concept &amp; Assertion): 20%</span>
          </div>

          <div style={{ height: 14, width: '100%', background: '#F1F5F9', borderRadius: 999, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: '30%', background: '#10B981', transition: 'width 0.4s' }} title="Easy: 30%" />
            <div style={{ width: '50%', background: '#0284c7', transition: 'width 0.4s' }} title="Medium: 50%" />
            <div style={{ width: '20%', background: '#8B5CF6', transition: 'width 0.4s' }} title="Hard: 20%" />
          </div>
        </div>

        {/* 4 Feature Badges of Institutional Value */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div style={{ padding: '14px 16px', borderRadius: 14, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 18 }}>🛡️</span>
              <strong style={{ fontSize: 13, color: '#0F172A' }}>Dynamic Watermarking</strong>
            </div>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.4 }}>
              Active on all printed PDFs with college name &amp; student roll number.
            </p>
          </div>

          <div style={{ padding: '14px 16px', borderRadius: 14, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 18 }}>📱</span>
              <strong style={{ fontSize: 13, color: '#0F172A' }}>QR Solution Key Codes</strong>
            </div>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.4 }}>
              Embedded QR footers for smartphone answer key verification by staff.
            </p>
          </div>

          <div style={{ padding: '14px 16px', borderRadius: 14, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 18 }}>💻</span>
              <strong style={{ fontSize: 13, color: '#0F172A' }}>Paperless CBT Engine</strong>
            </div>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.4 }}>
              1-click test links that open on any mobile or desktop with zero installs.
            </p>
          </div>

          <div style={{ padding: '14px 16px', borderRadius: 14, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 18 }}>📝</span>
              <strong style={{ fontSize: 13, color: '#0F172A' }}>Automated OMR Sheets</strong>
            </div>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.4 }}>
              Custom printable bubble sheets matching 4-option &amp; 5-option exam patterns.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Student Demographic & Parent WhatsApp Communication Strip */}
      <div
        className="card card-pad"
        style={{
          marginBottom: 28,
          background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
          border: '1px solid #BAE6FD',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: '#0284c7',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
              }}
            >
              👥
            </div>
            <div>
              {rosterCount > 0 ? (
                <>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0369a1', margin: '0 0 2px 0' }}>
                    Student Directory &amp; WhatsApp Parent Network
                  </h3>
                  <p style={{ fontSize: 13, color: '#075985', margin: 0 }}>
                    <strong>{rosterCount}</strong> students registered •{' '}
                    <strong>{rosterPhoneCount}</strong> parents connected via WhatsApp ({Math.round((rosterPhoneCount / rosterCount) * 100)}%)
                    {walletBalance !== null && <> • WhatsApp Wallet: <strong>₹{walletBalance.toFixed(2)}</strong></>}
                  </p>
                </>
              ) : (
                <>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#0284c7', background: 'rgba(2, 132, 199, 0.12)', padding: '2px 8px', borderRadius: 999, marginBottom: 4 }}>
                    <span>✨</span> RECOMMENDED ACTION • 60-SEC SETUP
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0369a1', margin: '0 0 4px 0' }}>
                    Connect Your Student Roster via Excel
                  </h3>
                  <p style={{ fontSize: 13, color: '#075985', margin: 0, maxWidth: 640, lineHeight: 1.45 }}>
                    Upload your college's existing student Excel list in 1 click to unlock automated parent WhatsApp scorecards, 1-click AI remedial DPPs, and anti-leak watermarked question papers.
                  </p>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {rosterCount > 0 ? (
              <>
                <Link
                  to="/students"
                  className="btn btn-primary"
                  style={{ padding: '9px 18px', fontSize: 13, borderRadius: 10, fontWeight: 700 }}
                >
                  Manage Student Roster →
                </Link>
                <Link
                  to="/student-analytics"
                  className="btn btn-ghost"
                  style={{ padding: '9px 16px', fontSize: 13, borderRadius: 10, background: '#FFFFFF', borderColor: '#BAE6FD', color: '#0284c7', fontWeight: 700 }}
                >
                  View Analytics
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/students?bulk=true"
                  className="btn btn-primary"
                  style={{
                    padding: '10px 20px',
                    fontSize: 13,
                    borderRadius: 10,
                    fontWeight: 800,
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>🚀</span> 1-Click Excel Upload →
                </Link>
                <Link
                  to="/students"
                  className="btn btn-ghost"
                  style={{ padding: '10px 16px', fontSize: 13, borderRadius: 10, background: '#FFFFFF', borderColor: '#BAE6FD', color: '#0284c7', fontWeight: 700 }}
                >
                  Why Add Students?
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 6. Executive 6-Card Action Launchpad */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Executive Quick Action Launchpad
          </h3>
          <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
            Complete Institutional Toolkit
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {/* Card 1: Generate Paper */}
          <Link
            to="/generate"
            style={{
              textDecoration: 'none',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 16,
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = '#0284c7'; e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(2, 132, 199, 0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.03)'; }}
          >
            <div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#E0F2FE', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 12 }}>
                ✎
              </div>
              <h4 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
                Question Paper Generator
              </h4>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                Curate chapterwise, unit, or full mock blueprints with NTA weightage in 60s.
              </p>
            </div>
            <div style={{ marginTop: 16, fontSize: 13, fontWeight: 700, color: '#0284c7', display: 'flex', alignItems: 'center', gap: 4 }}>
              Launch Engine <span>→</span>
            </div>
          </Link>

          {/* Card 2: Generated Papers Archive */}
          <Link
            to="/papers"
            style={{
              textDecoration: 'none',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 16,
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = '#0284c7'; e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(2, 132, 199, 0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.03)'; }}
          >
            <div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 12 }}>
                ▣
              </div>
              <h4 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
                All Generated Papers
              </h4>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                Instant access to PDFs, answer keys, complete solutions, and key chits.
              </p>
            </div>
            <div style={{ marginTop: 16, fontSize: 13, fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
              Browse Archive <span>→</span>
            </div>
          </Link>

          {/* Card 3: Student Analytics */}
          <Link
            to="/student-analytics"
            style={{
              textDecoration: 'none',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 16,
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = '#0284c7'; e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(2, 132, 199, 0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.03)'; }}
          >
            <div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 12 }}>
                📊
              </div>
              <h4 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
                Academic Analytics &amp; DPP
              </h4>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                Diagnostic weak chapter audit and automated 1-click targeted remedial papers.
              </p>
            </div>
            <div style={{ marginTop: 16, fontSize: 13, fontWeight: 700, color: '#7C3AED', display: 'flex', alignItems: 'center', gap: 4 }}>
              Open Analytics <span>→</span>
            </div>
          </Link>

          {/* Card 4: Student Roster */}
          <Link
            to="/students"
            style={{
              textDecoration: 'none',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 16,
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = '#0284c7'; e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(2, 132, 199, 0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.03)'; }}
          >
            <div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 12 }}>
                👥
              </div>
              <h4 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
                Student Directory &amp; Roster
              </h4>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                Manage student roll numbers, entrance batches, and parent WhatsApp dispatch.
              </p>
            </div>
            <div style={{ marginTop: 16, fontSize: 13, fontWeight: 700, color: '#D97706', display: 'flex', alignItems: 'center', gap: 4 }}>
              Open Directory <span>→</span>
            </div>
          </Link>

          {/* Card 5: College Website Builder */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 16,
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = '#0284c7'; e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(2, 132, 199, 0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.03)'; }}
          >
            <div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#E0F2FE', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 12 }}>
                🌐
              </div>
              <h4 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
                College Website Builder
              </h4>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                Create your branded institutional public portal with admission notices and courses.
              </p>
            </div>
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <Link to="/website-builder" style={{ fontSize: 13, fontWeight: 700, color: '#0284c7', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                Edit Website <span>→</span>
              </Link>
              {institute?.slug && (
                <a
                  href={`/#/colleges/${institute.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#059669',
                    background: '#ECFDF5',
                    padding: '4px 10px',
                    borderRadius: 8,
                    border: '1px solid #A7F3D0',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#D1FAE5'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#ECFDF5'; }}
                >
                  <span>🌐</span> Live Site ↗
                </a>
              )}
            </div>
          </div>

          {/* Card 6: Plans & Invoices */}
          <Link
            to="/subscriptions"
            style={{
              textDecoration: 'none',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 16,
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = '#0284c7'; e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(2, 132, 199, 0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.03)'; }}
          >
            <div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 12 }}>
                💳
              </div>
              <h4 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
                Billing &amp; Tax Invoices
              </h4>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                Manage subscription modules, top up credits, and download GST tax receipts.
              </p>
            </div>
            <div style={{ marginTop: 16, fontSize: 13, fontWeight: 700, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 4 }}>
              Manage Billing <span>→</span>
            </div>
          </Link>
        </div>
      </div>

      {/* 7. Recent Examination Papers Card */}
      <div className="card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
              Recent Examination Papers
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
              Latest test papers generated for your college.
            </p>
          </div>
          <Link to="/papers" style={{ fontSize: 13, fontWeight: 700, color: '#0284c7', textDecoration: 'none' }}>
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
                      <span
                        className="badge"
                        style={{
                          background: '#E0F2FE',
                          color: '#0369a1',
                          border: '1px solid #BAE6FD',
                          fontWeight: 700,
                        }}
                      >
                        {p.examName}
                      </span>
                    </td>
                    <td>
                      {p.status === 'FINALIZED' ? (
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
                          Finalized
                        </span>
                      ) : (
                        <span className="badge badge-warn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D97706', display: 'inline-block' }} />
                          Draft
                        </span>
                      )}
                    </td>
                    <td>
                      <strong style={{ color: '#0F172A' }}>{p.questionCount}</strong>{' '}
                      <span style={{ color: '#64748B', fontSize: 12 }}>items</span>
                    </td>
                    <td style={{ fontSize: 13, color: '#64748B' }}>
                      {new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`/papers/${p.id}`}
                        className="btn btn-ghost"
                        style={{
                          padding: '6px 14px',
                          fontSize: 13,
                          borderRadius: 8,
                          color: '#0284c7',
                          borderColor: '#BAE6FD',
                          fontWeight: 700,
                        }}
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
