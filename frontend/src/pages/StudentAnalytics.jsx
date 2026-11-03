// frontend/src/pages/StudentAnalytics.jsx
// Student Performance Dashboard, Historical Progress Tracker & Multi-Test Trend Analytics.

import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api');

export default function StudentAnalytics() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRoll = searchParams.get('roll') || '';

  const [studentsList, setStudentsList] = useState([]);
  const [selectedRoll, setSelectedRoll] = useState(initialRoll);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Remedial DPP Modal State
  const [remedialModal, setRemedialModal] = useState(null);
  const [generatingRemedial, setGeneratingRemedial] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  // Load students roster on mount
  useEffect(() => {
    async function fetchRoster() {
      try {
        const data = await api.getAnalyticsStudentsList();
        setStudentsList(data.students || []);
        if (!initialRoll && data.students?.length > 0) {
          setSelectedRoll(data.students[0].rollNumber);
          setSearchParams({ roll: data.students[0].rollNumber });
        }
      } catch (err) {
        console.error('Failed to load students roster:', err);
      }
    }
    fetchRoster();
  }, []);

  // Load selected student analytics
  useEffect(() => {
    if (!selectedRoll) return;

    async function loadStudentData() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getStudentAnalytics(selectedRoll);
        setAnalyticsData(data);
      } catch (err) {
        setError(err.message || 'Failed to load student progress');
        setAnalyticsData(null);
      } finally {
        setLoading(false);
      }
    }
    loadStudentData();
  }, [selectedRoll]);

  async function handleGenerateRemedial(specificChapters = []) {
    if (!analyticsData?.student) return;
    try {
      setGeneratingRemedial(true);
      const chaps = specificChapters.length > 0
        ? specificChapters
        : analyticsData.chronicWeakChapters?.map((c) => c.chapterName) || [];

      const res = await api.generateRemedialPaper({
        targetType: 'STUDENT',
        studentName: analyticsData.student.studentName,
        rollNumber: analyticsData.student.rollNumber,
        chapterNames: chaps,
        questionCount: 15,
      });

      setRemedialModal(res);
    } catch (err) {
      alert('Failed to generate remedial paper: ' + err.message);
    } finally {
      setGeneratingRemedial(false);
    }
  }

  async function handleExportCsv() {
    if (!analyticsData?.student?.rollNumber) return;
    try {
      setExportingCsv(true);
      await api.downloadStudentAnalyticsCsv(analyticsData.student.rollNumber);
    } catch (err) {
      alert('Failed to export CSV: ' + err.message);
    } finally {
      setExportingCsv(false);
    }
  }

  function handleSelectStudent(roll) {
    setSelectedRoll(roll);
    setSearchParams({ roll });
  }

  const filteredStudents = studentsList.filter(
    (s) =>
      s.studentName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.batchName.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.headerRow}>
        <div>
          <div style={styles.badge}>MODULE 4 & 5: PERFORMANCE TRACKER</div>
          <h1 style={styles.title}>Student Performance Analytics & Progress Tracker</h1>
          <p style={styles.subtitle}>
            Historical score progression, percentage-point gains, subject trends, and chronic weak area diagnostic audit.
          </p>
        </div>
      </div>

      {/* Main Two-Column Layout: Left Roster, Right Analytics */}
      <div style={styles.layoutGrid}>
        {/* Left Column: Student Roster Search & Selector */}
        <div style={styles.rosterCard}>
          <div style={{ padding: 14, borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
              Enrolled Students ({studentsList.length})
            </div>
            <input
              type="text"
              placeholder="Filter by name, roll, batch..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={styles.rosterSearchInput}
            />
          </div>
          <div style={styles.rosterList}>
            {filteredStudents.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                No students found
              </div>
            ) : (
              filteredStudents.map((s) => {
                const isSelected = s.rollNumber === selectedRoll;
                return (
                  <div
                    key={s.rollNumber}
                    onClick={() => handleSelectStudent(s.rollNumber)}
                    style={{
                      ...styles.rosterItem,
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      borderLeft: isSelected ? '4px solid #2563eb' : '4px solid transparent',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{s.studentName}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      Roll: <span style={{ fontWeight: 600 }}>{s.rollNumber}</span> • {s.batchName}
                    </div>
                    <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, marginTop: 4 }}>
                      {s.totalExams} {s.totalExams === 1 ? 'Exam' : 'Exams'} • Avg: {s.averagePercentage}%
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Performance Analytics */}
        <div style={styles.analyticsCol}>
          {loading ? (
            <div style={styles.emptyCard}>
              <div style={styles.spinner}></div>
              <p style={{ marginTop: 16, color: '#64748b' }}>Analyzing multi-exam performance records...</p>
            </div>
          ) : error ? (
            <div style={styles.emptyCard}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
              <div style={{ color: '#dc2626', fontWeight: 600 }}>{error}</div>
            </div>
          ) : !analyticsData ? (
            <div style={styles.emptyCard}>
              <p style={{ color: '#64748b' }}>Select a student from the left roster to view performance analytics.</p>
            </div>
          ) : (
            <div>
              {/* Student Profile Bar */}
              <div style={styles.profileBanner}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', letterSpacing: '0.04em' }}>STUDENT PROFILE</span>
                    {analyticsData.student.courseTarget && (
                      <span style={{
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                      }}>
                        🎯 {analyticsData.student.courseTarget}
                      </span>
                    )}
                    {analyticsData.student.classYear && (
                      <span style={{
                        background: '#f8fafc',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                      }}>
                        🎓 {analyticsData.student.classYear}
                      </span>
                    )}
                    {analyticsData.student.hostelStatus && (
                      <span style={{
                        background: analyticsData.student.hostelStatus.toLowerCase().includes('hostel') ? '#faf5ff' : '#f0fdf4',
                        color: analyticsData.student.hostelStatus.toLowerCase().includes('hostel') ? '#7e22ce' : '#15803d',
                        border: `1px solid ${analyticsData.student.hostelStatus.toLowerCase().includes('hostel') ? '#e9d5ff' : '#bbf7d0'}`,
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                      }}>
                        {analyticsData.student.hostelStatus.toLowerCase().includes('hostel') ? '🛏️ Hosteler' : '🏠 Day Scholar'}
                      </span>
                    )}
                  </div>

                  <h2 style={{ margin: '4px 0', fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
                    {analyticsData.student.studentName}
                  </h2>

                  <div style={{ fontSize: 13, color: '#475569', marginTop: 4, lineHeight: 1.5 }}>
                    Roll: <b style={{ color: '#0f172a' }}>{analyticsData.student.rollNumber}</b>
                    {analyticsData.student.admissionNumber && ` (Adm: ${analyticsData.student.admissionNumber})`}
                    {' '}• Batch: <b>{analyticsData.student.batchName}</b> {analyticsData.student.section ? `(${analyticsData.student.section})` : ''}
                    {(analyticsData.student.nativePlace || analyticsData.student.district) && (
                      <span>
                        {' '}• 📍 <b>{analyticsData.student.nativePlace || ''}{analyticsData.student.nativePlace && analyticsData.student.district ? ', ' : ''}{analyticsData.student.district ? `${analyticsData.student.district} Dt` : ''}</b>
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 12.5, color: '#334155', marginTop: 4 }}>
                    👨‍👩‍👦 Parent:{' '}
                    <b>
                      {analyticsData.student.parentName || 'Parent'}
                      {analyticsData.student.parentRelation ? ` (${analyticsData.student.parentRelation})` : ''}
                      {analyticsData.student.parentOccupation ? ` • ${analyticsData.student.parentOccupation}` : ''}
                    </b>
                    {' '}• WhatsApp:{' '}
                    <span style={{ fontWeight: 700, color: '#059669' }}>
                      {analyticsData.student.parentPhoneMasked || 'Not registered'}
                    </span>
                    {analyticsData.student.studentPhone && (
                      <span> • Student Mobile: <b>{analyticsData.student.studentPhone}</b></span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button
                    onClick={handleExportCsv}
                    disabled={exportingCsv}
                    style={{
                      background: '#fff',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      padding: '8px 14px',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: exportingCsv ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                    title="Export complete examination history as CSV spreadsheet"
                  >
                    {exportingCsv ? 'Exporting…' : '📥 Export CSV'}
                  </button>
                  <div style={styles.examCountBadge}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#1e3a8a' }}>
                      {analyticsData.careerStats.totalExamsTaken}
                    </div>
                    <div style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>Exams Completed</div>
                  </div>
                </div>
              </div>

              {/* Career Performance KPI Grid */}
              <div style={styles.kpiGrid}>
                <div style={styles.kpiCard}>
                  <div style={styles.kpiLabel}>CAREER AVERAGE %</div>
                  <div style={{ ...styles.kpiValue, color: '#2563eb' }}>
                    {analyticsData.careerStats.careerAveragePercentage}%
                  </div>
                </div>

                <div style={styles.kpiCard}>
                  <div style={styles.kpiLabel}>OVERALL ACCURACY</div>
                  <div style={{ ...styles.kpiValue, color: '#059669' }}>
                    {analyticsData.careerStats.careerAverageAccuracy}%
                  </div>
                </div>

                <div style={styles.kpiCard}>
                  <div style={styles.kpiLabel}>BEST COLLEGE RANK</div>
                  <div style={{ ...styles.kpiValue, color: '#d97706' }}>
                    #{analyticsData.careerStats.bestRank}
                  </div>
                </div>

                <div style={styles.kpiCard}>
                  <div style={styles.kpiLabel}>LATEST TEST GAIN</div>
                  <div style={styles.kpiValue}>
                    {analyticsData.careerStats.latestDelta >= 0 ? (
                      <span style={{ color: '#16a34a' }}>+{analyticsData.careerStats.latestDelta} pts ▲</span>
                    ) : (
                      <span style={{ color: '#dc2626' }}>{analyticsData.careerStats.latestDelta} pts ▼</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>percentage points vs previous test</div>
                </div>
              </div>

              {/* Visual Performance Progression Timeline Chart */}
              <div style={styles.sectionCard}>
                <div style={styles.sectionHeaderRow}>
                  <div>
                    <h3 style={styles.sectionHeading}>Test Progression Trend (Percentage Points & Accuracy)</h3>
                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                      Tracks sequential examination scores and accuracy. Improvement shown as percentage points.
                    </p>
                  </div>
                </div>

                <div style={styles.chartContainer}>
                  {analyticsData.timeline.map((item, idx) => {
                    const isPositive = item.percentagePointsDelta >= 0;
                    return (
                      <div key={item.resultId} style={styles.timelineBarCol}>
                        {/* Score bar */}
                        <div style={styles.barTrack}>
                          <div
                            style={{
                              ...styles.barFill,
                              height: `${Math.min(item.percentage, 100)}%`,
                              background: item.percentage >= 75 ? '#059669' : item.percentage >= 50 ? '#2563eb' : '#dc2626',
                            }}
                          >
                            <span style={styles.barLabel}>{item.percentage}%</span>
                          </div>
                        </div>

                        {/* Test label */}
                        <div style={styles.barBottomMeta}>
                          <div style={{ fontWeight: 700, fontSize: 11, color: '#0f172a' }}>T{idx + 1}</div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>#{item.rank}</div>
                          {idx > 0 && (
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: isPositive ? '#16a34a' : '#dc2626',
                                marginTop: 2,
                              }}
                            >
                              {isPositive ? `+${item.percentagePointsDelta} pts` : `${item.percentagePointsDelta} pts`}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Examination History Table with Exact Deltas */}
              <div style={styles.sectionCard}>
                <h3 style={styles.sectionHeading}>Comprehensive Examination History</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.thRow}>
                        <th style={styles.th}>Exam Name & Date</th>
                        <th style={{ ...styles.th, textAlign: 'center' }}>Rank</th>
                        <th style={{ ...styles.th, textAlign: 'right' }}>Score / Max</th>
                        <th style={{ ...styles.th, textAlign: 'center' }}>Percentage</th>
                        <th style={{ ...styles.th, textAlign: 'center' }}>Accuracy</th>
                        <th style={{ ...styles.th, textAlign: 'center' }}>Trend Delta</th>
                        <th style={{ ...styles.th, textAlign: 'right' }}>Scorecard</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.timeline.map((item, idx) => {
                        const dateStr = item.examDate
                          ? new Date(item.examDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : 'Recent';
                        const isPos = item.percentagePointsDelta >= 0;

                        return (
                          <tr key={item.resultId} style={styles.tr}>
                            <td style={styles.td}>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.examName}</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>{dateStr} • {item.examType}</div>
                            </td>
                            <td style={{ ...styles.td, textAlign: 'center', fontWeight: 800, color: '#d97706' }}>
                              #{item.rank} <span style={{ fontSize: 11, color: '#64748b' }}>/ {item.totalStudents}</span>
                            </td>
                            <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700 }}>
                              {item.marksObtained} <span style={{ fontSize: 11, color: '#64748b' }}>/ {item.maxMarks}</span>
                            </td>
                            <td style={{ ...styles.td, textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                              {item.percentage}%
                            </td>
                            <td style={{ ...styles.td, textAlign: 'center', fontWeight: 700 }}>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 10,
                                  fontSize: 11,
                                  background: item.accuracyPercentage >= 75 ? '#dcfce7' : item.accuracyPercentage >= 50 ? '#fef3c7' : '#fee2e2',
                                  color: item.accuracyPercentage >= 75 ? '#15803d' : item.accuracyPercentage >= 50 ? '#b45309' : '#b91c1c',
                                }}
                              >
                                {item.accuracyPercentage}%
                              </span>
                            </td>
                            <td style={{ ...styles.td, textAlign: 'center' }}>
                              {idx === 0 ? (
                                <span style={{ color: '#94a3b8', fontSize: 11 }}>Baseline</span>
                              ) : (
                                <span
                                  style={{
                                    fontWeight: 700,
                                    fontSize: 11,
                                    color: isPos ? '#16a34a' : '#dc2626',
                                  }}
                                >
                                  {isPos ? `+${item.percentagePointsDelta} pts ▲` : `${item.percentagePointsDelta} pts ▼`}
                                </span>
                              )}
                            </td>
                            <td style={{ ...styles.td, textAlign: 'right' }}>
                              <a
                                href={`${API_BASE}/results/${item.resultId}/pdf?token=${encodeURIComponent(localStorage.getItem('qpgen_token') || '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={styles.pdfBtn}
                              >
                                📄 A4 PDF
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Longitudinal Chronic Weak Areas */}
              <div style={styles.sectionCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <h3 style={{ ...styles.sectionHeading, margin: 0 }}>Longitudinal Weak Topics (Accuracy &lt; 60%)</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#64748b' }}>
                      Identified chapters where the student has struggled and requires targeted drill practice.
                    </p>
                  </div>
                  {analyticsData.chronicWeakChapters.length > 0 && (
                    <button
                      onClick={() => handleGenerateRemedial()}
                      disabled={generatingRemedial}
                      style={styles.remedialActionBtn}
                      title="Automatically create a 15-question remedial DPP paper in these weak chapters"
                    >
                      {generatingRemedial ? 'Generating DPP…' : '⚡ Generate 15-Q Remedial DPP'}
                    </button>
                  )}
                </div>

                {analyticsData.chronicWeakChapters.length === 0 ? (
                  <div style={{ padding: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, color: '#166534', fontSize: 13 }}>
                    🎉 No chronic weak topics detected! Student maintains satisfactory accuracy across all assessed chapters.
                  </div>
                ) : (
                  <div style={styles.weakGrid}>
                    {analyticsData.chronicWeakChapters.map((c, i) => (
                      <div key={i} style={styles.weakItem}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#b91c1c' }}>{c.chapterName}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            Encountered across {c.timesEncountered} tests • {c.totalCorrect} / {c.totalAttempted} correct
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', marginRight: 10 }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#dc2626' }}>{c.overallAccuracy}%</div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>Avg Accuracy</div>
                        </div>
                        <button
                          onClick={() => handleGenerateRemedial([c.chapterName])}
                          disabled={generatingRemedial}
                          style={styles.singleChapterRemedialBtn}
                          title="Generate a custom DPP targeting only this specific chapter"
                        >
                          Target DPP
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Academic Counseling & Remedial Action Plan */}
              <div style={{ ...styles.sectionCard, background: '#f8fafc', border: '1px solid #cbd5e1' }}>
                <h3 style={{ ...styles.sectionHeading, color: '#1e3a8a' }}>📋 Academic Counseling & Remedial Action Plan</h3>
                <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 10 }}>
                    <div style={{ background: '#fff', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>🎯 Diagnostic Assessment</div>
                      <p style={{ margin: 0, fontSize: 12.5, color: '#475569' }}>
                        {analyticsData.careerStats.careerAveragePercentage >= 75
                          ? `High-caliber student with strong conceptual retention (${analyticsData.careerStats.careerAveragePercentage}% avg). Focus on speed and negative-marking discipline to reach top-tier percentiles.`
                          : analyticsData.careerStats.careerAveragePercentage >= 50
                          ? `Consistent performer (${analyticsData.careerStats.careerAveragePercentage}% avg). Needs targeted question drilling in weak chapters to eliminate negative deductions.`
                          : `Requires academic support in core foundation chapters. Recommend structured daily practice problems (DPPs) before full syllabus mock examinations.`}
                      </p>
                    </div>
                    <div style={{ background: '#fff', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>💡 Recommended Action Plan</div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#475569' }}>
                        <li>Practice 15–20 questions daily from identified weak chapters using generated Remedial DPPs.</li>
                        <li>Avoid speculative guessing when confidence is below 50% to prevent negative mark deductions.</li>
                        <li>Review complete step-by-step solutions for incorrect questions before the next exam.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Remedial Paper Generated Notification */}
      {remedialModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#059669' }}>
                🎉 Remedial Paper Generated!
              </h3>
              <button onClick={() => setRemedialModal(null)} style={styles.modalCloseBtn}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a', marginBottom: 12 }}>
                {remedialModal.title}
              </div>
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16, fontSize: 13 }}>
                <div style={{ marginBottom: 4 }}>
                  <b>Questions Assembled:</b> <span style={{ color: '#2563eb', fontWeight: 700 }}>{remedialModal.questionCount} Questions</span>
                </div>
                <div>
                  <b>Targeted Chapters:</b> {remedialModal.chaptersTargeted?.join(', ')}
                </div>
              </div>
              <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 18px 0', lineHeight: 1.5 }}>
                This remedial practice paper has been saved to your <b>Papers</b> list. You can print the question paper with detailed solutions, download an OMR sheet, or launch an online CBT test for this student!
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <Link
                  to={remedialModal.previewUrl}
                  style={styles.openPaperBtn}
                >
                  📄 Open Paper & Print PDF
                </Link>
                <button
                  type="button"
                  onClick={() => setRemedialModal(null)}
                  style={styles.closeBtn}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 1280,
    margin: '0 auto',
    padding: '24px 16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  headerRow: {
    marginBottom: 20,
  },
  badge: {
    display: 'inline-block',
    fontSize: 10,
    fontWeight: 800,
    color: '#2563eb',
    background: '#eff6ff',
    padding: '3px 8px',
    borderRadius: 4,
    letterSpacing: '0.05em',
    marginBottom: 6,
  },
  title: {
    margin: '0 0 6px 0',
    fontSize: 24,
    fontWeight: 800,
    color: '#0f172a',
  },
  subtitle: {
    margin: 0,
    fontSize: 13,
    color: '#64748b',
  },
  layoutGrid: {
    display: 'grid',
    gridTemplateColumns: '300px 1fr',
    gap: 20,
  },
  rosterCard: {
    background: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    overflow: 'hidden',
    height: 'fit-content',
    maxHeight: 'calc(100vh - 160px)',
    display: 'flex',
    flexDirection: 'column',
  },
  rosterSearchInput: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box',
  },
  rosterList: {
    overflowY: 'auto',
    flex: 1,
  },
  rosterItem: {
    padding: '12px 14px',
    borderBottom: '1px solid #f1f5f9',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  analyticsCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  emptyCard: {
    background: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    padding: 60,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: 36,
    height: 36,
    border: '4px solid #cbd5e1',
    borderTop: '4px solid #2563eb',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  profileBanner: {
    background: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  examCountBadge: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 10,
    padding: '10px 18px',
    textAlign: 'center',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: 12,
  },
  kpiCard: {
    background: '#ffffff',
    padding: 16,
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  kpiLabel: {
    fontSize: 10.5,
    fontWeight: 700,
    color: '#64748b',
    marginBottom: 4,
    letterSpacing: '0.04em',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: 800,
    color: '#0f172a',
  },
  sectionCard: {
    background: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  sectionHeaderRow: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 4px 0',
  },
  chartContainer: {
    display: 'flex',
    gap: 14,
    overflowX: 'auto',
    padding: '16px 8px 8px 8px',
    alignItems: 'flex-end',
    height: 180,
    borderBottom: '2px solid #e2e8f0',
  },
  timelineBarCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 58,
    height: '100%',
  },
  barTrack: {
    width: 28,
    flex: 1,
    background: '#f1f5f9',
    borderRadius: '4px 4px 0 0',
    display: 'flex',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: '4px 4px 0 0',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: 4,
    transition: 'height 0.4s ease',
  },
  barLabel: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 800,
  },
  barBottomMeta: {
    textAlign: 'center',
    marginTop: 6,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  thRow: {
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  th: {
    padding: '10px 12px',
    color: '#475569',
    fontSize: 11.5,
    fontWeight: 700,
    textAlign: 'left',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '12px',
    color: '#334155',
    verticalAlign: 'middle',
  },
  pdfBtn: {
    padding: '4px 8px',
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    color: '#2563eb',
    textDecoration: 'none',
  },
  weakGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 10,
  },
  weakItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
  },
  remedialActionBtn: {
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '8px 14px',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  singleChapterRemedialBtn: {
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    borderRadius: 4,
    padding: '5px 9px',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  openPaperBtn: {
    background: '#2563eb',
    color: '#fff',
    padding: '9px 16px',
    borderRadius: 6,
    fontWeight: 700,
    fontSize: 13,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
  },
  closeBtn: {
    background: '#fff',
    color: '#334155',
    border: '1px solid #cbd5e1',
    padding: '9px 14px',
    borderRadius: 6,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,0.6)',
    zIndex: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    background: '#fff',
    borderRadius: 12,
    maxWidth: 500,
    width: '100%',
    overflow: 'hidden',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    color: '#64748b',
  },
};
