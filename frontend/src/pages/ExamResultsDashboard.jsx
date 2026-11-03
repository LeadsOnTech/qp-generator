// frontend/src/pages/ExamResultsDashboard.jsx
// Comprehensive College Faculty & Admin Dashboard for Exam Results, Scorecards & WhatsApp Parent Communication.

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api');

export default function ExamResultsDashboard() {
  const { id: paperId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paperData, setPaperData] = useState(null);
  const [stats, setStats] = useState(null);
  const [results, setResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [batchFilter, setBatchFilter] = useState('');

  // Modals state
  const [previewModal, setPreviewModal] = useState(null); // { result, previewData }
  const [batchModal, setBatchModal] = useState(false);
  const [ledgerModal, setLedgerModal] = useState(false);
  const [offlineModal, setOfflineModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  // WhatsApp Ledger
  const [ledgerData, setLedgerData] = useState(null);

  // Offline Upload State
  const [offlineCsv, setOfflineCsv] = useState('');
  const [posMarks, setPosMarks] = useState(4.0);
  const [negMarks, setNegMarks] = useState(1.0);

  // Load results
  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getPaperResults(paperId, {
        batch: batchFilter,
        search: searchTerm,
      });
      setPaperData(data.paper);
      setStats(data.stats);
      setResults(data.results);
    } catch (err) {
      setError(err.message || 'Failed to load exam results');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (paperId) loadData();
  }, [paperId, batchFilter]);

  // Handle Search submit
  function handleSearch(e) {
    e.preventDefault();
    loadData();
  }

  // Evaluate CBT Submissions
  async function handleEvaluateCbt() {
    try {
      setActionLoading(true);
      setActionSuccess(null);
      const tests = await api.getCbtTestsForPaper(paperId);
      if (!tests || tests.length === 0) {
        alert('No CBT exam found for this paper. Use Offline Marksheet Upload instead.');
        return;
      }
      const test = tests[0];
      const res = await api.generateResultsFromCbt(test.id);
      setActionSuccess(res.message);
      await loadData();
    } catch (err) {
      alert('Failed to evaluate CBT submissions: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  // Open WhatsApp Preview Modal
  async function handleOpenWhatsAppPreview(result) {
    try {
      setActionLoading(true);
      const preview = await api.previewResultWhatsApp(result.id);
      setPreviewModal({ result, preview });
    } catch (err) {
      alert('Unable to load WhatsApp preview: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  // Send Single WhatsApp
  async function handleSendSingleWhatsApp(resultId) {
    try {
      setActionLoading(true);
      const res = await api.sendResultWhatsApp(resultId, true);
      alert(`WhatsApp notification sent to ${res.recipientPhone}!`);
      setPreviewModal(null);
      await loadData();
    } catch (err) {
      alert('Failed to send WhatsApp message: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  // Batch Send WhatsApp
  async function handleBatchSendWhatsApp() {
    try {
      setActionLoading(true);
      const res = await api.batchSendWhatsApp(paperId, { batchName: batchFilter });
      alert(`Batch WhatsApp Dispatch Complete!\n\nSent: ${res.sentCount}\nAlready Sent (Skipped): ${res.skippedAlreadySent}\nNo Phone: ${res.skippedNoPhone}\nTotal Cost: ₹${res.totalCostRupees}`);
      setBatchModal(false);
      await loadData();
    } catch (err) {
      alert('Batch WhatsApp dispatch failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  // Load WhatsApp Ledger
  async function handleOpenLedger() {
    try {
      setActionLoading(true);
      const data = await api.getWhatsAppLedger();
      setLedgerData(data);
      setLedgerModal(true);
    } catch (err) {
      alert('Failed to load WhatsApp ledger: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  // Submit Offline Marksheet
  async function handleOfflineUploadSubmit() {
    try {
      setActionLoading(true);
      if (!offlineCsv.trim()) {
        alert('Please paste or enter CSV data');
        return;
      }

      // Simple CSV parser
      const lines = offlineCsv.trim().split(/\r?\n/);
      if (lines.length < 2) {
        alert('CSV must contain at least a header row and 1 data row.');
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const records = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map((c) => c.trim());
        if (row.length < 2) continue;

        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = row[idx];
        });

        records.push({
          rollNumber: obj['rollnumber'] || obj['roll'] || obj['student id'] || `STU${i}`,
          studentName: obj['studentname'] || obj['name'] || `Student ${i}`,
          batchName: obj['batchname'] || obj['batch'] || obj['section'] || 'General',
          parentPhone: obj['parentphone'] || obj['phone'] || obj['mobile'] || null,
          marksObtained: parseFloat(obj['marks'] || obj['score'] || obj['marksobtained']) || 0.0,
          maxMarks: parseFloat(obj['maxmarks'] || obj['max']) || (posMarks * 100),
          correctAnswers: parseInt(obj['correct'] || obj['correctanswers'], 10) || 0,
          incorrectAnswers: parseInt(obj['incorrect'] || obj['wrong'] || obj['incorrectanswers'], 10) || 0,
          unattemptedQuestions: parseInt(obj['unattempted'] || obj['unattemptedquestions'], 10) || 0,
        });
      }

      const res = await api.uploadOfflineResults({
        paperId,
        records,
        positiveMarks: posMarks,
        negativeMarks: negMarks,
      });

      alert(res.message);
      setOfflineModal(false);
      setOfflineCsv('');
      await loadData();
    } catch (err) {
      alert('Failed to process offline marks: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  // Copy Public Scorecard Link
  function copyPublicLink(token) {
    const url = `${window.location.origin}/#/r/${token}`;
    navigator.clipboard.writeText(url);
    alert(`Secure Parent Report Link copied to clipboard:\n${url}`);
  }

  // Extract unique batches for filter dropdown
  const uniqueBatches = Array.from(new Set(results.map((r) => r.batchName).filter(Boolean)));

  return (
    <div style={styles.container}>
      {/* Breadcrumb & Navigation */}
      <div style={styles.navRow}>
        <Link to={`/papers/${paperId}`} style={styles.backLink}>
          ← Back to Paper Preview
        </Link>
        <button onClick={handleOpenLedger} style={styles.ledgerBtn}>
          💰 WhatsApp Usage & Cost Ledger
        </button>
      </div>

      {/* Main Header */}
      <div style={styles.headerCard}>
        <div style={{ flex: 1 }}>
          <div style={styles.badge}>SMART EXAM RESULTS & PARENT COMMUNICATION</div>
          <h1 style={styles.title}>{paperData?.title || 'Examination Results'}</h1>
          <p style={styles.subtitle}>
            Exam: <span style={{ fontWeight: 600 }}>{paperData?.examName}</span> • Institute:{' '}
            <span style={{ fontWeight: 600 }}>{paperData?.instituteName || 'College Campus'}</span>
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div style={styles.toolbar}>
          <button
            onClick={handleEvaluateCbt}
            disabled={actionLoading}
            style={styles.primaryActionBtn}
            title="Approve and compute ranks from online student CBT attempts"
          >
            ⚡ Approve CBT Results
          </button>
          <button
            onClick={() => setOfflineModal(true)}
            style={styles.secondaryActionBtn}
            title="Upload OMR marksheet or Excel CSV"
          >
            📥 Upload Offline Marksheet
          </button>
          <button
            onClick={() => setBatchModal(true)}
            disabled={results.length === 0}
            style={styles.whatsappBatchBtn}
            title="Send WhatsApp performance report to all parents"
          >
            📱 Batch WhatsApp to Parents
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div style={styles.alertSuccess}>
          ✅ {actionSuccess}
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>TOTAL STUDENTS</div>
            <div style={styles.statValue}>{stats.totalStudents}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>CLASS AVERAGE SCORE</div>
            <div style={{ ...styles.statValue, color: '#2563eb' }}>{stats.averageScore}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>HIGHEST SCORE</div>
            <div style={{ ...styles.statValue, color: '#16a34a' }}>{stats.topScore}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>PASS PERCENTAGE</div>
            <div style={{ ...styles.statValue, color: '#0d9488' }}>{stats.passPercentage}%</div>
          </div>
        </div>
      )}

      {/* Search & Batch Filters */}
      <div style={styles.filterBar}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1 }}>
          <input
            type="text"
            placeholder="Search by student name or roll number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <button type="submit" style={styles.searchBtn}>Search</button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Batch:</span>
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            style={styles.selectInput}
          >
            <option value="">All Batches</option>
            {uniqueBatches.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Table */}
      <div style={styles.tableCard}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            Loading student exam results...
          </div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>
            {error}
          </div>
        ) : results.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>No Exam Results Published Yet</h3>
            <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: 14 }}>
              Click <b>"Approve CBT Results"</b> to evaluate online exam submissions, or <b>"Upload Offline Marksheet"</b> to import OMR scores.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={{ ...styles.th, width: 60, textAlign: 'center' }}>Rank</th>
                  <th style={styles.th}>Student Details</th>
                  <th style={styles.th}>Batch</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Score</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Accuracy</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Q Analysis (C/W/U)</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Parent Mobile</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>WhatsApp</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => {
                  const token = r.publicToken;
                  const pdfUrl = `${API_BASE}/results/${r.id}/pdf`;

                  return (
                    <tr key={r.id} style={styles.tr}>
                      <td style={{ ...styles.td, textAlign: 'center', fontWeight: 800, color: r.rank <= 3 ? '#d97706' : '#334155' }}>
                        #{r.rank}
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.studentName}</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>Roll: {r.rollNumber}</div>
                      </td>
                      <td style={{ ...styles.td, color: '#475569', fontSize: 13 }}>
                        {r.batchName} {r.section ? `(${r.section})` : ''}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>
                          {r.marksObtained} <span style={{ fontSize: 11, color: '#64748b' }}>/ {r.maxMarks}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 600 }}>
                          {r.percentage}%
                        </div>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 12,
                            fontSize: 12,
                            background:
                              r.accuracyPercentage >= 75
                                ? '#dcfce7'
                                : r.accuracyPercentage >= 50
                                ? '#fef3c7'
                                : '#fee2e2',
                            color:
                              r.accuracyPercentage >= 75
                                ? '#15803d'
                                : r.accuracyPercentage >= 50
                                ? '#b45309'
                                : '#b91c1c',
                          }}
                        >
                          {r.accuracyPercentage}%
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center', fontSize: 12 }}>
                        <span style={{ color: '#16a34a', fontWeight: 700 }}>{r.correctAnswers}</span> /{' '}
                        <span style={{ color: '#dc2626', fontWeight: 700 }}>{r.incorrectAnswers}</span> /{' '}
                        <span style={{ color: '#64748b' }}>{r.unattemptedQuestions}</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center', fontSize: 12, color: '#475569' }}>
                        {r.parentPhoneMasked || '—'}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 4,
                            background:
                              r.latestWhatsAppStatus === 'SENT' || r.latestWhatsAppStatus === 'DELIVERED'
                                ? '#dcfce7'
                                : r.latestWhatsAppStatus === 'FAILED'
                                ? '#fee2e2'
                                : '#f1f5f9',
                            color:
                              r.latestWhatsAppStatus === 'SENT' || r.latestWhatsAppStatus === 'DELIVERED'
                                ? '#15803d'
                                : r.latestWhatsAppStatus === 'FAILED'
                                ? '#b91c1c'
                                : '#64748b',
                          }}
                        >
                          {r.latestWhatsAppStatus}
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.actionIconBtn}
                            title="Download A4 Performance PDF"
                          >
                            📄 PDF
                          </a>
                          {token && (
                            <button
                              onClick={() => copyPublicLink(token)}
                              style={styles.actionIconBtn}
                              title="Copy secure link for parents"
                            >
                              🔗 Link
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenWhatsAppPreview(r)}
                            style={{ ...styles.actionIconBtn, color: '#059669', borderColor: '#a7f3d0' }}
                            title="Preview and dispatch WhatsApp message"
                          >
                            📱 Send
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: WhatsApp Single Preview */}
      {previewModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>
                WhatsApp Notification Preview
              </h3>
              <button onClick={() => setPreviewModal(null)} style={styles.modalCloseBtn}>✕</button>
            </div>
            <div style={{ padding: 16 }}>
              <div style={styles.metaRow}>
                <span><b>Student:</b> {previewModal.result.studentName} ({previewModal.result.rollNumber})</span>
                <span><b>Parent Mobile:</b> {previewModal.preview.recipientPhoneMasked}</span>
              </div>
              <div style={{ margin: '12px 0 6px 0', fontSize: 12, fontWeight: 700, color: '#475569' }}>
                MESSAGE PREVIEW (OFFICIAL TEMPLATE):
              </div>
              <pre style={styles.waPreviewBox}>
                {previewModal.preview.previewMessage}
              </pre>
              <div style={styles.costNotice}>
                Estimated Cost: <b>₹{previewModal.preview.estimatedCostRupees}</b> (Deducted from WhatsApp wallet)
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setPreviewModal(null)} style={styles.cancelBtn}>Cancel</button>
              <button
                onClick={() => handleSendSingleWhatsApp(previewModal.result.id)}
                disabled={actionLoading}
                style={styles.confirmSendBtn}
              >
                {actionLoading ? 'Dispatching...' : '🚀 Send WhatsApp Message'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Batch WhatsApp Confirmation */}
      {batchModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>
                Batch WhatsApp Parent Dispatch
              </h3>
              <button onClick={() => setBatchModal(false)} style={styles.modalCloseBtn}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <p style={{ margin: '0 0 12px 0', color: '#334155', fontSize: 14, lineHeight: 1.5 }}>
                You are about to dispatch official WhatsApp scorecards to registered parents of all{' '}
                <b>{results.length} students</b> in <b>{batchFilter || 'All Batches'}</b>.
              </p>
              <div style={styles.batchCostBox}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Eligible Students:</span>
                  <b>{results.length}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Rate per WhatsApp message:</span>
                  <b>₹0.75</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: 6 }}>
                  <span style={{ fontWeight: 700 }}>Total Estimated Cost:</span>
                  <b style={{ color: '#059669', fontSize: 16 }}>
                    ₹{(results.length * 0.75).toFixed(2)}
                  </b>
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#64748b', margin: '12px 0 0 0' }}>
                🛡️ <b>Idempotency Protection:</b> Students whose parents have already received this exam's scorecard will automatically be skipped to prevent duplicate charges.
              </p>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setBatchModal(false)} style={styles.cancelBtn}>Cancel</button>
              <button
                onClick={handleBatchSendWhatsApp}
                disabled={actionLoading}
                style={styles.confirmSendBtn}
              >
                {actionLoading ? 'Dispatching Batch...' : 'Confirm & Dispatch to All Parents'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Offline Marksheet Upload */}
      {offlineModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: 640 }}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>
                Upload Offline OMR / Excel Marksheet
              </h3>
              <button onClick={() => setOfflineModal(false)} style={styles.modalCloseBtn}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.inputLabel}>Positive Marks per Question:</label>
                  <input
                    type="number"
                    step="0.5"
                    value={posMarks}
                    onChange={(e) => setPosMarks(parseFloat(e.target.value) || 4.0)}
                    style={styles.numberInput}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.inputLabel}>Negative Penalty per Wrong:</label>
                  <input
                    type="number"
                    step="0.5"
                    value={negMarks}
                    onChange={(e) => setNegMarks(parseFloat(e.target.value) || 1.0)}
                    style={styles.numberInput}
                  />
                </div>
              </div>

              <label style={styles.inputLabel}>
                Paste CSV Rows (Columns: rollNumber, studentName, batchName, parentPhone, marks, correct, wrong, unattempted):
              </label>
              <textarea
                rows={8}
                placeholder={`rollNumber,studentName,batchName,parentPhone,marks,correct,wrong,unattempted\n24NEET001,Aarav Sharma,NEET-A,9876543210,320,85,20,15\n24NEET002,Bhavana Reddy,NEET-A,9876543211,280,75,20,25`}
                value={offlineCsv}
                onChange={(e) => setOfflineCsv(e.target.value)}
                style={styles.csvTextarea}
              />
              <p style={{ margin: '6px 0 0 0', fontSize: 11, color: '#64748b' }}>
                Tip: Copy columns directly from Excel and paste here. Tie-breaking and percentage ranks will be automatically calculated.
              </p>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setOfflineModal(false)} style={styles.cancelBtn}>Cancel</button>
              <button
                onClick={handleOfflineUploadSubmit}
                disabled={actionLoading}
                style={styles.confirmSendBtn}
              >
                {actionLoading ? 'Processing...' : 'Ingest & Publish Results'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: WhatsApp Cost & Ledger */}
      {ledgerModal && ledgerData && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: 700 }}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>
                WhatsApp Usage & Financial Ledger
              </h3>
              <button onClick={() => setLedgerModal(false)} style={styles.modalCloseBtn}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={styles.walletTile}>
                <div>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>CURRENT WHATSAPP BALANCE</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#059669' }}>
                    ₹{ledgerData.walletBalance?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const amt = prompt('Enter top-up amount in Rupees (e.g. 100):', '50');
                    if (amt) {
                      await api.rechargeWhatsAppWallet(parseFloat(amt));
                      const refreshed = await api.getWhatsAppLedger();
                      setLedgerData(refreshed);
                    }
                  }}
                  style={styles.topUpBtn}
                >
                  + Add ₹ Credits
                </button>
              </div>

              <h4 style={{ margin: '16px 0 8px 0', fontSize: 14, color: '#0f172a' }}>Recent Activity Logs</h4>
              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6 }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thRow}>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Description</th>
                      <th style={{ ...styles.th, textAlign: 'center' }}>Status</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerData.recentLogs?.map((log) => (
                      <tr key={log.id} style={styles.tr}>
                        <td style={{ ...styles.td, fontSize: 12 }}>
                          {new Date(log.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </td>
                        <td style={{ ...styles.td, fontSize: 12 }}>
                          {log.result?.studentName || 'Student'} ({log.recipientPhoneMasked})
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center', fontSize: 11, fontWeight: 700 }}>
                          <span style={{ color: log.status === 'SENT' ? '#16a34a' : '#dc2626' }}>
                            {log.status}
                          </span>
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, color: '#b91c1c', fontSize: 12 }}>
                          -₹{log.costInRupees.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setLedgerModal(false)} style={styles.cancelBtn}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '24px 16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  navRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backLink: {
    color: '#2563eb',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 600,
  },
  ledgerBtn: {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 600,
    color: '#334155',
    cursor: 'pointer',
  },
  headerCard: {
    background: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    padding: 24,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
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
  toolbar: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  primaryActionBtn: {
    background: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: 6,
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
  },
  secondaryActionBtn: {
    background: '#ffffff',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  whatsappBatchBtn: {
    background: '#059669',
    color: '#ffffff',
    border: 'none',
    borderRadius: 6,
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(5,150,105,0.2)',
  },
  alertSuccess: {
    background: '#dcfce7',
    border: '1px solid #86efac',
    color: '#15803d',
    padding: '12px 16px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 20,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 14,
    marginBottom: 20,
  },
  statCard: {
    background: '#ffffff',
    padding: 16,
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#64748b',
    marginBottom: 4,
    letterSpacing: '0.04em',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 800,
    color: '#0f172a',
  },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  searchInput: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
  },
  searchBtn: {
    padding: '8px 16px',
    background: '#334155',
    color: '#ffffff',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  selectInput: {
    padding: '8px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    background: '#ffffff',
  },
  tableCard: {
    background: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    overflow: 'hidden',
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
    padding: '12px 14px',
    color: '#475569',
    fontSize: 12,
    fontWeight: 700,
    textAlign: 'left',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '12px 14px',
    color: '#334155',
    verticalAlign: 'middle',
  },
  actionIconBtn: {
    padding: '4px 8px',
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    color: '#334155',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15,23,42,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modalContent: {
    background: '#ffffff',
    borderRadius: 12,
    maxWidth: 520,
    width: '100%',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
    overflow: 'hidden',
  },
  modalHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalCloseBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    color: '#94a3b8',
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    color: '#334155',
    background: '#f8fafc',
    padding: 10,
    borderRadius: 6,
  },
  waPreviewBox: {
    background: '#075e54',
    color: '#ffffff',
    padding: 14,
    borderRadius: 8,
    fontSize: 11.5,
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    maxHeight: 240,
    overflowY: 'auto',
    lineHeight: 1.4,
  },
  costNotice: {
    fontSize: 12,
    color: '#059669',
    background: '#ecfdf5',
    padding: '8px 12px',
    borderRadius: 6,
    marginTop: 10,
  },
  modalFooter: {
    padding: '12px 20px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    background: '#f8fafc',
  },
  cancelBtn: {
    padding: '8px 16px',
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  confirmSendBtn: {
    padding: '8px 16px',
    background: '#059669',
    color: '#ffffff',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  batchCostBox: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    padding: 14,
    borderRadius: 8,
    fontSize: 13,
  },
  inputLabel: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#475569',
    marginBottom: 4,
  },
  numberInput: {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 13,
  },
  csvTextarea: {
    width: '100%',
    padding: 10,
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 12,
    fontFamily: 'monospace',
    boxSizing: 'border-box',
  },
  walletTile: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    padding: 16,
    borderRadius: 8,
  },
  topUpBtn: {
    background: '#059669',
    color: '#ffffff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 6,
    fontWeight: 700,
    fontSize: 12,
    cursor: 'pointer',
  },
};
