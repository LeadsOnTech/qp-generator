import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

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

const DEFAULT_FORM = {
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
};

export default function StudentsRoster() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [hostelFilter, setHostelFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  // Modals
  const [addModal, setAddModal] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exportingRoster, setExportingRoster] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Form State
  const [form, setForm] = useState(DEFAULT_FORM);
  const fileInputRef = useRef(null);

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
  const filteredStudents = (students || []).filter((s) => {
    const q = (search || '').toLowerCase();
    const matchesSearch =
      !q ||
      ((s.rollNumber || '').toLowerCase().includes(q)) ||
      ((s.fullName || '').toLowerCase().includes(q)) ||
      (s.admissionNumber && s.admissionNumber.toLowerCase().includes(q)) ||
      (s.parentPhone && s.parentPhone.includes(q)) ||
      (s.studentPhone && s.studentPhone.includes(q)) ||
      (s.batchName && s.batchName.toLowerCase().includes(q)) ||
      (s.nativePlace && s.nativePlace.toLowerCase().includes(q)) ||
      (s.district && s.district.toLowerCase().includes(q)) ||
      (s.state && s.state.toLowerCase().includes(q)) ||
      (s.parentName && s.parentName.toLowerCase().includes(q));

    const matchesBatch = !batchFilter || s.batchName === batchFilter;
    const matchesCourse = !courseFilter || s.courseTarget === courseFilter;
    const matchesClass = !classFilter || s.classYear === classFilter;
    const matchesHostel = !hostelFilter || s.hostelStatus === hostelFilter;
    const matchesState = !stateFilter || s.state === stateFilter;

    return matchesSearch && matchesBatch && matchesCourse && matchesClass && matchesHostel && matchesState;
  });

  const batches = Array.from(new Set(students.map((s) => s.batchName).filter(Boolean)));
  const totalStudents = students.length;
  const withPhoneCount = students.filter((s) => s.parentPhone && s.parentPhone.length >= 10).length;
  const coveragePercent = totalStudents > 0 ? Math.round((withPhoneCount / totalStudents) * 100) : 0;
  const hostelerCount = students.filter((s) => s.hostelStatus && s.hostelStatus.toLowerCase().includes('hostel')).length;
  const dayScholarCount = totalStudents - hostelerCount;

  function openAddModal() {
    setForm({
      ...DEFAULT_FORM,
      batchName: batches[0] || 'MPC Section-A',
      photoUrl: '',
    });
    setEditingStudent(null);
    setAddModal(true);
  }

  function openEditModal(st) {
    setForm({
      rollNumber: st.rollNumber || '',
      fullName: st.fullName || '',
      photoUrl: st.photoUrl || '',
      admissionNumber: st.admissionNumber || '',
      classYear: st.classYear || 'Inter 2nd Year (12th)',
      courseTarget: st.courseTarget || 'NEET (Medical)',
      batchName: st.batchName || 'General',
      section: st.section || '',
      gender: st.gender || 'Female',
      nativePlace: st.nativePlace || '',
      district: st.district || '',
      state: st.state || 'Andhra Pradesh',
      hostelStatus: st.hostelStatus || 'Day Scholar',
      parentName: st.parentName || '',
      parentRelation: st.parentRelation || 'Father',
      parentOccupation: st.parentOccupation || 'Farmer / Agriculture',
      parentPhone: st.parentPhone || '',
      parentEmail: st.parentEmail || '',
      studentPhone: st.studentPhone || '',
      address: st.address || '',
    });
    setEditingStudent(st);
    setAddModal(true);
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
        setForm((f) => ({ ...f, photoUrl: res.photoUrl }));
      }
    } catch (err) {
      // Fallback: convert to base64 Data URL so photo upload always works
      const reader = new FileReader();
      reader.onload = () => {
        setForm((f) => ({ ...f, photoUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSaveStudent(e) {
    e.preventDefault();
    if (!form.rollNumber.trim() || !form.fullName.trim()) {
      alert('Roll Number and Student Full Name are required.');
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

  async function handleExportRoster() {
    try {
      setExportingRoster(true);
      await api.downloadRosterCsv();
    } catch (err) {
      alert('Failed to export roster: ' + err.message);
    } finally {
      setExportingRoster(false);
    }
  }

  function handleDownloadSampleTemplate() {
    const csvContent =
      'Roll Number,Student Name,Admission Number,Class Year,Target Course,Batch,Section,Native Place,District,State,Hostel Status,Gender,Parent WhatsApp Mobile,Parent Name,Parent Relation,Parent Occupation,Student Mobile,Address\n' +
      '24MPC001,Sneha Latha Reddy,ADM-101,Inter 2nd Year (12th),NEET (Medical),MPC Section-A,A,Tenali,Krishna,Andhra Pradesh,Day Scholar,Female,9848628863,K. Venkat Reddy,Father,Farmer / Agriculture,9848628800,Main Bazar Tenali\n' +
      '24MPC002,K. Ramesh Kumar,ADM-102,Inter 2nd Year (12th),JEE Main & Advanced,MPC Section-A,A,Nuzvid,Eluru,Andhra Pradesh,Hosteler / Residential,Male,9848628864,K. Sambasiva Rao,Father,Business / Self-Employed,9848628801,Near Bus Stand Nuzvid\n' +
      '24BiPC003,G. Swathi,ADM-103,Inter 1st Year (11th),AP EAPCET (Engg & Agri),BiPC Super-60,B,Tirupati,Tirupati,Andhra Pradesh,Hosteler / Residential,Female,9848628865,G. Prasad,Father,Teacher / Lecturer / Educator,9848628802,KT Road Tirupati\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Student_Roster_Sample_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleBulkImport(e) {
    e.preventDefault();
    if (!bulkCsv.trim()) return;

    const lines = bulkCsv.trim().split(/\r?\n/);
    const parsedStudents = [];

    let headerIdx = -1;
    let colMap = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const rawParts = line.split(/[,\t]/).map((p) => p.trim().replace(/^["']|["']$/g, ''));

      if (headerIdx === -1 && rawParts.some((p) => /roll|hall\s*ticket/i.test(p))) {
        headerIdx = i;
        colMap = {};
        rawParts.forEach((col, idx) => {
          const c = col.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (/roll/i.test(c)) colMap.rollNumber = idx;
          else if (/name|studentname|fullname/i.test(c)) colMap.fullName = idx;
          else if (/admission/i.test(c)) colMap.admissionNumber = idx;
          else if (/class|year/i.test(c)) colMap.classYear = idx;
          else if (/course|target/i.test(c)) colMap.courseTarget = idx;
          else if (/batch/i.test(c)) colMap.batchName = idx;
          else if (/sec/i.test(c)) colMap.section = idx;
          else if (/native|village|town|city/i.test(c)) colMap.nativePlace = idx;
          else if (/district/i.test(c)) colMap.district = idx;
          else if (/state/i.test(c)) colMap.state = idx;
          else if (/hostel|resident/i.test(c)) colMap.hostelStatus = idx;
          else if (/gender|sex/i.test(c)) colMap.gender = idx;
          else if (/parentphone|parentmobile|whatsapp/i.test(c)) colMap.parentPhone = idx;
          else if (/parentname|guardianname/i.test(c)) colMap.parentName = idx;
          else if (/relation/i.test(c)) colMap.parentRelation = idx;
          else if (/occupation|job/i.test(c)) colMap.parentOccupation = idx;
          else if (/studentphone|mobile/i.test(c)) colMap.studentPhone = idx;
          else if (/address/i.test(c)) colMap.address = idx;
        });
        continue;
      }

      if (colMap && colMap.rollNumber !== undefined && colMap.fullName !== undefined) {
        const roll = rawParts[colMap.rollNumber];
        const name = rawParts[colMap.fullName];
        if (roll && name) {
          parsedStudents.push({
            rollNumber: roll,
            fullName: name,
            admissionNumber: colMap.admissionNumber !== undefined ? rawParts[colMap.admissionNumber] : '',
            classYear: colMap.classYear !== undefined ? rawParts[colMap.classYear] : '',
            courseTarget: colMap.courseTarget !== undefined ? rawParts[colMap.courseTarget] : '',
            batchName: colMap.batchName !== undefined ? rawParts[colMap.batchName] || 'General' : 'General',
            section: colMap.section !== undefined ? rawParts[colMap.section] : '',
            nativePlace: colMap.nativePlace !== undefined ? rawParts[colMap.nativePlace] : '',
            district: colMap.district !== undefined ? rawParts[colMap.district] : '',
            state: colMap.state !== undefined ? rawParts[colMap.state] : '',
            hostelStatus: colMap.hostelStatus !== undefined ? rawParts[colMap.hostelStatus] : '',
            gender: colMap.gender !== undefined ? rawParts[colMap.gender] : '',
            parentPhone: colMap.parentPhone !== undefined ? rawParts[colMap.parentPhone] : '',
            parentName: colMap.parentName !== undefined ? rawParts[colMap.parentName] : '',
            parentRelation: colMap.parentRelation !== undefined ? rawParts[colMap.parentRelation] : '',
            parentOccupation: colMap.parentOccupation !== undefined ? rawParts[colMap.parentOccupation] : '',
            studentPhone: colMap.studentPhone !== undefined ? rawParts[colMap.studentPhone] : '',
            address: colMap.address !== undefined ? rawParts[colMap.address] : '',
          });
        }
      } else {
        if (rawParts.length >= 2 && rawParts[0] && rawParts[1]) {
          parsedStudents.push({
            rollNumber: rawParts[0],
            fullName: rawParts[1],
            batchName: rawParts[2] || 'General',
            parentPhone: rawParts[3] || '',
            parentName: rawParts[4] || '',
            courseTarget: rawParts[5] || '',
            nativePlace: rawParts[6] || '',
            district: rawParts[7] || '',
          });
        }
      }
    }

    if (parsedStudents.length === 0) {
      alert('Could not find valid student rows. Please ensure Roll Number and Student Name are present in each row.');
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

  function getCourseBadgeStyle(course) {
    if (!course) return { background: '#f1f5f9', color: '#475569' };
    const c = course.toLowerCase();
    if (c.includes('neet') || c.includes('med')) return { background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' };
    if (c.includes('jee') || c.includes('iit')) return { background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' };
    if (c.includes('eapcet') || c.includes('cet')) return { background: '#f5f3ff', color: '#5b21b6', border: '1px solid #ddd6fe' };
    if (c.includes('foundation')) return { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' };
    return { background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0' };
  }

  return (
    <div style={styles.container}>
      {/* Executive Hero Banner */}
      <div className="studio-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="studio-badge">
              <span>👨‍🎓</span>
              <span>Demographic Directory &bull; Student Records</span>
            </div>
            <h1 className="studio-title">Student Directory &amp; Academic Profiles</h1>
            <p className="studio-sub">
              Manage student enrollment, passport photos, entrance target courses (NEET/JEE/EAPCET), hostel status, and automated parent WhatsApp scorecard dispatch.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={handleExportRoster}
              disabled={exportingRoster}
              className="btn btn-secondary"
              style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700 }}
              title="Download complete enrolled student directory as CSV"
            >
              {exportingRoster ? 'Exporting…' : '📤 Export CSV'}
            </button>
            <button
              onClick={() => setBulkModal(true)}
              className="btn btn-secondary"
              style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700 }}
            >
              📥 Bulk Import
            </button>
            <button
              onClick={openAddModal}
              className="btn btn-primary"
              style={{ padding: '10px 18px', fontSize: 13, fontWeight: 700 }}
            >
              + Add Student
            </button>
          </div>
        </div>

        {/* Live Metrics Ribbon */}
        <div className="studio-chips">
          <div className="studio-chip">
            <span>Enrolled Students:</span> <strong>{totalStudents}</strong>
          </div>
          <div className="studio-chip">
            <span>Parent WhatsApp:</span> <strong style={{ color: '#4ADE80' }}>{withPhoneCount} ({coveragePercent}%)</strong>
          </div>
          <div className="studio-chip">
            <span>Day Scholars:</span> <strong>{dayScholarCount}</strong>
          </div>
          <div className="studio-chip">
            <span>Hostelers:</span> <strong style={{ color: '#A78BFA' }}>{hostelerCount}</strong>
          </div>
        </div>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {/* KPI Cards */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>TOTAL STUDENTS ENROLLED</div>
          <div style={styles.kpiValue}>{totalStudents}</div>
          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
            Active across {batches.length || 1} batch{batches.length === 1 ? '' : 'es'}
          </div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>PARENT WHATSAPP REGISTERED</div>
          <div style={{ ...styles.kpiValue, color: '#059669' }}>
            {withPhoneCount} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>({coveragePercent}%)</span>
          </div>
          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
            Ready for instant automated scorecard dispatch
          </div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>RESIDENCE BREAKDOWN</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{dayScholarCount}</span>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Day Scholars</span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#7c3aed' }}>{hostelerCount}</span>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Hostelers</span>
          </div>
          <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
            Local day scholars & residential hostelers
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div style={styles.filterCard}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', width: '100%' }}>
          <input
            type="text"
            placeholder="🔍 Search by roll, name, admission #, phone, native village, district..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            style={styles.selectFilter}
          >
            <option value="">All Courses ({students.length})</option>
            {COURSE_TARGET_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            style={styles.selectFilter}
          >
            <option value="">All Classes / Years</option>
            {CLASS_YEAR_OPTIONS.map((cy) => (
              <option key={cy} value={cy}>{cy}</option>
            ))}
          </select>
          <select
            value={hostelFilter}
            onChange={(e) => setHostelFilter(e.target.value)}
            style={styles.selectFilter}
          >
            <option value="">All Residence Statuses</option>
            {HOSTEL_OPTIONS.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            style={styles.selectFilter}
          >
            <option value="">All States ({INDIAN_STATES.length})</option>
            {INDIAN_STATES.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
          {batches.length > 0 && (
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              style={styles.selectFilter}
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading student directory…</div>
      ) : filteredStudents.length === 0 ? (
        <div style={styles.emptyCard}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>👨‍🎓</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#0f172a' }}>No Students Found</h3>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 16px 0', maxWidth: 460 }}>
            {search || batchFilter || courseFilter || classFilter || hostelFilter || stateFilter
              ? 'No enrolled students match your active search filters.'
              : 'Add your first student or bulk import your student roster from Excel/CSV to register academic courses, native places, and parent WhatsApp numbers.'}
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
                <th style={{ ...styles.th, width: 44, textAlign: 'center' }}>#</th>
                <th style={styles.th}>Roll / Adm #</th>
                <th style={styles.th}>Student Details</th>
                <th style={styles.th}>Target Course & Class</th>
                <th style={styles.th}>Batch / Section</th>
                <th style={styles.th}>Native & Residence</th>
                <th style={styles.th}>Parent WhatsApp & Info</th>
                <th style={styles.th}>Exams Taken</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((st, idx) => {
                const courseBadgeStyle = getCourseBadgeStyle(st.courseTarget);
                const isHosteler = st.hostelStatus && st.hostelStatus.toLowerCase().includes('hostel');

                return (
                  <tr key={st.id} style={styles.tr}>
                    <td style={{ ...styles.td, color: '#94a3b8', fontSize: 12, textAlign: 'center' }}>
                      {idx + 1}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.rollBadge}>{st.rollNumber}</span>
                      {st.admissionNumber && (
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                          Adm: <b>{st.admissionNumber}</b>
                        </div>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {st.photoUrl ? (
                          <img
                            src={st.photoUrl}
                            alt={st.fullName}
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid #cbd5e1',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                              flexShrink: 0,
                            }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: st.gender === 'Female' ? '#fdf2f8' : '#eff6ff',
                            color: st.gender === 'Female' ? '#db2777' : '#2563eb',
                            border: `1px solid ${st.gender === 'Female' ? '#fbcfe8' : '#bfdbfe'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 14,
                            flexShrink: 0,
                          }}>
                            {st.fullName ? st.fullName.charAt(0).toUpperCase() : '👤'}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13.5 }}>
                            {st.fullName}
                          </div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}>
                            {st.gender && (
                              <span style={styles.genderTag}>
                                {st.gender === 'Female' ? '♀ Female' : st.gender === 'Male' ? '♂ Male' : st.gender}
                              </span>
                            )}
                            {st.studentPhone && (
                              <span style={{ fontSize: 11, color: '#64748b' }}>
                                📱 {st.studentPhone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>
                      {st.courseTarget ? (
                        <span style={{ ...styles.courseBadge, ...courseBadgeStyle }}>
                          {st.courseTarget}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
                      )}
                      {st.classYear && (
                        <div style={{ fontSize: 11.5, color: '#475569', fontWeight: 600, marginTop: 4 }}>
                          🎓 {st.classYear}
                        </div>
                      )}
                    </td>
                    <td style={{ ...styles.td, color: '#475569', fontSize: 13 }}>
                      <div style={{ fontWeight: 600 }}>{st.batchName}</div>
                      {st.section && (
                        <div style={{ fontSize: 11.5, color: '#64748b' }}>Sec: {st.section}</div>
                      )}
                    </td>
                    <td style={styles.td}>
                      {st.nativePlace || st.district ? (
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>
                          📍 {st.nativePlace ? st.nativePlace : ''}
                          {st.nativePlace && st.district ? `, ` : ''}
                          {st.district ? `${st.district} Dt` : ''}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Native: Not specified</div>
                      )}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                        {isHosteler ? (
                          <span style={styles.hostelBadgeHostel}>🛏️ Hosteler</span>
                        ) : (
                          <span style={styles.hostelBadgeDay}>🏠 Day Scholar</span>
                        )}
                        {st.state && st.state !== 'Andhra Pradesh' && (
                          <span style={{ fontSize: 10.5, color: '#64748b', background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>
                            {st.state}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>
                      {st.parentPhone && st.parentPhone.length >= 10 ? (
                        <div>
                          <a
                            href={`https://wa.me/91${st.parentPhone.replace(/\D/g, '').slice(-10)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.phoneTagActive}
                            title="Chat on WhatsApp"
                          >
                            💬 {st.parentPhoneMasked || st.parentPhone}
                          </a>
                          {st.parentName && (
                            <div style={{ fontSize: 11.5, color: '#475569', marginTop: 3 }}>
                              {st.parentName}
                              {st.parentRelation ? ` (${st.parentRelation})` : ''}
                              {st.parentOccupation ? ` • ${st.parentOccupation}` : ''}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <button
                            onClick={() => openEditModal(st)}
                            style={styles.addPhoneTag}
                            title="Click to register parent WhatsApp mobile"
                          >
                            + Register WhatsApp
                          </button>
                          {st.parentName && (
                            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 3 }}>
                              {st.parentName}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ ...styles.td, color: '#64748b', fontSize: 13 }}>
                      <Link
                        to={`/student-analytics?roll=${encodeURIComponent(st.rollNumber)}`}
                        style={styles.analyticsLink}
                        title="View student multi-exam progress analytics"
                      >
                        📈 {st.examCount || 0} tests
                      </Link>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL 1: Add/Edit Single Student with 3 Sections */}
      {addModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, color: '#0f172a', fontWeight: 800 }}>
                  {editingStudent ? '✏️ Edit Student Profile' : '➕ Add Student to Roster'}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#64748b' }}>
                  Register student photo, course, native village, hostel status, and parent WhatsApp number.
                </p>
              </div>
              <button onClick={() => setAddModal(false)} style={styles.modalCloseBtn}>✕</button>
            </div>
            <form onSubmit={handleSaveStudent}>
              <div style={{ padding: '16px 20px', maxHeight: '76vh', overflowY: 'auto' }}>
                
                {/* STUDENT PHOTOGRAPH UPLOAD WIDGET */}
                <div style={styles.photoUploadCard}>
                  <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                    {form.photoUrl ? (
                      <img
                        src={form.photoUrl}
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
                      Upload passport photo for ID records and official scorecards (JPG, PNG, WebP up to 5MB).
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
                        {uploadingPhoto ? '⏳ Uploading…' : form.photoUrl ? '🔄 Change Photo' : '📷 Upload Photo'}
                      </button>
                      {form.photoUrl && (
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, photoUrl: '' }))}
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

                {/* SECTION 1: Academic & Course Details */}
                <div style={styles.sectionHeader}>
                  <span style={styles.sectionIcon}>🎓</span>
                  <span style={styles.sectionTitle}>1. Academic & Course Enrollment</span>
                </div>
                
                <div style={styles.formGrid}>
                  <div className="field">
                    <label style={styles.label}>Roll Number / Hall Ticket *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 24MPC001 or 25NEET042"
                      value={form.rollNumber}
                      onChange={(e) => setForm((f) => ({ ...f, rollNumber: e.target.value.toUpperCase() }))}
                      style={{ ...styles.input, fontWeight: 700 }}
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
                    <label style={styles.label}>Target Course Joined *</label>
                    <select
                      value={form.courseTarget}
                      onChange={(e) => setForm((f) => ({ ...f, courseTarget: e.target.value }))}
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
                      value={form.classYear}
                      onChange={(e) => setForm((f) => ({ ...f, classYear: e.target.value }))}
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
                  <div className="field">
                    <label style={styles.label}>Admission No (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. ADM-2024-001"
                      value={form.admissionNumber}
                      onChange={(e) => setForm((f) => ({ ...f, admissionNumber: e.target.value }))}
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
                      value={form.nativePlace}
                      onChange={(e) => setForm((f) => ({ ...f, nativePlace: e.target.value }))}
                      style={styles.input}
                    />
                  </div>
                  <div className="field">
                    <label style={styles.label}>District</label>
                    <input
                      type="text"
                      placeholder="e.g. Krishna, Guntur, NTR, Visakhapatnam"
                      value={form.district}
                      onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.formGrid3}>
                  <div className="field">
                    <label style={styles.label}>Residence / Hostel Status</label>
                    <select
                      value={form.hostelStatus}
                      onChange={(e) => setForm((f) => ({ ...f, hostelStatus: e.target.value }))}
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
                      value={form.gender}
                      onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
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
                      value={form.state}
                      onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                      style={{ ...styles.select, fontWeight: 600 }}
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SECTION 3: Parent WhatsApp & Contact Details */}
                <div style={{ ...styles.sectionHeader, marginTop: 18 }}>
                  <span style={styles.sectionIcon}>📱</span>
                  <span style={styles.sectionTitle}>3. Parent WhatsApp Mobile & Family Details</span>
                </div>

                <div style={styles.formGrid}>
                  <div className="field">
                    <label style={styles.label}>Parent Mobile Number (WhatsApp) *</label>
                    <input
                      type="tel"
                      placeholder="e.g. 9848628863 (10 digits)"
                      value={form.parentPhone}
                      onChange={(e) => setForm((f) => ({ ...f, parentPhone: e.target.value }))}
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
                      value={form.parentName}
                      onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))}
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.formGrid}>
                  <div className="field">
                    <label style={styles.label}>Relationship</label>
                    <select
                      value={form.parentRelation}
                      onChange={(e) => setForm((f) => ({ ...f, parentRelation: e.target.value }))}
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
                      value={form.parentOccupation}
                      onChange={(e) => setForm((f) => ({ ...f, parentOccupation: e.target.value }))}
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
                      value={form.studentPhone}
                      onChange={(e) => setForm((f) => ({ ...f, studentPhone: e.target.value }))}
                      style={styles.input}
                    />
                  </div>
                  <div className="field">
                    <label style={styles.label}>Permanent / Native Address (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. D.No 4-12, Main Road, Tenali"
                      value={form.address}
                      onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                      style={styles.input}
                    />
                  </div>
                </div>

              </div>
              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setAddModal(false)} style={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" disabled={saving || uploadingPhoto} style={styles.primaryBtn}>
                  {saving ? 'Saving…' : editingStudent ? 'Update Profile' : 'Save Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Bulk Import Roster */}
      {bulkModal && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: 720 }}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, color: '#0f172a', fontWeight: 800 }}>
                  📥 Bulk Import Student Roster from Excel / CSV
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#64748b' }}>
                  Upload full student roster with course, native village, and parent WhatsApp numbers.
                </p>
              </div>
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
              <div style={{ padding: 28, textAlign: 'center' }}>
                <div style={{ fontSize: 44, marginBottom: 10 }}>🎉</div>
                <h3 style={{ margin: '0 0 8px 0', color: '#059669', fontSize: 20 }}>Roster Import Complete!</h3>
                <p style={{ color: '#334155', fontSize: 14, margin: '0 0 16px 0', lineHeight: 1.5 }}>
                  Successfully processed <b>{bulkResult.totalProcessed}</b> student rows:
                  <br />
                  <b>{bulkResult.importedCount}</b> new students enrolled, <b>{bulkResult.updatedCount}</b> profiles updated.
                </p>
                {bulkResult.errors?.length > 0 && (
                  <div style={{ textAlign: 'left', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: '#92400e', marginBottom: 4 }}>Note on some rows:</div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#78350f' }}>
                      {bulkResult.errors.map((er, idx) => <li key={idx}>{er}</li>)}
                    </ul>
                  </div>
                )}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <p style={{ margin: 0, fontSize: 13, color: '#334155' }}>
                      Copy columns directly from your college Excel sheet or paste CSV text below.
                    </p>
                    <button
                      type="button"
                      onClick={handleDownloadSampleTemplate}
                      style={{
                        background: '#f0fdf4',
                        color: '#15803d',
                        border: '1px solid #bbf7d0',
                        borderRadius: 6,
                        padding: '5px 10px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      📄 Download Sample CSV Template
                    </button>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#475569' }}>
                    <b>Supported columns (with or without header row):</b>
                    <br />
                    <code>RollNumber, FullName, AdmissionNo, ClassYear, TargetCourse, Batch, Section, NativePlace, District, State, HostelStatus, Gender, ParentPhone, ParentName, Relation, Occupation, StudentPhone, Address</code>
                  </div>

                  <textarea
                    rows={9}
                    required
                    placeholder={`Roll Number, Student Name, Target Course, Batch, Native Place, District, Hostel Status, Parent WhatsApp\n24MPC001, Sneha Latha Reddy, NEET (Medical), MPC-A, Tenali, Krishna, Day Scholar, 9848628863\n24MPC002, K. Ramesh Kumar, JEE Main & Advanced, MPC-A, Nuzvid, Eluru, Hosteler, 9848628864`}
                    value={bulkCsv}
                    onChange={(e) => setBulkCsv(e.target.value)}
                    style={styles.csvTextarea}
                  />
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 6 }}>
                    Supports comma-separated or tab-separated rows copied directly from MS Excel or Google Sheets.
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
    maxWidth: 1240,
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
    maxWidth: 680,
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 14,
    marginBottom: 16,
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
  filterCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  searchInput: {
    flex: 1,
    minWidth: 240,
    padding: '9px 13px',
    borderRadius: 7,
    border: '1px solid #cbd5e1',
    fontSize: 13,
  },
  selectFilter: {
    padding: '9px 12px',
    borderRadius: 7,
    border: '1px solid #cbd5e1',
    fontSize: 13,
    background: '#fff',
    color: '#334155',
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
    fontSize: 11.5,
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
    fontSize: 13,
    verticalAlign: 'middle',
  },
  rollBadge: {
    background: '#f1f5f9',
    padding: '3px 8px',
    borderRadius: 6,
    fontFamily: 'monospace',
    fontSize: 12.5,
    fontWeight: 700,
    color: '#1e293b',
    border: '1px solid #e2e8f0',
  },
  genderTag: {
    fontSize: 10.5,
    padding: '2px 6px',
    borderRadius: 4,
    background: '#f1f5f9',
    color: '#475569',
    fontWeight: 600,
  },
  courseBadge: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: 6,
    fontSize: 11.5,
    fontWeight: 700,
  },
  hostelBadgeHostel: {
    display: 'inline-block',
    padding: '2px 7px',
    borderRadius: 5,
    fontSize: 11,
    fontWeight: 700,
    background: '#faf5ff',
    color: '#7e22ce',
    border: '1px solid #e9d5ff',
  },
  hostelBadgeDay: {
    display: 'inline-block',
    padding: '2px 7px',
    borderRadius: 5,
    fontSize: 11,
    fontWeight: 700,
    background: '#f8fafc',
    color: '#475569',
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
    fontWeight: 700,
    textDecoration: 'none',
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
    fontWeight: 700,
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
  csvTextarea: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    fontFamily: 'monospace',
    fontSize: 12,
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
