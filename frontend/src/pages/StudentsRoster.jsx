import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function StudentsRoster() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('');

  // Modals
  const [addModal, setAddModal] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    rollNumber: '',
    fullName: '',
    batchName: 'MPC Section-A',
    section: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
  });

  // Bulk Import State
  const [bulkCsv, setBulkCsv] = useState('');
  const [bulkResult, setBulkResult] = useState(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getStudentsRoster();
      setStudents(data);
    } catch (err) {
      setError(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filter students
  const filteredStudents = students.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      s.rollNumber.toLowerCase().includes(q) ||
      s.fullName.toLowerCase().includes(q) ||
      (s.parentPhone && s.parentPhone.includes(q)) ||
      (s.batchName && s.batchName.toLowerCase().includes(q));
    const matchesBatch = !batchFilter || s.batchName === batchFilter;
    return matchesSearch && matchesBatch;
  });

  const batches = Array.from(new Set(students.map((s) => s.batchName).filter(Boolean)));
  const totalStudents = students.length;
  const withPhoneCount = students.filter((s) => s.parentPhone && s.parentPhone.length >= 10).length;
  const coveragePercent = totalStudents > 0 ? Math.round((withPhoneCount / totalStudents) * 100) : 0;

  function openAddModal() {
    setForm({
      rollNumber: '',
      fullName: '',
      batchName: batches[0] || 'MPC Section-A',
      section: '',
      parentName: '',
      parentPhone: '',
      parentEmail: '',
    });
    setEditingStudent(null);
    setAddModal(true);
  }

  function openEditModal(st) {
    setForm({
      rollNumber: st.rollNumber,
      fullName: st.fullName,
      batchName: st.batchName || 'General',
      section: st.section || '',
      parentName: st.parentName || '',
      parentPhone: st.parentPhone || '',
      parentEmail: st.parentEmail || '',
    });
    setEditingStudent(st);
    setAddModal(true);
  }

  async function handleSaveStudent(e) {
    e.preventDefault();
    if (!form.rollNumber.trim() || !form.fullName.trim()) {
      alert('Roll Number and Full Name are required.');
      return;
    }
    try {
      setSaving(true);
      await api.saveStudentProfile(form);
      setAddModal(false);
      await loadData();
    } catch (err) {
      alert('Failed to save student: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteStudent(id, name) {
    if (!window.confirm(`Are you sure you want to remove "${name}" from the student roster?`)) return;
    try {
      await api.deleteStudentProfile(id);
      await loadData();
    } catch (err) {
      alert('Failed to delete student: ' + err.message);
    }
  }

  async function handleBulkImport(e) {
    e.preventDefault();
    if (!bulkCsv.trim()) return;

    // Parse CSV lines
    const lines = bulkCsv.trim().split(/\r?\n/);
    const parsedStudents = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // Skip header row if present
      if (i === 0 && line.toLowerCase().includes('roll')) continue;

      const parts = line.split(/[,\t]/).map((p) => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length >= 2) {
        parsedStudents.push({
          rollNumber: parts[0],
          fullName: parts[1],
          batchName: parts[2] || 'General',
          parentPhone: parts[3] || '',
          parentName: parts[4] || '',
        });
      }
    }

    if (parsedStudents.length === 0) {
      alert('Could not find valid student rows. Expected: RollNumber, StudentName, Batch, ParentPhone');
      return;
    }

    try {
      setSaving(true);
      const res = await api.bulkImportStudents(parsedStudents);
      setBulkResult(res);
      await loadData();
    } catch (err) {
      alert('Bulk import failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.headerRow}>
        <div>
          <p style={styles.eyebrow}>ACADEMIC ROSTER & ENROLLMENT</p>
          <h1 style={styles.title}>👨‍🎓 Student Directory</h1>
          <p style={styles.subtitle}>
            Enroll students and register parent WhatsApp mobile numbers for automated test scorecards and reports.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a
            href={`${import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api')}/results/students/roster/export-csv`}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.secondaryBtn}
            title="Download complete enrolled student directory as CSV"
          >
            📤 Export Roster CSV
          </a>
          <button onClick={() => setBulkModal(true)} style={styles.secondaryBtn}>
            📥 Bulk Import CSV
          </button>
          <button onClick={openAddModal} style={styles.primaryBtn}>
            + Add Student
          </button>
        </div>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {/* KPI Cards */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>TOTAL STUDENTS ENROLLED</div>
          <div style={styles.kpiValue}>{totalStudents}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>PARENT WHATSAPP REGISTERED</div>
          <div style={{ ...styles.kpiValue, color: '#059669' }}>
            {withPhoneCount} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>({coveragePercent}%)</span>
          </div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>BATCHES / SECTIONS</div>
          <div style={styles.kpiValue}>{batches.length || 1}</div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="🔍 Search by roll number, name, or parent mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        {batches.length > 0 && (
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            style={styles.selectFilter}
          >
            <option value="">All Batches ({students.length})</option>
            {batches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading student directory…</div>
      ) : filteredStudents.length === 0 ? (
        <div style={styles.emptyCard}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>👨‍🎓</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>No Students Found</h3>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 16px 0', maxWidth: 440 }}>
            {search || batchFilter
              ? 'No enrolled students match your search filter.'
              : 'Add your first student or bulk import your student roster from Excel/CSV to register parent WhatsApp numbers.'}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={openAddModal} style={styles.primaryBtn}>
              + Add Single Student
            </button>
            <button onClick={() => setBulkModal(true)} style={styles.secondaryBtn}>
              📥 Bulk Import Roster
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={{ ...styles.th, width: 60 }}>#</th>
                <th style={styles.th}>Roll Number</th>
                <th style={styles.th}>Student Name</th>
                <th style={styles.th}>Batch / Section</th>
                <th style={styles.th}>Parent WhatsApp Phone</th>
                <th style={styles.th}>Exams Taken</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((st, idx) => (
                <tr key={st.id} style={styles.tr}>
                  <td style={{ ...styles.td, color: '#94a3b8', fontSize: 12 }}>{idx + 1}</td>
                  <td style={{ ...styles.td, fontWeight: 700, color: '#0f172a' }}>
                    <span style={styles.rollBadge}>{st.rollNumber}</span>
                  </td>
                  <td style={{ ...styles.td, fontWeight: 600, color: '#1e293b' }}>
                    {st.fullName}
                    {st.parentName && (
                      <div style={{ fontSize: 11.5, color: '#64748b' }}>Parent: {st.parentName}</div>
                    )}
                  </td>
                  <td style={{ ...styles.td, color: '#475569', fontSize: 13 }}>
                    {st.batchName} {st.section ? `(${st.section})` : ''}
                  </td>
                  <td style={styles.td}>
                    {st.parentPhone && st.parentPhone.length >= 10 ? (
                      <span style={styles.phoneTagActive}>
                        📱 {st.parentPhoneMasked || st.parentPhone}
                      </span>
                    ) : (
                      <button
                        onClick={() => openEditModal(st)}
                        style={styles.addPhoneTag}
                        title="Click to register parent mobile"
                      >
                        + Add Mobile
                      </button>
                    )}
                  </td>
                  <td style={{ ...styles.td, color: '#64748b', fontSize: 13 }}>
                    <Link
                      to={`/student-analytics?roll=${encodeURIComponent(st.rollNumber)}`}
                      style={styles.analyticsLink}
                      title="View student multi-exam progress analytics"
                    >
                      📈 {st.examCount} tests
                    </Link>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right' }}>
                    <button
                      onClick={() => openEditModal(st)}
                      style={styles.iconBtn}
                      title="Edit student and parent details"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteStudent(st.id, st.fullName)}
                      style={{ ...styles.iconBtn, color: '#dc2626' }}
                      title="Remove from roster"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: Add/Edit Single Student */}
      {addModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>
                {editingStudent ? '✏️ Edit Student Profile' : '➕ Add Student to Roster'}
              </h3>
              <button onClick={() => setAddModal(false)} style={styles.modalCloseBtn}>✕</button>
            </div>
            <form onSubmit={handleSaveStudent}>
              <div style={{ padding: 20 }}>
                <div style={styles.formGrid}>
                  <div className="field">
                    <label style={styles.label}>Roll Number / Hall Ticket *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 24MPC001"
                      value={form.rollNumber}
                      onChange={(e) => setForm((f) => ({ ...f, rollNumber: e.target.value.toUpperCase() }))}
                      style={styles.input}
                    />
                  </div>
                  <div className="field">
                    <label style={styles.label}>Student Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sneha Latha Reddy"
                      value={form.fullName}
                      onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.formGrid}>
                  <div className="field">
                    <label style={styles.label}>Batch / Class</label>
                    <input
                      type="text"
                      placeholder="e.g. MPC Section-A"
                      value={form.batchName}
                      onChange={(e) => setForm((f) => ({ ...f, batchName: e.target.value }))}
                      style={styles.input}
                    />
                  </div>
                  <div className="field">
                    <label style={styles.label}>Section (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Section A"
                      value={form.section}
                      onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 8 }}>
                    📱 Parent WhatsApp Details
                  </div>
                  <div style={styles.formGrid}>
                    <div className="field">
                      <label style={styles.label}>Parent Mobile Number (WhatsApp) *</label>
                      <input
                        type="tel"
                        placeholder="e.g. 9848628863 (10 digits)"
                        value={form.parentPhone}
                        onChange={(e) => setForm((f) => ({ ...f, parentPhone: e.target.value }))}
                        style={{ ...styles.input, borderColor: '#0284c7' }}
                      />
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        Results and WhatsApp scorecards will be dispatched here.
                      </span>
                    </div>
                    <div className="field">
                      <label style={styles.label}>Parent / Guardian Name</label>
                      <input
                        type="text"
                        placeholder="e.g. K. Venkat Reddy"
                        value={form.parentName}
                        onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))}
                        style={styles.input}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setAddModal(false)} style={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={styles.primaryBtn}>
                  {saving ? 'Saving…' : editingStudent ? 'Update Student' : 'Save Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Bulk Import Roster */}
      {bulkModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: 640 }}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>
                📥 Bulk Import Students from Excel / CSV
              </h3>
              <button
                onClick={() => {
                  setBulkModal(false);
                  setBulkResult(null);
                }}
                style={styles.modalCloseBtn}
              >
                ✕
              </button>
            </div>
            {bulkResult ? (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 42, marginBottom: 10 }}>🎉</div>
                <h3 style={{ margin: '0 0 8px 0', color: '#059669' }}>Roster Import Complete!</h3>
                <p style={{ color: '#334155', fontSize: 14, margin: '0 0 16px 0' }}>
                  Successfully processed <b>{bulkResult.totalProcessed}</b> rows:
                  <br />
                  <b>{bulkResult.importedCount}</b> new students enrolled, <b>{bulkResult.updatedCount}</b> updated.
                </p>
                <button
                  onClick={() => {
                    setBulkModal(false);
                    setBulkResult(null);
                    setBulkCsv('');
                  }}
                  style={styles.primaryBtn}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleBulkImport}>
                <div style={{ padding: 20 }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                    Copy columns from your college Excel sheet and paste them below.
                    <br />
                    Format: <b>RollNumber, StudentName, Batch, ParentPhone</b>
                  </p>
                  <textarea
                    rows={8}
                    required
                    placeholder={`24MPC001, Sneha Latha Reddy, MPC-A, 9848628863\n24MPC002, Ramesh Kumar, MPC-A, 9848628864\n24MPC003, Priya Sharma, MPC-B, 9848628865`}
                    value={bulkCsv}
                    onChange={(e) => setBulkCsv(e.target.value)}
                    style={styles.csvTextarea}
                  />
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 6 }}>
                    Supports comma-separated or tab-separated (copied directly from Excel). Phone numbers will be normalized to standard WhatsApp format.
                  </div>
                </div>
                <div style={styles.modalFooter}>
                  <button type="button" onClick={() => setBulkModal(false)} style={styles.cancelBtn}>
                    Cancel
                  </button>
                  <button type="submit" disabled={saving || !bulkCsv.trim()} style={styles.primaryBtn}>
                    {saving ? 'Importing…' : '📥 Ingest & Enroll Roster'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 1140,
    margin: '0 auto',
    padding: '24px 16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#2563eb',
    fontWeight: 700,
    margin: '0 0 4px 0',
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: '#0f172a',
    margin: '0 0 6px 0',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    margin: 0,
    maxWidth: 620,
  },
  primaryBtn: {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '9px 16px',
    fontSize: 13.5,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  secondaryBtn: {
    background: '#fff',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: '9px 14px',
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 14,
    marginBottom: 20,
  },
  kpiCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 800,
    color: '#0f172a',
  },
  filterBar: {
    display: 'flex',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  searchInput: {
    flex: 1,
    minWidth: 260,
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontSize: 13.5,
  },
  selectFilter: {
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontSize: 13.5,
    background: '#fff',
  },
  tableCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  theadRow: {
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  th: {
    padding: '12px 14px',
    fontSize: 12,
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '12px 14px',
    fontSize: 13.5,
  },
  rollBadge: {
    background: '#f1f5f9',
    padding: '3px 8px',
    borderRadius: 6,
    fontFamily: 'monospace',
    fontSize: 12.5,
    color: '#1e293b',
    border: '1px solid #e2e8f0',
  },
  phoneTagActive: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: '#ecfdf5',
    color: '#065f46',
    border: '1px solid #a7f3d0',
    borderRadius: 6,
    padding: '3px 8px',
    fontSize: 12,
    fontWeight: 600,
  },
  addPhoneTag: {
    background: '#fef2f2',
    color: '#dc2626',
    border: '1px dashed #ef4444',
    borderRadius: 6,
    padding: '3px 8px',
    fontSize: 11.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
  analyticsLink: {
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: 12.5,
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    color: '#2563eb',
    padding: '4px 6px',
    fontWeight: 600,
  },
  emptyCard: {
    background: '#fff',
    border: '1px dashed #cbd5e1',
    borderRadius: 12,
    padding: '48px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
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
    maxWidth: 520,
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
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    padding: '14px 20px',
    borderTop: '1px solid #e2e8f0',
    background: '#f8fafc',
  },
  cancelBtn: {
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    padding: '8px 14px',
    fontSize: 13,
    cursor: 'pointer',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: '#334155',
    display: 'block',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #cbd5e1',
    fontSize: 13,
    boxSizing: 'border-box',
  },
  csvTextarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontFamily: 'monospace',
    fontSize: 12.5,
    lineHeight: 1.4,
    boxSizing: 'border-box',
  },
  errorBox: {
    background: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    padding: '10px 14px',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 13,
  },
};
