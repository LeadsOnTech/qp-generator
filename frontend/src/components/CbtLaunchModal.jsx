import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function CbtLaunchModal({ paper, onClose, onOpenDashboard }) {
  const { user, hasModuleAccess } = useAuth();
  const navigate = useNavigate();
  const hasCbtAccess = user?.role === 'ADMIN' || hasModuleAccess('CBT');

  const isEapcet = paper?.examName?.toUpperCase().includes('EAPCET') || paper?.examName?.toUpperCase().includes('EAMCET');

  const [activeTests, setActiveTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(true);

  // Form State
  const [securityMode, setSecurityMode] = useState('STRICT_ROSTER'); // 'STRICT_ROSTER' | 'PIN_PROTECTED' | 'OPEN_PRACTICE'
  const [rosterInput, setRosterInput] = useState('24MPC001..24MPC060');
  const [examPin, setExamPin] = useState(String(Math.floor(1000 + Math.random() * 9000)));
  const [durationMinutes, setDurationMinutes] = useState(paper?.durationMinutes || 60);
  const [positiveMarks, setPositiveMarks] = useState(isEapcet ? 1.0 : 4.0);
  const [negativeMarks, setNegativeMarks] = useState(isEapcet ? 0.0 : 1.0);
  const [showSolutionsImmediate, setShowSolutionsImmediate] = useState(true);
  const [allowSingleAttempt, setAllowSingleAttempt] = useState(true);

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [createdTest, setCreatedTest] = useState(null);
  const [copied, setCopied] = useState(false);

  // Load existing tests
  const loadExistingTests = async () => {
    try {
      setLoadingTests(true);
      const list = await api.getCbtTestsForPaper(paper.id);
      setActiveTests(list || []);
    } catch {
      setActiveTests([]);
    } finally {
      setLoadingTests(false);
    }
  };

  useEffect(() => {
    if (paper?.id) loadExistingTests();
  }, [paper?.id]);

  const handleCreateTest = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      setError(null);
      const res = await api.createCbtTest({
        paperId: paper.id,
        securityMode,
        rosterInput: securityMode === 'STRICT_ROSTER' ? rosterInput : null,
        examPin: securityMode === 'PIN_PROTECTED' ? examPin : null,
        durationMinutes: parseInt(durationMinutes, 10) || 60,
        positiveMarks: parseFloat(positiveMarks) || 4.0,
        negativeMarks: parseFloat(negativeMarks) || 0.0,
        showSolutionsImmediate,
        allowSingleAttempt,
      });

      setCreatedTest(res.test);
      await loadExistingTests();
    } catch (err) {
      setError(err.message || 'Failed to create CBT test');
    } finally {
      setCreating(false);
    }
  };

  const getFullExamLink = (code) => {
    return `${window.location.origin}/#/cbt/${code}`;
  };

  const copyLink = (code) => {
    navigator.clipboard.writeText(getFullExamLink(code));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareWhatsApp = (test) => {
    const link = getFullExamLink(test.code);
    const text = encodeURIComponent(
      `*${paper?.instituteName || 'COLLEGE'} — ONLINE CBT EXAM*\n` +
      `Test: *${paper?.title || paper?.examName}*\n` +
      `Duration: ${test.durationMinutes} Mins\n` +
      (test.examPin ? `4-Digit PIN: *${test.examPin}*\n` : '') +
      `\nClick here to start test: ${link}\n\n` +
      `_Note: Enter your official College Roll Number. 1 attempt only._`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  if (!hasCbtAccess) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          fontFamily: 'system-ui, sans-serif',
        }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: 520,
            width: '100%',
            borderRadius: 16,
            overflow: 'hidden',
            padding: 0,
            border: '1px solid #e2e8f0',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            background: '#ffffff',
          }}
        >
          <div style={{ background: '#07154A', color: '#fff', padding: '24px', position: 'relative' }}>
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#fff',
                borderRadius: '50%',
                width: 32,
                height: 32,
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
            <div style={{ fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: 20, display: 'inline-block', marginBottom: 8 }}>
              💻 OPTIONAL ADD-ON MODULE
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: '#ffffff' }}>
              Online Examination (CBT)
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: '#bfdbfe', lineHeight: 1.4 }}>
              Instant computer-based test deployment, secure PIN codes, anti-cheating controls, and real-time live scoreboards.
            </p>
          </div>
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '16px', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Module Pricing</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#07154A' }}>
                  ₹1,999 <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>/ month</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 700 }}>OR ALL 4 IN BUNDLE</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>₹4,499 / mo</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, margin: '0 0 20px' }}>
              Your institution does not have an active CBT subscription. Activate this module or the Complete Bundle to launch online CBT tests from any paper.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/subscriptions');
                }}
                style={{ flex: 1, padding: '10px 16px', background: '#07154A', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              >
                View Plans & Activate →
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '10px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.7)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: 'system-ui, sans-serif',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          width: '100%',
          maxWidth: 640,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background: '#0f172a', color: '#fff', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: '#38bdf8', fontWeight: 700 }}>
              Digital Expansion · Phase 3
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '4px 0 0 0', color: '#fff' }}>
              🚀 Host Online Student CBT Exam
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* Active Tests Section */}
          {activeTests.length > 0 && !createdTest && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: 8 }}>
                Existing CBT Tests for this paper ({activeTests.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activeTests.map((t) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 12px' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>{t.code}</span>
                      <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>
                        {t._count?.submissions || 0} submissions · {t.securityMode}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => copyLink(t.code)}
                        style={{ padding: '4px 8px', borderRadius: 4, background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: 12, cursor: 'pointer' }}
                      >
                        📋 Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => shareWhatsApp(t)}
                        style={{ padding: '4px 8px', borderRadius: 4, background: '#25D366', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        💬 WhatsApp
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenDashboard(t.code);
                        }}
                        style={{ padding: '4px 8px', borderRadius: 4, background: '#2563eb', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        📊 Rankboard
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success Card when test is created */}
          {createdTest ? (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ fontSize: 44, marginBottom: 8 }}>🎉</div>
              <h3 style={{ fontSize: 20, margin: '0 0 6px 0', color: '#16a34a' }}>CBT Exam Link Generated!</h3>
              <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 20px 0' }}>
                Your exam is live. Share this link on WhatsApp with your student batch.
              </p>

              {/* Link Box */}
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {getFullExamLink(createdTest.code)}
                </div>
                <button
                  type="button"
                  onClick={() => copyLink(createdTest.code)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    background: copied ? '#16a34a' : '#2563eb',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {copied ? '✓ Copied!' : '📋 Copy Link'}
                </button>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => shareWhatsApp(createdTest)}
                  style={{
                    padding: '12px 20px',
                    borderRadius: 8,
                    background: '#25D366',
                    color: '#fff',
                    border: 'none',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span>💬</span> Share to WhatsApp Group
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDashboard(createdTest.code);
                  }}
                  style={{
                    padding: '12px 20px',
                    borderRadius: 8,
                    background: '#0f172a',
                    color: '#fff',
                    border: 'none',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  📊 Open Live Rankboard
                </button>
              </div>
            </div>
          ) : (
            /* Creation Form */
            <form onSubmit={handleCreateTest}>
              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: 10, borderRadius: 8, marginBottom: 16, fontSize: 13.5 }}>
                  {error}
                </div>
              )}

              {/* Security Level Radio */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
                  🛡️ Access Control & Anti-Forwarding Security
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: 12,
                    borderRadius: 8,
                    border: `1.5px solid ${securityMode === 'STRICT_ROSTER' ? '#2563eb' : '#e2e8f0'}`,
                    background: securityMode === 'STRICT_ROSTER' ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                  }}>
                    <input
                      type="radio"
                      name="secMode"
                      value="STRICT_ROSTER"
                      checked={securityMode === 'STRICT_ROSTER'}
                      onChange={() => setSecurityMode('STRICT_ROSTER')}
                      style={{ marginTop: 3 }}
                    />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                        Strict Roster Whitelist <span style={{ background: '#16a34a', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4, marginLeft: 6 }}>RECOMMENDED</span>
                      </div>
                      <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
                        Only enrolled roll numbers can open the test. 1 attempt per roll number. Outsiders blocked 100%.
                      </div>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: 12,
                    borderRadius: 8,
                    border: `1.5px solid ${securityMode === 'PIN_PROTECTED' ? '#2563eb' : '#e2e8f0'}`,
                    background: securityMode === 'PIN_PROTECTED' ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                  }}>
                    <input
                      type="radio"
                      name="secMode"
                      value="PIN_PROTECTED"
                      checked={securityMode === 'PIN_PROTECTED'}
                      onChange={() => setSecurityMode('PIN_PROTECTED')}
                      style={{ marginTop: 3 }}
                    />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                        4-Digit Exam PIN (Best for Daily Evening DPPs)
                      </div>
                      <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
                        Quick launch. Requires students to enter a 4-digit PIN provided on blackboard or WhatsApp.
                      </div>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: 12,
                    borderRadius: 8,
                    border: `1.5px solid ${securityMode === 'OPEN_PRACTICE' ? '#2563eb' : '#e2e8f0'}`,
                    background: securityMode === 'OPEN_PRACTICE' ? '#eff6ff' : '#fff',
                    cursor: 'pointer',
                  }}>
                    <input
                      type="radio"
                      name="secMode"
                      value="OPEN_PRACTICE"
                      checked={securityMode === 'OPEN_PRACTICE'}
                      onChange={() => setSecurityMode('OPEN_PRACTICE')}
                      style={{ marginTop: 3 }}
                    />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                        Open Practice Test (For Revision / Demo Admissions)
                      </div>
                      <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
                        Anyone with the link can enter. Unverified students are isolated into the "Guest Tab".
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Roster Input box when STRICT_ROSTER */}
              {securityMode === 'STRICT_ROSTER' && (
                <div style={{ marginBottom: 18, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                    Enrolled Roll Numbers / Range:
                  </label>
                  <textarea
                    rows={3}
                    value={rosterInput}
                    onChange={(e) => setRosterInput(e.target.value)}
                    placeholder="e.g. 24MPC001..24MPC060 or comma-separated roll numbers"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'monospace', boxSizing: 'border-box' }}
                  />
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>
                    💡 Tip: Supports ranges like <code>24MPC001..24MPC060</code> or comma-separated lists.
                  </div>
                </div>
              )}

              {/* PIN input box when PIN_PROTECTED */}
              {securityMode === 'PIN_PROTECTED' && (
                <div style={{ marginBottom: 18, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                    4-Digit Exam PIN:
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={examPin}
                    onChange={(e) => setExamPin(e.target.value)}
                    style={{ width: 140, padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 16, fontWeight: 700, letterSpacing: 2 }}
                  />
                </div>
              )}

              {/* Timing & Marking Config */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={360}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                    Correct (+ Marks)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={positiveMarks}
                    onChange={(e) => setPositiveMarks(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
                    Negative (- Marks)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={negativeMarks}
                    onChange={(e) => setNegativeMarks(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showSolutionsImmediate}
                    onChange={(e) => setShowSolutionsImmediate(e.target.checked)}
                  />
                  <span>Show detailed 2-column solutions immediately upon student submission</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={allowSingleAttempt}
                    onChange={(e) => setAllowSingleAttempt(e.target.checked)}
                  />
                  <span>Lock to 1 attempt per student (disables re-attempts with same roll number)</span>
                </label>
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ padding: '10px 18px', borderRadius: 8, background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 8,
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: creating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {creating ? 'Generating Link…' : '🚀 Generate CBT Link'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
