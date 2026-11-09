import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

// Exam theme metadata for distinctive visual branding
const EXAM_THEMES = {
  'AP EAPCET': {
    category: 'Engineering & Agriculture',
    gradient: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
    bgSoft: '#ECFDF5',
    textAccent: '#059669',
    borderSoft: '#A7F3D0',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
        <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
      </svg>
    )
  },
  'TG EAPCET': {
    category: 'Telangana Engineering & Tech',
    gradient: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
    bgSoft: '#EEF2FF',
    textAccent: '#4F46E5',
    borderSoft: '#C7D2FE',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    )
  },
  'KCET': {
    category: 'Karnataka State Entrance',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)',
    bgSoft: '#F5F3FF',
    textAccent: '#7C3AED',
    borderSoft: '#DDD6FE',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/>
        <line x1="8.5" y1="2" x2="15.5" y2="2"/>
        <line x1="7" y1="16" x2="17" y2="16"/>
      </svg>
    )
  },
  'NEET': {
    category: 'National Medical (UG)',
    gradient: 'linear-gradient(135deg, #E11D48 0%, #F43F5E 100%)',
    bgSoft: '#FFF1F2',
    textAccent: '#E11D48',
    borderSoft: '#FECDD3',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
        <polyline points="12 5 12 11 15 11"/>
      </svg>
    )
  },
  'JEE': {
    category: 'National Engineering (Main/Adv)',
    gradient: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)',
    bgSoft: '#F0F9FF',
    textAccent: '#0284C7',
    borderSoft: '#BAE6FD',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="m4.93 4.93 4.24 4.24"/>
        <path d="m14.83 9.17 4.24-4.24"/>
        <path d="m14.83 14.83 4.24 4.24"/>
        <path d="m9.17 14.83-4.24 4.24"/>
        <circle cx="12" cy="12" r="4"/>
      </svg>
    )
  }
};

const DEFAULT_THEME = {
  category: 'Entrance Examination',
  gradient: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
  bgSoft: '#EFF6FF',
  textAccent: '#1E40AF',
  borderSoft: '#BFDBFE',
  icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
      <path d="M6 6h10"/>
      <path d="M6 10h10"/>
    </svg>
  )
};

