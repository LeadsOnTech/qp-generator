import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import MathText from '../components/MathText';

export default function CbtExam() {
  const { code } = useParams();

  // Page Phase: 'LOADING' | 'REGISTER' | 'EXAM' | 'SCORECARD'
  const [phase, setPhase] = useState('LOADING');
  const [testInfo, setTestInfo] = useState(null);
  const [initError, setInitError] = useState(null);

  // Registration Form
  const [studentName, setStudentName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [section, setSection] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [pin, setPin] = useState('');
  const [registering, setRegistering] = useState(false);
  const [regError, setRegError] = useState(null);

  // Exam Runtime State
  const [student, setStudent] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [qId]: 'A' | 'B' | ... }
  const [reviewFlags, setReviewFlags] = useState({}); // { [qId]: boolean }
  const [visited, setVisited] = useState({}); // { [qId]: boolean }
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [tabWarning, setTabWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);

  // Final Results
  const [scoreResult, setScoreResult] = useState(null);

  const timerRef = useRef(null);

  // 1. Load initial test info on page load
  useEffect(() => {
    async function loadInfo() {
      try {
        setPhase('LOADING');
        const data = await api.getCbtTestInfo(code);
        setTestInfo(data);
        setPhase('REGISTER');
      } catch (err) {
        setInitError(err.message || 'Exam link not found or expired');
        setPhase('REGISTER');
      }
    }
    loadInfo();
  }, [code]);

  // 2. Anti-cheat tab switch listener during EXAM phase
  useEffect(() => {
    if (phase !== 'EXAM') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => {
          const next = prev + 1;
          setTabWarning(true);
          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [phase]);

  // 3. Countdown timer during EXAM phase
  useEffect(() => {
    if (phase !== 'EXAM' || secondsLeft <= 0) return;

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
      setTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [phase, secondsLeft]);

  // Mark current question as visited
  useEffect(() => {
    if (phase === 'EXAM' && questions[currentIndex]) {
      const qId = questions[currentIndex].id;
      setVisited((prev) => ({ ...prev, [qId]: true }));
    }
  }, [phase, currentIndex, questions]);

  // Handle student login/verification
  const handleStartExam = async (e) => {
    e.preventDefault();
    if (!studentName.trim() || !rollNumber.trim()) {
      setRegError('Please provide both your Full Name and Roll Number.');
      return;
    }
    if (testInfo?.hasPin && !pin.trim()) {
      setRegError('Please enter the 4-digit Exam PIN provided by your faculty.');
      return;
    }

    try {
      setRegistering(true);
      setRegError(null);
      const res = await api.verifyCbtStudent(code, {
        studentName: studentName.trim(),
        rollNumber: rollNumber.trim(),
        section: section.trim(),
        phone: parentPhone.trim(),
        pin: pin.trim(),
      });

      setStudent(res.student);
      setQuestions(res.questions || []);
      setSecondsLeft((res.durationMinutes || 60) * 60);
      setCurrentIndex(0);
      setPhase('EXAM');
    } catch (err) {
      setRegError(err.message || 'Verification failed');
    } finally {
      setRegistering(false);
    }
  };

  // Option select
  const handleSelectOption = (qId, optKey) => {
    setAnswers((prev) => ({ ...prev, [qId]: optKey }));
  };

  // Clear choice
  const handleClearChoice = (qId) => {
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[qId];
      return copy;
    });
  };

  // Toggle mark for review
  const handleToggleReview = (qId) => {
    setReviewFlags((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  // Submit test
  const executeSubmit = async () => {
    try {
      setSubmitting(true);
      setShowSubmitConfirm(false);
      clearInterval(timerRef.current);

      const res = await api.submitCbtExam(code, {
        studentName: student.studentName,
        rollNumber: student.rollNumber,
        section: student.section,
        phone: student.phone || parentPhone.trim() || undefined,
        answers,
        timeSpentSeconds: timeSpent,
        tabSwitchCount,
        isVerifiedStudent: student.isVerifiedStudent,
      });

      setScoreResult(res);
      setPhase('SCORECARD');
    } catch (err) {
      alert('Failed to submit exam: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = () => {
    executeSubmit();
  };

  // Format time MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Get question palette status
  const getPaletteStatus = (qId) => {
    const isAns = answers[qId] != null;
    const isRev = Boolean(reviewFlags[qId]);
    const isVis = Boolean(visited[qId]);

    if (isAns && isRev) return 'ans-review';
    if (isAns) return 'answered';
    if (isRev) return 'review';
    if (isVis) return 'unanswered';
    return 'not-visited';
  };

  // Color badges for palette
  const getBadgeStyle = (status) => {
    switch (status) {
      case 'answered':
        return { background: '#16a34a', color: '#fff', border: '1px solid #15803d' }; // Green
      case 'unanswered':
        return { background: '#dc2626', color: '#fff', border: '1px solid #b91c1c' }; // Red
      case 'review':
        return { background: '#eab308', color: '#000', border: '1px solid #ca8a04' }; // Yellow
      case 'ans-review':
        return { background: '#9333ea', color: '#fff', border: '1px solid #7e22ce' }; // Purple
      default:
        return { background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }; // Grey
    }
  };

  // -------------------------------------------------------------
  // PHASE 1: Loading
  // -------------------------------------------------------------
  if (phase === 'LOADING') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>QP Gen Online CBT</div>
          <div style={{ color: '#94a3b8' }}>Loading exam details…</div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PHASE 2: Registration & Welcome Screen
  // -------------------------------------------------------------
  if (phase === 'REGISTER') {
    if (initError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: 20, fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 32, maxWidth: 460, width: '100%', color: '#fff', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: 20 }}>Exam Not Available</h2>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 20px 0' }}>{initError}</p>
            <Link to="/" style={{ color: '#38bdf8', textDecoration: 'none', fontSize: 14 }}>← Return to Homepage</Link>
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: '28px 24px', maxWidth: 480, width: '100%', color: '#f8fafc', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '1px solid #334155', paddingBottom: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, color: '#38bdf8', fontWeight: 700 }}>
              {testInfo?.instituteName || 'COLLEGE CBT EXAM PORTAL'}
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: '6px 0', color: '#fff' }}>
              {testInfo?.title}
            </h1>
            <div style={{ display: 'inline-flex', gap: 12, fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
              <span>📝 {testInfo?.totalQuestions} Questions</span>
              <span>⏱️ {testInfo?.durationMinutes} Minutes</span>
              <span>🎯 Marks: +{testInfo?.positiveMarks} / -{testInfo?.negativeMarks}</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleStartExam} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {regError && (
              <div style={{ background: '#7f1d1d', border: '1px solid #991b1b', color: '#fecaca', padding: '10px 14px', borderRadius: 8, fontSize: 13.5, lineHeight: 1.4 }}>
                {regError}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 5 }}>
                Student Full Name <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. K. Ramesh"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #475569', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 5 }}>
                Roll Number / Hall Ticket <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 24MPC042"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #475569', color: '#fff', fontSize: 14, textTransform: 'uppercase', boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                Must match your college roster. Test allows 1 attempt per roll number.
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 5 }}>
                Section / Batch (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. MPC Section-A"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #475569', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#38bdf8', marginBottom: 5 }}>
                Parent WhatsApp Mobile (Optional)
              </label>
              <input
                type="tel"
                placeholder="e.g. 9848628863 (10-digit number)"
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #0284c7', color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 4 }}>
                Performance report and scorecard will be sent to this WhatsApp number.
              </div>
            </div>

            {testInfo?.hasPin && (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#facc15', marginBottom: 5 }}>
                  4-Digit Exam PIN <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  placeholder="Enter 4-digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid #eab308', color: '#fff', fontSize: 16, letterSpacing: 2, boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 4 }}>
                  Provided by your faculty in class or via official announcement.
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={registering}
              style={{
                marginTop: 8,
                padding: '12px 16px',
                borderRadius: 8,
                background: '#2563eb',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                border: 'none',
                cursor: registering ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {registering ? 'Verifying Credentials…' : '🚀 Start CBT Exam'}
            </button>
          </form>

          <div style={{ textAlign: 'center', fontSize: 11.5, color: '#64748b', marginTop: 18 }}>
            🔒 Powered by QP Gen CBT Engine · Live Exam Proctoring Active
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PHASE 3: Live Exam Interface (NTA / EAPCET Style)
  // -------------------------------------------------------------
  if (phase === 'EXAM') {
    const curQ = questions[currentIndex];
    const qId = curQ?.id;
    const currentAnswer = answers[qId];
    const isMarkedReview = Boolean(reviewFlags[qId]);
    const isLastQ = currentIndex === questions.length - 1;

    // Counts for legend
    const answeredCount = Object.keys(answers).length;
    const reviewCount = Object.values(reviewFlags).filter(Boolean).length;
    const unansweredCount = questions.length - answeredCount;

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc', color: '#0f172a', fontFamily: 'system-ui, sans-serif' }}>
        {/* Anti-cheat tab switch warning modal */}
        {tabWarning && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 420, width: '100%', textAlign: 'center', border: '2px solid #ef4444' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#b91c1c' }}>Proctor Warning: Tab Switch Detected</h3>
              <p style={{ fontSize: 14, color: '#475569', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                You switched away from the exam window. This event has been recorded on your scorecard (Total: <strong>{tabSwitchCount}</strong>).
                Continued tab-switching may lead to disqualification by your college.
              </p>
              <button
                onClick={() => setTabWarning(false)}
                style={{ padding: '10px 20px', borderRadius: 8, background: '#b91c1c', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
              >
                I Understand, Return to Test
              </button>
            </div>
          </div>
        )}

        {/* Submit Confirmation Modal */}
        {showSubmitConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 28, maxWidth: 460, width: '100%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 19 }}>Confirm Exam Submission?</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#f1f5f9', padding: 12, borderRadius: 8, margin: '14px 0', textAlign: 'left', fontSize: 13 }}>
                <div>🟩 Answered: <strong>{answeredCount}</strong></div>
                <div>🟥 Unanswered: <strong>{unansweredCount}</strong></div>
                <div>🟨 Marked Review: <strong>{reviewCount}</strong></div>
                <div>⏱️ Time Left: <strong>{formatTime(secondsLeft)}</strong></div>
              </div>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px 0' }}>
                Once submitted, you cannot change your answers.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  style={{ padding: '10px 18px', borderRadius: 8, background: '#e2e8f0', color: '#334155', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                  Resume Test
                </button>
                <button
                  onClick={executeSubmit}
                  disabled={submitting}
                  style={{ padding: '10px 22px', borderRadius: 8, background: '#16a34a', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                >
                  {submitting ? 'Submitting…' : 'Yes, Submit Final Answers'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Top Sticky Header */}
        <header style={{ background: '#0f172a', color: '#fff', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #334155', position: 'sticky', top: 0, zIndex: 100 }}>
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: '#38bdf8', letterSpacing: 1, fontWeight: 700 }}>
              {testInfo?.instituteName}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
              {testInfo?.title}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              Student: <strong>{student?.studentName}</strong> ({student?.rollNumber})
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Timer */}
            <div style={{
              background: secondsLeft <= 300 ? '#7f1d1d' : '#1e293b',
              border: `1px solid ${secondsLeft <= 300 ? '#ef4444' : '#475569'}`,
              color: secondsLeft <= 300 ? '#fecaca' : '#38bdf8',
              padding: '6px 14px',
              borderRadius: 8,
              fontWeight: 800,
              fontSize: 18,
              letterSpacing: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span>⏱️</span>
              <span>{formatTime(secondsLeft)}</span>
            </div>

            {/* Submit Button */}
            <button
              onClick={() => setShowSubmitConfirm(true)}
              style={{
                background: '#16a34a',
                color: '#fff',
                border: 'none',
                padding: '9px 18px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Submit Test
            </button>
          </div>
        </header>

        {/* Main Exam Workspace: Left question area, Right palette */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Question View Area */}
          <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
            {/* Question Info Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                  Question {currentIndex + 1} of {questions.length}
                </span>
                {curQ?.subjectName && (
                  <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                    {curQ.subjectName}
                  </span>
                )}
                {isMarkedReview && (
                  <span style={{ background: '#fef08a', color: '#854d0e', fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                    ★ Marked for Review
                  </span>
                )}
              </div>

              <div style={{ fontSize: 13, color: '#64748b' }}>
                Marks: <strong style={{ color: '#16a34a' }}>+{testInfo?.positiveMarks}</strong> / <strong style={{ color: '#dc2626' }}>-{testInfo?.negativeMarks}</strong>
              </div>
            </div>

            {/* Question Body */}
            <div style={{ fontSize: 16, lineHeight: 1.7, color: '#1e293b', marginBottom: 24, fontWeight: 500 }}>
              <MathText text={curQ?.questionText} />
            </div>

            {/* Options List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
              {curQ?.options?.map((opt, oIdx) => {
                const optKey = String.fromCharCode(65 + oIdx); // 'A', 'B', 'C', 'D'
                const isSelected = currentAnswer === optKey;

                return (
                  <div
                    key={oIdx}
                    onClick={() => handleSelectOption(qId, optKey)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      borderRadius: 10,
                      border: `1.5px solid ${isSelected ? '#2563eb' : '#cbd5e1'}`,
                      background: isSelected ? '#eff6ff' : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                      background: isSelected ? '#2563eb' : '#f1f5f9',
                      color: isSelected ? '#fff' : '#475569',
                      border: `1px solid ${isSelected ? '#2563eb' : '#cbd5e1'}`,
                    }}>
                      {optKey}
                    </div>

                    <div style={{ fontSize: 15, color: '#0f172a', flex: 1 }}>
                      <MathText text={opt} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Question Action Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 18 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleClearChoice(qId)}
                  disabled={!currentAnswer}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: currentAnswer ? '#dc2626' : '#94a3b8',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: currentAnswer ? 'pointer' : 'not-allowed',
                  }}
                >
                  Clear Choice
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleReview(qId)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    background: isMarkedReview ? '#fef08a' : '#f8fafc',
                    border: `1px solid ${isMarkedReview ? '#eab308' : '#cbd5e1'}`,
                    color: isMarkedReview ? '#854d0e' : '#475569',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isMarkedReview ? '★ Unmark Review' : '☆ Mark for Review'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 8,
                    background: '#e2e8f0',
                    border: 'none',
                    color: currentIndex === 0 ? '#94a3b8' : '#1e293b',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  ← Previous
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!isLastQ) setCurrentIndex((prev) => prev + 1);
                    else setShowSubmitConfirm(true);
                  }}
                  style={{
                    padding: '9px 20px',
                    borderRadius: 8,
                    background: '#2563eb',
                    border: 'none',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isLastQ ? 'Review & Submit' : 'Save & Next →'}
                </button>
              </div>
            </div>
          </main>

          {/* Right Question Palette (Desktop view) */}
          <aside style={{ width: 280, background: '#fff', borderLeft: '1px solid #e2e8f0', padding: 18, overflowY: 'auto' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, color: '#64748b' }}>
              Question Palette
            </h4>

            {/* Legend */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11, marginBottom: 16, background: '#f8fafc', padding: 8, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#16a34a' }} /> Answered
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#dc2626' }} /> Not Answered
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#eab308' }} /> Review
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#cbd5e1' }} /> Not Visited
              </div>
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {questions.map((q, idx) => {
                const status = getPaletteStatus(q.id);
                const isCurrent = idx === currentIndex;
                const badgeStyle = getBadgeStyle(status);

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    style={{
                      ...badgeStyle,
                      height: 38,
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      outline: isCurrent ? '2.5px solid #2563eb' : 'none',
                      outlineOffset: 1,
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PHASE 4: Scorecard & Solutions View
  // -------------------------------------------------------------
  if (phase === 'SCORECARD' && scoreResult) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '32px 16px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', background: '#fff', borderRadius: 16, border: '1px solid #cbd5e1', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {/* Header Banner */}
          <div style={{ background: '#0f172a', color: '#fff', padding: '28px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>
              {testInfo?.instituteName} · EXAM SCORECARD
            </div>
            <h1 style={{ fontSize: 24, margin: '8px 0', color: '#fff' }}>
              {testInfo?.title}
            </h1>
            <div style={{ fontSize: 14, color: '#94a3b8' }}>
              Student: <strong>{student?.studentName}</strong> (Roll: <strong>{student?.rollNumber}</strong>)
            </div>
          </div>

          {/* Score Summary Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '24px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <div style={{ textAlign: 'center', background: '#fff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>TOTAL SCORE</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#2563eb', margin: '4px 0' }}>
                {scoreResult.score} <span style={{ fontSize: 15, color: '#94a3b8' }}>/ {scoreResult.maxScore}</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Marks Secured</div>
            </div>

            <div style={{ textAlign: 'center', background: '#fff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>ACCURACY</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#16a34a', margin: '4px 0' }}>
                {scoreResult.accuracyPercentage}%
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Correct Ratio</div>
            </div>

            <div style={{ textAlign: 'center', background: '#fff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>BREAKDOWN</div>
              <div style={{ fontSize: 18, fontWeight: 700, margin: '8px 0', color: '#0f172a' }}>
                <span style={{ color: '#16a34a' }}>✓ {scoreResult.correctCount}</span> · <span style={{ color: '#dc2626' }}>✗ {scoreResult.incorrectCount}</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Unattempted: {scoreResult.unattemptedCount}</div>
            </div>

            <div style={{ textAlign: 'center', background: '#fff', padding: 16, borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>INTEGRITY</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: tabSwitchCount > 0 ? '#eab308' : '#16a34a', margin: '4px 0' }}>
                {tabSwitchCount}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Tab Switches Logged</div>
            </div>
          </div>

          {/* Solutions & Question Review Section */}
          {scoreResult.showSolutions && scoreResult.itemDetails && (
            <div style={{ padding: '24px 20px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 18, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📖</span> Question-by-Question Detailed Solutions
              </h3>

              {/* 2-Column Solutions Grid to reduce screen scrolling */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>
                {scoreResult.itemDetails.map((item, idx) => {
                  const isCorrect = item.isCorrect;
                  const isAttempted = item.isAttempted;

                  return (
                    <div
                      key={item.id}
                      style={{
                        border: `1.5px solid ${!isAttempted ? '#cbd5e1' : isCorrect ? '#86efac' : '#fca5a5'}`,
                        background: !isAttempted ? '#f8fafc' : isCorrect ? '#f0fdf4' : '#fef2f2',
                        borderRadius: 10,
                        padding: 14,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px dashed #cbd5e1', paddingBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                          Q. {idx + 1}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: !isAttempted ? '#64748b' : isCorrect ? '#16a34a' : '#dc2626' }}>
                          {!isAttempted ? '○ Skipped' : isCorrect ? '✓ Correct (+4)' : '✗ Incorrect (-1)'}
                        </span>
                      </div>

                      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: '#1e293b' }}>
                        <MathText text={item.questionText} />
                      </div>

                      <div style={{ display: 'flex', gap: 12, fontSize: 12.5, fontWeight: 600 }}>
                        <span>Your Answer: <strong style={{ color: isCorrect ? '#16a34a' : '#dc2626' }}>{item.studentAnswer || 'None'}</strong></span>
                        <span>Correct Answer: <strong style={{ color: '#16a34a' }}>({item.correctOption})</strong></span>
                      </div>

                      {item.solutionText && (
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '8px 10px', fontSize: 12.5, color: '#334155', marginTop: 4 }}>
                          <strong style={{ color: '#0f172a', display: 'block', marginBottom: 2 }}>Worked Solution:</strong>
                          <MathText text={item.solutionText} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!scoreResult.showSolutions && (
            <div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
              <h4 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>Solutions Under Hold</h4>
              <p style={{ margin: 0, fontSize: 13.5 }}>
                Your exam has been submitted safely. Detailed solutions will be released once all students complete the test.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
