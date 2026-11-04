import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import '../college-portal.css';

// SVG Icon Helpers
function IconGraduationCap() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

function IconDocument() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconComputer() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function IconDeviceMobile() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export default function PublicCollegePortal() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active section for sticky header highlight
  const [activeSection, setActiveSection] = useState('home');

  // Mobile drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Gallery active filter
  const [galleryCategory, setGalleryCategory] = useState('ALL');
  const [previewMedia, setPreviewMedia] = useState(null);

  // FAQ Accordion active state (index of open item)
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Modal states
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [isBrochureModalOpen, setIsBrochureModalOpen] = useState(false);

  // Admission Enquiry Form State
  const [enquiryForm, setEnquiryForm] = useState({
    studentName: '',
    parentName: '',
    phone: '',
    email: '',
    courseOfInterest: '',
    cityOrTown: '',
    academicYear: '2026-2027',
    message: '',
  });
  const [enquirySubmitting, setEnquirySubmitting] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState(false);
  const [enquiryError, setEnquiryError] = useState(null);

  // Faculty Job Application Modal & Form State
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

  function scrollToSection(id) {
    setIsDrawerOpen(false);
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function openCourseEnquiry(courseName) {
    setEnquiryForm((prev) => ({ ...prev, courseOfInterest: courseName }));
    setIsEnquiryModalOpen(true);
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
        academicYear: '2026-2027',
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
      setJobError('Please attach your resume file (.pdf, .doc, or .docx).');
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
        <h3 style={{ marginTop: 16, color: '#1e293b', fontWeight: 700 }}>Loading Official College Portal...</h3>
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

  // Safe JSON extraction
  const statsList = data.parsedStatsCounters || [];
  const whyUsList = data.parsedWhyChooseUs || [];
  const methodologyList = data.parsedMethodologySteps || [];
  const admissionProcessList = data.parsedAdmissionProcess || [];
  const scholarshipList = data.parsedScholarshipDetails || [];
  const faqsList = data.parsedFaqs || [];

  // Filter gallery items by active category
  const filteredGallery = (data.galleryItems || []).filter((item) => {
    if (galleryCategory === 'ALL') return true;
    return item.category === galleryCategory;
  });

  return (
    <div
      className="cp-portal"
      style={{
        '--cp-primary': primary,
        '--cp-secondary': secondary,
        '--cp-accent': accent,
      }}
    >
      {/* =========================================================================
          SECTION 1: PREMIUM HEADER & ANNOUNCEMENT BAR
          ========================================================================= */}
      {data.promotionalBannerText && (
        <div className="cp-announcement-bar">
          <div className="cp-announcement-content">
            <span className="cp-announcement-badge">Announcement</span>
            <span>{data.promotionalBannerText}</span>
          </div>
        </div>
      )}

      {/* Topbar Contact Info */}
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

      {/* Main Sticky Header */}
      <header className="cp-header">
        <div className="cp-container cp-header-inner">
          <Link to={`/colleges/${slug}`} onClick={() => scrollToSection('home')} className="cp-brand">
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
            <button onClick={() => scrollToSection('home')} className={`cp-nav-btn ${activeSection === 'home' ? 'active' : ''}`}>
              Home
            </button>
            {data.showAboutSection !== false && (
              <button onClick={() => scrollToSection('about')} className={`cp-nav-btn ${activeSection === 'about' ? 'active' : ''}`}>
                About Us
              </button>
            )}
            {data.showWhyUsSection !== false && whyUsList.length > 0 && (
              <button onClick={() => scrollToSection('whyus')} className={`cp-nav-btn ${activeSection === 'whyus' ? 'active' : ''}`}>
                Why Us
              </button>
            )}
            {data.showCoursesSection !== false && data.courses?.length > 0 && (
              <button onClick={() => scrollToSection('courses')} className={`cp-nav-btn ${activeSection === 'courses' ? 'active' : ''}`}>
                Courses
              </button>
            )}
            {data.showFacultySection !== false && data.faculties?.length > 0 && (
              <button onClick={() => scrollToSection('faculty')} className={`cp-nav-btn ${activeSection === 'faculty' ? 'active' : ''}`}>
                Faculty
              </button>
            )}
            {data.showMethodologySection !== false && methodologyList.length > 0 && (
              <button onClick={() => scrollToSection('methodology')} className={`cp-nav-btn ${activeSection === 'methodology' ? 'active' : ''}`}>
                Methodology
              </button>
            )}
            {data.showFacilitiesSection !== false && data.facilities?.length > 0 && (
              <button onClick={() => scrollToSection('campus')} className={`cp-nav-btn ${activeSection === 'campus' ? 'active' : ''}`}>
                Campus
              </button>
            )}
            {data.showResultsSection !== false && data.achievements?.length > 0 && (
              <button onClick={() => scrollToSection('toppers')} className={`cp-nav-btn ${activeSection === 'toppers' ? 'active' : ''}`}>
                Toppers
              </button>
            )}
            {data.showAdmissionsSection !== false && (
              <button onClick={() => scrollToSection('admissions')} className={`cp-nav-btn ${activeSection === 'admissions' ? 'active' : ''}`}>
                Admissions
              </button>
            )}
            {/* Guarded Open Exams */}
            {data.hasOnlineExamModule && data.showOpenExamsSection !== false && data.openExams?.length > 0 && (
              <button onClick={() => scrollToSection('exams')} className={`cp-nav-btn ${activeSection === 'exams' ? 'active' : ''}`}>
                Open Exams <span className="cp-nav-badge">{data.openExams.length}</span>
              </button>
            )}
            {/* Guarded Careers */}
            {data.hasRecruitmentModule && data.showCareersSection !== false && data.jobPostings?.length > 0 && (
              <button onClick={() => scrollToSection('careers')} className={`cp-nav-btn ${activeSection === 'careers' ? 'active' : ''}`}>
                Careers <span className="cp-nav-badge">{data.jobPostings.length}</span>
              </button>
            )}
            {data.showGallerySection !== false && data.galleryItems?.length > 0 && (
              <button onClick={() => scrollToSection('gallery')} className={`cp-nav-btn ${activeSection === 'gallery' ? 'active' : ''}`}>
                Gallery
              </button>
            )}
            <button onClick={() => scrollToSection('contact')} className={`cp-nav-btn ${activeSection === 'contact' ? 'active' : ''}`}>
              Contact
            </button>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setIsEnquiryModalOpen(true)}
              className="cp-btn-cta"
            >
              Apply for Admission 2026-27 →
            </button>

            {/* Mobile Hamburger Button */}
            <button
              className="cp-hamburger-btn"
              onClick={() => setIsDrawerOpen(true)}
              aria-label="Open Navigation Menu"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Off-Canvas Drawer */}
      {isDrawerOpen && (
        <>
          <div className="cp-drawer-overlay" onClick={() => setIsDrawerOpen(false)} />
          <div className="cp-mobile-drawer">
            <div>
              <div className="cp-drawer-top">
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Quick Navigation</h4>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 16, cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
              <div className="cp-drawer-links">
                <button className="cp-drawer-link-btn" onClick={() => scrollToSection('home')}>Home</button>
                <button className="cp-drawer-link-btn" onClick={() => scrollToSection('about')}>About Institution</button>
                <button className="cp-drawer-link-btn" onClick={() => scrollToSection('whyus')}>Why Choose Us</button>
                <button className="cp-drawer-link-btn" onClick={() => scrollToSection('courses')}>Academic Courses</button>
                <button className="cp-drawer-link-btn" onClick={() => scrollToSection('faculty')}>Faculty Leaders</button>
                <button className="cp-drawer-link-btn" onClick={() => scrollToSection('methodology')}>Teaching Methodology</button>
                <button className="cp-drawer-link-btn" onClick={() => scrollToSection('campus')}>Campus Facilities</button>
                <button className="cp-drawer-link-btn" onClick={() => scrollToSection('toppers')}>Student Ranks</button>
                <button className="cp-drawer-link-btn" onClick={() => scrollToSection('admissions')}>Admissions & Scholarships</button>
                {data.hasOnlineExamModule && data.openExams?.length > 0 && (
                  <button className="cp-drawer-link-btn" onClick={() => scrollToSection('exams')}>Open Exams ({data.openExams.length})</button>
                )}
                {data.hasRecruitmentModule && data.jobPostings?.length > 0 && (
                  <button className="cp-drawer-link-btn" onClick={() => scrollToSection('careers')}>Careers ({data.jobPostings.length})</button>
                )}
                <button className="cp-drawer-link-btn" onClick={() => scrollToSection('gallery')}>Campus Gallery</button>
                <button className="cp-drawer-link-btn" onClick={() => scrollToSection('contact')}>Contact & Enquiry</button>
              </div>
            </div>

            <div style={{ paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  setIsEnquiryModalOpen(true);
                }}
                className="cp-btn-cta"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Apply for Admission →
              </button>
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          SECTION 2: LARGE HERO BANNER
          ========================================================================= */}
      <section id="home" className="cp-hero">
        <div className="cp-container">
          <div className="cp-hero-grid">
            <div className="cp-hero-content">
              {data.accreditation && (
                <div className="cp-accreditation-tag">
                  <span>★</span> {data.accreditation}
                </div>
              )}
              <h2 className="cp-hero-title">
                {data.heroTitle || 'Empowering Future Doctors & Engineers with Elite Mentorship'}
              </h2>
              <p className="cp-hero-subtitle">
                {data.heroSubtitle || 'Premier Academic Academy for NEET-UG, IIT-JEE Advanced & Intermediate Excellence with 14+ Years of Proven State Ranks.'}
              </p>

              <div className="cp-hero-actions">
                <button onClick={() => setIsEnquiryModalOpen(true)} className="cp-btn-hero-white">
                  {data.heroCtaText || 'Apply for Admission 2026-27'} →
                </button>
                <button onClick={() => scrollToSection('courses')} className="cp-btn-hero-outline">
                  Explore Courses
                </button>
                {data.hasOnlineExamModule && data.openExams?.length > 0 && (
                  <button onClick={() => scrollToSection('exams')} className="cp-btn-hero-accent">
                    📝 Open Mock Tests ({data.openExams.length})
                  </button>
                )}
              </div>
            </div>

            <div className="cp-hero-visual">
              {data.heroBannerUrl ? (
                <img src={data.heroBannerUrl} alt="Campus" className="cp-hero-img" />
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: 40, borderRadius: 24, textAlign: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: 24, color: '#ffffff' }}>{data.displayName}</h3>
                  <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.85)' }}>Admissions Open for 2026-27</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: INSTITUTIONAL ACHIEVEMENTS (STATS STRIP)
          ========================================================================= */}
      {data.showStatsSection !== false && statsList.length > 0 && (
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

      {/* =========================================================================
          SECTION 4: ABOUT OUR INSTITUTION
          ========================================================================= */}
      {data.showAboutSection !== false && (
        <section id="about" className="cp-section">
          <div className="cp-container">
            <div className="cp-section-header">
              <span className="cp-section-eyebrow">Institutional Heritage</span>
              <h3 className="cp-section-title">{data.aboutTitle || 'Committed to Academic Rigor & Ethical Character'}</h3>
              <p className="cp-section-desc">Building strong conceptual foundations and empowering students to achieve top national percentiles.</p>
            </div>

            <div className="cp-about-grid">
              <div className="cp-about-content">
                <p className="cp-about-text-lead">
                  {data.aboutText || 'Founded with a visionary commitment to scientific excellence, our institution blends disciplined pedagogy with cutting-edge examination technologies, diagnostic error analysis, and round-the-clock mentorship.'}
                </p>

                {/* 4 Core Institutional Pillars */}
                <div className="cp-pillars-grid">
                  <div className="cp-pillar-card">
                    <div className="cp-pillar-icon">🎯</div>
                    <div>
                      <h4 className="cp-pillar-title">1:25 Faculty Ratio</h4>
                      <p className="cp-pillar-desc">Small batch sizes ensuring individual attention and daily doubt resolution.</p>
                    </div>
                  </div>

                  <div className="cp-pillar-card">
                    <div className="cp-pillar-icon">📖</div>
                    <div>
                      <h4 className="cp-pillar-title">NCERT Mastery</h4>
                      <p className="cp-pillar-desc">Line-by-line textbook analysis mapped directly to latest NTA patterns.</p>
                    </div>
                  </div>

                  <div className="cp-pillar-card">
                    <div className="cp-pillar-icon">💻</div>
                    <div>
                      <h4 className="cp-pillar-title">Computer CBT Labs</h4>
                      <p className="cp-pillar-desc">National-level timed computer testing replicating exact exam conditions.</p>
                    </div>
                  </div>

                  <div className="cp-pillar-card">
                    <div className="cp-pillar-icon">🏡</div>
                    <div>
                      <h4 className="cp-pillar-title">Residential Discipline</h4>
                      <p className="cp-pillar-desc">Air-conditioned, distraction-free residential hostels with resident mentors.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vision & Mission Cards */}
              <div>
                {data.visionText && (
                  <div className="cp-vision-card">
                    <h4 className="cp-vm-title">👁 Our Vision</h4>
                    <p className="cp-vm-text">{data.visionText}</p>
                  </div>
                )}
                {data.missionText && (
                  <div className="cp-mission-card">
                    <h4 className="cp-vm-title">🎯 Our Mission</h4>
                    <p className="cp-vm-text">{data.missionText}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 5: DIRECTOR AND LEADERSHIP MESSAGE
          ========================================================================= */}
      {data.showDirectorSection !== false && data.directorName && (
        <section className="cp-section cp-section-gray">
          <div className="cp-container">
            <div className="cp-director-card">
              <div className="cp-director-col-photo">
                {data.directorPhotoUrl ? (
                  <img src={data.directorPhotoUrl} alt={data.directorName} className="cp-director-img" />
                ) : (
                  <div className="cp-director-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, background: '#e2e8f0' }}>
                    👨‍🏫
                  </div>
                )}
                <h4 className="cp-director-name">{data.directorName}</h4>
                <p className="cp-director-title">{data.directorTitle || 'Founder & Academic Director'}</p>
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
                  "{data.directorMessage || 'Success in competitive examinations like NEET and JEE is never an accident. It is the natural consequence of daily conceptual clarity, targeted practice, and fearless self-correction. At our institution, every student is known personally, guided patiently, and challenged systematically to realize their supreme potential.'}"
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 6: WHY CHOOSE OUR COLLEGE?
          ========================================================================= */}
      {data.showWhyUsSection !== false && whyUsList.length > 0 && (
        <section id="whyus" className="cp-section">
          <div className="cp-container">
            <div className="cp-section-header">
              <span className="cp-section-eyebrow">Institutional Advantages</span>
              <h3 className="cp-section-title">Why Choose Our College?</h3>
              <p className="cp-section-desc">Six proven educational pillars designed to guarantee top ranks and transformative student growth.</p>
            </div>

            <div className="cp-whyus-grid">
              {whyUsList.map((item, idx) => (
                <div key={idx} className="cp-whyus-card">
                  <div className="cp-whyus-icon-wrap">
                    {idx === 0 && <IconGraduationCap />}
                    {idx === 1 && <IconDocument />}
                    {idx === 2 && <IconComputer />}
                    {idx === 3 && <IconChat />}
                    {idx === 4 && <IconDeviceMobile />}
                    {idx >= 5 && <IconShield />}
                  </div>
                  <h4 className="cp-whyus-title">{item.title}</h4>
                  <p className="cp-whyus-desc">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 7: COURSES AND ACADEMIC PROGRAMMES
          ========================================================================= */}
      {data.showCoursesSection !== false && data.courses?.length > 0 && (
        <section id="courses" className="cp-section cp-section-gray">
          <div className="cp-container">
            <div className="cp-section-header">
              <span className="cp-section-eyebrow">Academic Programmes</span>
              <h3 className="cp-section-title">Courses Offered</h3>
              <p className="cp-section-desc">Designed with rigorous pedagogy and high-speed accuracy training for national entrance exams.</p>
            </div>

            <div className="cp-courses-grid">
              {data.courses.map((c) => (
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
                      onClick={() => openCourseEnquiry(c.courseName)}
                      className="cp-btn-enquire"
                    >
                      Enquire Now →
                    </button>
                    {c.brochureFilename ? (
                      <a
                        href={`/uploads/brochures/${c.brochureFilename}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 12, color: 'var(--cp-text-muted)', textDecoration: 'none', fontWeight: 600 }}
                      >
                        📄 Download Brochure
                      </a>
                    ) : (
                      <button
                        onClick={() => setIsBrochureModalOpen(true)}
                        style={{ background: 'none', border: 'none', fontSize: 12, color: 'var(--cp-text-muted)', cursor: 'pointer', fontWeight: 600 }}
                      >
                        📄 Syllabus & Fees
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 8: FACULTY AND ACADEMIC LEADERSHIP
          ========================================================================= */}
      {data.showFacultySection !== false && data.faculties?.length > 0 && (
        <section id="faculty" className="cp-section">
          <div className="cp-container">
            <div className="cp-section-header">
              <span className="cp-section-eyebrow">Academic Mentors</span>
              <h3 className="cp-section-title">Faculty and Academic Leadership</h3>
              <p className="cp-section-desc">Learn from seasoned educators and rank producers with master's degrees from IITs and national universities.</p>
            </div>

            <div className="cp-faculty-grid">
              {data.faculties.map((f) => (
                <div key={f.id} className="cp-faculty-card">
                  {f.photoUrl ? (
                    <img src={f.photoUrl} alt={f.name} className="cp-faculty-img" />
                  ) : (
                    <div className="cp-faculty-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, background: '#f1f5f9' }}>
                      👨‍🏫
                    </div>
                  )}
                  <h4 className="cp-faculty-name">{f.name}</h4>
                  <p className="cp-faculty-desig">{f.designation}</p>
                  {f.department && (
                    <span className="cp-faculty-dept">{f.department}</span>
                  )}
                  {f.qualification && (
                    <p className="cp-faculty-qual">{f.qualification}</p>
                  )}
                  {f.bio && (
                    <p style={{ fontSize: 12, color: '#64748b', marginTop: 10, lineHeight: 1.5 }}>{f.bio}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 9: TEACHING METHODOLOGY AND ACADEMIC RIGOUR
          ========================================================================= */}
      {data.showMethodologySection !== false && methodologyList.length > 0 && (
        <section id="methodology" className="cp-section cp-section-gray">
          <div className="cp-container">
            <div className="cp-section-header">
              <span className="cp-section-eyebrow">Proven 5-Step Academic Cycle</span>
              <h3 className="cp-section-title">Teaching Methodology & Rigour</h3>
              <p className="cp-section-desc">Our closed-loop diagnostic learning model transforms average students into national competitive toppers.</p>
            </div>

            <div className="cp-methodology-grid">
              {methodologyList.map((step, idx) => (
                <div key={idx} className="cp-methodology-card">
                  <div className="cp-methodology-header">
                    <span className="cp-methodology-step-num">{step.stepNumber || `0${idx + 1}`}</span>
                    {step.badge && (
                      <span className="cp-methodology-badge">{step.badge}</span>
                    )}
                  </div>
                  <h4 className="cp-methodology-title">{step.title}</h4>
                  <p className="cp-methodology-desc">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 10: CAMPUS AND INFRASTRUCTURE
          ========================================================================= */}
      {data.showFacilitiesSection !== false && data.facilities?.length > 0 && (
        <section id="campus" className="cp-section">
          <div className="cp-container">
            <div className="cp-section-header">
              <span className="cp-section-eyebrow">State-of-the-Art Environment</span>
              <h3 className="cp-section-title">Campus & Infrastructure</h3>
              <p className="cp-section-desc">A safe, distraction-free residential and academic environment engineered for complete student focus.</p>
            </div>

            <div className="cp-facility-grid">
              {data.facilities.map((fac) => (
                <div key={fac.id} className="cp-facility-card">
                  {fac.photoUrl ? (
                    <img src={fac.photoUrl} alt={fac.title} className="cp-facility-img" />
                  ) : (
                    <div className="cp-facility-img" style={{ background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                      🏢
                    </div>
                  )}
                  <div className="cp-facility-body">
                    {fac.category && (
                      <span className="cp-badge-cat">{fac.category}</span>
                    )}
                    <h4 className="cp-facility-title">{fac.title}</h4>
                    <p className="cp-facility-desc">{fac.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 11: STUDENT RESULTS AND HALL OF FAME
          ========================================================================= */}
      {data.showResultsSection !== false && data.achievements?.length > 0 && (
        <section id="toppers" className="cp-section cp-section-gray">
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
                    <div className="cp-topper-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, background: '#f1f5f9' }}>
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

      {/* =========================================================================
          SECTION 12: ADMISSIONS AND SCHOLARSHIPS
          ========================================================================= */}
      {data.showAdmissionsSection !== false && (
        <section id="admissions" className="cp-section">
          <div className="cp-container">
            <div className="cp-section-header">
              <span className="cp-section-eyebrow">Academic Year 2026-27</span>
              <h3 className="cp-section-title">Admissions & Scholarships</h3>
              <p className="cp-section-desc">Transparent 4-step admission roadmap and merit scholarships up to 100% full fee waiver.</p>
            </div>

            <div className="cp-admissions-grid">
              {/* 4-Step Process */}
              <div>
                <h4 style={{ fontSize: 18, fontWeight: 800, color: 'var(--cp-dark)', marginBottom: 18 }}>
                  4-Step Admission Roadmap
                </h4>
                <div className="cp-adm-steps-list">
                  {(admissionProcessList.length > 0 ? admissionProcessList : [
                    { step: '01', title: 'Submit Online Enquiry', description: 'Complete our quick online registration form with student academic marks and stream preference.' },
                    { step: '02', title: 'Diagnostic Talent & Scholarship Test', description: 'Appear for the Annual Scholarship Test (AITSE) to evaluate baseline readiness and qualify for fee waivers.' },
                    { step: '03', title: 'Personal Academic Counseling', description: 'Meet with senior academic deans to map individual career targets and batch allocation.' },
                    { step: '04', title: 'Seat Allotment & Enrollment', description: 'Finalize document verification, collect curriculum kit, and attend the student induction program.' },
                  ]).map((st, idx) => (
                    <div key={idx} className="cp-adm-step-card">
                      <div className="cp-adm-step-num">{st.step}</div>
                      <div className="cp-adm-step-body">
                        <h4>{st.title}</h4>
                        <p>{st.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scholarship Tiers Card */}
              <div className="cp-scholarships-card">
                <span className="cp-badge-pill" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  ★ Merit Concessions
                </span>
                <h4 style={{ fontSize: 22, fontWeight: 900, margin: '14px 0 6px 0', color: '#ffffff' }}>
                  Institutional Scholarship Tiers
                </h4>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 20 }}>
                  We reward academic dedication. Scholarship benefits apply directly to tuition fees for 2 full academic years.
                </p>

                <div>
                  {(scholarshipList.length > 0 ? scholarshipList : [
                    { name: 'State Ranker Scholarship', criteria: 'Top 50 Ranks in AITSE or 98%+ in 10th Board Exams', benefit: '100% Full Tuition Waiver for 2 Years' },
                    { name: 'Merit Excellence Scholarship', criteria: 'Ranks 51 - 150 in AITSE or 95% - 97.9% in 10th Board Exams', benefit: '75% Tuition Fee Waiver' },
                    { name: 'Academic Achiever Concession', criteria: 'Ranks 151 - 500 in AITSE or 90% - 94.9% in 10th Board Exams', benefit: '50% Tuition Fee Waiver' },
                    { name: 'Defense & Social Quota', criteria: 'Wards of Armed Forces / Police & Single Parent Girls', benefit: 'Special 25% Institutional Grant' },
                  ]).map((sc, idx) => (
                    <div key={idx} className="cp-scholarship-tier-item">
                      <div className="cp-scholarship-name">{sc.name}</div>
                      <div className="cp-scholarship-criteria">{sc.criteria}</div>
                      <div className="cp-scholarship-benefit">✓ {sc.benefit}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => setIsEnquiryModalOpen(true)}
                    className="cp-btn-hero-white"
                    style={{ flex: 1, padding: 12, fontSize: 13, textAlign: 'center' }}
                  >
                    Apply for Scholarship Test →
                  </button>
                  <button
                    onClick={() => setIsBrochureModalOpen(true)}
                    className="cp-btn-hero-outline"
                    style={{ padding: 12, fontSize: 13 }}
                  >
                    Brochure 📄
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 13: OPEN EXAMINATIONS (MODULAR GUARD)
          ========================================================================= */}
      {data.hasOnlineExamModule && data.showOpenExamsSection !== false && data.openExams?.length > 0 && (
        <section id="exams" className="cp-section cp-section-gray">
          <div className="cp-container">
            <div className="cp-section-header">
              <span className="cp-section-eyebrow">Computer-Based Testing</span>
              <h3 className="cp-section-title">Open Mock & Scholarship Examinations</h3>
              <p className="cp-section-desc">External candidates can attempt these official online tests to assess their all-state ranking and test readiness.</p>
            </div>

            <div>
              {data.openExams.map((test) => (
                <div key={test.id} className="cp-exam-card">
                  <div className="cp-exam-info">
                    <span className="cp-badge-cat">{test.examName}</span>
                    <h4>{test.title}</h4>
                    {test.publicDescription && (
                      <p style={{ margin: '4px 0 10px 0', fontSize: 13, color: '#475569' }}>{test.publicDescription}</p>
                    )}
                    <div className="cp-exam-details">
                      <span>⏱ Duration: <strong>{test.durationMinutes} Mins</strong></span>
                      <span>❓ Questions: <strong>{test.questionCount} Qs</strong></span>
                      <span>⚖ Marking: <strong>+{test.positiveMarks} / -{test.negativeMarks}</strong></span>
                      <span>🔒 Code: <code>{test.code}</code></span>
                    </div>
                  </div>

                  <div>
                    <a
                      href={test.cbtUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="cp-btn-exam"
                    >
                      Start Online Examination →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 14: FACULTY CAREERS AND RECRUITMENT (MODULAR GUARD)
          ========================================================================= */}
      {data.hasRecruitmentModule && data.showCareersSection !== false && data.jobPostings?.length > 0 && (
        <section id="careers" className="cp-section">
          <div className="cp-container">
            <div className="cp-section-header">
              <span className="cp-section-eyebrow">Join Our Teaching Faculty</span>
              <h3 className="cp-section-title">Faculty Careers & Openings</h3>
              <p className="cp-section-desc">We are always looking for passionate educators and academic leaders to mentor national rankers.</p>
            </div>

            <div className="cp-careers-grid">
              {data.jobPostings.map((job) => (
                <div key={job.id} className="cp-job-card">
                  <div>
                    <h4 className="cp-job-title">{job.jobTitle}</h4>
                    <div className="cp-job-badges">
                      <span className="cp-job-badge">🏢 {job.department}</span>
                      <span className="cp-job-badge">⏱ {job.employmentType}</span>
                      {job.minExperienceYrs > 0 && (
                        <span className="cp-job-badge">💼 {job.minExperienceYrs}+ Yrs Exp</span>
                      )}
                      {job.location && (
                        <span className="cp-job-badge">📍 {job.location}</span>
                      )}
                    </div>
                    <p className="cp-job-desc">{job.jobDescription}</p>
                    {job.requiredQualifications && (
                      <div className="cp-job-qual" style={{ marginTop: 12 }}>
                        <strong>Required Qualifications:</strong> {job.requiredQualifications}
                      </div>
                    )}
                  </div>

                  <div>
                    <button
                      onClick={() => {
                        setSelectedJob(job);
                        setJobSuccess(false);
                        setJobError(null);
                      }}
                      className="cp-btn-apply-job"
                    >
                      Apply Online with Resume →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 15: CAMPUS LIFE AND PHOTO GALLERY
          ========================================================================= */}
      {data.showGallerySection !== false && data.galleryItems?.length > 0 && (
        <section id="gallery" className="cp-section cp-section-gray">
          <div className="cp-container">
            <div className="cp-section-header">
              <span className="cp-section-eyebrow">Campus Glimpses</span>
              <h3 className="cp-section-title">Campus Life & Photo Gallery</h3>
              <p className="cp-section-desc">Explore daily life, laboratories, convocation ceremonies, and sports activities.</p>
            </div>

            {/* Gallery Category Filter Tabs */}
            <div className="cp-gallery-tabs">
              {['ALL', 'CAMPUS', 'LABS', 'EVENTS', 'SPORTS'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setGalleryCategory(cat)}
                  className={`cp-gallery-tab-btn ${galleryCategory === cat ? 'active' : ''}`}
                >
                  {cat === 'ALL' ? 'All Photos' : cat}
                </button>
              ))}
            </div>

            <div className="cp-gallery-grid">
              {filteredGallery.map((item) => (
                <div
                  key={item.id}
                  className="cp-gallery-item"
                  onClick={() => setPreviewMedia(item)}
                >
                  <img src={item.mediaUrl} alt={item.title} className="cp-gallery-img" />
                  <div className="cp-gallery-overlay">
                    <span className="cp-badge-cat" style={{ width: 'fit-content', marginBottom: 6 }}>{item.category}</span>
                    <strong style={{ fontSize: 14 }}>{item.title}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 16: PARENT AND STUDENT TESTIMONIALS
          ========================================================================= */}
      {data.showTestimonialsSection !== false && data.testimonials?.length > 0 && (
        <section id="testimonials" className="cp-section">
          <div className="cp-container">
            <div className="cp-section-header">
              <span className="cp-section-eyebrow">Alumni & Parent Voices</span>
              <h3 className="cp-section-title">What They Say About Us</h3>
              <p className="cp-section-desc">Authentic experiences and reviews from our successful doctors, engineers, and their proud parents.</p>
            </div>

            <div className="cp-testimonials-grid">
              {data.testimonials.map((t) => (
                <div key={t.id} className="cp-testimonial-card">
                  <div>
                    <div className="cp-test-stars">
                      {'★'.repeat(t.rating || 5)}
                    </div>
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

      {/* =========================================================================
          SECTION 17: FAQ, CONTACT AND FINAL ADMISSION CTA
          ========================================================================= */}
      <section id="contact" className="cp-section cp-section-gray">
        <div className="cp-container">
          {/* FAQ Accordion */}
          {data.showFaqSection !== false && faqsList.length > 0 && (
            <div style={{ marginBottom: 60 }}>
              <div className="cp-section-header">
                <span className="cp-section-eyebrow">Clear Answers</span>
                <h3 className="cp-section-title">Frequently Asked Questions</h3>
                <p className="cp-section-desc">Everything you need to know about academic admissions, batch structure, hostel life, and testing.</p>
              </div>

              <div className="cp-faq-list">
                {faqsList.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div key={idx} className={`cp-faq-item ${isOpen ? 'open' : ''}`}>
                      <div
                        className="cp-faq-header"
                        onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                      >
                        <h4 className="cp-faq-question">{faq.question}</h4>
                        <div className="cp-faq-toggle-icon">
                          {isOpen ? '✕' : '+'}
                        </div>
                      </div>
                      {isOpen && (
                        <div className="cp-faq-body">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Admission Enquiry Form & Campus Address */}
          <div className="cp-section-header">
            <span className="cp-section-eyebrow">Start Your Journey</span>
            <h3 className="cp-section-title">Apply for Admission or Enquire Today</h3>
            <p className="cp-section-desc">Our senior admissions counselors are ready to help you choose the right stream and answer all your queries.</p>
          </div>

          <div className="cp-contact-grid">
            {/* Left: High-Conversion Admission Enquiry Form */}
            <div className="cp-card-form">
              <h4 style={{ fontSize: 18, fontWeight: 800, color: 'var(--cp-dark)', margin: '0 0 16px 0' }}>
                Online Admission Enquiry
              </h4>

              {enquirySuccess && (
                <div className="cp-alert-success">
                  <span>✓</span> Thank you! Your enquiry has been received. Our admissions counselor will get in touch with you shortly.
                </div>
              )}
              {enquiryError && (
                <div className="cp-alert-error">
                  {enquiryError}
                </div>
              )}

              <form onSubmit={handleEnquirySubmit}>
                <div className="cp-form-row">
                  <div>
                    <label className="cp-label">Student Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={enquiryForm.studentName}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, studentName: e.target.value })}
                      className="cp-input"
                    />
                  </div>
                  <div>
                    <label className="cp-label">Parent / Guardian Name</label>
                    <input
                      type="text"
                      placeholder="e.g. S. Sharma"
                      value={enquiryForm.parentName}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, parentName: e.target.value })}
                      className="cp-input"
                    />
                  </div>
                </div>

                <div className="cp-form-row">
                  <div>
                    <label className="cp-label">Mobile Number * (10 Digits)</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={enquiryForm.phone}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                      className="cp-input"
                    />
                  </div>
                  <div>
                    <label className="cp-label">Email Address</label>
                    <input
                      type="email"
                      placeholder="e.g. student@gmail.com"
                      value={enquiryForm.email}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                      className="cp-input"
                    />
                  </div>
                </div>

                <div className="cp-form-row">
                  <div>
                    <label className="cp-label">Course / Stream of Interest</label>
                    <select
                      value={enquiryForm.courseOfInterest}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, courseOfInterest: e.target.value })}
                      className="cp-select"
                    >
                      <option value="">Select Target Course</option>
                      {data.courses?.map((c) => (
                        <option key={c.id} value={c.courseName}>{c.courseName}</option>
                      ))}
                      <option value="NEET Medical">NEET Medical (2-Year)</option>
                      <option value="IIT-JEE Engineering">IIT-JEE Engineering (2-Year)</option>
                      <option value="Foundation Program">Foundation Program (Class 8-10)</option>
                      <option value="Long Term Repeater">Long Term Repeater Batch</option>
                    </select>
                  </div>
                  <div>
                    <label className="cp-label">City / Town</label>
                    <input
                      type="text"
                      placeholder="e.g. Vijayawada, Guntur"
                      value={enquiryForm.cityOrTown}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, cityOrTown: e.target.value })}
                      className="cp-input"
                    />
                  </div>
                </div>

                <div className="cp-form-group">
                  <label className="cp-label">Questions or Additional Requirements</label>
                  <textarea
                    rows={3}
                    placeholder="Tell us about previous test scores or hostel accommodation requirements..."
                    value={enquiryForm.message}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                    className="cp-textarea"
                  />
                </div>

                <button
                  type="submit"
                  disabled={enquirySubmitting}
                  className="cp-btn-submit"
                >
                  {enquirySubmitting ? 'Submitting Enquiry...' : 'Submit Admission Enquiry →'}
                </button>
              </form>
            </div>

            {/* Right: Contact Information & WhatsApp */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: '#ffffff', border: '1px solid var(--cp-border)', borderRadius: 24, padding: 32, boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                <h4 style={{ fontSize: 18, fontWeight: 800, color: 'var(--cp-dark)', margin: '0 0 16px 0' }}>
                  Campus Visit & Helpline
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 14, color: '#334155' }}>
                  {data.campusAddress && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 18 }}>📍</span>
                      <div>
                        <strong>Campus Address:</strong>
                        <p style={{ margin: '4px 0 0 0', color: '#64748b', lineHeight: 1.5 }}>{data.campusAddress}</p>
                      </div>
                    </div>
                  )}

                  {data.contactPhone && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 18 }}>📞</span>
                      <div>
                        <strong>Helpline Phone:</strong>{' '}
                        <a href={`tel:${data.contactPhone}`} style={{ color: 'var(--cp-primary)', fontWeight: 700, textDecoration: 'none' }}>
                          {data.contactPhone}
                        </a>
                      </div>
                    </div>
                  )}

                  {data.contactEmail && (
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 18 }}>✉</span>
                      <div>
                        <strong>Email Admissions:</strong>{' '}
                        <a href={`mailto:${data.contactEmail}`} style={{ color: 'var(--cp-primary)', fontWeight: 700, textDecoration: 'none' }}>
                          {data.contactEmail}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {data.whatsappNumber && (
                  <a
                    href={`https://wa.me/${data.whatsappNumber.replace(/[^0-9]/g, '')}?text=Hello!%20I%20would%20like%20to%20enquire%20about%20admissions%20at%20${encodeURIComponent(data.displayName || 'your college')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="cp-btn-whatsapp"
                  >
                    <span>💬</span> Chat with Admission Counselor on WhatsApp
                  </a>
                )}
              </div>

              {/* Campus Location Map / Directions */}
              {data.googleMapEmbedUrl && (
                <div style={{ background: '#ffffff', border: '1px solid var(--cp-border)', borderRadius: 20, overflow: 'hidden', height: 240 }}>
                  <iframe
                    src={data.googleMapEmbedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                    title="Campus Map"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          MULTI-COLUMN INSTITUTIONAL FOOTER
          ========================================================================= */}
      <footer className="cp-footer">
        <div className="cp-container">
          <div className="cp-footer-grid">
            {/* Col 1: About & Motto */}
            <div>
              <h4>{data.displayName || data.institute?.name}</h4>
              <p style={{ color: '#94a3b8', lineHeight: 1.6, fontSize: 13, margin: '0 0 16px 0' }}>
                {data.mottoTagline || 'Shaping State Toppers & National Rankers in NEET, JEE & EAPCET with elite faculty mentorship and advanced computerized testing.'}
              </p>
              {data.accreditation && (
                <div style={{ display: 'inline-block', background: '#1e293b', border: '1px solid #334155', padding: '4px 10px', borderRadius: 6, fontSize: 11, color: '#e2e8f0' }}>
                  ✓ {data.accreditation}
                </div>
              )}
            </div>

            {/* Col 2: Quick Links */}
            <div>
              <h5>Quick Navigation</h5>
              <ul>
                <li><button onClick={() => scrollToSection('home')}>Home</button></li>
                <li><button onClick={() => scrollToSection('about')}>About Us</button></li>
                <li><button onClick={() => scrollToSection('courses')}>Courses Offered</button></li>
                <li><button onClick={() => scrollToSection('faculty')}>Faculty</button></li>
                <li><button onClick={() => scrollToSection('toppers')}>Hall of Fame</button></li>
                <li><button onClick={() => scrollToSection('admissions')}>Admissions</button></li>
              </ul>
            </div>

            {/* Col 3: Contact Details */}
            <div>
              <h5>Campus Office</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: '#94a3b8' }}>
                <p style={{ margin: 0, lineHeight: 1.5 }}>{data.campusAddress}</p>
                {data.contactPhone && (
                  <p style={{ margin: 0 }}>📞 {data.contactPhone}</p>
                )}
                {data.contactEmail && (
                  <p style={{ margin: 0 }}>✉ {data.contactEmail}</p>
                )}
              </div>
            </div>

            {/* Col 4: Platform & SaaS Attribution */}
            <div>
              <h5>QuestionsStudio</h5>
              <div style={{ background: '#1e293b', padding: 16, borderRadius: 12, border: '1px solid #334155' }}>
                <strong style={{ color: '#ffffff', fontSize: 13 }}>Powered by QuestionsStudio</strong>
                <p style={{ color: '#94a3b8', fontSize: 11, margin: '6px 0 0 0', lineHeight: 1.5 }}>
                  Centralized Question Bank, Computer-Based Online Testing, OMR Grading & Multi-College Portal SaaS.
                </p>
              </div>
            </div>
          </div>

          <div className="cp-footer-bottom">
            <div>
              © {new Date().getFullYear()} {data.displayName || data.institute?.name}. All rights reserved.
            </div>
            <div style={{ display: 'flex', gap: 18 }}>
              <span style={{ color: '#64748b' }}>QuestionsStudio SaaS</span>
              <span style={{ color: '#64748b' }}>Privacy Policy</span>
              <span style={{ color: '#64748b' }}>Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>

      {/* =========================================================================
          POPUP MODAL: ADMISSION ENQUIRY
          ========================================================================= */}
      {isEnquiryModalOpen && (
        <div className="cp-modal-backdrop" onClick={() => setIsEnquiryModalOpen(false)}>
          <div className="cp-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="cp-modal-header">
              <h3 className="cp-modal-title">Apply for Admission 2026-27</h3>
              <button className="cp-modal-close" onClick={() => setIsEnquiryModalOpen(false)}>✕</button>
            </div>
            <div className="cp-modal-body">
              {enquirySuccess ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                  <h4 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px 0', color: '#065f46' }}>Enquiry Submitted!</h4>
                  <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.5 }}>
                    Thank you! Our admission counselor will get in touch with you at <strong>{enquiryForm.phone}</strong> shortly.
                  </p>
                  <button
                    onClick={() => {
                      setIsEnquiryModalOpen(false);
                      setEnquirySuccess(false);
                    }}
                    className="cp-btn-cta"
                    style={{ marginTop: 20 }}
                  >
                    Close Window
                  </button>
                </div>
              ) : (
                <form onSubmit={handleEnquirySubmit}>
                  {enquiryError && <div className="cp-alert-error">{enquiryError}</div>}
                  <div className="cp-form-group">
                    <label className="cp-label">Student Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sai Kiran"
                      value={enquiryForm.studentName}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, studentName: e.target.value })}
                      className="cp-input"
                    />
                  </div>

                  <div className="cp-form-row">
                    <div>
                      <label className="cp-label">Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        placeholder="10 digit mobile"
                        value={enquiryForm.phone}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                        className="cp-input"
                      />
                    </div>
                    <div>
                      <label className="cp-label">Target Course</label>
                      <select
                        value={enquiryForm.courseOfInterest}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, courseOfInterest: e.target.value })}
                        className="cp-select"
                      >
                        <option value="">Select Course</option>
                        {data.courses?.map((c) => (
                          <option key={c.id} value={c.courseName}>{c.courseName}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="cp-form-group">
                    <label className="cp-label">City / Town</label>
                    <input
                      type="text"
                      placeholder="e.g. Vijayawada"
                      value={enquiryForm.cityOrTown}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, cityOrTown: e.target.value })}
                      className="cp-input"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={enquirySubmitting}
                    className="cp-btn-submit"
                    style={{ marginTop: 10 }}
                  >
                    {enquirySubmitting ? 'Submitting...' : 'Submit Application →'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          POPUP MODAL: FACULTY JOB APPLICATION (WITH RESUME UPLOAD)
          ========================================================================= */}
      {selectedJob && (
        <div className="cp-modal-backdrop" onClick={() => setSelectedJob(null)}>
          <div className="cp-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="cp-modal-header">
              <div>
                <h3 className="cp-modal-title">Apply for {selectedJob.jobTitle}</h3>
                <span style={{ fontSize: 12, color: 'var(--cp-primary)', fontWeight: 700 }}>
                  Department of {selectedJob.department}
                </span>
              </div>
              <button className="cp-modal-close" onClick={() => setSelectedJob(null)}>✕</button>
            </div>
            <div className="cp-modal-body">
              {jobSuccess ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
                  <h4 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px 0', color: '#065f46' }}>Application Submitted!</h4>
                  <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.5 }}>
                    Your application and resume have been securely forwarded to the academic selection board. Shortlisted candidates will be invited for interview and demo lecture.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedJob(null);
                      setJobSuccess(false);
                    }}
                    className="cp-btn-cta"
                    style={{ marginTop: 20 }}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleJobApplySubmit}>
                  {jobError && <div className="cp-alert-error">{jobError}</div>}

                  <div className="cp-form-row">
                    <div>
                      <label className="cp-label">Applicant Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Dr. / Prof. Full Name"
                        value={jobForm.applicantName}
                        onChange={(e) => setJobForm({ ...jobForm, applicantName: e.target.value })}
                        className="cp-input"
                      />
                    </div>
                    <div>
                      <label className="cp-label">Mobile Phone *</label>
                      <input
                        type="tel"
                        required
                        placeholder="10-digit number"
                        value={jobForm.phone}
                        onChange={(e) => setJobForm({ ...jobForm, phone: e.target.value })}
                        className="cp-input"
                      />
                    </div>
                  </div>

                  <div className="cp-form-row">
                    <div>
                      <label className="cp-label">Email Address *</label>
                      <input
                        type="email"
                        required
                        placeholder="educator@domain.com"
                        value={jobForm.email}
                        onChange={(e) => setJobForm({ ...jobForm, email: e.target.value })}
                        className="cp-input"
                      />
                    </div>
                    <div>
                      <label className="cp-label">Teaching Experience (Years)</label>
                      <input
                        type="number"
                        placeholder="e.g. 8"
                        value={jobForm.experienceYrs}
                        onChange={(e) => setJobForm({ ...jobForm, experienceYrs: e.target.value })}
                        className="cp-input"
                      />
                    </div>
                  </div>

                  <div className="cp-form-row">
                    <div>
                      <label className="cp-label">Current Employer / City</label>
                      <input
                        type="text"
                        placeholder="e.g. Apex Academy, Hyderabad"
                        value={jobForm.currentEmployer}
                        onChange={(e) => setJobForm({ ...jobForm, currentEmployer: e.target.value })}
                        className="cp-input"
                      />
                    </div>
                    <div>
                      <label className="cp-label">Expected Annual CTC</label>
                      <input
                        type="text"
                        placeholder="e.g. ₹18 - 22 LPA"
                        value={jobForm.expectedSalary}
                        onChange={(e) => setJobForm({ ...jobForm, expectedSalary: e.target.value })}
                        className="cp-input"
                      />
                    </div>
                  </div>

                  <div className="cp-form-group">
                    <label className="cp-label">Attach Resume / CV * (PDF or DOCX, max 10MB)</label>
                    <input
                      type="file"
                      required
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setResumeFile(e.target.files[0])}
                      className="cp-input"
                      style={{ padding: 8 }}
                    />
                  </div>

                  <div className="cp-form-group">
                    <label className="cp-label">Cover Letter / Note for Academic Director</label>
                    <textarea
                      rows={3}
                      placeholder="Briefly describe your subject expertise, rank producing track record, and motivation..."
                      value={jobForm.coverLetter}
                      onChange={(e) => setJobForm({ ...jobForm, coverLetter: e.target.value })}
                      className="cp-textarea"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={jobSubmitting}
                    className="cp-btn-submit"
                  >
                    {jobSubmitting ? 'Uploading Application...' : 'Submit Faculty Application →'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          POPUP MODAL: BROCHURE & PROSPECTUS
          ========================================================================= */}
      {isBrochureModalOpen && (
        <div className="cp-modal-backdrop" onClick={() => setIsBrochureModalOpen(false)}>
          <div className="cp-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="cp-modal-header">
              <h3 className="cp-modal-title">Institutional Prospectus & Syllabus</h3>
              <button className="cp-modal-close" onClick={() => setIsBrochureModalOpen(false)}>✕</button>
            </div>
            <div className="cp-modal-body" style={{ textAlign: 'center', padding: '30px 20px' }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>📘</div>
              <h4 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px 0', color: 'var(--cp-dark)' }}>
                {data.displayName} Academic Guide
              </h4>
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.6, maxWidth: 420, margin: '0 auto 24px' }}>
                Download our comprehensive handbook containing batch structures, weekly timetable, test series calendar, hostel policies, and fee concession details.
              </p>
              <button
                onClick={() => {
                  setIsBrochureModalOpen(false);
                  setIsEnquiryModalOpen(true);
                }}
                className="cp-btn-cta"
              >
                Request Prospectus via WhatsApp / Email →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          POPUP MODAL: GALLERY LIGHTBOX PREVIEW
          ========================================================================= */}
      {previewMedia && (
        <div className="cp-modal-backdrop" onClick={() => setPreviewMedia(null)}>
          <div style={{ maxWidth: 840, width: '100%', background: '#000', borderRadius: 20, overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ position: 'relative' }}>
              <img
                src={previewMedia.mediaUrl}
                alt={previewMedia.title}
                style={{ width: '100%', maxHeight: '75vh', objectFit: 'contain', display: 'block' }}
              />
              <button
                onClick={() => setPreviewMedia(null)}
                style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', width: 36, height: 36, borderRadius: '50%', fontSize: 20, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '16px 24px', background: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: 16 }}>{previewMedia.title}</strong>
                <span style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Category: {previewMedia.category}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
