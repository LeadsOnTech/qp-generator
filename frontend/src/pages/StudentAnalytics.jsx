// frontend/src/pages/StudentAnalytics.jsx
// Student Performance Dashboard, Historical Progress Tracker & Multi-Test Trend Analytics.

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import '../student-analytics.css';

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
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [institutes, setInstitutes] = useState([]);
  const [selectedInstituteId, setSelectedInstituteId] = useState('');

  const [searchParams, setSearchParams] = useSearchParams();
  const initialRoll = searchParams.get('roll') || '';

  const [studentsList, setStudentsList] = useState([]);
  const [selectedRoll, setSelectedRoll] = useState(initialRoll);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Load institutes if admin
  useEffect(() => {
    if (isAdmin) {
      api.listInstitutes().then((list) => {
        setInstitutes(list || []);
      }).catch(() => {});
    }
  }, [isAdmin]);

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

  // Load students roster on mount or when institute changes
  const fetchRoster = useCallback(async () => {
    try {
      const filters = {};
      if (selectedInstituteId) filters.instituteId = selectedInstituteId;
      const data = await api.getAnalyticsStudentsList(filters);
      const students = data.students || [];
      setStudentsList(students);
      if (students.length > 0) {
        if (!initialRoll || !students.some((s) => s.rollNumber === initialRoll)) {
          setSelectedRoll(students[0].rollNumber);
          setSearchParams({ roll: students[0].rollNumber });
        }
      } else {
        setSelectedRoll('');
        setAnalyticsData(null);
      }
    } catch (err) {
      console.error('Failed to load students roster:', err);
    }
  }, [selectedInstituteId, initialRoll, setSearchParams]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  // Load selected student analytics
  const loadStudentData = useCallback(async (roll = selectedRoll) => {
    if (!roll) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.getStudentAnalytics(roll, selectedInstituteId || undefined);
      setAnalyticsData(data);
    } catch (err) {
      setError(err.message || 'Failed to load student progress');
      setAnalyticsData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedRoll, selectedInstituteId]);

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
      const payload = { ...editForm };
      if (isAdmin && selectedInstituteId) {
        payload.instituteId = selectedInstituteId;
      }
      await api.saveStudentProfile(payload);
      setEditModal(false);
      await loadStudentData(selectedRoll);
      // Refresh list in case name changed
      const filters = {};
      if (selectedInstituteId) filters.instituteId = selectedInstituteId;
      const listData = await api.getAnalyticsStudentsList(filters);
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
        instituteId: selectedInstituteId || analyticsData.student.instituteId || undefined,
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
      await api.downloadStudentAnalyticsCsv(analyticsData.student.rollNumber, selectedInstituteId || undefined);
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

  const cleanParentPhone = analyticsData?.student?.parentPhone
    ? analyticsData.student.parentPhone.replace(/\D/g, '').slice(-10)
    : '';

  return (
    <div className="sa-container">
      {/* Executive Sky Blue Hero Banner */}
      <div className="studio-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="studio-badge">
              <span>📈</span>
              <span>Institutional Performance Audit &bull; Academic Progression</span>
            </div>
            <h1 className="studio-title">Student Performance Analytics &amp; Academic Progression</h1>
            <p className="studio-sub">
              Multi-test trajectory, diagnostic weak-chapter audit, and automated 1-click remedial intervention.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {isAdmin && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '5px 12px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#e0f2fe', textTransform: 'uppercase', letterSpacing: '0.04em' }}>College:</span>
                <select
                  value={selectedInstituteId}
                  onChange={(e) => {
                    setSelectedInstituteId(e.target.value);
                    setSelectedRoll('');
                  }}
                  style={{
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: '#0369a1',
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: '#ffffff',
                    borderRadius: 6,
                    padding: '5px 10px',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="">All Colleges (Global)</option>
                  {institutes.map((inst) => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </select>
              </div>
            )}
            <Link to="/students" className="btn btn-secondary" style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700 }}>
              👥 View Full Roster
            </Link>
            <button
              type="button"
              onClick={() => loadStudentData(selectedRoll)}
              className="btn btn-secondary"
              style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700 }}
              title="Reload student progress records"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Left Roster, Right Analytics */}
      <div className="sa-layout-grid">
        {/* Left Column: Student Roster Search, Selector & Cohort Summary */}
        <div className="sa-roster-card">
          <div className="sa-roster-header">
            <div className="sa-roster-title-row">
              <span className="sa-roster-title">
                👥 Enrolled Students
              </span>
              <span className="sa-roster-pill">
                {studentsList.length} Active
              </span>
            </div>
            <div className="sa-search-wrap">
              <span className="sa-search-icon">🔍</span>
              <input
                type="text"
                placeholder="Filter by name, roll, batch..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="sa-search-input"
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="sa-search-clear"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="sa-roster-list">
            {filteredStudents.length === 0 ? (
              <div style={{ padding: '30px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                No matching students found
              </div>
            ) : (
              filteredStudents.map((s) => {
                const isSelected = s.rollNumber === selectedRoll;
                const initials = (s.studentName || s.rollNumber || 'S').charAt(0).toUpperCase();
                const avgPct = Math.round(s.averagePercentage || 0);
                const scoreClass = avgPct >= 70 ? 'high' : avgPct >= 50 ? 'mid' : 'low';

                return (
                  <div
                    key={s.rollNumber}
                    onClick={() => handleSelectStudent(s.rollNumber)}
                    className={`sa-roster-item ${isSelected ? 'active' : ''}`}
                  >
                    <div className="sa-student-avatar-ring">
                      {s.photoUrl ? (
                        <img src={s.photoUrl} alt={s.studentName} className="sa-student-avatar-img" />
                      ) : (
                        initials
                      )}
                    </div>

                    <div className="sa-student-meta">
                      <div className="sa-student-name">
                        {s.studentName || s.rollNumber}
                      </div>
                      <div className="sa-student-sub">
                        <span>Roll: <strong>{s.rollNumber}</strong></span>
                        {s.batchName && (
                          <span style={{ color: '#64748b' }}>• {s.batchName}</span>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span className={`sa-score-pill ${scoreClass}`}>
                        {avgPct}%
                      </span>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>
                        {s.totalExams || 1} {s.totalExams === 1 ? 'Exam' : 'Exams'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Institutional Cohort Summary Box */}
          <div className="sa-cohort-box">
            <div className="sa-cohort-eyebrow">
              <span>📊</span> Batch Benchmark Snapshot
            </div>
            <div className="sa-cohort-row">
              <span>Total Enrolled</span>
              <strong>{studentsList.length} Student{studentsList.length !== 1 ? 's' : ''}</strong>
            </div>
            <div className="sa-cohort-row">
              <span>Active Batch</span>
              <strong>{analyticsData?.student?.batchName || 'General'}</strong>
            </div>
            <div className="sa-cohort-row">
              <span>Top Batch Score</span>
              <strong style={{ color: '#059669' }}>{analyticsData?.careerStats?.careerAveragePercentage ?? 0}%</strong>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Performance Analytics */}
        <div className="sa-analytics-col">
          {loading ? (
            <div className="sa-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
              <h4 style={{ margin: 0, color: '#0f172a' }}>Analyzing Performance Records...</h4>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 13 }}>
                Gathering multi-exam trajectories, weak-chapter indices, and accuracy benchmarks.
              </p>
            </div>
          ) : error ? (
            <div className="sa-card" style={{ textAlign: 'center', padding: '40px 20px', borderColor: '#fca5a5', background: '#fef2f2' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
              <div style={{ color: '#dc2626', fontWeight: 700, fontSize: 15 }}>{error}</div>
              <button
                onClick={() => loadStudentData(selectedRoll)}
                className="sa-btn-refresh"
                style={{ marginTop: 14 }}
              >
                Try Again
              </button>
            </div>
          ) : !analyticsData ? (
            <div className="sa-card" style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
              <h4 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Select a Student</h4>
              <p style={{ margin: 0, fontSize: 13 }}>Choose a student from the left roster to inspect detailed diagnostic analytics.</p>
            </div>
          ) : (
            <>
              {/* 1. Student Profile Hero Card */}
              <div className="sa-profile-hero">
                <div className="sa-profile-left">
                  {/* Interactive Avatar */}
                  <div
                    onClick={openEditModal}
                    className="sa-hero-avatar-frame"
                    title="Click to edit profile or upload photo"
                  >
                    {analyticsData.student.photoUrl ? (
                      <img
                        src={analyticsData.student.photoUrl}
                        alt={analyticsData.student.studentName}
                        className="sa-hero-avatar"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="sa-hero-avatar-placeholder">
                        {analyticsData.student.studentName?.charAt(0).toUpperCase() || '👤'}
                      </div>
                    )}
                    <div className="sa-avatar-edit-badge" title="Upload photo / Edit profile">
                      📷
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    {/* Demographics Chips */}
                    <div className="sa-chips-row">
                      {analyticsData.student.courseTarget && (
                        <span className="sa-chip sa-chip-target">
                          🎯 {analyticsData.student.courseTarget}
                        </span>
                      )}
                      {analyticsData.student.classYear && (
                        <span className="sa-chip sa-chip-class">
                          🎓 {analyticsData.student.classYear}
                        </span>
                      )}
                      {analyticsData.student.hostelStatus && (
                        <span className="sa-chip sa-chip-hostel">
                          {String(analyticsData.student.hostelStatus).toLowerCase().includes('hostel') ? '🛏️ Hosteler' : '🏠 Day Scholar'}
                        </span>
                      )}
                      <span className="sa-chip sa-chip-batch">
                        🏷️ {analyticsData.student.batchName || 'General'} {analyticsData.student.section ? `(${analyticsData.student.section})` : ''}
                      </span>
                    </div>

                    <h2 className="sa-profile-name">
                      {analyticsData.student.studentName}
                    </h2>

                    <div className="sa-profile-meta-line">
                      <span>Roll: <strong className="sa-meta-code">{analyticsData.student.rollNumber}</strong></span>
                      {analyticsData.student.admissionNumber && (
                        <span>• Adm: <strong>{analyticsData.student.admissionNumber}</strong></span>
                      )}
                      {(analyticsData.student.nativePlace || analyticsData.student.district) && (
                        <span>• 📍 <strong>{analyticsData.student.nativePlace || ''}{analyticsData.student.nativePlace && analyticsData.student.district ? ', ' : ''}{analyticsData.student.district ? `${analyticsData.student.district} Dt` : ''}</strong></span>
                      )}
                      {analyticsData.student.state && (
                        <span>• <strong>{analyticsData.student.state}</strong></span>
                      )}
                    </div>

                    {/* Parent & WhatsApp Ribbon */}
                    <div className="sa-parent-ribbon">
                      <span>
                        👨‍👩‍👦 <strong>{analyticsData.student.parentName || 'Parent'}</strong>
                        {analyticsData.student.parentRelation ? ` (${analyticsData.student.parentRelation})` : ''}
                        {analyticsData.student.parentOccupation ? ` • ${analyticsData.student.parentOccupation}` : ''}
                      </span>
                      <span>•</span>
                      {cleanParentPhone ? (
                        <a
                          href={`https://wa.me/91${cleanParentPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="sa-whatsapp-badge"
                          title="Open WhatsApp chat with parent"
                        >
                          <span>💬 WhatsApp:</span>
                          <span>{analyticsData.student.parentPhoneMasked || analyticsData.student.parentPhone}</span>
                        </a>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>💬 WhatsApp: Not registered</span>
                      )}
                      {analyticsData.student.studentPhone && (
                        <>
                          <span>•</span>
                          <span>Student Mobile: <strong>{analyticsData.student.studentPhone}</strong></span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Profile Actions & Milestones */}
                <div className="sa-profile-right">
                  <div className="sa-exams-count-box">
                    <div className="sa-count-number">
                      {analyticsData.careerStats?.totalExamsTaken || 1}
                    </div>
                    <div className="sa-count-label">
                      Exam{analyticsData.careerStats?.totalExamsTaken !== 1 ? 's' : ''} Completed
                    </div>
                  </div>

                  <div className="sa-profile-btn-row">
                    <button
                      onClick={openEditModal}
                      className="sa-btn-edit"
                      title="Edit profile demographics or upload photo"
                    >
                      ✏️ Edit Profile & Photo
                    </button>
                    <button
                      onClick={handleExportCsv}
                      disabled={exportingCsv}
                      className="sa-btn-export"
                      title="Export student history as CSV"
                    >
                      {exportingCsv ? 'Exporting…' : '📥 Export CSV'}
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Key Performance Indicators Row (Balanced 4-Grid) */}
              <div className="sa-kpi-grid">
                <div className="sa-kpi-card blue">
                  <div className="sa-kpi-top">
                    <span className="sa-kpi-title">CAREER AVERAGE</span>
                    <div className="sa-kpi-icon-wrap">📈</div>
                  </div>
                  <div className="sa-kpi-value">
                    {analyticsData.careerStats?.careerAveragePercentage ?? 0}%
                  </div>
                  <div className="sa-kpi-subtitle">
                    Across {analyticsData.careerStats?.totalExamsTaken || 1} exam attempt(s)
                  </div>
                </div>

                <div className="sa-kpi-card emerald">
                  <div className="sa-kpi-top">
                    <span className="sa-kpi-title">OVERALL ACCURACY</span>
                    <div className="sa-kpi-icon-wrap">🎯</div>
                  </div>
                  <div className="sa-kpi-value">
                    {analyticsData.careerStats?.careerAverageAccuracy ?? 0}%
                  </div>
                  <div className="sa-kpi-subtitle">
                    Correct vs attempted efficiency
                  </div>
                </div>

                <div className="sa-kpi-card amber">
                  <div className="sa-kpi-top">
                    <span className="sa-kpi-title">COLLEGE / BATCH RANK</span>
                    <div className="sa-kpi-icon-wrap">🏆</div>
                  </div>
                  <div className="sa-kpi-value">
                    #{analyticsData.careerStats?.bestRank || 1}
                  </div>
                  <div className="sa-kpi-subtitle">
                    Batch benchmark standing
                  </div>
                </div>

                <div className="sa-kpi-card violet">
                  <div className="sa-kpi-top">
                    <span className="sa-kpi-title">LATEST TEST GAIN</span>
                    <div className="sa-kpi-icon-wrap">⚡</div>
                  </div>
                  <div className="sa-kpi-value">
                    {(analyticsData.careerStats?.latestDelta ?? 0) >= 0 ? (
                      <span style={{ color: '#16a34a' }}>+{(analyticsData.careerStats?.latestDelta ?? 0)} pts ▲</span>
                    ) : (
                      <span style={{ color: '#dc2626' }}>{analyticsData.careerStats?.latestDelta} pts ▼</span>
                    )}
                  </div>
                  <div className="sa-kpi-subtitle">
                    Relative to baseline exam
                  </div>
                </div>
              </div>

              {/* 3. Balanced 2-Column Split: Progression & Exam History (Left) | Subject Mastery (Right) */}
              <div className="sa-split-grid">
                {/* Left Column: Test Progression Trajectory & Detailed Exam Table */}
                <div className="sa-card">
                  <div className="sa-section-header">
                    <h3 className="sa-section-heading">
                      <span>📈</span> Examination Progression & History
                    </h3>
                    <p className="sa-section-sub">
                      Sequential examination scores, accuracy percentage, and digital scorecards.
                    </p>
                  </div>

                  {/* Progression Milestone Card */}
                  {analyticsData.timeline?.length <= 1 ? (
                    <div className="sa-baseline-card">
                      <div className="sa-baseline-badge">
                        <span className="sa-baseline-num">
                          {analyticsData.timeline[0]?.percentage || 0}%
                        </span>
                        <span className="sa-baseline-lbl">Test 1 (T1)</span>
                      </div>
                      <div className="sa-baseline-info" style={{ flex: 1 }}>
                        <h4>Baseline Examination: "{analyticsData.timeline[0]?.examName || 'Kinematics'}"</h4>
                        <div className="sa-baseline-stats">
                          Score: <strong>{analyticsData.timeline[0]?.marksObtained}/{analyticsData.timeline[0]?.maxMarks}</strong> • Rank: <strong style={{ color: '#d97706' }}>#{analyticsData.timeline[0]?.rank}</strong> of {analyticsData.timeline[0]?.totalStudents} • Accuracy: <strong style={{ color: '#059669' }}>{analyticsData.timeline[0]?.accuracyPercentage}%</strong>
                        </div>
                        <p className="sa-baseline-note">
                          ℹ️ Baseline milestone established. Interactive trajectory trendlines and percentile deltas will automatically plot as future exams are taken.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 110, padding: '16px 10px', background: '#f8fafc', borderRadius: 12, marginBottom: 16 }}>
                      {(analyticsData.timeline || []).map((item, idx) => (
                        <div key={item.resultId} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                          <div
                            style={{
                              width: '100%',
                              maxWidth: 36,
                              height: `${Math.max(item.percentage || 0, 12)}%`,
                              background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
                              borderRadius: '6px 6px 0 0',
                              display: 'flex',
                              alignItems: 'flex-start',
                              justifyContent: 'center',
                              paddingTop: 4,
                              color: '#fff',
                              fontSize: 10,
                              fontWeight: 800,
                            }}
                            title={`Score: ${item.percentage}% (${item.marksObtained}/${item.maxMarks})`}
                          >
                            {item.percentage}%
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginTop: 4 }}>T{idx + 1}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>#{item.rank}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Examination Breakdown Table */}
                  <div className="sa-table-wrap">
                    <table className="sa-table">
                      <thead>
                        <tr>
                          <th className="sa-th">Test</th>
                          <th className="sa-th">Exam Name</th>
                          <th className="sa-th">Date</th>
                          <th className="sa-th">Format</th>
                          <th className="sa-th" style={{ textAlign: 'center' }}>Rank</th>
                          <th className="sa-th" style={{ textAlign: 'right' }}>Score</th>
                          <th className="sa-th" style={{ textAlign: 'center' }}>Accuracy</th>
                          <th className="sa-th" style={{ textAlign: 'center' }}>Gain</th>
                          <th className="sa-th" style={{ textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(analyticsData.timeline || []).map((item, idx) => (
                          <tr key={item.resultId} className="sa-tr">
                            <td className="sa-td" style={{ fontWeight: 800, color: '#475569' }}>T{idx + 1}</td>
                            <td className="sa-td" style={{ fontWeight: 800, color: '#0f172a' }}>{item.examName}</td>
                            <td className="sa-td" style={{ color: '#64748b', fontSize: 12 }}>
                              {item.examDate ? new Date(item.examDate).toLocaleDateString('en-IN') : '—'}
                            </td>
                            <td className="sa-td">
                              <span className="sa-exam-badge">{item.examType}</span>
                            </td>
                            <td className="sa-td" style={{ textAlign: 'center', fontWeight: 800, color: item.rank <= 3 ? '#d97706' : '#334155' }}>
                              #{item.rank} <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 600 }}>/{item.totalStudents}</span>
                            </td>
                            <td className="sa-td" style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, color: '#0f172a' }}>{item.marksObtained} / {item.maxMarks}</div>
                              <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 700 }}>{item.percentage}%</div>
                            </td>
                            <td className="sa-td" style={{ textAlign: 'center' }}>
                              <span
                                className={`sa-score-pill ${item.accuracyPercentage >= 70 ? 'high' : item.accuracyPercentage >= 50 ? 'mid' : 'low'}`}
                              >
                                {item.accuracyPercentage}%
                              </span>
                            </td>
                            <td className="sa-td" style={{ textAlign: 'center', fontWeight: 700 }}>
                              {idx === 0 ? (
                                <span style={{ color: '#94a3b8' }}>—</span>
                              ) : item.percentagePointsDelta >= 0 ? (
                                <span style={{ color: '#16a34a' }}>+{item.percentagePointsDelta}</span>
                              ) : (
                                <span style={{ color: '#dc2626' }}>{item.percentagePointsDelta}</span>
                              )}
                            </td>
                            <td className="sa-td" style={{ textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', gap: 6 }}>
                                <a
                                  href={`${API_BASE}/results/${item.resultId}/pdf`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="sa-btn-action"
                                  title="Download PDF Scorecard"
                                >
                                  📄 PDF
                                </a>
                                {item.publicToken && (
                                  <Link
                                    to={`/scorecard/${item.publicToken}`}
                                    target="_blank"
                                    className="sa-btn-action"
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

                {/* Right Column: Subject Mastery & Faculty Diagnostic */}
                <div className="sa-card">
                  <div className="sa-section-header">
                    <h3 className="sa-section-heading">
                      <span>🎯</span> Subject Mastery
                    </h3>
                    <p className="sa-section-sub">Historical proficiency and accuracy rates across subjects.</p>
                  </div>

                  <div className="sa-subject-list">
                    {(analyticsData.subjectPerformance || []).map((subj) => (
                      <div key={subj.subjectName} className="sa-subject-card">
                        <div className="sa-subject-top">
                          <span className="sa-subject-name">{subj.subjectName}</span>
                          <span className={`sa-score-pill ${subj.averageAccuracy >= 60 ? 'high' : 'low'}`}>
                            {subj.averageAccuracy}% Accuracy
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                          {subj.testsAppeared} Test Appeared • Career Avg: <strong>{subj.averagePercentage}%</strong>
                        </div>
                        <div className="sa-progress-bar-bg">
                          <div
                            className="sa-progress-bar-fill"
                            style={{
                              width: `${Math.min(subj.averagePercentage, 100)}%`,
                              background: subj.averagePercentage >= 70 ? '#10b981' : subj.averagePercentage >= 50 ? '#f59e0b' : '#ef4444',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    {(!analyticsData.subjectPerformance || analyticsData.subjectPerformance.length === 0) && (
                      <div style={{ padding: '24px', color: '#64748b', fontSize: 13, textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                        No subject breakdown recorded yet.
                      </div>
                    )}
                  </div>

                  {/* Faculty Diagnostic Advisory Note */}
                  <div className="sa-diagnostic-note-box">
                    <div className="sa-diag-title">
                      <span>💡</span> Faculty Diagnostic Note
                    </div>
                    <p className="sa-diag-body">
                      {(analyticsData.careerStats?.careerAveragePercentage ?? 0) >= 60
                        ? 'Student demonstrates solid conceptual foundation. Recommend speed-drilling and timer practice to improve question attempt rate.'
                        : 'Accuracy is below the 50% threshold. Immediate priority: Focus on fundamentals and formula application before attempting full mock tests.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Diagnostic Weak Chapters Audit */}
              <div className="sa-card">
                <div className="sa-weak-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <h3 className="sa-section-heading" style={{ margin: 0 }}>
                        <span>⚠️</span> Diagnostic Weak Chapters Audit
                      </h3>
                      <span className="sa-weak-pill">
                        {(analyticsData.chronicWeakChapters || []).length} Identified
                      </span>
                    </div>
                    <p className="sa-section-sub">
                      Chapters identified with accuracy below the 60% mastery threshold requiring targeted remediation.
                    </p>
                  </div>

                  {(analyticsData.chronicWeakChapters || []).length > 0 && (
                    <button
                      onClick={() => handleGenerateRemedial()}
                      disabled={generatingRemedial}
                      className="sa-btn-remedial-mega"
                      title="Generate customized remedial Daily Practice Problem targeting all weak chapters"
                    >
                      {generatingRemedial ? 'Generating DPP…' : '⚡ 1-Click Tailored Remedial DPP'}
                    </button>
                  )}
                </div>

                {(!analyticsData.chronicWeakChapters || analyticsData.chronicWeakChapters.length === 0) ? (
                  <div style={{ padding: 28, textAlign: 'center', color: '#059669', background: '#ecfdf5', borderRadius: 12, border: '1.5px solid #a7f3d0' }}>
                    ✅ <strong>Outstanding Mastery!</strong> No chronic weak chapters detected below 60% accuracy threshold.
                  </div>
                ) : (
                  <>
                    <div className="sa-weak-grid">
                      {(showAllWeakChapters
                        ? analyticsData.chronicWeakChapters
                        : analyticsData.chronicWeakChapters.slice(0, 6)
                      ).map((w) => {
                        const acc = Math.round(w.overallAccuracy ?? w.averageAccuracy ?? 0);
                        return (
                          <div key={w.chapterName} className="sa-weak-card">
                            <div>
                              <div className="sa-weak-top">
                                <span className="sa-weak-chapter-name">{w.chapterName}</span>
                                <span className="sa-weak-acc-pill">{acc}% Acc</span>
                              </div>
                              <div className="sa-weak-stats">
                                {w.totalAttempted > 0 ? (
                                  <span>{w.totalCorrect || 0}/{w.totalAttempted} Correct • {w.occurrenceCount || w.timesEncountered || 1} Test</span>
                                ) : (
                                  <span>Unattempted • {w.occurrenceCount || w.timesEncountered || 1} Test Encountered</span>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => handleGenerateRemedial([w.chapterName])}
                              disabled={generatingRemedial}
                              className="sa-btn-target-dpp"
                              title={`Generate practice paper targeting ${w.chapterName}`}
                            >
                              Target Remedial DPP →
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {analyticsData.chronicWeakChapters.length > 6 && (
                      <div style={{ textAlign: 'center', marginTop: 18 }}>
                        <button
                          type="button"
                          onClick={() => setShowAllWeakChapters(!showAllWeakChapters)}
                          className="sa-btn-toggle-chapters"
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
              <div className="sa-card" style={{ background: '#f8fafc' }}>
                <h3 className="sa-section-heading" style={{ color: '#1e3a8a' }}>
                  <span>📋</span> Academic Counseling & Remedial Action Plan
                </h3>
                <div className="sa-counseling-grid">
                  <div className="sa-counseling-card">
                    <div className="sa-counseling-card-title">
                      <span>🎯</span> AI Diagnostic Assessment
                    </div>
                    <p>
                      {(analyticsData.careerStats?.careerAveragePercentage ?? 0) >= 75
                        ? `High-caliber student with strong conceptual retention (${analyticsData.careerStats?.careerAveragePercentage ?? 0}% avg). Focus on speed and negative-marking discipline to reach top-tier percentiles.`
                        : (analyticsData.careerStats?.careerAveragePercentage ?? 0) >= 50
                        ? `Consistent performer (${analyticsData.careerStats?.careerAveragePercentage ?? 0}% avg). Needs targeted question drilling in weak chapters to eliminate negative deductions.`
                        : `Requires academic support in core foundation chapters. Recommend structured daily practice problems (DPPs) before full syllabus mock examinations.`}
                    </p>
                  </div>

                  <div className="sa-counseling-card">
                    <div className="sa-counseling-card-title">
                      <span>💡</span> Recommended Action Plan
                    </div>
                    <ul className="sa-counseling-list">
                      <li>Practice 15–20 questions daily from identified weak chapters using generated Remedial DPPs.</li>
                      <li>Avoid speculative guessing when confidence is below 50% to prevent negative mark deductions.</li>
                      <li>Review complete step-by-step solutions for incorrect questions before the next exam.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL 1: Edit Student Profile & Upload Photo */}
      {editModal && (
        <div className="sa-modal-overlay" onClick={() => setEditModal(false)}>
          <div className="sa-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <div>
                <h3 className="sa-modal-title">✏️ Edit Student Profile & Upload Photo</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#64748b' }}>
                  Update passport photograph, target course, native place, and parent WhatsApp contact.
                </p>
              </div>
              <button onClick={() => setEditModal(false)} className="sa-modal-close">✕</button>
            </div>

            <form onSubmit={handleSaveEditProfile}>
              <div style={{ padding: '20px 24px', maxHeight: '72vh', overflowY: 'auto' }}>
                
                {/* Photograph Upload Widget */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: 12, padding: 16, marginBottom: 20 }}>
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
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px dashed #94a3b8',
                        fontSize: 26,
                      }}>
                        📷
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 13.5, color: '#0f172a', marginBottom: 2 }}>
                      Student Photograph (Passport Size)
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
                          background: '#ffffff',
                          color: '#2563eb',
                          border: '1.5px solid #bfdbfe',
                          borderRadius: 8,
                          padding: '6px 14px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
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
                            borderRadius: 8,
                            padding: '6px 10px',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          ✕ Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 1: Academic & Course */}
                <div style={{ fontWeight: 800, fontSize: 13, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                  1. Academic & Course Enrollment
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Roll Number / Hall Ticket *</label>
                    <input
                      type="text"
                      disabled
                      value={editForm.rollNumber}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, fontWeight: 700, background: '#f1f5f9', cursor: 'not-allowed', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Student Full Name *</label>
                    <input
                      type="text"
                      required
                      value={editForm.fullName}
                      onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Target Course Joined *</label>
                    <select
                      value={editForm.courseTarget}
                      onChange={(e) => setEditForm((f) => ({ ...f, courseTarget: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', background: '#fff' }}
                    >
                      {COURSE_TARGET_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Class / Academic Year *</label>
                    <select
                      value={editForm.classYear}
                      onChange={(e) => setEditForm((f) => ({ ...f, classYear: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', background: '#fff' }}
                    >
                      {CLASS_YEAR_OPTIONS.map((cy) => (
                        <option key={cy} value={cy}>{cy}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Batch / Class</label>
                    <input
                      type="text"
                      value={editForm.batchName}
                      onChange={(e) => setEditForm((f) => ({ ...f, batchName: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Section</label>
                    <input
                      type="text"
                      value={editForm.section}
                      onChange={(e) => setEditForm((f) => ({ ...f, section: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Admission No</label>
                    <input
                      type="text"
                      value={editForm.admissionNumber}
                      onChange={(e) => setEditForm((f) => ({ ...f, admissionNumber: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Section 2: Residential & Location */}
                <div style={{ fontWeight: 800, fontSize: 13, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                  2. Residential Status & Demographics
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Hostel / Day Scholar</label>
                    <select
                      value={editForm.hostelStatus}
                      onChange={(e) => setEditForm((f) => ({ ...f, hostelStatus: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', background: '#fff' }}
                    >
                      {HOSTEL_OPTIONS.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Native Place / City</label>
                    <input
                      type="text"
                      placeholder="e.g. Guntur, Kurnool"
                      value={editForm.nativePlace}
                      onChange={(e) => setEditForm((f) => ({ ...f, nativePlace: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Gender</label>
                    <select
                      value={editForm.gender}
                      onChange={(e) => setEditForm((f) => ({ ...f, gender: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', background: '#fff' }}
                    >
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>State *</label>
                    <select
                      value={editForm.state}
                      onChange={(e) => setEditForm((f) => ({ ...f, state: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, fontWeight: 700, boxSizing: 'border-box', background: '#fff' }}
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Section 3: Parent WhatsApp & Contact */}
                <div style={{ fontWeight: 800, fontSize: 13, color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                  3. Parent WhatsApp Mobile & Family Details
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#0369a1', marginBottom: 4 }}>Parent Mobile (WhatsApp) *</label>
                    <input
                      type="tel"
                      placeholder="e.g. 9848628863"
                      value={editForm.parentPhone}
                      onChange={(e) => setEditForm((f) => ({ ...f, parentPhone: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #0284c7', background: '#f0f9ff', borderRadius: 8, fontSize: 13, fontWeight: 700, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Parent / Guardian Name</label>
                    <input
                      type="text"
                      placeholder="e.g. K. Venkat Reddy"
                      value={editForm.parentName}
                      onChange={(e) => setEditForm((f) => ({ ...f, parentName: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Relationship</label>
                    <select
                      value={editForm.parentRelation}
                      onChange={(e) => setEditForm((f) => ({ ...f, parentRelation: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', background: '#fff' }}
                    >
                      {PARENT_RELATION_OPTIONS.map((pr) => (
                        <option key={pr} value={pr}>{pr}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Parent Occupation</label>
                    <select
                      value={editForm.parentOccupation}
                      onChange={(e) => setEditForm((f) => ({ ...f, parentOccupation: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', background: '#fff' }}
                    >
                      {PARENT_OCCUPATION_OPTIONS.map((po) => (
                        <option key={po} value={po}>{po}</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>

              <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setEditModal(false)}
                  style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || uploadingPhoto}
                  style={{ background: '#2563eb', border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 13, fontWeight: 800, color: '#fff', cursor: 'pointer', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' }}
                >
                  {savingEdit ? 'Saving Changes…' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Remedial Paper Generated Notification */}
      {remedialModal && (
        <div className="sa-modal-overlay" onClick={() => setRemedialModal(null)}>
          <div className="sa-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="sa-modal-header">
              <h3 className="sa-modal-title" style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🎉</span> Remedial Paper Generated!
              </h3>
              <button onClick={() => setRemedialModal(null)} className="sa-modal-close">✕</button>
            </div>
            <div style={{ padding: '24px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
                {remedialModal.title}
              </h4>
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 16, fontSize: 13 }}>
                <div style={{ marginBottom: 6 }}>
                  <strong>Questions Assembled:</strong> <span style={{ color: '#2563eb', fontWeight: 800 }}>{remedialModal.questionCount} Questions</span>
                </div>
                <div>
                  <strong>Targeted Chapters:</strong> {remedialModal.chaptersTargeted?.join(', ')}
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px 0', lineHeight: 1.55 }}>
                This remedial practice paper has been saved to your <strong>Papers</strong> repository. You can print the question paper with complete solution keys or launch an online CBT practice test for this student!
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <Link
                  to={remedialModal.previewUrl}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    background: '#2563eb',
                    color: '#fff',
                    borderRadius: 10,
                    padding: '11px 18px',
                    fontWeight: 800,
                    fontSize: 13.5,
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
                  }}
                >
                  📄 Open Paper & Print PDF
                </Link>
                <button
                  type="button"
                  onClick={() => setRemedialModal(null)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: 10,
                    padding: '11px 18px',
                    fontWeight: 700,
                    fontSize: 13.5,
                    color: '#334155',
                    cursor: 'pointer',
                  }}
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
