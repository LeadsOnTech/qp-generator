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
  const [showAllWeakChapters, setShowAllWeakChapters] = useState(false);

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={styles.badge}>MODULE 4 &amp; 5 • INSTITUTIONAL PERFORMANCE AUDIT</div>
            <h1 style={styles.title}>Student Performance Analytics &amp; Academic Progression</h1>
            <p style={styles.subtitle}>
              Multi-test trajectory, diagnostic weak-chapter audit, and automated 1-click remedial intervention.
            </p>
          </div>
          <div>
            <Link
              to="/students"
              style={{
                background: '#fff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                padding: '8px 14px',
                fontSize: 12.5,
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              👥 View Full Roster
            </Link>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Left Roster, Right Analytics */}
      <div style={styles.layoutGrid}>
        {/* Left Column: Student Roster Search, Selector & Cohort Summary */}
        <div style={styles.rosterCard}>
          <div style={styles.rosterHeader}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                Enrolled Students
              </span>
              <span style={styles.rosterCountPill}>
                {studentsList.length} Total
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Filter by name, roll, batch..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={styles.rosterSearchInput}
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  style={styles.searchClearBtn}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div style={styles.rosterList}>
            {filteredStudents.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                No matching students found
              </div>
            ) : (
              filteredStudents.map((s) => {
                const isSelected = s.rollNumber === selectedRoll;
                const initials = (s.studentName || s.rollNumber || 'S').charAt(0).toUpperCase();
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: isSelected ? '#dbeafe' : '#f1f5f9',
                          color: isSelected ? '#1d4ed8' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: 14,
                          flexShrink: 0,
                        }}
                      >
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 700,
                          fontSize: 13.5,
                          color: isSelected ? '#1d4ed8' : '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {s.studentName || s.rollNumber}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
                          Roll: <b style={{ color: '#334155' }}>{s.rollNumber}</b>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: (s.averagePercentage || 0) >= 70 ? '#dcfce7' : (s.averagePercentage || 0) >= 50 ? '#fef3c7' : '#fee2e2',
                            color: (s.averagePercentage || 0) >= 70 ? '#15803d' : (s.averagePercentage || 0) >= 50 ? '#b45309' : '#b91c1c',
                          }}
                        >
                          {s.averagePercentage || 0}%
                        </span>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>
                          {s.totalExams || 1} {s.totalExams === 1 ? 'Exam' : 'Exams'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Institutional Cohort Summary card at the bottom of the sidebar */}
          <div style={styles.rosterCohortSummary}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: '#1e3a8a', letterSpacing: '0.04em', marginBottom: 6 }}>
              COHORT SNAPSHOT
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569', marginBottom: 4 }}>
              <span>Total Enrolled</span>
              <b style={{ color: '#0f172a' }}>{studentsList.length} Student{studentsList.length !== 1 ? 's' : ''}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569', marginBottom: 4 }}>
              <span>Active Batch</span>
              <b style={{ color: '#0f172a' }}>{analyticsData?.student?.batchName || 'General'}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569' }}>
              <span>Top Batch Score</span>
              <b style={{ color: '#059669' }}>{analyticsData?.careerStats?.careerAveragePercentage ?? 0}%</b>
            </div>
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
              {/* 1. Student Profile Hero Card */}
              <div style={styles.profileBanner}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 1, minWidth: 320 }}>
                  {/* Interactive Avatar */}
                  <div
                    onClick={openEditModal}
                    style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
                    title="Click to edit profile or upload photo"
                  >
                    {analyticsData.student.photoUrl ? (
                      <img
                        src={analyticsData.student.photoUrl}
                        alt={analyticsData.student.studentName}
                        style={styles.avatarImg}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={styles.avatarPlaceholder}>
                        {analyticsData.student.studentName?.charAt(0).toUpperCase() || '👤'}
                      </div>
                    )}
                    <div style={styles.avatarBadge} title="Upload photo / Edit profile">
                      📷
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    {/* Demographics Chips */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                      {analyticsData.student.courseTarget && (
                        <span style={styles.chipCourse}>🎯 {analyticsData.student.courseTarget}</span>
                      )}
                      {analyticsData.student.classYear && (
                        <span style={styles.chipClass}>🎓 {analyticsData.student.classYear}</span>
                      )}
                      {analyticsData.student.hostelStatus && (
                        <span style={String(analyticsData.student.hostelStatus).toLowerCase().includes('hostel') ? styles.chipHostel : styles.chipDayScholar}>
                          {String(analyticsData.student.hostelStatus).toLowerCase().includes('hostel') ? '🛏️ Hosteler' : '🏠 Day Scholar'}
                        </span>
                      )}
                      <span style={styles.chipBatch}>
                        🏷️ {analyticsData.student.batchName || 'General'} {analyticsData.student.section ? `(${analyticsData.student.section})` : ''}
                      </span>
                    </div>

                    <h2 style={styles.profileStudentName}>
                      {analyticsData.student.studentName}
                    </h2>

                    <div style={styles.profileMetaRow}>
                      <span>Roll: <b style={{ color: '#0f172a' }}>{analyticsData.student.rollNumber}</b></span>
                      {analyticsData.student.admissionNumber && (
                        <span>• Adm: <b>{analyticsData.student.admissionNumber}</b></span>
                      )}
                      {(analyticsData.student.nativePlace || analyticsData.student.district) && (
                        <span>• 📍 <b>{analyticsData.student.nativePlace || ''}{analyticsData.student.nativePlace && analyticsData.student.district ? ', ' : ''}{analyticsData.student.district ? `${analyticsData.student.district} Dt` : ''}</b></span>
                      )}
                      {analyticsData.student.state && (
                        <span>• <b>{analyticsData.student.state}</b></span>
                      )}
                    </div>

                    {/* Parent & WhatsApp Cardlet */}
                    <div style={styles.parentCardlet}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span>👨‍👩‍👦 <b>{analyticsData.student.parentName || 'Parent'}</b>{analyticsData.student.parentRelation ? ` (${analyticsData.student.parentRelation})` : ''}{analyticsData.student.parentOccupation ? ` • ${analyticsData.student.parentOccupation}` : ''}</span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#059669', fontWeight: 700 }}>
                          <span>💬 WhatsApp:</span>
                          <span>{analyticsData.student.parentPhoneMasked || 'Not registered'}</span>
                        </span>
                        {analyticsData.student.studentPhone && (
                          <>
                            <span style={{ color: '#cbd5e1' }}>•</span>
                            <span style={{ color: '#475569' }}>Student Mobile: <b>{analyticsData.student.studentPhone}</b></span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Action Cluster */}
                <div style={styles.profileActionsCol}>
                  <div style={styles.examMilestoneTile}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: '#1e3a8a', lineHeight: 1 }}>
                      {analyticsData.careerStats?.totalExamsTaken || 1}
                    </div>
                    <div style={{ fontSize: 11, color: '#475569', fontWeight: 700, marginTop: 4 }}>
                      Exam{analyticsData.careerStats?.totalExamsTaken !== 1 ? 's' : ''} Completed
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={openEditModal}
                      style={styles.editProfileBtn}
                      title="Edit profile demographics or upload photo"
                    >
                      ✏️ Edit Profile &amp; Photo
                    </button>
                    <button
                      onClick={handleExportCsv}
                      disabled={exportingCsv}
                      style={styles.exportCsvBtn}
                      title="Export student history as CSV"
                    >
                      {exportingCsv ? 'Exporting…' : '📥 Export CSV'}
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Key Performance Indicators Row (Balanced 4-Grid) */}
              <div style={styles.kpiGrid}>
                <div style={{ ...styles.kpiCard, borderTop: '3px solid #2563eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={styles.kpiLabel}>CAREER AVERAGE</div>
                    <span style={{ fontSize: 16 }}>📈</span>
                  </div>
                  <div style={{ ...styles.kpiValue, color: '#2563eb' }}>
                    {analyticsData.careerStats?.careerAveragePercentage ?? 0}%
                  </div>
                  <div style={styles.kpiSub}>Across {analyticsData.careerStats?.totalExamsTaken || 1} exam(s)</div>
                </div>

                <div style={{ ...styles.kpiCard, borderTop: '3px solid #10b981' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={styles.kpiLabel}>OVERALL ACCURACY</div>
                    <span style={{ fontSize: 16 }}>🎯</span>
                  </div>
                  <div style={{ ...styles.kpiValue, color: '#059669' }}>
                    {analyticsData.careerStats?.careerAverageAccuracy ?? 0}%
                  </div>
                  <div style={styles.kpiSub}>Correct vs attempted efficiency</div>
                </div>

                <div style={{ ...styles.kpiCard, borderTop: '3px solid #f59e0b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={styles.kpiLabel}>COLLEGE RANK</div>
                    <span style={{ fontSize: 16 }}>🏆</span>
                  </div>
                  <div style={{ ...styles.kpiValue, color: '#d97706' }}>
                    #{analyticsData.careerStats?.bestRank || 1}
                  </div>
                  <div style={styles.kpiSub}>Batch benchmark standing</div>
                </div>

                <div style={{ ...styles.kpiCard, borderTop: '3px solid #8b5cf6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={styles.kpiLabel}>LATEST TEST GAIN</div>
                    <span style={{ fontSize: 16 }}>⚡</span>
                  </div>
                  <div style={styles.kpiValue}>
                    {(analyticsData.careerStats?.latestDelta ?? 0) >= 0 ? (
                      <span style={{ color: '#16a34a' }}>+{(analyticsData.careerStats?.latestDelta ?? 0)} pts ▲</span>
                    ) : (
                      <span style={{ color: '#dc2626' }}>{analyticsData.careerStats?.latestDelta} pts ▼</span>
                    )}
                  </div>
                  <div style={styles.kpiSub}>Relative to baseline</div>
                </div>
              </div>

              {/* 3. Balanced 2-Column Core: Progression & Exam History (Left) | Subject Mastery (Right) */}
              <div style={styles.dashboardSplitGrid}>
                
                {/* Left Column: Test Progression Trajectory & Detailed Exam Table */}
                <div style={styles.sectionCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <h3 style={styles.sectionHeading}>📈 Examination Progression &amp; History</h3>
                      <p style={styles.sectionSub}>Sequential test scores, accuracy percentage, and scorecards.</p>
                    </div>
                  </div>

                  {/* Progression Chart Area */}
                  {analyticsData.timeline?.length <= 1 ? (
                    <div style={styles.singleTestBenchmarkCard}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={styles.baselineScoreBadge}>
                          <div style={{ fontSize: 24, fontWeight: 900, color: '#2563eb' }}>
                            {analyticsData.timeline[0]?.percentage || 0}%
                          </div>
                          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>Test 1 (T1)</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                            Baseline Examination: "{analyticsData.timeline[0]?.examName || 'Kinematics'}"
                          </div>
                          <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>
                            Score: <b>{analyticsData.timeline[0]?.marksObtained}/{analyticsData.timeline[0]?.maxMarks}</b> • Rank: <b style={{ color: '#d97706' }}>#{analyticsData.timeline[0]?.rank}</b> of {analyticsData.timeline[0]?.totalStudents} • Accuracy: <b style={{ color: '#059669' }}>{analyticsData.timeline[0]?.accuracyPercentage}%</b>
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>
                            ℹ️ Sequential trajectory trendlines and percentage-point deltas will dynamically plot as future tests are recorded.
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
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
                  )}

                  {/* Examination Breakdown Table */}
                  <div style={{ overflowX: 'auto', marginTop: 14 }}>
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

                {/* Right Column: Subject Mastery & Diagnostic Guidance */}
                <div style={styles.sectionCard}>
                  <div style={{ marginBottom: 12 }}>
                    <h3 style={styles.sectionHeading}>🎯 Subject Mastery</h3>
                    <p style={styles.sectionSub}>Historical proficiency &amp; accuracy across subjects.</p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {(analyticsData.subjectPerformance || []).map((subj) => (
                      <div key={subj.subjectName} style={styles.subjectCardCompact}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ fontWeight: 800, fontSize: 13.5, color: '#0f172a' }}>{subj.subjectName}</div>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: subj.averageAccuracy >= 60 ? '#dcfce7' : '#fee2e2',
                            color: subj.averageAccuracy >= 60 ? '#15803d' : '#b91c1c',
                          }}>
                            {subj.averageAccuracy}% Accuracy
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 8 }}>
                          {subj.testsAppeared} Test Appeared • Career Avg: <b>{subj.averagePercentage}%</b>
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
                      <div style={{ padding: '20px', color: '#64748b', fontSize: 12.5, textAlign: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                        No subject breakdown available yet.
                      </div>
                    )}
                  </div>

                  {/* Quick Academic Diagnostic Insight Box */}
                  <div style={styles.diagnosticQuickTip}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#1e3a8a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>💡</span> Faculty Diagnostic Note
                    </div>
                    <p style={{ margin: 0, fontSize: 11.5, color: '#334155', lineHeight: 1.5 }}>
                      {(analyticsData.careerStats?.careerAveragePercentage ?? 0) >= 60
                        ? 'Student demonstrates solid conceptual foundation. Recommend speed-drilling and timer practice to improve question attempt rate.'
                        : 'Accuracy is below 50% threshold. Immediate priority: Focus on fundamentals and formula application before attempting full mock tests.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Diagnostic Weak Chapters Audit */}
              <div style={styles.sectionCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3 style={styles.sectionHeading}>⚠️ Chronic Weak Chapters (Diagnostic Audit)</h3>
                      <span style={styles.weakBadgeCount}>
                        {(analyticsData.chronicWeakChapters || []).length} Identified
                      </span>
                    </div>
                    <p style={styles.sectionSub}>
                      Chapters with accuracy below the 60% mastery threshold across examinations.
                    </p>
                  </div>
                  {(analyticsData.chronicWeakChapters || []).length > 0 && (
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
                  <>
                    <div style={styles.weakChapterGrid}>
                      {(showAllWeakChapters
                        ? analyticsData.chronicWeakChapters
                        : analyticsData.chronicWeakChapters.slice(0, 6)
                      ).map((w) => {
                        const acc = Math.round(w.overallAccuracy ?? w.averageAccuracy ?? 0);
                        return (
                          <div key={w.chapterName} style={styles.weakChapterCard}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: '#991b1b', flex: 1 }}>
                                {w.chapterName}
                              </div>
                              <span style={styles.weakAccuracyTag}>
                                {acc}% Acc
                              </span>
                            </div>
                            <div style={{ fontSize: 11.5, color: '#78350f', marginTop: 4 }}>
                              {w.totalAttempted > 0 ? (
                                <span>{w.totalCorrect || 0}/{w.totalAttempted} Correct • {w.occurrenceCount || w.timesEncountered || 1} Test</span>
                              ) : (
                                <span>Unattempted • {w.occurrenceCount || w.timesEncountered || 1} Test Encountered</span>
                              )}
                            </div>
                            <button
                              onClick={() => handleGenerateRemedial([w.chapterName])}
                              disabled={generatingRemedial}
                              style={styles.singleChapterRemedialBtn}
                              title={`Generate practice paper targeting ${w.chapterName}`}
                            >
                              Target DPP
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {analyticsData.chronicWeakChapters.length > 6 && (
                      <div style={{ textAlign: 'center', marginTop: 14 }}>
                        <button
                          type="button"
                          onClick={() => setShowAllWeakChapters(!showAllWeakChapters)}
                          style={styles.toggleWeakBtn}
                        >
                          {showAllWeakChapters
                            ? '▲ Show Fewer Chapters (Top 6 Priority)'
                            : `▼ View All ${analyticsData.chronicWeakChapters.length} Identified Chapters (${analyticsData.chronicWeakChapters.length - 6} more)`}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 5. Academic Counseling & Remedial Action Plan */}
              <div style={{ ...styles.sectionCard, background: '#f8fafc', border: '1px solid #cbd5e1' }}>
                <h3 style={{ ...styles.sectionHeading, color: '#1e3a8a' }}>📋 Academic Counseling &amp; Remedial Action Plan</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 10 }}>
                  <div style={{ background: '#fff', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>🎯 Diagnostic Assessment</div>
                    <p style={{ margin: 0, fontSize: 12.5, color: '#475569', lineHeight: 1.55 }}>
                      {(analyticsData.careerStats?.careerAveragePercentage ?? 0) >= 75
                        ? `High-caliber student with strong conceptual retention (${analyticsData.careerStats?.careerAveragePercentage ?? 0}% avg). Focus on speed and negative-marking discipline to reach top-tier percentiles.`
                        : (analyticsData.careerStats?.careerAveragePercentage ?? 0) >= 50
                        ? `Consistent performer (${analyticsData.careerStats?.careerAveragePercentage ?? 0}% avg). Needs targeted question drilling in weak chapters to eliminate negative deductions.`
                        : `Requires academic support in core foundation chapters. Recommend structured daily practice problems (DPPs) before full syllabus mock examinations.`}
                    </p>
                  </div>
                  <div style={{ background: '#fff', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>💡 Recommended Action Plan</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
                      <li>Practice 15–20 questions daily from identified weak chapters using generated Remedial DPPs.</li>
                      <li>Avoid speculative guessing when confidence is below 50% to prevent negative mark deductions.</li>
                      <li>Review complete step-by-step solutions for incorrect questions before the next exam.</li>
                    </ul>
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
    maxWidth: 1380,
    margin: '0 auto',
    padding: '24px 20px',
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
    gridTemplateColumns: '290px 1fr',
    gap: 20,
    alignItems: 'start',
  },
  rosterCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    position: 'sticky',
    top: 20,
  },
  rosterHeader: {
    padding: '14px 16px',
    borderBottom: '1px solid #e2e8f0',
    background: '#f8fafc',
  },
  rosterCountPill: {
    fontSize: 11,
    fontWeight: 700,
    color: '#2563eb',
    background: '#eff6ff',
    padding: '2px 8px',
    borderRadius: 12,
    border: '1px solid #bfdbfe',
  },
  rosterSearchInput: {
    width: '100%',
    padding: '7px 28px 7px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 12.5,
    boxSizing: 'border-box',
  },
  searchClearBtn: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 12,
  },
  rosterList: {
    maxHeight: 'calc(100vh - 350px)',
    minHeight: 180,
    overflowY: 'auto',
  },
  rosterItem: {
    padding: '12px 14px',
    borderBottom: '1px solid #f1f5f9',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  rosterCohortSummary: {
    padding: '14px 16px',
    background: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
  },
  analyticsCol: {
    minWidth: 0,
  },
  profileBanner: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 18,
    boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
  },
  avatarImg: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid #2563eb',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    display: 'block',
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: '#eff6ff',
    color: '#1d4ed8',
    border: '2px solid #bfdbfe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontWeight: 900,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    background: '#2563eb',
    color: '#fff',
    width: 24,
    height: 24,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    border: '2px solid #fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  chipCourse: {
    background: '#eff6ff',
    color: '#1d4ed8',
    border: '1px solid #bfdbfe',
    padding: '2px 9px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
  },
  chipClass: {
    background: '#f8fafc',
    color: '#334155',
    border: '1px solid #cbd5e1',
    padding: '2px 9px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
  },
  chipHostel: {
    background: '#faf5ff',
    color: '#7e22ce',
    border: '1px solid #e9d5ff',
    padding: '2px 9px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
  },
  chipDayScholar: {
    background: '#f0fdf4',
    color: '#15803d',
    border: '1px solid #bbf7d0',
    padding: '2px 9px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
  },
  chipBatch: {
    background: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    padding: '2px 9px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
  },
  profileStudentName: {
    margin: '4px 0',
    fontSize: 22,
    fontWeight: 900,
    color: '#0f172a',
    letterSpacing: '-0.02em',
  },
  profileMetaRow: {
    fontSize: 12.5,
    color: '#475569',
    marginTop: 3,
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  parentCardlet: {
    marginTop: 10,
    padding: '8px 14px',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 12,
    color: '#334155',
  },
  profileActionsCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 10,
    minWidth: 160,
  },
  examMilestoneTile: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 10,
    padding: '10px 18px',
    textAlign: 'center',
    width: '100%',
    boxSizing: 'border-box',
  },
  editProfileBtn: {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '9px 15px',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    boxShadow: '0 1px 3px rgba(37,99,235,0.25)',
  },
  exportCsvBtn: {
    background: '#fff',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: '9px 14px',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 14,
    marginBottom: 16,
  },
  kpiCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '14px 16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: '#64748b',
    letterSpacing: '0.04em',
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 900,
    color: '#0f172a',
    margin: '4px 0 2px 0',
  },
  kpiSub: {
    fontSize: 11,
    color: '#94a3b8',
  },
  dashboardSplitGrid: {
    display: 'grid',
    gridTemplateColumns: '1.25fr 0.75fr',
    gap: 16,
    marginBottom: 16,
  },
  sectionCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: 800,
    color: '#0f172a',
    margin: '0 0 2px 0',
  },
  sectionSub: {
    margin: 0,
    fontSize: 12,
    color: '#64748b',
  },
  singleTestBenchmarkCard: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '16px 18px',
    marginTop: 10,
  },
  baselineScoreBadge: {
    background: '#eff6ff',
    border: '2px solid #bfdbfe',
    borderRadius: 10,
    padding: '12px 16px',
    textAlign: 'center',
    minWidth: 76,
  },
  chartContainer: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 12,
    height: 160,
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
    height: 120,
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
    fontSize: 11,
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
  subjectCardCompact: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '12px 14px',
  },
  diagnosticQuickTip: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 8,
    padding: '12px 14px',
    marginTop: 14,
  },
  weakBadgeCount: {
    background: '#fee2e2',
    color: '#b91c1c',
    border: '1px solid #fca5a5',
    padding: '1px 8px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 700,
  },
  toggleWeakBtn: {
    background: '#f8fafc',
    color: '#334155',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    padding: '8px 18px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  progressBarBg: {
    width: '100%',
    height: 7,
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 10,
    marginTop: 10,
  },
  weakChapterCard: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  weakAccuracyTag: {
    fontSize: 11,
    fontWeight: 800,
    color: '#991b1b',
    background: '#fff',
    border: '1px solid #fca5a5',
    padding: '1px 6px',
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
    padding: '4px 8px',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 8,
    alignSelf: 'flex-start',
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