export default function ExamHub() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  async function handleSync() {
    setSyncing(true);
    setSyncMessage(null);
    setError(null);
    try {
      const res = await api.syncExams();
      setSyncMessage(res.message || 'Syllabus and questions synchronized across all exams!');
      const updated = await api.listExams();
      setExams(updated);
    } catch (err) {
      setError(err.message || 'Failed to sync exams');
    } finally {
      setSyncing(false);
    }
  }

  async function handleDeleteExam(e, id, name) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to permanently delete the exam "${name}"? This will delete ALL Questions, Subjects, Chapters, and Generated Papers associated with it.`)) return;
    try {
      await api.deleteExam(id);
      setExams(prev => prev.filter(item => item.id !== id));
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

  const totalQuestionsSum = useMemo(() => {
    return exams.reduce((acc, ex) => acc + (ex.totalQuestions || 0), 0);
  }, [exams]);

  const totalPapersSum = useMemo(() => {
    return exams.reduce((acc, ex) => acc + (ex.paperCount || 0), 0);
  }, [exams]);

  const filteredExams = useMemo(() => {
    if (!searchQuery.trim()) return exams;
    const q = searchQuery.toLowerCase();
    return exams.filter(e => 
      e.name.toLowerCase().includes(q) || 
      (EXAM_THEMES[e.name]?.category || '').toLowerCase().includes(q)
    );
  }, [exams, searchQuery]);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 48 }}>
      {/* Hero Header Card */}
      <div 
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #1E1B4B 100%)',
          borderRadius: 24,
          padding: '36px 36px 32px 36px',
          color: '#FFFFFF',
          marginBottom: 32,
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Subtle decorative glow circle in background */}
        <div 
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24, position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 720 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.15)', marginBottom: 14 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 8px #10B981' }} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#E2E8F0' }}>
                Central Exam Hub
              </span>
            </div>

            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.025em', color: '#FFFFFF', margin: '0 0 12px 0', lineHeight: 1.2 }}>
              Which exam workspace are you working on?
            </h1>

            <p style={{ fontSize: 15, color: '#94A3B8', margin: 0, lineHeight: 1.6 }}>
              Each entrance exam maintains its own isolated question bank, subject taxonomies, and certified paper blueprints. Questions and exam papers never mix between curricula.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
            {isAdmin && (
              <button
                type="button"
                disabled={syncing}
                onClick={handleSync}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 20px',
                  borderRadius: 12,
                  background: syncing ? 'rgba(255, 255, 255, 0.1)' : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: 14,
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  cursor: syncing ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <span style={{ display: 'inline-block', animation: syncing ? 'spin 1s linear infinite' : 'none' }}>
                  🔄
                </span>
                {syncing ? 'Syncing All Banks...' : 'Sync Question Banks'}
              </button>
            )}

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#94A3B8', background: 'rgba(255, 255, 255, 0.05)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                ⚡ Auto-Isolating Banks
              </span>
              <span style={{ fontSize: 12, color: '#94A3B8', background: 'rgba(255, 255, 255, 0.05)', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                🛡️ PostgreSQL Ready
              </span>
            </div>
          </div>
        </div>

        {/* Executive Metrics Ribbon */}
        <div 
          style={{
            marginTop: 32,
            paddingTop: 24,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 20
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Active Blueprints</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#F8FAFC', marginTop: 4 }}>
              {exams.length} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748B' }}>Exams</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Distributed Questions</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#38BDF8', marginTop: 4 }}>
              {totalQuestionsSum.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748B' }}>Pool</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Papers Generated</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#A78BFA', marginTop: 4 }}>
              {totalPapersSum} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748B' }}>Created</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Architecture Mode</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#34D399', marginTop: 4 }}>
              Enterprise <span style={{ fontSize: 14, fontWeight: 500, color: '#64748B' }}>v2.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {syncMessage && (
        <div style={{ background: '#ECFDF5', color: '#065F46', padding: '14px 20px', borderRadius: 14, border: '1px solid #A7F3D0', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{syncMessage}</span>
        </div>
      )}
      {error && (
        <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '14px 20px', borderRadius: 14, border: '1px solid #FECACA', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{error}</span>
        </div>
      )}

      {/* Controls Bar: Search & Count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, maxWidth: 420 }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontSize: 15 }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search exam (e.g. NEET, EAPCET, KCET)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 16px 11px 40px',
                borderRadius: 12,
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                fontSize: 14,
                color: '#0F172A',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'border-color 0.15s ease'
              }}
            />
          </div>
        </div>

        <div style={{ fontSize: 14, color: '#64748B', fontWeight: 500 }}>
          Showing <strong>{filteredExams.length}</strong> of <strong>{exams.length}</strong> Exam Portals
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              style={{ 
                height: 280, 
                borderRadius: 20, 
                background: '#E2E8F0', 
                animation: 'pulse 1.5s infinite ease-in-out' 
              }} 
            />
          ))}
        </div>
      ) : exams.length === 0 ? (
        <div 
          style={{ 
            background: '#FFFFFF', 
            borderRadius: 24, 
            padding: 48, 
            textAlign: 'center', 
            border: '2px dashed #CBD5E1',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: '0 0 8px 0' }}>No entrance exams configured</h3>
          <p style={{ color: '#64748B', maxWidth: 480, margin: '0 auto 20px auto', fontSize: 14 }}>
            Upload a batch of questions with an exam name (e.g. "NEET" or "JEE") to automatically provision an isolated exam hub.
          </p>
          <Link to="/upload" className="btn btn-primary" style={{ padding: '12px 24px', borderRadius: 12 }}>
            Upload Question Batch
          </Link>
        </div>
      ) : (
        /* Exam Cards Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 24 }}>
          {filteredExams.map((exam) => {
            const theme = EXAM_THEMES[exam.name] || DEFAULT_THEME;

            return (
              <div
                key={exam.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 20,
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                className="exam-hub-card"
              >
                {/* Top Colored Accent Stripe */}
                <div style={{ height: 6, background: theme.gradient, width: '100%' }} />

                <div style={{ padding: '24px 24px 20px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Card Header: Icon + Name + Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div 
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          background: theme.bgSoft,
                          color: theme.textAccent,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          border: `1px solid ${theme.borderSoft}`,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                        }}
                      >
                        {theme.icon}
                      </div>

                      <div>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                          {exam.name}
                        </h2>
                        <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500, display: 'block', marginTop: 3 }}>
                          {theme.category}
                        </span>
                      </div>
                    </div>

                    {/* Top Right Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isAdmin && (
                        <button
                          type="button"
                          title="Delete Exam"
                          onClick={(e) => handleDeleteExam(e, exam.id, exam.name)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94A3B8',
                            padding: 6,
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.15s ease, background 0.15s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = '#FEE2E2'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18"/>
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Blueprint Status Chip */}
                  <div style={{ marginBottom: 18 }}>
                    {exam.hasSavedPattern ? (
                      <span 
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: 8,
                          background: '#ECFDF5',
                          color: '#047857',
                          border: '1px solid #A7F3D0',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}
                      >
                        <span>⭐</span> Blueprint Configured
                      </span>
                    ) : (
                      <span 
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: 8,
                          background: '#F1F5F9',
                          color: '#64748B',
                          border: '1px solid #E2E8F0',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}
                      >
                        Default Blueprint
                      </span>
                    )}
                  </div>

                  {/* 3-Tile Metrics Grid */}
                  <div 
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: 8,
                      background: '#F8FAFC',
                      padding: 12,
                      borderRadius: 14,
                      border: '1px solid #F1F5F9',
                      marginBottom: 20
                    }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Questions
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                        {(exam.totalQuestions || 0).toLocaleString()}
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', borderLeft: '1px solid #E2E8F0', borderRight: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Subjects
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                        {exam.subjectCount || 0}
                      </div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Papers
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                        {exam.paperCount || 0}
                      </div>
                    </div>
                  </div>

                  {/* Action Link Button */}
                  <div style={{ marginTop: 'auto' }}>
                    <Link
                      to={`/exam/${encodeURIComponent(exam.name)}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 18px',
                        borderRadius: 12,
                        background: '#F8FAFC',
                        color: '#0F172A',
                        textDecoration: 'none',
                        fontSize: 14,
                        fontWeight: 700,
                        border: '1px solid #E2E8F0',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#0F172A';
                        e.currentTarget.style.color = '#FFFFFF';
                        e.currentTarget.style.borderColor = '#0F172A';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#F8FAFC';
                        e.currentTarget.style.color = '#0F172A';
                        e.currentTarget.style.borderColor = '#E2E8F0';
                      }}
                    >
                      <span>Open Workspace</span>
                      <span style={{ fontSize: 16 }}>→</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Quick Add New Exam Card */}
          <Link
            to="/upload"
            style={{
              background: '#FAFAFA',
              borderRadius: 20,
              border: '2px dashed #CBD5E1',
              padding: '24px',
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              minHeight: 280,
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F0F9FF';
              e.currentTarget.style.borderColor = '#3B82F6';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FAFAFA';
              e.currentTarget.style.borderColor = '#CBD5E1';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <div 
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                color: '#3B82F6',
                marginBottom: 16,
                boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
              }}
            >
              +
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
              Add New Entrance Exam
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 16px 0', maxWidth: 220, lineHeight: 1.5 }}>
              Upload questions with a new exam tag to automatically provision its hub.
            </p>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2563EB' }}>
              Import Questions →
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}
