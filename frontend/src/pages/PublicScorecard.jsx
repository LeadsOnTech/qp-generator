// frontend/src/pages/PublicScorecard.jsx
// Public, mobile-optimized Student Performance Report viewer for Parents & Students.
// Authenticated via secure cryptographic token (/r/:token) — No login required.

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api');

export default function PublicScorecard() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    async function loadReport() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getPublicResult(token);
        setReport(data.report);
      } catch (err) {
        setError(err.message || 'Unable to load examination report. The link may have expired or is invalid.');
      } finally {
        setLoading(false);
      }
    }
    if (token) loadReport();
  }, [token]);

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: 16, color: '#475569', fontWeight: 500 }}>
          Verifying and loading official performance report...
        </p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div style={styles.errorWrap}>
        <div style={styles.errorCard}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ color: '#0f172a', margin: '0 0 8px 0', fontSize: 20 }}>Report Unavailable</h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 16px 0', lineHeight: 1.5 }}>
            {error || 'This examination report could not be found.'}
          </p>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>
            Please check the link received on WhatsApp or contact your college academic office.
          </div>
        </div>
      </div>
    );
  }

  const {
    studentName,
    rollNumber,
    batchName,
    section,
    examName,
    examDate,
    examType,
    marksObtained,
    maxMarks,
    percentage,
    accuracyPercentage,
    rank,
    totalStudents,
    correctAnswers,
    incorrectAnswers,
    unattemptedQuestions,
    negativeMarksDeducted,
    academicInsight,
    institute = {},
    subjectResults = [],
    chapterResults = [],
  } = report;

  const formattedDate = examDate
    ? new Date(examDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Recent';

  const downloadPdfUrl = `${API_BASE}/public/results/${token}/pdf`;

  return (
    <div style={styles.pageWrap}>
      {/* Top Header Branding */}
      <header style={styles.header}>
        <div style={styles.brandRow}>
          {institute.logoFilename ? (
            <img
              src={`/uploads/logos/${institute.logoFilename}`}
              alt={institute.name}
              style={styles.logoImg}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div style={styles.emblemBadge}>🎓</div>
          )}
          <div>
            <h1 style={styles.collegeName}>{institute.name || 'Academic Institute'}</h1>
            {institute.tagline && <p style={styles.tagline}>{institute.tagline}</p>}
          </div>
        </div>
        <div style={styles.verifiedBadge}>
          <span style={{ marginRight: 6 }}>🛡️</span> Official Verified Report
        </div>
      </header>

      {/* Main Scorecard Container */}
      <main style={styles.mainContent}>
        {/* Student & Exam Banner */}
        <section style={styles.studentBanner}>
          <div style={styles.bannerCol}>
            <div style={styles.metaLabel}>STUDENT</div>
            <div style={styles.studentNameText}>{studentName}</div>
            <div style={styles.metaSub}>
              Roll No: <span style={{ fontWeight: 600, color: '#0f172a' }}>{rollNumber}</span> • Batch: {batchName}
              {section ? ` (${section})` : ''}
            </div>
          </div>
          <div style={styles.bannerColRight}>
            <div style={styles.metaLabel}>EXAMINATION</div>
            <div style={styles.examNameText}>{examName}</div>
            <div style={styles.metaSub}>
              Date: {formattedDate} • Mode: {examType === 'CBT' ? 'Online CBT' : 'OMR Offline'}
            </div>
          </div>
        </section>

        {/* 4 Core KPI Tiles */}
        <div style={styles.kpiGrid}>
          {/* Marks */}
          <div style={{ ...styles.kpiCard, borderLeft: '4px solid #10b981', background: '#f0fdf4' }}>
            <div style={styles.kpiLabel}>MARKS OBTAINED</div>
            <div style={{ ...styles.kpiValue, color: '#047857' }}>
              {marksObtained} <span style={styles.kpiSub}>/ {maxMarks}</span>
            </div>
          </div>

          {/* Score Percentage */}
          <div style={{ ...styles.kpiCard, borderLeft: '4px solid #3b82f6', background: '#eff6ff' }}>
            <div style={styles.kpiLabel}>SCORE PERCENTAGE</div>
            <div style={{ ...styles.kpiValue, color: '#1d4ed8' }}>{percentage}%</div>
          </div>

          {/* Accuracy */}
          <div style={{ ...styles.kpiCard, borderLeft: '4px solid #14b8a6', background: '#f0fdfa' }}>
            <div style={styles.kpiLabel}>ACCURACY</div>
            <div style={{ ...styles.kpiValue, color: '#0f766e' }}>{accuracyPercentage}%</div>
          </div>

          {/* College Rank */}
          <div style={{ ...styles.kpiCard, borderLeft: '4px solid #f59e0b', background: '#fffbeb' }}>
            <div style={styles.kpiLabel}>COLLEGE RANK</div>
            <div style={{ ...styles.kpiValue, color: '#b45309' }}>
              #{rank} <span style={styles.kpiSub}>of {totalStudents}</span>
            </div>
          </div>
        </div>

        {/* Question Attempt Breakdown */}
        <section style={styles.cardSection}>
          <h2 style={styles.sectionHeading}>Question Analysis</h2>
          <div style={styles.breakdownRow}>
            <div style={styles.breakdownTile}>
              <div style={{ ...styles.breakdownNum, color: '#16a34a' }}>{correctAnswers}</div>
              <div style={styles.breakdownLabel}>Correct Answers</div>
            </div>
            <div style={styles.breakdownTile}>
              <div style={{ ...styles.breakdownNum, color: '#dc2626' }}>{incorrectAnswers}</div>
              <div style={styles.breakdownLabel}>Incorrect (-marks)</div>
            </div>
            <div style={styles.breakdownTile}>
              <div style={{ ...styles.breakdownNum, color: '#64748b' }}>{unattemptedQuestions}</div>
              <div style={styles.breakdownLabel}>Not Attempted</div>
            </div>
            <div style={styles.breakdownTile}>
              <div style={{ ...styles.breakdownNum, color: '#991b1b' }}>-{negativeMarksDeducted}</div>
              <div style={styles.breakdownLabel}>Negative Marks Lost</div>
            </div>
          </div>
        </section>

        {/* Subject-Wise Performance */}
        {subjectResults.length > 0 && (
          <section style={styles.cardSection}>
            <h2 style={styles.sectionHeading}>Subject-Wise Performance</h2>
            <div style={styles.tableScroll}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thRow}>
                    <th style={styles.th}>Subject</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Total</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Attempt</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Correct</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Wrong</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>Accuracy</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectResults.map((sub, idx) => (
                    <tr key={idx} style={{ ...styles.tr, background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                      <td style={{ ...styles.td, fontWeight: 600, color: '#0f172a' }}>{sub.subjectName}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{sub.totalQuestions}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{sub.attemptedQuestions}</td>
                      <td style={{ ...styles.td, textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>
                        {sub.correctCount}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>
                        {sub.incorrectCount}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center', fontWeight: 600 }}>
                        <span
                          style={{
                            color:
                              sub.accuracyPercentage >= 75
                                ? '#059669'
                                : sub.accuracyPercentage >= 50
                                ? '#d97706'
                                : '#dc2626',
                          }}
                        >
                          {sub.accuracyPercentage}%
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        {sub.marksObtained} / {sub.maxMarks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Chapter-Wise Diagnostic Status */}
        {chapterResults.length > 0 && (
          <section style={styles.cardSection}>
            <h2 style={styles.sectionHeading}>Chapter Mastery & Diagnostic Analysis</h2>
            <div style={styles.chapterGrid}>
              {chapterResults.map((chap, idx) => {
                let badgeBg = '#f1f5f9';
                let badgeColor = '#475569';
                let statusLabel = 'AVERAGE';

                if (chap.status === 'STRONG') {
                  badgeBg = '#dcfce7';
                  badgeColor = '#15803d';
                  statusLabel = 'STRONG';
                } else if (chap.status === 'WEAK') {
                  badgeBg = '#fee2e2';
                  badgeColor = '#b91c1c';
                  statusLabel = 'NEEDS FOCUS';
                }

                return (
                  <div key={idx} style={styles.chapItem}>
                    <div style={{ flex: 1 }}>
                      <div style={styles.chapName}>{chap.chapterName}</div>
                      <div style={styles.chapSub}>
                        {chap.correctCount} correct of {chap.attemptedQuestions} attempted ({chap.accuracyPercentage}%)
                      </div>
                    </div>
                    <span style={{ ...styles.chapBadge, background: badgeBg, color: badgeColor }}>
                      {statusLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Academic Feedback Note */}
        {academicInsight && (
          <section style={styles.insightCard}>
            <div style={styles.insightHeader}>
              <span style={{ fontSize: 20, marginRight: 8 }}>💡</span>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0369a1' }}>
                Academic Directorate Feedback
              </h3>
            </div>
            <p style={styles.insightText}>{academicInsight}</p>
          </section>
        )}

        {/* Action Button: Download Official PDF */}
        <div style={styles.actionWrap}>
          <a
            href={downloadPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.downloadPdfBtn}
          >
            📥 Download Official Performance PDF (A4)
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={{ margin: '0 0 4px 0', fontSize: 12, color: '#64748b' }}>
          Digitally generated performance report certified by {institute.name || 'Academic Institution'}.
        </p>
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
          Powered by QuestionStudio Academic Performance & Evaluation System
        </p>
      </footer>
    </div>
  );
}

const styles = {
  pageWrap: {
    minHeight: '100vh',
    background: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    flexDirection: 'column',
  },
  loadingWrap: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fafc',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '4px solid #cbd5e1',
    borderTop: '4px solid #2563eb',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorWrap: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    background: '#f8fafc',
  },
  errorCard: {
    maxWidth: 420,
    background: '#fff',
    padding: 32,
    borderRadius: 12,
    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
    textAlign: 'center',
  },
  header: {
    background: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  logoImg: {
    width: 44,
    height: 44,
    objectFit: 'contain',
    borderRadius: 6,
  },
  emblemBadge: {
    width: 44,
    height: 44,
    borderRadius: 8,
    background: '#e0f2fe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
  },
  collegeName: {
    margin: 0,
    fontSize: 17,
    fontWeight: 700,
    color: '#0f172a',
  },
  tagline: {
    margin: '2px 0 0 0',
    fontSize: 12,
    color: '#64748b',
  },
  verifiedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    background: '#f1f5f9',
    color: '#334155',
    padding: '6px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  mainContent: {
    flex: 1,
    maxWidth: 860,
    width: '100%',
    margin: '0 auto',
    padding: '24px 16px',
  },
  studentBanner: {
    background: '#ffffff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  bannerCol: {
    flex: 1,
    minWidth: 240,
  },
  bannerColRight: {
    flex: 1,
    minWidth: 240,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: '#64748b',
    letterSpacing: '0.05em',
    marginBottom: 4,
  },
  studentNameText: {
    fontSize: 20,
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 4,
  },
  examNameText: {
    fontSize: 18,
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: 4,
  },
  metaSub: {
    fontSize: 13,
    color: '#475569',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
    marginBottom: 20,
  },
  kpiCard: {
    padding: 16,
    borderRadius: 10,
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#475569',
    marginBottom: 6,
    letterSpacing: '0.04em',
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: 800,
    lineHeight: 1.1,
  },
  kpiSub: {
    fontSize: 14,
    fontWeight: 500,
    color: '#64748b',
  },
  cardSection: {
    background: '#ffffff',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 16px 0',
  },
  breakdownRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: 12,
    textAlign: 'center',
  },
  breakdownTile: {
    background: '#f8fafc',
    padding: 14,
    borderRadius: 8,
  },
  breakdownNum: {
    fontSize: 22,
    fontWeight: 800,
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: 500,
  },
  tableScroll: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  thRow: {
    background: '#1e293b',
  },
  th: {
    padding: '10px 12px',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 600,
    textAlign: 'left',
  },
  tr: {
    borderBottom: '1px solid #e2e8f0',
  },
  td: {
    padding: '10px 12px',
    color: '#334155',
  },
  chapterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 10,
  },
  chapItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    background: '#f8fafc',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
  },
  chapName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#1e293b',
  },
  chapSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  chapBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: '4px 8px',
    borderRadius: 4,
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
    marginLeft: 8,
  },
  insightCard: {
    background: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: 12,
    padding: 18,
    marginBottom: 24,
  },
  insightHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightText: {
    margin: 0,
    fontSize: 13,
    color: '#0c4a6e',
    lineHeight: 1.5,
  },
  actionWrap: {
    textAlign: 'center',
    marginBottom: 32,
  },
  downloadPdfBtn: {
    display: 'inline-block',
    background: '#2563eb',
    color: '#ffffff',
    padding: '14px 28px',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 15,
    textDecoration: 'none',
    boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
  },
  footer: {
    background: '#ffffff',
    borderTop: '1px solid #e2e8f0',
    padding: 20,
    textAlign: 'center',
  },
};
