import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import '../college-portal.css';

export default function PublicCollegePortal({ defaultTab = 'home' }) {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Enquiry modal / form state
  const [enquiryForm, setEnquiryForm] = useState({
    studentName: '',
    parentName: '',
    phone: '',
    email: '',
    courseOfInterest: '',
    cityOrTown: '',
    academicYear: '2025-2026',
    message: '',
  });
  const [enquirySubmitting, setEnquirySubmitting] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(false);
  const [enquiryError, setEnquiryError] = useState(null);

  // Job application modal
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobForm, setJobForm] = useState({
    applicantName: '',
    email: '',
    phone: '',
    currentLocation: '',
    experienceYrs: '',
    currentEmployer: '',
    expectedSalary: '',
    coverLetter: '',
  });
  const [resumeFile, setResumeFile] = useState(null);
  const [jobSubmitting, setJobSubmitting] = useState(false);
  const [jobSuccess, setJobSuccess] = useState(false);
  const [jobError, setJobError] = useState(null);

  // Lightbox for gallery
  const [previewMedia, setPreviewMedia] = useState(null);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    fetchWebsiteData();
  }, [slug]);

  async function fetchWebsiteData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/colleges/${slug}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to load college website');
      }
      setData(json.website);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEnquirySubmit(e) {
    e.preventDefault();
    setEnquirySubmitting(true);
    setEnquiryError(null);
    try {
      const res = await fetch(`/api/public/colleges/${slug}/enquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enquiryForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to submit enquiry');
      setEnquirySuccess(true);
      setEnquiryForm({
        studentName: '',
        parentName: '',
        phone: '',
        email: '',
        courseOfInterest: '',
        cityOrTown: '',
        academicYear: '2025-2026',
        message: '',
      });
    } catch (err) {
      setEnquiryError(err.message);
    } finally {
      setEnquirySubmitting(false);
    }
  }

  async function handleJobApplySubmit(e) {
    e.preventDefault();
    if (!resumeFile) {
      setJobError('Please select your resume file (.pdf or .docx).');
      return;
    }
    setJobSubmitting(true);
    setJobError(null);

    try {
      const fd = new FormData();
      Object.keys(jobForm).forEach((key) => fd.append(key, jobForm[key]));
      fd.append('resume', resumeFile);

      const res = await fetch(`/api/public/colleges/${slug}/careers/${selectedJob.id}/apply`, {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Application submission failed');

      setJobSuccess(true);
      setJobForm({
        applicantName: '',
        email: '',
        phone: '',
        currentLocation: '',
        experienceYrs: '',
        currentEmployer: '',
        expectedSalary: '',
        coverLetter: '',
      });
      setResumeFile(null);
    } catch (err) {
      setJobError(err.message);
    } finally {
      setJobSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 44, height: 44, border: '4px solid #1e3a8a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <h3 style={{ marginTop: 16, color: '#1e293b' }}>Loading Official College Portal...</h3>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#fff', padding: 40, borderRadius: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: 460 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🏛</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>Portal Unavailable</h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 24px 0', lineHeight: 1.5 }}>
            {error || 'The requested college website could not be found or is currently in draft mode.'}
          </p>
          <Link to="/" style={{ display: 'inline-block', padding: '10px 20px', background: '#1e3a8a', color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 700 }}>
            Go to QuestionsStudio Home
          </Link>
        </div>
      </div>
    );
  }

  const primary = data.primaryColor || '#1e3a8a';
  const secondary = data.secondaryColor || '#0f766e';
  const accent = data.accentColor || '#f59e0b';
  const logoUrl = data.institute?.logoFilename ? `/uploads/images/${data.institute.logoFilename}` : null;

  let statsList = [];
  try {
    statsList = data.statsCountersJson ? JSON.parse(data.statsCountersJson) : [];
  } catch (e) {
    statsList = [];
  }

  return (
    <div
      className="cp-portal"
      style={{
        '--cp-primary': primary,
        '--cp-secondary': secondary,
        '--cp-accent': accent,
      }}
    >
      {/* 1. Topbar */}
      <div className="cp-topbar">
        <div className="cp-container cp-topbar-inner">
          <div className="cp-topbar-left">
            {data.accreditation && (
              <span className="cp-badge-pill">✓ {data.accreditation}</span>
            )}
            {data.estYear && (
              <span>Est. {data.estYear}</span>
            )}
          </div>
          <div className="cp-topbar-right">
            {data.contactPhone && (
              <a href={`tel:${data.contactPhone}`}>📞 {data.contactPhone}</a>
            )}
            {data.contactEmail && (
              <a href={`mailto:${data.contactEmail}`}>✉ {data.contactEmail}</a>
            )}
            <span style={{ opacity: 0.75 }}>Powered by QuestionsStudio</span>
          </div>
        </div>
      </div>

      {/* 2. Main Sticky Header */}
      <header className="cp-header">
        <div className="cp-container cp-header-inner">
          <Link to={`/colleges/${slug}`} onClick={() => setActiveTab('home')} className="cp-brand">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={data.displayName || data.institute?.name}
                className="cp-brand-logo"
              />
            ) : (
              <div className="cp-brand-fallback">
                {(data.displayName || data.institute?.name || 'C')[0]}
              </div>
            )}
            <div className="cp-brand-titles">
              <h1 className="cp-brand-name">
                {data.displayName || data.institute?.name}
              </h1>
              {data.mottoTagline && (
                <p className="cp-brand-tagline">{data.mottoTagline}</p>
              )}
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="cp-nav">
            {[
              { id: 'home', label: 'Home' },
              { id: 'about', label: 'About Us' },
              { id: 'courses', label: 'Courses' },
              { id: 'faculty', label: 'Faculty' },
              { id: 'facilities', label: 'Campus' },
              { id: 'achievements', label: 'Toppers' },
              { id: 'exams', label: 'Open Exams', badge: data.openExams?.length },
              { id: 'gallery', label: 'Gallery' },
              { id: 'careers', label: 'Careers', badge: data.jobPostings?.length },
              { id: 'contact', label: 'Contact' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`cp-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
              >
                {tab.label}
                {Boolean(tab.badge) && (
                  <span className="cp-nav-badge">{tab.badge}</span>
                )}
              </button>
            ))}
          </nav>

          <button
            onClick={() => {
              setActiveTab('admissions');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="cp-btn-cta"
          >
            Apply for Admission →
          </button>
        </div>

        {/* Mobile Horizontal Tab Scrollbar */}
        <div className="cp-mobile-nav">
          {[
            { id: 'home', label: 'Home' },
            { id: 'about', label: 'About' },
            { id: 'courses', label: 'Courses' },
            { id: 'faculty', label: 'Faculty' },
            { id: 'facilities', label: 'Campus' },
            { id: 'achievements', label: 'Ranks' },
            { id: 'exams', label: 'Open Exams' },
            { id: 'gallery', label: 'Gallery' },
            { id: 'careers', label: 'Careers' },
            { id: 'contact', label: 'Contact' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={activeTab === tab.id ? 'active' : ''}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* 3. Main Content Views */}
      <main style={{ flex: 1 }}>
        {/* ==================== TAB: HOME ==================== */}
        {activeTab === 'home' && (
          <div>
            {/* Hero Section */}
            <section className="cp-hero">
              <div className="cp-container">
                <div className="cp-hero-grid">
                  <div className="cp-hero-content">
                    {data.accreditation && (
                      <div className="cp-accreditation-tag">
                        <span>★</span> {data.accreditation}
                      </div>
                    )}
                    <h2 className="cp-hero-title">
                      {data.heroTitle || 'Empowering Future Leaders & Achievers'}
                    </h2>
                    <p className="cp-hero-subtitle">
                      {data.heroSubtitle || 'Excellence in Academic Preparation, Competitive Ranks & Holistic Development.'}
                    </p>

                    <div className="cp-hero-actions">
                      <button onClick={() => setActiveTab('admissions')} className="cp-btn-hero-white">
                        {data.heroCtaText || 'Apply for Admission'} →
                      </button>
                      <button onClick={() => setActiveTab('courses')} className="cp-btn-hero-outline">
                        Explore Courses
                      </button>
                      {data.openExams?.length > 0 && (
                        <button onClick={() => setActiveTab('exams')} className="cp-btn-hero-accent">
                          📝 Open Mock Tests ({data.openExams.length})
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="cp-hero-visual">
                    {data.heroBannerUrl ? (
                      <img src={data.heroBannerUrl} alt="Campus" className="cp-hero-img" />
                    ) : (
                      <div style={{ background: 'rgba(255,255,255,0.1)', padding: 30, borderRadius: 20 }}>
                        <h3>Admission Open 2026-27</h3>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Impact Numbers / Stats Counter */}
            {statsList.length > 0 && (
              <div className="cp-container">
                <div className="cp-stats-card">
                  <div className="cp-stats-grid">
                    {statsList.map((st, idx) => (
                      <div key={idx} className="cp-stat-item">
                        <div className="cp-stat-number">{st.value}</div>
                        <div className="cp-stat-label">{st.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Director's Welcome Card */}
            {data.directorName && (
              <section className="cp-section">
                <div className="cp-container">
                  <div className="cp-director-card">
                    <div className="cp-director-col-photo">
                      {data.directorPhotoUrl ? (
                        <img src={data.directorPhotoUrl} alt={data.directorName} className="cp-director-img" />
                      ) : (
                        <div className="cp-director-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
                          👨‍🏫
                        </div>
                      )}
                      <h4 className="cp-director-name">{data.directorName}</h4>
                      <p className="cp-director-title">{data.directorTitle || 'Director / Principal'}</p>
                      {data.directorQualifications && (
                        <p className="cp-director-qual">{data.directorQualifications}</p>
                      )}
                    </div>

                    <div className="cp-director-content">
                      <span className="cp-section-eyebrow">Leadership Message</span>
                      <h3 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--cp-dark)' }}>
                        "Committed to Nurturing Every Student's Highest Potential"
                      </h3>
                      <p className="cp-director-quote">
                        "{data.directorMessage || 'Our goal is to provide world-class mentoring, rigorous problem-solving practice, and supportive counseling so our students lead national ranks with confidence.'}"
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Featured Academic Courses */}
            {data.courses?.length > 0 && (
              <section className="cp-section cp-section-gray">
                <div className="cp-container">
                  <div className="cp-section-header">
                    <span className="cp-section-eyebrow">Academic Programs</span>
                    <h3 className="cp-section-title">Courses Offered</h3>
                    <p className="cp-section-desc">Designed with rigorous pedagogy and high-speed accuracy training for national entrance exams.</p>
                  </div>

                  <div className="cp-courses-grid">
                    {data.courses.slice(0, 6).map((c) => (
                      <div key={c.id} className="cp-course-card">
                        <div>
                          <div className="cp-course-top">
                            <span className="cp-badge-cat">{c.category}</span>
                            {c.duration && <span className="cp-course-duration">⏱ {c.duration}</span>}
                          </div>
                          <h4 className="cp-course-name">{c.courseName}</h4>
                          {c.targetExam && <div className="cp-course-target">🎯 Target: {c.targetExam}</div>}
                          <p className="cp-course-desc">{c.description}</p>
                          {c.eligibility && (
                            <div className="cp-course-eligibility">
                              <strong>Eligibility:</strong> {c.eligibility}
                            </div>
                          )}
                        </div>

                        <div className="cp-course-footer">
                          <button
                            onClick={() => {
                              setEnquiryForm({ ...enquiryForm, courseOfInterest: c.courseName });
                              setActiveTab('admissions');
                            }}
                            className="cp-btn-enquire"
                          >
                            Enquire Now →
                          </button>
                          {c.brochureFilename && (
                            <a
                              href={`/uploads/brochures/${c.brochureFilename}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: 12, color: 'var(--cp-text-muted)', textDecoration: 'none', fontWeight: 600 }}
                            >
                              📄 Brochure
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Student Achievements / Hall of Fame */}
            {data.achievements?.length > 0 && (
              <section className="cp-section">
                <div className="cp-container">
                  <div className="cp-section-header">
                    <span className="cp-section-eyebrow">Hall of Fame</span>
                    <h3 className="cp-section-title">Student Achievers & Ranks</h3>
                    <p className="cp-section-desc">Celebrating our stellar rankers who realized their medical and engineering dreams.</p>
                  </div>

                  <div className="cp-toppers-grid">
                    {data.achievements.map((a) => (
                      <div key={a.id} className="cp-topper-card">
                        {a.photoUrl ? (
                          <img src={a.photoUrl} alt={a.studentName} className="cp-topper-img" />
                        ) : (
                          <div className="cp-topper-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                            🏆
                          </div>
                        )}
                        <h4 className="cp-topper-name">{a.studentName}</h4>
                        <div className="cp-topper-award">{a.examOrAward}</div>
                        {a.rankOrScore && (
                          <span className="cp-topper-rank">{a.rankOrScore}</span>
                        )}
                        {a.description && <p className="cp-topper-desc">{a.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Testimonials */}
            {data.testimonials?.length > 0 && (
              <section className="cp-section cp-section-gray">
                <div className="cp-container">
                  <div className="cp-section-header">
                    <span className="cp-section-eyebrow">Alumni & Parent Voices</span>
                    <h3 className="cp-section-title">What They Say About Us</h3>
                  </div>

                  <div className="cp-testimonials-grid">
                    {data.testimonials.map((t) => (
                      <div key={t.id} className="cp-testimonial-card">
                        <div>
                          <div className="cp-test-stars">{'★'.repeat(t.rating || 5)}</div>
                          <p className="cp-test-quote">"{t.quote}"</p>
                        </div>
                        <div>
                          <h5 className="cp-test-author">{t.authorName}</h5>
                          <p className="cp-test-role">{t.authorRole}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {/* ==================== TAB: ABOUT US ==================== */}
        {activeTab === 'about' && (
          <section className="cp-section">
            <div className="cp-container" style={{ maxWidth: 860 }}>
              <div className="cp-section-header">
                <span className="cp-section-eyebrow">Institutional Heritage</span>
                <h2 className="cp-section-title">{data.aboutTitle || `About ${data.displayName || data.institute?.name}`}</h2>
                {data.mottoTagline && <p className="cp-section-desc">{data.mottoTagline}</p>}
              </div>

              <div style={{ background: '#fff', padding: 36, borderRadius: 20, border: '1px solid var(--cp-border)', lineHeight: 1.8, fontSize: 15, marginBottom: 30 }}>
                <p>{data.aboutText}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div style={{ background: '#fff', padding: 28, borderRadius: 16, border: '1px solid var(--cp-border)' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🎯</div>
                  <h4 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 8px 0' }}>Our Vision</h4>
                  <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: 0 }}>{data.visionText}</p>
                </div>
                <div style={{ background: '#fff', padding: 28, borderRadius: 16, border: '1px solid var(--cp-border)' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🚀</div>
                  <h4 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 8px 0' }}>Our Mission</h4>
                  <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: 0 }}>{data.missionText}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================== TAB: COURSES ==================== */}
        {activeTab === 'courses' && (
          <section className="cp-section">
            <div className="cp-container">
              <div className="cp-section-header">
                <span className="cp-section-eyebrow">Academic Curriculum</span>
                <h2 className="cp-section-title">All Courses & Programs</h2>
                <p className="cp-section-desc">Comprehensive competitive coaching tailored for top ranks</p>
              </div>

              <div className="cp-courses-grid">
                {data.courses?.map((c) => (
                  <div key={c.id} className="cp-course-card">
                    <div>
                      <div className="cp-course-top">
                        <span className="cp-badge-cat">{c.category}</span>
                        {c.duration && <span className="cp-course-duration">⏱ {c.duration}</span>}
                      </div>
                      <h4 className="cp-course-name">{c.courseName}</h4>
                      {c.targetExam && <div className="cp-course-target">🎯 Target: {c.targetExam}</div>}
                      <p className="cp-course-desc">{c.description}</p>
                      {c.eligibility && (
                        <div className="cp-course-eligibility">
                          <strong>Eligibility:</strong> {c.eligibility}
                        </div>
                      )}
                    </div>

                    <div className="cp-course-footer">
                      <button
                        onClick={() => {
                          setEnquiryForm({ ...enquiryForm, courseOfInterest: c.courseName });
                          setActiveTab('admissions');
                        }}
                        className="cp-btn-enquire"
                      >
                        Enquire for Course →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ==================== TAB: FACULTY ==================== */}
        {activeTab === 'faculty' && (
          <section className="cp-section">
            <div className="cp-container">
              <div className="cp-section-header">
                <span className="cp-section-eyebrow">Academic Mentors</span>
                <h2 className="cp-section-title">Distinguished Faculty Directory</h2>
                <p className="cp-section-desc">Learn from distinguished subject authors and competitive exam specialists.</p>
              </div>

              <div className="cp-faculty-grid">
                {data.faculties?.map((f) => (
                  <div key={f.id} className="cp-faculty-card">
                    {f.photoUrl ? (
                      <img src={f.photoUrl} alt={f.name} className="cp-faculty-img" />
                    ) : (
                      <div className="cp-faculty-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                        👨‍🏫
                      </div>
                    )}
                    <h4 className="cp-faculty-name">{f.name}</h4>
                    <div className="cp-faculty-desig">{f.designation}</div>
                    <span className="cp-faculty-dept">{f.department}</span>
                    <p className="cp-faculty-qual">{f.qualification}</p>
                    {f.experienceYrs && <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>💼 {f.experienceYrs}+ Yrs Experience</p>}
                    {f.bio && <p style={{ fontSize: 12, color: '#475569', marginTop: 8, fontStyle: 'italic', lineHeight: 1.5 }}>"{f.bio}"</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ==================== TAB: CAMPUS & FACILITIES ==================== */}
        {activeTab === 'facilities' && (
          <section className="cp-section">
            <div className="cp-container">
              <div className="cp-section-header">
                <span className="cp-section-eyebrow">Infrastructure</span>
                <h2 className="cp-section-title">Campus & Facilities</h2>
                <p className="cp-section-desc">World-class laboratories, digital libraries, and comfortable residential environments.</p>
              </div>

              <div className="cp-facility-grid">
                {data.facilities?.map((fc) => (
                  <div key={fc.id} className="cp-facility-card">
                    {fc.photoUrl && <img src={fc.photoUrl} alt={fc.title} className="cp-facility-img" />}
                    <div className="cp-facility-body">
                      <span className="cp-badge-cat">{fc.category}</span>
                      <h4 className="cp-facility-title">{fc.title}</h4>
                      <p className="cp-facility-desc">{fc.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ==================== TAB: OPEN EXAMINATIONS (CBT LINK) ==================== */}
        {activeTab === 'exams' && (
          <section className="cp-section">
            <div className="cp-container" style={{ maxWidth: 860 }}>
              <div className="cp-section-header">
                <span className="cp-section-eyebrow">Online CBT Portal</span>
                <h2 className="cp-section-title">Open Practice Examinations</h2>
                <p className="cp-section-desc">Attempt practice papers online using our official Computer-Based Test (CBT) portal.</p>
              </div>

              {data.openExams?.length === 0 ? (
                <div style={{ background: '#fff', padding: 40, textAlign: 'center', borderRadius: 20, border: '1px solid var(--cp-border)' }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📝</div>
                  <h4 style={{ margin: 0, color: 'var(--cp-dark)' }}>No Open Examinations Active Today</h4>
                  <p style={{ color: 'var(--cp-text-muted)', fontSize: 13, marginTop: 4 }}>Check back shortly or submit an admission enquiry to receive alerts.</p>
                </div>
              ) : (
                <div>
                  {data.openExams.map((exam) => (
                    <div key={exam.id} className="cp-exam-card">
                      <div className="cp-exam-info">
                        <span className="cp-badge-pill" style={{ background: '#dcfce7', color: '#166534' }}>
                          FREE OPEN PRACTICE
                        </span>
                        <h4>{exam.title}</h4>
                        {exam.publicDescription && <p style={{ fontSize: 13, color: '#475569', margin: '4px 0' }}>{exam.publicDescription}</p>}
                        <div className="cp-exam-details">
                          <span>⏱ <strong>{exam.durationMinutes} Mins</strong></span>
                          <span>🎯 Marking: <strong>+{exam.positiveMarks} / -{exam.negativeMarks}</strong></span>
                        </div>
                      </div>

                      <a href={exam.cbtUrl} target="_blank" rel="noreferrer" className="cp-btn-exam">
                        Start Examination →
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ==================== TAB: GALLERY ==================== */}
        {activeTab === 'gallery' && (
          <section className="cp-section">
            <div className="cp-container">
              <div className="cp-section-header">
                <span className="cp-section-eyebrow">Visual Tour</span>
                <h2 className="cp-section-title">Campus Photo Gallery</h2>
                <p className="cp-section-desc">A glimpse into academic life, laboratories, sports, and celebrations.</p>
              </div>

              <div className="cp-gallery-grid">
                {data.galleryItems?.map((g) => (
                  <div key={g.id} onClick={() => setPreviewMedia(g)} className="cp-gallery-item">
                    <img src={g.mediaUrl} alt={g.title} className="cp-gallery-img" />
                    <div className="cp-gallery-overlay">
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--cp-accent)' }}>{g.category}</span>
                      <strong style={{ fontSize: 13 }}>{g.title || 'Campus Moment'}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ==================== TAB: ADMISSIONS & CONTACT ==================== */}
        {(activeTab === 'admissions' || activeTab === 'contact') && (
          <section className="cp-section">
            <div className="cp-container">
              <div className="cp-section-header">
                <span className="cp-section-eyebrow">Get In Touch</span>
                <h2 className="cp-section-title">
                  {activeTab === 'admissions' ? 'Admission Enquiry & Registration' : 'Contact Us & Campus Location'}
                </h2>
                <p className="cp-section-desc">Speak directly with our academic counselors regarding eligibility, scholarships, and batch schedules.</p>
              </div>

              <div className="cp-contact-grid">
                {/* Form */}
                <div className="cp-card-form">
                  <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 20px 0', color: 'var(--cp-dark)' }}>
                    Submit an Academic Enquiry
                  </h3>

                  {enquirySuccess ? (
                    <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: 24, borderRadius: 16, textAlign: 'center' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                      <h4 style={{ color: '#065f46', margin: '0 0 6px 0' }}>Thank you for your enquiry!</h4>
                      <p style={{ color: '#047857', fontSize: 13, margin: 0 }}>Our admissions team will call you shortly.</p>
                    </div>
                  ) : (
                    <form onSubmit={handleEnquirySubmit}>
                      {enquiryError && (
                        <div style={{ background: '#ffe4e6', color: '#be123c', padding: 10, borderRadius: 8, fontSize: 12, marginBottom: 16 }}>
                          {enquiryError}
                        </div>
                      )}
                      <div className="cp-form-row">
                        <div>
                          <label className="cp-label">Student Full Name *</label>
                          <input
                            type="text"
                            required
                            className="cp-input"
                            placeholder="e.g. Rahul Sharma"
                            value={enquiryForm.studentName}
                            onChange={(e) => setEnquiryForm({ ...enquiryForm, studentName: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="cp-label">Parent / Guardian Name</label>
                          <input
                            type="text"
                            className="cp-input"
                            placeholder="e.g. S. Sharma"
                            value={enquiryForm.parentName}
                            onChange={(e) => setEnquiryForm({ ...enquiryForm, parentName: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="cp-form-row">
                        <div>
                          <label className="cp-label">Mobile Number (WhatsApp) *</label>
                          <input
                            type="tel"
                            required
                            className="cp-input"
                            placeholder="10-digit number"
                            value={enquiryForm.phone}
                            onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="cp-label">Email Address</label>
                          <input
                            type="email"
                            className="cp-input"
                            placeholder="student@example.com"
                            value={enquiryForm.email}
                            onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="cp-form-row">
                        <div>
                          <label className="cp-label">Target Course</label>
                          <select
                            className="cp-select"
                            value={enquiryForm.courseOfInterest}
                            onChange={(e) => setEnquiryForm({ ...enquiryForm, courseOfInterest: e.target.value })}
                          >
                            <option value="">Select Target Course</option>
                            {data.courses?.map((c) => (
                              <option key={c.id} value={c.courseName}>{c.courseName}</option>
                            ))}
                            <option value="NEET Medical">NEET (Medical)</option>
                            <option value="JEE Main & Adv">JEE (Main & Advanced)</option>
                            <option value="Foundation">Foundation</option>
                          </select>
                        </div>
                        <div>
                          <label className="cp-label">City / Town</label>
                          <input
                            type="text"
                            className="cp-input"
                            placeholder="e.g. Vijayawada, Guntur"
                            value={enquiryForm.cityOrTown}
                            onChange={(e) => setEnquiryForm({ ...enquiryForm, cityOrTown: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="cp-form-group">
                        <label className="cp-label">Specific Query / Notes</label>
                        <textarea
                          rows={3}
                          className="cp-textarea"
                          placeholder="Hostel requirement, previous marks, or scholarship inquiry..."
                          value={enquiryForm.message}
                          onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                        />
                      </div>

                      <button type="submit" disabled={enquirySubmitting} className="cp-btn-submit">
                        {enquirySubmitting ? 'Submitting Details...' : 'Submit Admission Enquiry'}
                      </button>
                    </form>
                  )}
                </div>

                {/* Campus Details */}
                <div>
                  <div style={{ background: '#fff', padding: 32, borderRadius: 24, border: '1px solid var(--cp-border)', marginBottom: 20 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px 0', color: 'var(--cp-dark)' }}>Campus Information</h3>
                    <p style={{ fontSize: 13, lineHeight: 1.6, color: '#475569', marginBottom: 12 }}>
                      📍 <strong>Address:</strong><br />
                      {data.campusAddress}
                    </p>
                    {data.contactPhone && (
                      <p style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>
                        📞 <strong>Helpdesk:</strong> <a href={`tel:${data.contactPhone}`} style={{ color: 'var(--cp-primary)', fontWeight: 700 }}>{data.contactPhone}</a>
                      </p>
                    )}
                    {data.contactEmail && (
                      <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
                        ✉ <strong>Email:</strong> <a href={`mailto:${data.contactEmail}`} style={{ color: 'var(--cp-primary)', fontWeight: 700 }}>{data.contactEmail}</a>
                      </p>
                    )}
                    {data.whatsappNumber && (
                      <a href={`https://wa.me/${data.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="cp-btn-whatsapp">
                        <span>💬</span> Chat on Official WhatsApp
                      </a>
                    )}
                  </div>

                  {data.googleMapEmbedUrl && (
                    <div style={{ borderRadius: 20, overflow: 'hidden', height: 240, border: '1px solid var(--cp-border)' }}>
                      <iframe src={data.googleMapEmbedUrl} title="Map" width="100%" height="100%" style={{ border: 0 }} loading="lazy" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* 4. Footer */}
      <footer className="cp-footer">
        <div className="cp-container">
          <div className="cp-footer-grid">
            <div>
              <h4>{data.displayName || data.institute?.name}</h4>
              <p style={{ lineHeight: 1.6, color: '#94a3b8' }}>{data.mottoTagline}</p>
              {data.accreditation && (
                <span className="cp-badge-pill" style={{ background: '#1e293b', color: '#cbd5e1' }}>
                  ✓ {data.accreditation}
                </span>
              )}
            </div>

            <div>
              <h5>Quick Links</h5>
              <ul>
                <li><button onClick={() => setActiveTab('home')}>Home</button></li>
                <li><button onClick={() => setActiveTab('about')}>About Us</button></li>
                <li><button onClick={() => setActiveTab('courses')}>Courses</button></li>
                <li><button onClick={() => setActiveTab('faculty')}>Faculty</button></li>
                <li><button onClick={() => setActiveTab('exams')}>Open Exams</button></li>
              </ul>
            </div>

            <div>
              <h5>Contact</h5>
              <p style={{ lineHeight: 1.6 }}>{data.campusAddress}</p>
              {data.contactPhone && <p>📞 {data.contactPhone}</p>}
              {data.contactEmail && <p>✉ {data.contactEmail}</p>}
            </div>

            <div>
              <h5>QuestionsStudio</h5>
              <div style={{ background: '#1e293b', padding: 14, borderRadius: 12 }}>
                <strong style={{ display: 'block', color: '#fff', fontSize: 13, marginBottom: 4 }}>
                  Powered by QuestionsStudio
                </strong>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                  Centralized Question Bank, Computer-Based Online Testing & Smart Results Engine.
                </p>
              </div>
            </div>
          </div>

          <div className="cp-footer-bottom">
            <div>© {new Date().getFullYear()} {data.displayName || data.institute?.name}. All rights reserved.</div>
            <div style={{ display: 'flex', gap: 16 }}>
              <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>QuestionsStudio Platform</Link>
              <Link to="/privacy" style={{ color: '#94a3b8', textDecoration: 'none' }}>Privacy Policy</Link>
              <Link to="/terms" style={{ color: '#94a3b8', textDecoration: 'none' }}>Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
