// frontend/src/pages/BatchPerformanceReport.jsx
// Executive Batch Performance Report & Academic Audit for College Principals & Management.

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api');

export default function BatchPerformanceReport() {
  const { id: paperId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchBatchReport() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.getBatchAnalytics(paperId);
        setData(res);
      } catch (err) {
        setError(err.message || 'Failed to load batch performance report');
      } finally {
        setLoading(false);
      }
    }
    if (paperId) fetchBatchReport();
  }, [paperId]);

  if (loading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: 16, color: '#64748b', fontWeight: 600 }}>
          Compiling executive batch audit and cohort statistics...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={styles.container}>
        <div style={{ marginBottom: 16 }}>
          <Link to={`/papers/${paperId}/results`} style={styles.backLink}>← Back to Exam Results</Link>
        </div>
        <div style={styles.errorBox}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
          <h3 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>Unable to load batch report</h3>
          <p style={{ margin: 0, color: '#64748b' }}>{error}</p>
        </div>
      </div>
    );
  }

  const { paper, stats, distribution, subjectAverages, sectionComparison, top10, bottom10 } = data;
  const pdfUrl = `${API_BASE}/results/analytics/batch/${paperId}/pdf`;
  const csvUrl = `${API_BASE}/results/analytics/batch/${paperId}/csv`;

  return (
    <div style={styles.container}>
      {/* Top Nav */}
      <div style={styles.navRow}>
        <Link to={`/papers/${paperId}/results`} style={styles.backLink}>
          ← Back to Exam Results
        </Link>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href={csvUrl} download style={styles.csvBtn}>
            📥 Export Cohort CSV
          </a>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={styles.pdfBtn}>
            📄 Download Management PDF
          </a>
        </div>
      </div>

      {/* Executive Header Banner */}
      <div style={styles.headerCard}>
        <div>
          <div style={styles.badge}>MODULE 6: CONSOLIDATED BATCH AUDIT</div>
          <h1 style={styles.title}>Batch Performance Report & Management Audit</h1>
          <p style={styles.subtitle}>
            Exam: <span style={{ fontWeight: 700, color: '#0f172a' }}>{paper.title}</span> • Pattern:{' '}
            <span style={{ fontWeight: 600 }}>{paper.examName}</span> • Institute:{' '}
            <span style={{ fontWeight: 600 }}>{paper.instituteName}</span>
          </p>
        </div>
      </div>

      {/* 5 Executive KPI Tiles */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>TOTAL CANDIDATES</div>
          <div style={{ ...styles.kpiValue, color: '#0f172a' }}>{stats.totalStudents}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>CLASS AVERAGE SCORE</div>
          <div style={{ ...styles.kpiValue, color: '#2563eb' }}>
            {stats.averageScore} <span style={styles.kpiSub}>/ {stats.maxMarks}</span>
          </div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>HIGHEST SCORE</div>
          <div style={{ ...styles.kpiValue, color: '#059669' }}>{stats.topScore}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>LOWEST SCORE</div>
          <div style={{ ...styles.kpiValue, color: '#dc2626' }}>{stats.lowestScore}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>PASS PERCENTAGE</div>
          <div style={{ ...styles.kpiValue, color: '#0d9488' }}>{stats.passPercentage}%</div>
        </div>
      </div>

      {/* Score Distribution Bell-Curve Bands */}
      <div style={styles.sectionCard}>
        <h2 style={styles.sectionTitle}>Cohort Score Distribution (Performance Tiers)</h2>
        <div style={styles.bandGrid}>
          <div style={{ ...styles.bandCard, background: '#ecfdf5', borderLeft: '4px solid #059669' }}>
            <div style={styles.bandCount}>{distribution.outstanding}</div>
            <div style={{ ...styles.bandLabel, color: '#065f46' }}>≥ 90% (Outstanding)</div>
          </div>
          <div style={{ ...styles.bandCard, background: '#eff6ff', borderLeft: '4px solid #2563eb' }}>
            <div style={styles.bandCount}>{distribution.distinction}</div>
            <div style={{ ...styles.bandLabel, color: '#1e40af' }}>75 - 89% (Distinction)</div>
          </div>
          <div style={{ ...styles.bandCard, background: '#f0fdfa', borderLeft: '4px solid #0d9488' }}>
            <div style={styles.bandCount}>{distribution.firstClass}</div>
            <div style={{ ...styles.bandLabel, color: '#115e59' }}>60 - 74% (First Class)</div>
          </div>
          <div style={{ ...styles.bandCard, background: '#fffbeb', borderLeft: '4px solid #d97706' }}>
            <div style={styles.bandCount}>{distribution.secondClass}</div>
            <div style={{ ...styles.bandLabel, color: '#92400e' }}>40 - 59% (Second Class)</div>
          </div>
          <div style={{ ...styles.bandCard, background: '#fef2f2', borderLeft: '4px solid #dc2626' }}>
            <div style={styles.bandCount}>{distribution.remedial}</div>
            <div style={{ ...styles.bandLabel, color: '#991b1b' }}>&lt; 40% (Needs Remedial)</div>
          </div>
        </div>
      </div>

      {/* Subject-Wise Class Averages */}
      {subjectAverages.length > 0 && (
        <div style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>Subject-Wise Class Performance & Benchmark</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Subject Name</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Class Average Marks</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Class Accuracy %</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Max Subject Marks</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Faculty Benchmark</th>
                </tr>
              </thead>
              <tbody>
                {subjectAverages.map((sub, idx) => (
                  <tr key={idx} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: 700, color: '#0f172a' }}>{sub.subjectName}</td>
                    <td style={{ ...styles.td, textAlign: 'center', fontWeight: 600 }}>{sub.averageMarks}</td>
                    <td style={{ ...styles.td, textAlign: 'center', fontWeight: 700 }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 8,
                          fontSize: 12,
                          background:
                            sub.averageAccuracy >= 75
                              ? '#dcfce7'
                              : sub.averageAccuracy >= 55
                              ? '#fef3c7'
                              : '#fee2e2',
                          color:
                            sub.averageAccuracy >= 75
                              ? '#15803d'
                              : sub.averageAccuracy >= 55
                              ? '#b45309'
                              : '#b91c1c',
                        }}
                      >
                        {sub.averageAccuracy}%
                      </span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center', color: '#64748b' }}>{sub.maxMarks}</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700 }}>
                      {sub.averageAccuracy >= 75 ? (
                        <span style={{ color: '#059669' }}>HIGH MASTERY</span>
                      ) : sub.averageAccuracy >= 55 ? (
                        <span style={{ color: '#d97706' }}>ACCEPTABLE</span>
                      ) : (
                        <span style={{ color: '#dc2626' }}>URGENT REVIEW NEEDED</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Batch / Section Comparison (if multiple sections exist) */}
      {sectionComparison.length > 1 && (
        <div style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>Section-to-Section Comparative Audit</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Batch / Section</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Appeared</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Batch Average Score</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Pass Percentage</th>
                </tr>
              </thead>
              <tbody>
                {sectionComparison.map((sec, idx) => (
                  <tr key={idx} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: 700, color: '#0f172a' }}>{sec.batchName}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>{sec.totalStudents}</td>
                    <td style={{ ...styles.td, textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                      {sec.averageScore}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                      {sec.passPercentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Side-by-Side: Top 10 Honor Roll vs Bottom 10 Remedial Watchlist */}
      <div style={styles.twoColGrid}>
        {/* Top 10 */}
        <div style={styles.sectionCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>🏆</span>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#065f46' }}>
              Top 10 High Performers (Merit Cohort)
            </h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={{ background: '#ecfdf5' }}>
                  <th style={{ ...styles.th, color: '#065f46', width: 44 }}>Rank</th>
                  <th style={{ ...styles.th, color: '#065f46' }}>Student</th>
                  <th style={{ ...styles.th, color: '#065f46', textAlign: 'right' }}>Score (%)</th>
                </tr>
              </thead>
              <tbody>
                {top10.map((s) => (
                  <tr key={s.id} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: 800, color: '#047857' }}>#{s.rank}</td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{s.studentName}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Roll: {s.rollNumber} • {s.batchName}</div>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      {s.marksObtained} ({s.percentage}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom 10 */}
        <div style={styles.sectionCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#991b1b' }}>
              Bottom 10 Remedial Watchlist (Action Required)
            </h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={{ background: '#fef2f2' }}>
                  <th style={{ ...styles.th, color: '#991b1b', width: 44 }}>Rank</th>
                  <th style={{ ...styles.th, color: '#991b1b' }}>Student</th>
                  <th style={{ ...styles.th, color: '#991b1b', textAlign: 'right' }}>Score (%)</th>
                </tr>
              </thead>
              <tbody>
                {bottom10.map((s) => (
                  <tr key={s.id} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: 800, color: '#b91c1c' }}>#{s.rank}</td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{s.studentName}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Roll: {s.rollNumber} • {s.batchName}</div>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                      {s.marksObtained} ({s.percentage}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 1240,
    margin: '0 auto',
    padding: '24px 16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  loadingWrap: {
    minHeight: '60vh',
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
  navRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  backLink: {
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: 13,
  },
  csvBtn: {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    color: '#334155',
    padding: '8px 14px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
  },
  pdfBtn: {
    background: '#2563eb',
    color: '#ffffff',
    padding: '8px 16px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 700,
    textDecoration: 'none',
    boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
  },
  headerCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 22,
    marginBottom: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
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
    fontSize: 22,
    fontWeight: 800,
    color: '#0f172a',
  },
  subtitle: {
    margin: 0,
    fontSize: 13,
    color: '#64748b',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
    marginBottom: 20,
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
    fontSize: 24,
    fontWeight: 800,
  },
  kpiSub: {
    fontSize: 13,
    fontWeight: 500,
    color: '#64748b',
  },
  sectionCard: {
    background: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    padding: 20,
    marginBottom: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  sectionTitle: {
    margin: '0 0 14px 0',
    fontSize: 15,
    fontWeight: 700,
    color: '#0f172a',
  },
  bandGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 10,
  },
  bandCard: {
    padding: 14,
    borderRadius: 8,
  },
  bandCount: {
    fontSize: 24,
    fontWeight: 800,
    color: '#0f172a',
    marginBottom: 4,
  },
  bandLabel: {
    fontSize: 11,
    fontWeight: 700,
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
    padding: '11px 12px',
    color: '#334155',
    verticalAlign: 'middle',
  },
  twoColGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: 16,
  },
  errorBox: {
    background: '#ffffff',
    borderRadius: 12,
    padding: 40,
    textAlign: 'center',
    border: '1px solid #e2e8f0',
  },
};
