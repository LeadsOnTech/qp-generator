// frontend/src/pages/StudentAnalytics.jsx
// Student Performance Dashboard, Historical Progress Tracker & Multi-Test Trend Analytics.

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../lib/api';

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api');

const CLASS_YEAR_OPTIONS = [
  'Inter 1st Year (11th)',
  'Inter 2nd Year (12th)',
  'Long Term / Repeater',
  'Class 10 Foundation',
  'Class 9 Foundation',
  'Class 8 Foundation',
  'Degree / Graduation',
  'Other',
];

const COURSE_TARGET_OPTIONS = [
  'NEET (Medical)',
  'JEE Main & Advanced',
  'AP EAPCET (Engg & Agri)',
  'TG EAPCET (Engg & Agri)',
  'IIT-JEE + CBSE Foundation',
  'BITSAT / VITEEE / State CET',
  'State Boards / CBSE Boards',
  'Other / General',
];

const HOSTEL_OPTIONS = [
  'Day Scholar',
  'Hosteler / Residential',
  'Semi-Residential',
];

const GENDER_OPTIONS = ['Female', 'Male', 'Other'];
const PARENT_RELATION_OPTIONS = ['Father', 'Mother', 'Guardian'];
const PARENT_OCCUPATION_OPTIONS = [
  'Farmer / Agriculture',
  'Business / Self-Employed',
  'Teacher / Lecturer / Educator',
  'Government Employee',
  'Private Sector Employee',
  'Doctor / Engineer / Professional',
  'Daily Wage / Artisan',
  'Homemaker',
  'Other',
];

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Telangana',
  'Karnataka',
  'Tamil Nadu',
  'Kerala',
  'Maharashtra',
  'Odisha',
  'Chhattisgarh',
  'Gujarat',
  'Rajasthan',
  'Uttar Pradesh',
  'Bihar',
  'Madhya Pradesh',
  'West Bengal',
  'Delhi (NCT)',
  'Punjab',
  'Haryana',
  'Assam',
  'Jharkhand',
  'Uttarakhand',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Goa',
  'Tripura',
  'Meghalaya',
  'Manipur',
  'Nagaland',
  'Arunachal Pradesh',
  'Mizoram',
  'Sikkim',
  'Puducherry',
  'Chandigarh',
  'Ladakh',
  'Andaman and Nicobar Islands',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Lakshadweep',
  'Other / International',
];

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

  // Edit Student Profile & Photo State
  const [editModal, setEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editForm, setEditForm] = useState({
    rollNumber: '',
    fullName: '',
    photoUrl: '',
    admissionNumber: '',
    classYear: 'Inter 2nd Year (12th)',
    courseTarget: 'NEET (Medical)',
    batchName: 'MPC Section-A',
    section: '',
    gender: 'Female',
    nativePlace: '',
    district: '',
    state: 'Andhra Pradesh',
    hostelStatus: 'Day Scholar',
    parentName: '',
    parentRelation: 'Father',
    parentOccupation: 'Farmer / Agriculture',
    parentPhone: '',
    parentEmail: '',
    studentPhone: '',
    address: '',
  });
  const fileInputRef = useRef(null);

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
  const loadStudentData = useCallback(async (roll = selectedRoll) => {
    if (!roll) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.getStudentAnalytics(roll);
      setAnalyticsData(data);
    } catch (err) {
      setError(err.message || 'Failed to load student progress');
      setAnalyticsData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedRoll]);

  useEffect(() => {
    loadStudentData(selectedRoll);
  }, [selectedRoll, loadStudentData]);

  function openEditModal() {
    if (!analyticsData?.student) return;
    const s = analyticsData.student;
    setEditForm({
      rollNumber: s.rollNumber || '',
      fullName: s.studentName || '',
      photoUrl: s.photoUrl || '',
      admissionNumber: s.admissionNumber || '',
      classYear: s.classYear || 'Inter 2nd Year (12th)',
      courseTarget: s.courseTarget || 'NEET (Medical)',
      batchName: s.batchName || 'General',
      section: s.section || '',
      gender: s.gender || 'Female',
      nativePlace: s.nativePlace || '',
      district: s.district || '',
      state: s.state || 'Andhra Pradesh',
      hostelStatus: s.hostelStatus || 'Day Scholar',
      parentName: s.parentName || '',
      parentRelation: s.parentRelation || 'Father',
      parentOccupation: s.parentOccupation || 'Farmer / Agriculture',
      parentPhone: s.parentPhone || '',
      parentEmail: s.parentEmail || '',
      studentPhone: s.studentPhone || '',
      address: s.address || '',
    });
    setEditModal(true);
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo file size exceeds 5MB limit. Please select a smaller photo.');
      return;
    }

    try {
      setUploadingPhoto(true);
      const res = await api.uploadStudentPhoto(file);
      if (res.photoUrl) {
        setEditForm((f) => ({ ...f, photoUrl: res.photoUrl }));
      }
    } catch (err) {
      const reader = new FileReader();
      reader.onload = () => {
        setEditForm((f) => ({ ...f, photoUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSaveEditProfile(e) {
    e.preventDefault();
    if (!editForm.rollNumber.trim() || !editForm.fullName.trim()) {
      alert('Roll Number and Full Name are required.');
      return;
    }
    try {
      setSavingEdit(true);
      await api.saveStudentProfile(editForm);
      setEditModal(false);
      await loadStudentData(selectedRoll);
      // Refresh list in case name changed
      const listData = await api.getAnalyticsStudentsList();
      setStudentsList(listData.students || []);
    } catch (err) {
      alert('Failed to save profile: ' + err.message);
    } finally {
      setSavingEdit(false);
    }
  }

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

  const filteredStudents = (studentsList || []).filter(
    (s) =>
      (s.studentName || '').toLowerCase().includes((searchFilter || '').toLowerCase()) ||
      (s.rollNumber || '').toLowerCase().includes((searchFilter || '').toLowerCase()) ||
      (s.batchName || '').toLowerCase().includes((searchFilter || '').toLowerCase())
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
              <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                No matching students found
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
                      background: isSelected ? '#eff6ff' : '#fff',
                      borderLeft: isSelected ? '4px solid #2563eb' : '4px solid transparent',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: isSelected ? '#1d4ed8' : '#0f172a' }}>
                      {s.studentName || s.rollNumber}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                      Roll: <span style={{ fontWeight: 600 }}>{s.rollNumber}</span> • {s.batchName || 'General'}
                    </div>
                    <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, marginTop: 4 }}>
                      {s.totalExams} {s.totalExams === 1 ? 'Exam' : 'Exams'} • Avg: {s.averagePercentage || 0}%
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
                  {/* Interactive Avatar */}
                  <div
                    onClick={openEditModal}
                    style={{
                      position: 'relative',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    title="Click to edit profile or upload photo"
                  >
                    {analyticsData.student.photoUrl ? (
                      <img
                        src={analyticsData.student.photoUrl}
                        alt={analyticsData.student.studentName}
                        style={{
                          width: 68,
                          height: 68,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '3px solid #2563eb',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                          display: 'block',
                        }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{
                        width: 68,
                        height: 68,
                        borderRadius: '50%',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '2px solid #bfdbfe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 26,
                        fontWeight: 800,
                      }}>
                        {analyticsData.student.studentName?.charAt(0).toUpperCase() || '👤'}
                      </div>
                    )}
                    <div style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      background: '#2563eb',
                      color: '#fff',
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      border: '2px solid #fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} title="Upload photo / Edit profile">
                      📷
                    </div>
                  </div>

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
                      {analyticsData.student?.hostelStatus && (
                        <span style={{
                          background: String(analyticsData.student.hostelStatus).toLowerCase().includes('hostel') ? '#faf5ff' : '#f0fdf4',
                          color: String(analyticsData.student.hostelStatus).toLowerCase().includes('hostel') ? '#7e22ce' : '#15803d',
                          border: `1px solid ${String(analyticsData.student.hostelStatus).toLowerCase().includes('hostel') ? '#e9d5ff' : '#bbf7d0'}`,
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                        }}>
                          {String(analyticsData.student.hostelStatus).toLowerCase().includes('hostel') ? '🛏️ Hosteler' : '🏠 Day Scholar'}
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
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={openEditModal}
                    style={{
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 14px',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                    title="Edit student profile, course target, native village, parent contact, or upload photo"
                  >
                    ✏️ Edit Profile & Photo
                  </button>

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
                      {analyticsData.careerStats?.totalExamsTaken || 0}
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
                    {analyticsData.careerStats?.careerAveragePercentage ?? 0}%
                  </div>
                </div>

                <div style={styles.kpiCard}>
                  <div style={styles.kpiLabel}>OVERALL ACCURACY</div>
                  <div style={{ ...styles.kpiValue, color: '#059669' }}>
                    {analyticsData.careerStats?.careerAverageAccuracy ?? 0}%
                  </div>
                </div>

                <div style={styles.kpiCard}>
                  <div style={styles.kpiLabel}>BEST COLLEGE RANK</div>
                  <div style={{ ...styles.kpiValue, color: '#d97706' }}>
                    #{analyticsData.careerStats?.bestRank || '—'}
                  </div>
                </div>

                <div style={styles.kpiCard}>
                  <div style={styles.kpiLabel}>LATEST TEST GAIN</div>
                  <div style={styles.kpiValue}>
                    {(analyticsData.careerStats?.latestDelta ?? 0) >= 0 ? (
                      <span style={{ color: '#16a34a' }}>+{(analyticsData.careerStats?.latestDelta ?? 0)} pts ▲</span>
                    ) : (
                      <span style={{ color: '#dc2626' }}>{analyticsData.careerStats?.latestDelta} pts ▼</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Progression Chart */}
              <div style={styles.sectionCard}>
                <h3 style={styles.sectionHeading}>Test Progression Trend (Percentage Points & Accuracy)</h3>
                <p style={{ margin: '0 0 16px 0', fontSize: 12.5, color: '#64748b' }}>
                  Tracks sequential examination scores and accuracy. Improvement shown as percentage points.
                </p>

                <div style={styles.chartContainer}>
                  {(analyticsData.timeline || []).map((item, idx) => (
                    <div key={item.resultId} style={styles.chartBarCol}>
                      <div style={styles.chartBarWrapper}>
                        <div
                          style={{
                            ...styles.chartBarScore,
                            height: `${Math.max(item.percentage || 0, 8)}%`,
                          }}
                          title={`Score: ${item.percentage}% (${item.marksObtained}/${item.maxMarks})`}
                        >
                          <span style={styles.barLabelText}>{item.percentage}%</span>
                        </div>
                      </div>
                      <div style={styles.barSubText}>T{idx + 1}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>#{item.rank}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Examination Breakdown Table */}
              <div style={styles.sectionCard}>
                <h3 style={styles.sectionHeading}>Detailed Examination History & Subject Breakdown</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.theadRow}>
                        <th style={styles.th}>Test</th>
                        <th style={styles.th}>Exam Name</th>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Type</th>
                        <th style={{ ...styles.th, textAlign: 'center' }}>Rank</th>
                        <th style={{ ...styles.th, textAlign: 'right' }}>Score</th>
                        <th style={{ ...styles.th, textAlign: 'center' }}>Accuracy</th>
                        <th style={{ ...styles.th, textAlign: 'center' }}>Gain</th>
                        <th style={{ ...styles.th, textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analyticsData.timeline || []).map((item, idx) => (
                        <tr key={item.resultId} style={styles.tr}>
                          <td style={{ ...styles.td, fontWeight: 700, color: '#475569' }}>T{idx + 1}</td>
                          <td style={{ ...styles.td, fontWeight: 700, color: '#0f172a' }}>{item.examName}</td>
                          <td style={{ ...styles.td, color: '#64748b', fontSize: 12 }}>
                            {item.examDate ? new Date(item.examDate).toLocaleDateString('en-IN') : '—'}
                          </td>
                          <td style={styles.td}>
                            <span style={styles.examTypePill}>{item.examType}</span>
                          </td>
                          <td style={{ ...styles.td, textAlign: 'center', fontWeight: 700, color: item.rank <= 3 ? '#d97706' : '#334155' }}>
                            #{item.rank} <span style={{ fontSize: 10.5, color: '#94a3b8' }}>/{item.totalStudents}</span>
                          </td>
                          <td style={{ ...styles.td, textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, color: '#0f172a' }}>{item.marksObtained} / {item.maxMarks}</div>
                            <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 600 }}>{item.percentage}%</div>
                          </td>
                          <td style={{ ...styles.td, textAlign: 'center' }}>
                            <span
                              style={{
                                ...styles.accuracyBadge,
                                background: item.accuracyPercentage >= 70 ? '#dcfce7' : item.accuracyPercentage >= 50 ? '#fef3c7' : '#fee2e2',
                                color: item.accuracyPercentage >= 70 ? '#15803d' : item.accuracyPercentage >= 50 ? '#b45309' : '#b91c1c',
                              }}
                            >
                              {item.accuracyPercentage}%
                            </span>
                          </td>
                          <td style={{ ...styles.td, textAlign: 'center', fontWeight: 700 }}>
                            {idx === 0 ? (
                              <span style={{ color: '#94a3b8' }}>—</span>
                            ) : item.percentagePointsDelta >= 0 ? (
                              <span style={{ color: '#16a34a' }}>+{item.percentagePointsDelta}</span>
                            ) : (
                              <span style={{ color: '#dc2626' }}>{item.percentagePointsDelta}</span>
                            )}
                          </td>
                          <td style={{ ...styles.td, textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: 6 }}>
                              <a
                                href={`${API_BASE}/results/${item.resultId}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={styles.actionBtnIcon}
                                title="Download PDF Scorecard"
                              >
                                📄 PDF
                              </a>
                              {item.publicToken && (
                                <Link
                                  to={`/scorecard/${item.publicToken}`}
                                  target="_blank"
                                  style={styles.actionBtnIcon}
                                  title="View Web Scorecard"
                                >
                                  🔗 View
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Subject Mastery Radar */}
              <div style={styles.sectionCard}>
                <h3 style={styles.sectionHeading}>Subject Mastery & Historical Consistency</h3>
                <div style={styles.subjectGrid}>
                  {(analyticsData.subjectPerformance || []).map((subj) => (
                    <div key={subj.subjectName} style={styles.subjectCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{subj.subjectName}</div>
                        <span style={styles.subjectAccuracyPill}>{subj.averageAccuracy}% Accuracy</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                        {subj.testsAppeared} Tests Appeared • Avg Score: <b>{subj.averagePercentage}%</b>
                      </div>
                      <div style={styles.progressBarBg}>
                        <div
                          style={{
                            ...styles.progressBarFill,
                            width: `${Math.min(subj.averagePercentage, 100)}%`,
                            background: subj.averagePercentage >= 70 ? '#10b981' : subj.averagePercentage >= 50 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {(!analyticsData.subjectPerformance || analyticsData.subjectPerformance.length === 0) && (
                    <div style={{ padding: '20px', color: '#64748b', fontSize: 13, gridColumn: '1 / -1', textAlign: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                      No subject-wise breakdown recorded for this examination yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Diagnostic Weak Chapter Matrix */}
              <div style={styles.sectionCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                  <div>
                    <h3 style={styles.sectionHeading}>Chronic Weak Chapters (Diagnostic Audit)</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: 12.5, color: '#64748b' }}>
                      Chapters with persistent low accuracy (&lt;60%) across examinations.
                    </p>
                  </div>
                  {analyticsData.chronicWeakChapters?.length > 0 && (
                    <button
                      onClick={() => handleGenerateRemedial()}
                      disabled={generatingRemedial}
                      style={styles.remedialBtn}
                      title="Generate customized remedial Daily Practice Problem targeting all weak chapters"
                    >
                      {generatingRemedial ? 'Generating DPP…' : '⚡ 1-Click Tailored Remedial DPP'}
                    </button>
                  )}
                </div>

                {(!analyticsData.chronicWeakChapters || analyticsData.chronicWeakChapters.length === 0) ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#059669', background: '#ecfdf5', borderRadius: 8 }}>
                    ✅ <b>Outstanding Mastery!</b> No chronic weak chapters detected below 60% accuracy threshold.
                  </div>
                ) : (
                  <div style={styles.weakChapterGrid}>
                    {(analyticsData.chronicWeakChapters || []).map((w) => (
                      <div key={w.chapterName} style={styles.weakChapterCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#991b1b', flex: 1, paddingRight: 8 }}>
                            {w.chapterName}
                          </div>
                          <span style={styles.weakAccuracyTag}>{w.averageAccuracy}% Acc</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: '#78350f', marginTop: 4 }}>
                          Failed or below threshold in <b>{w.occurrenceCount}</b> test{w.occurrenceCount === 1 ? '' : 's'}
                        </div>
                        <button
                          onClick={() => handleGenerateRemedial([w.chapterName])}
                          disabled={generatingRemedial}
                          style={{ ...styles.singleChapterRemedialBtn, marginTop: 8 }}
                          title={`Generate practice paper targeting ${w.chapterName}`}
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
                        {(analyticsData.careerStats?.careerAveragePercentage ?? 0) >= 75
                          ? `High-caliber student with strong conceptual retention (${analyticsData.careerStats?.careerAveragePercentage ?? 0}% avg). Focus on speed and negative-marking discipline to reach top-tier percentiles.`
                          : (analyticsData.careerStats?.careerAveragePercentage ?? 0) >= 50
                          ? `Consistent performer (${analyticsData.careerStats?.careerAveragePercentage ?? 0}% avg). Needs targeted question drilling in weak chapters to eliminate negative deductions.`
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

      {/* MODAL 1: Edit Student Profile & Upload Photo */}
      {editModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: 680 }}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, color: '#0f172a', fontWeight: 800 }}>
                  ✏️ Edit Student Profile & Upload Photo
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#64748b' }}>
                  Update passport photograph, target course, native place, and parent WhatsApp contact.
                </p>
              </div>
              <button onClick={() => setEditModal(false)} style={styles.modalCloseBtn}>✕</button>
            </div>
            <form onSubmit={handleSaveEditProfile}>
              <div style={{ padding: '16px 20px', maxHeight: '76vh', overflowY: 'auto' }}>
                
                {/* PHOTOGRAPH UPLOAD WIDGET */}
                <div style={styles.photoUploadCard}>
                  <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                    {editForm.photoUrl ? (
                      <img
                        src={editForm.photoUrl}
                        alt="Student"
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '3px solid #2563eb',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        background: '#e2e8f0',
                        color: '#64748b',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px dashed #94a3b8',
                        fontSize: 24,
                      }}>
                        📷
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 2 }}>
                      Student Photograph (Passport Photo)
                    </div>
                    <p style={{ margin: '0 0 8px 0', fontSize: 11.5, color: '#64748b' }}>
                      Upload passport photo for ID cards, hall tickets, and scorecards (JPG, PNG, WebP up to 5MB).
                    </p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        style={{ display: 'none' }}
                        onChange={handlePhotoUpload}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        style={{
                          background: '#fff',
                          color: '#2563eb',
                          border: '1px solid #93c5fd',
                          borderRadius: 6,
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        {uploadingPhoto ? '⏳ Uploading…' : editForm.photoUrl ? '🔄 Change Photo' : '📷 Upload Photo'}
                      </button>
                      {editForm.photoUrl && (
                        <button
                          type="button"
                          onClick={() => setEditForm((f) => ({ ...f, photoUrl: '' }))}
                          style={{
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            borderRadius: 6,
                            padding: '6px 10px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          ✕ Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* SECTION 1: Academic & Course */}
                <div style={styles.sectionHeader}>
                  <span style={styles.sectionIcon}>🎓</span>
                  <span style={styles.sectionTitle}>1. Academic & Course Enrollment</span>
                </div>
                
                <div style={styles.formGrid}>
                  <div className="field">
                    <label style={styles.label}>Roll Number / Hall Ticket *</label>
                    <input
                      type="text"
                      disabled
                      value={editForm.rollNumber}
                      style={{ ...styles.input, fontWeight: 700, background: '#f1f5f9', cursor: 'not-allowed' }}
                    />
                  </div>
                  <div className="field">
                    <label style={styles.label}>Student Full Name *</label>
                    <input
                      type="text"
                      required
                      value={editForm.fullName}
                      onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.formGrid}>
                  <div className="field">
                    <label style={styles.label}>Target Course Joined *</label>
                    <select
                      value={editForm.courseTarget}
                      onChange={(e) => setEditForm((f) => ({ ...f, courseTarget: e.target.value }))}
                      style={styles.select}
                    >
                      {COURSE_TARGET_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label style={styles.label}>Class / Academic Year *</label>
                    <select
                      value={editForm.classYear}
                      onChange={(e) => setEditForm((f) => ({ ...f, classYear: e.target.value }))}
                      style={styles.select}
                    >
                      {CLASS_YEAR_OPTIONS.map((cy) => (
                        <option key={cy} value={cy}>{cy}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.formGrid3}>
                  <div className="field">
                    <label style={styles.label}>Batch / Class</label>
                    <input
                      type="text"
                      value={editForm.batchName}
                      onChange={(e) => setEditForm((f) => ({ ...f, batchName: e.target.value }))}
                      style={styles.input}
                    />
                  </div>
                  <div className="field">
                    <label style={styles.label}>Section (Optional)</label>
                    <input
                      type="text"
                      value={editForm.section}
                      onChange={(e) => setEditForm((f) => ({ ...f, section: e.target.value }))}
                      style={styles.input}
                    />
                  </div>
                  <div className="field">
                    <label style={styles.label}>Admission No</label>
                    <input
                      type="text"
                      value={editForm.admissionNumber}
                      onChange={(e) => setEditForm((f) => ({ ...f, admissionNumber: e.target.value }))}
                      style={styles.input}
                    />
                  </div>
                </div>

                {/* SECTION 2: Personal & Native Details */}
                <div style={{ ...styles.sectionHeader, marginTop: 18 }}>
                  <span style={styles.sectionIcon}>🏡</span>
                  <span style={styles.sectionTitle}>2. Personal, Native & Residence Background</span>
                </div>

                <div style={styles.formGrid}>
                  <div className="field">
                    <label style={styles.label}>Native Village / Town / City</label>
                    <input
                      type="text"
                      placeholder="e.g. Tenali, Nuzvid, Tirupati, Vijayawada"
                      value={editForm.nativePlace}
                      onChange={(e) => setEditForm((f) => ({ ...f, nativePlace: e.target.value }))}
                      style={styles.input}
                    />
                  </div>
                  <div className="field">
                    <label style={styles.label}>District</label>
                    <input
                      type="text"
                      placeholder="e.g. Krishna, Guntur, NTR, Visakhapatnam"
                      value={editForm.district}
                      onChange={(e) => setEditForm((f) => ({ ...f, district: e.target.value }))}
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.formGrid3}>
                  <div className="field">
                    <label style={styles.label}>Residence / Hostel Status</label>
                    <select
                      value={editForm.hostelStatus}
                      onChange={(e) => setEditForm((f) => ({ ...f, hostelStatus: e.target.value }))}
                      style={styles.select}
                    >
                      {HOSTEL_OPTIONS.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label style={styles.label}>Gender</label>
                    <select
                      value={editForm.gender}
                      onChange={(e) => setEditForm((f) => ({ ...f, gender: e.target.value }))}
                      style={styles.select}
                    >
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label style={styles.label}>State *</label>
                    <select
                      value={editForm.state}
                      onChange={(e) => setEditForm((f) => ({ ...f, state: e.target.value }))}
                      style={{ ...styles.select, fontWeight: 600 }}
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SECTION 3: Parent WhatsApp & Contact */}
                <div style={{ ...styles.sectionHeader, marginTop: 18 }}>
                  <span style={styles.sectionIcon}>📱</span>
                  <span style={styles.sectionTitle}>3. Parent WhatsApp Mobile & Family Details</span>
                </div>

                <div style={styles.formGrid}>
                  <div className="field">
                    <label style={styles.label}>Parent Mobile (WhatsApp) *</label>
                    <input
                      type="tel"
                      placeholder="e.g. 9848628863 (10 digits)"
                      value={editForm.parentPhone}
                      onChange={(e) => setEditForm((f) => ({ ...f, parentPhone: e.target.value }))}
                      style={{ ...styles.input, borderColor: '#0284c7', background: '#f0f9ff' }}
                    />
                    <span style={{ fontSize: 11, color: '#0369a1', display: 'block', marginTop: 3 }}>
                      Automated exam scorecards and PDF reports are dispatched here.
                    </span>
                  </div>
                  <div className="field">
                    <label style={styles.label}>Parent / Guardian Name</label>
                    <input
                      type="text"
                      placeholder="e.g. K. Venkat Reddy"
                      value={editForm.parentName}
                      onChange={(e) => setEditForm((f) => ({ ...f, parentName: e.target.value }))}
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.formGrid}>
                  <div className="field">
                    <label style={styles.label}>Relationship</label>
                    <select
                      value={editForm.parentRelation}
                      onChange={(e) => setEditForm((f) => ({ ...f, parentRelation: e.target.value }))}
                      style={styles.select}
                    >
                      {PARENT_RELATION_OPTIONS.map((pr) => (
                        <option key={pr} value={pr}>{pr}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label style={styles.label}>Parent Occupation</label>
                    <select
                      value={editForm.parentOccupation}
                      onChange={(e) => setEditForm((f) => ({ ...f, parentOccupation: e.target.value }))}
                      style={styles.select}
                    >
                      {PARENT_OCCUPATION_OPTIONS.map((po) => (
                        <option key={po} value={po}>{po}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.formGrid}>
                  <div className="field">
                    <label style={styles.label}>Student Personal Mobile (Optional)</label>
                    <input
                      type="tel"
                      placeholder="e.g. 9848628800"
                      value={editForm.studentPhone}
                      onChange={(e) => setEditForm((f) => ({ ...f, studentPhone: e.target.value }))}
                      style={styles.input}
                    />
                  </div>
                  <div className="field">
                    <label style={styles.label}>Permanent / Native Address (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. D.No 4-12, Main Road, Tenali"
                      value={editForm.address}
                      onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                      style={styles.input}
                    />
                  </div>
                </div>

              </div>
              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setEditModal(false)} style={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" disabled={savingEdit || uploadingPhoto} style={styles.primaryBtn}>
                  {savingEdit ? 'Saving…' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Remedial Paper Generated Notification */}
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
    marginBottom: 6,
    letterSpacing: '0.04em',
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: '#0f172a',
    margin: '0 0 6px 0',
  },
  subtitle: {
    fontSize: 13.5,
    color: '#64748b',
    margin: 0,
  },
  layoutGrid: {
    display: 'grid',
    gridTemplateColumns: '300px 1fr',
    gap: 16,
    alignItems: 'start',
  },
  rosterCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  rosterSearchInput: {
    width: '100%',
    padding: '7px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 12.5,
    boxSizing: 'border-box',
  },
  rosterList: {
    maxHeight: 'calc(100vh - 280px)',
    overflowY: 'auto',
  },
  rosterItem: {
    padding: '12px 14px',
    borderBottom: '1px solid #f1f5f9',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  analyticsCol: {
    minWidth: 0,
  },
  profileBanner: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  examCountBadge: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 8,
    padding: '8px 16px',
    textAlign: 'center',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: 14,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#64748b',
    letterSpacing: '0.04em',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: 800,
    color: '#0f172a',
  },
  sectionCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: 18,
    marginBottom: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: 800,
    color: '#0f172a',
    margin: '0 0 4px 0',
  },
  chartContainer: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 12,
    height: 180,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottom: '1px solid #e2e8f0',
    overflowX: 'auto',
  },
  chartBarCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 44,
  },
  chartBarWrapper: {
    height: 140,
    display: 'flex',
    alignItems: 'flex-end',
    width: 28,
  },
  chartBarScore: {
    width: '100%',
    background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
    borderRadius: '4px 4px 0 0',
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    transition: 'height 0.3s ease',
  },
  barLabelText: {
    position: 'absolute',
    top: -18,
    fontSize: 10.5,
    fontWeight: 700,
    color: '#1e3a8a',
    whiteSpace: 'nowrap',
  },
  barSubText: {
    marginTop: 6,
    fontSize: 11.5,
    fontWeight: 700,
    color: '#0f172a',
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
    padding: '10px 12px',
    fontSize: 11.5,
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '11px 12px',
    fontSize: 12.5,
    verticalAlign: 'middle',
  },
  examTypePill: {
    background: '#f1f5f9',
    color: '#475569',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  accuracyBadge: {
    display: 'inline-block',
    padding: '2px 7px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 700,
  },
  actionBtnIcon: {
    background: '#f1f5f9',
    color: '#2563eb',
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    padding: '3px 8px',
    fontSize: 11,
    fontWeight: 700,
    textDecoration: 'none',
    cursor: 'pointer',
  },
  subjectGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 12,
  },
  subjectCard: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: 14,
  },
  subjectAccuracyPill: {
    fontSize: 11,
    fontWeight: 700,
    color: '#065f46',
    background: '#ecfdf5',
    padding: '2px 6px',
    borderRadius: 4,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    background: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  weakChapterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 10,
    marginTop: 10,
  },
  weakChapterCard: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: 12,
  },
  weakAccuracyTag: {
    fontSize: 11,
    fontWeight: 800,
    color: '#991b1b',
    background: '#fff',
    border: '1px solid #fca5a5',
    padding: '1px 5px',
    borderRadius: 4,
    whiteSpace: 'nowrap',
  },
  remedialBtn: {
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
    background: 'rgba(15,23,42,0.65)',
    zIndex: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backdropFilter: 'blur(2px)',
  },
  modalContent: {
    background: '#fff',
    borderRadius: 14,
    maxWidth: 680,
    width: '100%',
    overflow: 'hidden',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
    background: '#f8fafc',
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    color: '#64748b',
    padding: '4px 8px',
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
    fontWeight: 600,
  },
  primaryBtn: {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  photoUploadCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '12px 16px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    marginBottom: 16,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 6,
    borderBottom: '1px solid #e2e8f0',
    marginBottom: 10,
  },
  sectionIcon: {
    fontSize: 16,
  },
  sectionTitle: {
    fontWeight: 800,
    fontSize: 13,
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 10,
  },
  formGrid3: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 10,
    marginBottom: 10,
  },
  label: {
    fontSize: 11.5,
    fontWeight: 700,
    color: '#334155',
    display: 'block',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    padding: '8px 11px',
    borderRadius: 6,
    border: '1px solid #cbd5e1',
    fontSize: 13,
    boxSizing: 'border-box',
    color: '#0f172a',
  },
  select: {
    width: '100%',
    padding: '8px 11px',
    borderRadius: 6,
    border: '1px solid #cbd5e1',
    fontSize: 13,
    boxSizing: 'border-box',
    background: '#fff',
    color: '#0f172a',
  },
  emptyCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: 40,
    textAlign: 'center',
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid #e2e8f0',
    borderTopColor: '#2563eb',
    borderRadius: '50%',
    margin: '0 auto',
    animation: 'spin 1s linear infinite',
  },
};
