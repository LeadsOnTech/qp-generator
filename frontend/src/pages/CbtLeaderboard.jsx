import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function CbtLeaderboard() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('verified'); // 'verified' | 'quarantined'
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getCbtLeaderboard(code);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds for live updates
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [code]);

  const examLink = `${window.location.origin}/#/cbt/${code}`;

  const copyLink = () => {
    navigator.clipboard.writeText(examLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(
      `*${data?.test?.instituteName || 'COLLEGE'} — ONLINE CBT EXAM*\n` +
      `Test: *${data?.test?.title}*\n` +
      `Duration: ${data?.test?.durationMinutes} Mins | Questions: ${data?.test?.totalQuestions}\n` +
      (data?.test?.examPin ? `4-Digit PIN: *${data?.test?.examPin}*\n` : '') +
      `\nClick to start exam: ${examLink}\n\n` +
      `_Note: Enter your official College Roll Number. 1 attempt only._`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const shareStudentScoreWhatsApp = (student) => {
    const text = encodeURIComponent(
      `*${data?.test?.instituteName} — Exam Scorecard*\n` +
      `Student: *${student.studentName}* (${student.rollNumber})\n` +
      `Exam: *${data?.test?.title}*\n` +
      `Rank: *#${student.rank}* / ${data?.totalVerified}\n` +
      `Score: *${student.score}* / ${student.maxScore} (Accuracy: ${student.accuracyPercentage}%)\n` +
      `Status: Correct ${student.correctCount}, Wrong ${student.incorrectCount}\n` +
      `\nGreat effort!`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleToggleStatus = async (newStatus) => {
    try {
      setActionLoading(true);
      await api.toggleCbtStatus(code, newStatus);
      await loadData();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSubmission = async (subId) => {
    if (!window.confirm('Are you sure you want to delete this submission?')) return;
    try {
      await api.deleteCbtSubmission(code, subId);
      await loadData();
    } catch (err) {
      alert('Failed to delete submission: ' + err.message);
    }
  };

  const handleExportCSV = () => {
    if (!data?.verifiedList?.length) {
      alert('No verified submissions to export.');
      return;
    }

    const headers = ['Rank', 'Roll Number', 'Student Name', 'Section', 'Score', 'Max Score', 'Accuracy %', 'Correct', 'Incorrect', 'Unattempted', 'Time (Seconds)', 'Tab Switches', 'Submitted At'];
    const rows = data.verifiedList.map((s) => [
      s.rank,
      `"${s.rollNumber}"`,
      `"${s.studentName}"`,
      `"${s.section || ''}"`,
      s.score,
      s.maxScore,
      s.accuracyPercentage,
      s.correctCount,
      s.incorrectCount,
      s.unattemptedCount,
      s.timeSpentSeconds,
      s.tabSwitchCount,
      `"${new Date(s.submittedAt).toLocaleString('en-IN')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${data?.test?.title?.replace(/\s+/g, '_')}_leaderboard.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !data) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
        Loading CBT exam leaderboard…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>
        <h3>Error loading exam</h3>
        <p>{error}</p>
        <Link to="/papers" style={{ color: '#2563eb' }}>← Back to Papers</Link>
      </div>
    );
  }

  const test = data?.test;
  const verifiedList = data?.verifiedList || [];
  const quarantinedList = data?.quarantinedList || [];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Top Breadcrumb & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <Link to="/papers" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none' }}>
            ← Back to Generated Papers
          </Link>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '6px 0 2px 0', color: '#0f172a' }}>
            {test?.title}
          </h1>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            {test?.instituteName} · Code: <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{test?.code}</code>
            {' '}· Security: <strong>{test?.securityMode}</strong>
            {test?.examPin && <> · PIN: <strong style={{ color: '#eab308' }}>{test?.examPin}</strong></>}
          </div>
        </div>

        {/* Share & Link Controls */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={copyLink}
            style={{
              padding: '9px 14px',
              borderRadius: 8,
              background: copied ? '#16a34a' : '#fff',
              color: copied ? '#fff' : '#0f172a',
              border: '1px solid #cbd5e1',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {copied ? '✓ Link Copied!' : '📋 Copy Exam Link'}
          </button>

          <button
            onClick={shareOnWhatsApp}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              background: '#25D366',
              color: '#fff',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>💬</span> Share to WhatsApp Group
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>ATTEMPTED</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
            {data?.totalVerified}
          </div>
          <div style={{ fontSize: 11, color: '#16a34a' }}>Enrolled Students</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>TOP SCORE</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a', margin: '4px 0' }}>
            {data?.topScore}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Highest in Class</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>AVG SCORE</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#2563eb', margin: '4px 0' }}>
            {data?.averageScore}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Class Mean Marks</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>EXAM STATUS</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: test?.status === 'ACTIVE' ? '#16a34a' : '#dc2626', margin: '6px 0' }}>
            {test?.status}
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            {test?.status === 'ACTIVE' ? (
              <button
                disabled={actionLoading}
                onClick={() => handleToggleStatus('PAUSED')}
                style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5', cursor: 'pointer' }}
              >
                Pause Test
              </button>
            ) : (
              <button
                disabled={actionLoading}
                onClick={() => handleToggleStatus('ACTIVE')}
                style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', cursor: 'pointer' }}
              >
                Activate Test
              </button>
            )}
          </div>
        </div>

        <div style={{ background: data?.totalQuarantined > 0 ? '#fff1f2' : '#fff', border: `1px solid ${data?.totalQuarantined > 0 ? '#fecdd3' : '#e2e8f0'}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, color: data?.totalQuarantined > 0 ? '#e11d48' : '#64748b', fontWeight: 600 }}>QUARANTINED</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: data?.totalQuarantined > 0 ? '#e11d48' : '#64748b', margin: '4px 0' }}>
            {data?.totalQuarantined}
          </div>
          <div style={{ fontSize: 11, color: data?.totalQuarantined > 0 ? '#be123c' : '#64748b' }}>
            {data?.totalQuarantined > 0 ? 'Outsiders Flagged' : 'Zero Outsiders'}
          </div>
        </div>
      </div>

      {/* Main Tabs & Export Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #cbd5e1', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <button
            onClick={() => setActiveTab('verified')}
            style={{
              padding: '10px 4px',
              border: 'none',
              background: 'none',
              fontSize: 15,
              fontWeight: activeTab === 'verified' ? 700 : 500,
              color: activeTab === 'verified' ? '#2563eb' : '#64748b',
              borderBottom: activeTab === 'verified' ? '2.5px solid #2563eb' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>🏆 Official Class Rankboard ({verifiedList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('quarantined')}
            style={{
              padding: '10px 4px',
              border: 'none',
              background: 'none',
              fontSize: 15,
              fontWeight: activeTab === 'quarantined' ? 700 : 500,
              color: activeTab === 'quarantined' ? '#e11d48' : '#64748b',
              borderBottom: activeTab === 'quarantined' ? '2.5px solid #e11d48' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>🛡️ Quarantined Outsiders ({quarantinedList.length})</span>
          </button>
        </div>

        <div>
          <button
            onClick={handleExportCSV}
            style={{
              padding: '7px 14px',
              borderRadius: 6,
              background: '#0f172a',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            📥 Export to CSV / Excel
          </button>
        </div>
      </div>

      {/* Tab 1: Official Verified Leaderboard */}
      {activeTab === 'verified' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          {verifiedList.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
              <h4 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>No student submissions yet</h4>
              <p style={{ margin: 0, fontSize: 13.5 }}>
                Share the exam link with your students. As soon as they submit, real-time ranks will show up here.
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px' }}>Rank</th>
                  <th style={{ padding: '12px 16px' }}>Student Name</th>
                  <th style={{ padding: '12px 16px' }}>Roll Number</th>
                  <th style={{ padding: '12px 16px' }}>Section</th>
                  <th style={{ padding: '12px 16px' }}>Score</th>
                  <th style={{ padding: '12px 16px' }}>Accuracy</th>
                  <th style={{ padding: '12px 16px' }}>Time</th>
                  <th style={{ padding: '12px 16px' }}>Integrity</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {verifiedList.map((student) => (
                  <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: student.rank <= 3 ? '#eab308' : '#0f172a' }}>
                      {student.rank === 1 ? '🥇 1' : student.rank === 2 ? '🥈 2' : student.rank === 3 ? '🥉 3' : `#${student.rank}`}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                      {student.studentName}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', fontFamily: 'monospace' }}>
                      {student.rollNumber}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {student.section || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 800, color: '#2563eb' }}>
                      {student.score} <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>/ {student.maxScore}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#16a34a' }}>
                      {student.accuracyPercentage}%
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {Math.floor(student.timeSpentSeconds / 60)}m {student.timeSpentSeconds % 60}s
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {student.tabSwitchCount > 0 ? (
                        <span style={{ background: '#fef9c3', color: '#854d0e', padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                          ⚠️ {student.tabSwitchCount} switches
                        </span>
                      ) : (
                        <span style={{ color: '#16a34a', fontSize: 11, fontWeight: 700 }}>✓ Clean</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => shareStudentScoreWhatsApp(student)}
                        style={{
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          color: '#15803d',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        💬 WhatsApp Card
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 2: Quarantined Outsider Submissions */}
      {activeTab === 'quarantined' && (
        <div style={{ background: '#fff', border: '1px solid #fecdd3', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ background: '#fff1f2', padding: '12px 16px', borderBottom: '1px solid #fecdd3', color: '#9f1239', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              🛡️ <strong>Outsider Protection Active:</strong> These submissions did not match your official roster. They are isolated here so your class ranks are 100% clean.
            </div>
          </div>

          {quarantinedList.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
              <h4 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>Zero Quarantined Submissions</h4>
              <p style={{ margin: 0, fontSize: 13.5 }}>
                All student attempts have come from verified roll numbers.
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px' }}>Student Name</th>
                  <th style={{ padding: '12px 16px' }}>Entered Roll No</th>
                  <th style={{ padding: '12px 16px' }}>Score</th>
                  <th style={{ padding: '12px 16px' }}>Time</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {quarantinedList.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{item.studentName}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#e11d48' }}>{item.rollNumber}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{item.score} / {item.maxScore}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{Math.floor(item.timeSpentSeconds / 60)}m</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteSubmission(item.id)}
                        style={{ background: '#fff', border: '1px solid #fca5a5', color: '#dc2626', padding: '4px 8px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
