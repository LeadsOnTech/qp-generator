import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import '../college-portal.css';

// SVG Icon Helpers
function IconGraduationCap() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

function IconDocument() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function IconDeviceMobile() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

// Smooth Number Counter Component
function AnimatedCounter({ targetValue, isVisible }) {
  const [displayValue, setDisplayValue] = useState('0');

  useEffect(() => {
    if (!isVisible) return;
    const str = String(targetValue || '0').trim();
    const match = str.match(/^([^\d]*)(\d[\d,]*)(.*)$/);
    if (!match) {
      setDisplayValue(str);
      return;
    }
    const prefix = match[1] || '';
    const rawNum = parseInt(match[2].replace(/,/g, ''), 10);
    const suffix = match[3] || '';

    if (isNaN(rawNum)) {
      setDisplayValue(str);
      return;
    }

    const duration = 1600;
    const startTime = performance.now();

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(ease * rawNum);
      setDisplayValue(`${prefix}${current.toLocaleString()}${suffix}`);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayValue(str);
      }
    }

    requestAnimationFrame(step);
  }, [isVisible, targetValue]);

  return <span>{displayValue}</span>;
}

export default function PublicCollegePortal() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active section for sticky header highlight
  const [activeSection, setActiveSection] = useState('home');

  // Stats visible trigger
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef(null);

  // Mobile drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Gallery active filter & preview
  const [galleryCategory, setGalleryCategory] = useState('ALL');
  const [previewMedia, setPreviewMedia] = useState(null);

  // Testimonials Carousel Active Index
  const [testimonialIndex, setTestimonialIndex] = useState(0);

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
      const targetSlug = (!slug || slug === 'dummy' || slug === 'demo') ? 'andhra-inspire-academy' : slug;
      const res = await fetch(`/api/public/colleges/${targetSlug}`);
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

  // Scroll Reveal Observer
  useEffect(() => {
    if (!data) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('cp-visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    const elements = document.querySelectorAll('.cp-reveal');
    elements.forEach((el) => observer.observe(el));

    // Stats counter trigger
    let statsObserver = null;
    if (statsRef.current) {
      statsObserver = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setStatsVisible(true);
          }
        },
        { threshold: 0.3 }
      );
      statsObserver.observe(statsRef.current);
    }

    return () => {
      observer.disconnect();
      if (statsObserver) statsObserver.disconnect();
    };
  }, [data, galleryCategory]);

  // Testimonial Carousel Auto-advance
  useEffect(() => {
    if (!data?.testimonials || data.testimonials.length <= 1) return;
    const interval = setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % data.testimonials.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [data?.testimonials]);

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
        <div style={{ width: 48, height: 48, border: '4px solid #1e3a8a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <h3 style={{ marginTop: 20, color: '#1e293b', fontWeight: 800 }}>Loading Official College Portal...</h3>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: '#fff', padding: 44, borderRadius: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: 480, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏛</div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '0 0 10px 0' }}>Portal Unavailable</h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 26px 0', lineHeight: 1.6 }}>
            {error || 'The requested college website could not be found or is currently in draft mode.'}
          </p>
          <Link to="/" style={{ display: 'inline-block', padding: '12px 24px', background: '#1e3a8a', color: '#fff', borderRadius: 12, textDecoration: 'none', fontWeight: 800 }}>
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
            <span className="cp-announcement-badge">
              <span className="cp-pulse-dot" /> Announcement
            </span>
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
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(255,255,255,0.18)',
                color: '#ffffff',
                padding: '3px 10px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.3)',
                letterSpacing: '0.02em',
              }}
            >
              🔐 Staff / Admin Login
            </Link>
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
              Apply for Admission →
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
                <h4 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>Navigation Menu</h4>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 16, cursor: 'pointer' }}
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
                <button className="cp-drawer-link-btn" onClick={() => scrollToSection('contact')}>Contact & Helpline</button>
              </div>
            </div>

            <div style={{ paddingTop: 20, borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  setIsEnquiryModalOpen(true);
                }}
                className="cp-btn-cta"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Apply for Admission 2026-27 →
              </button>
              <Link
                to="/login"
                onClick={() => setIsDrawerOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '11px 16px',
                  borderRadius: 8,
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: 'none',
                }}
              >
                🔐 Staff / College Admin Login
              </Link>
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          SECTION 2: FULL-BLEED CINEMATIC HERO BANNER
          ========================================================================= */}
      <section id="home" className="cp-hero">
        <div className="cp-container">
          <div className="cp-hero-grid">
            <div className="cp-hero-content cp-reveal">
              <div className="cp-hero-intake-badge">
                <span className="cp-pulse-dot" />
                <span>{data.accreditation ? data.accreditation : 'Official Admissions 2026-27'}</span>
              </div>

              <h2 className="cp-hero-title">
                {data.heroTitle || 'Empowering Future Doctors & Engineers with Elite Mentorship'}
              </h2>
              <p className="cp-hero-subtitle">
                {data.heroSubtitle || 'Premier Academic Academy for NEET-UG, IIT-JEE Advanced & Intermediate Excellence with 14+ Years of Proven State Ranks.'}
              </p>

              <div className="cp-hero-actions">
                <button onClick={() => setIsEnquiryModalOpen(true)} className="cp-btn-hero-primary">
                  {data.heroCtaText || 'Apply for Admission 2026-27'} →
                </button>
                <button onClick={() => scrollToSection('courses')} className="cp-btn-hero-outline">
                  Explore Academic Programmes
                </button>
                {data.hasOnlineExamModule && data.openExams?.length > 0 && (
                  <button onClick={() => scrollToSection('exams')} className="cp-btn-hero-accent">
                    Open Mock Tests ({data.openExams.length})
                  </button>
                )}
              </div>
            </div>

            <div className="cp-hero-visual cp-reveal cp-delay-200">
              <div className="cp-hero-frame">
                {data.heroBannerUrl ? (
                  <img src={data.heroBannerUrl} alt="Campus" className="cp-hero-img" />
                ) : (
                  <div style={{ background: 'rgba(255,255,255,0.06)', padding: 60, textAlign: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: 26, color: '#ffffff' }}>{data.displayName}</h3>
                    <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.85)' }}>Admissions Open for Academic Year 2026-27</p>
                  </div>
                )}
                <div className="cp-hero-caption">
                  <span>Main Academic Block & Laboratories</span>
                  <span>Est. {data.estYear || '2009'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: INSTITUTIONAL ACHIEVEMENTS (STATS STRIP)
          ========================================================================= */}
      {data.showStatsSection !== false && statsList.length > 0 && (
        <div className="cp-stats-bar" ref={statsRef}>
          <div className="cp-container">
            <div className="cp-stats-grid">
              {statsList.map((st, idx) => (
                <div key={idx} className="cp-stat-cell">
                  <div className="cp-stat-number">
                    <AnimatedCounter targetValue={st.value} isVisible={statsVisible} />
                  </div>
                  <div className="cp-stat-label">{st.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 4: ABOUT OUR INSTITUTION (PORCELAIN EDITORIAL CANVAS)
          ========================================================================= */}
      {data.showAboutSection !== false && (
        <section id="about" className="cp-section cp-section-white">
          <div className="cp-container">
            <div className="cp-section-header cp-reveal">
              <span className="cp-section-marker">01 / INSTITUTIONAL HERITAGE</span>
              <h3 className="cp-section-title">{data.aboutTitle || 'Committed to Academic Rigor & Ethical Character'}</h3>
              <p className="cp-section-desc">Building strong conceptual foundations and empowering students to achieve top national percentiles.</p>
            </div>

            <div className="cp-about-spread">
              <div className="cp-about-col-lead cp-reveal cp-delay-100">
                <p className="cp-about-lead">
                  {data.aboutText || 'Founded with a visionary commitment to scientific excellence, our institution blends disciplined pedagogy with cutting-edge examination technologies, diagnostic error analysis, and round-the-clock mentorship.'}
                </p>

                {/* 4 Core Institutional Pillars */}
                <div className="cp-pillars-dossier">
                  <div className="cp-pillar-item">
                    <h4 className="cp-pillar-title">1:25 Faculty Ratio</h4>
                    <p className="cp-pillar-desc">Small batch sizes ensuring individual attention and daily doubt clinics.</p>
                  </div>

                  <div className="cp-pillar-item">
                    <h4 className="cp-pillar-title">NCERT Line-by-Line</h4>
                    <p className="cp-pillar-desc">Rigorous conceptual analysis mapped directly to latest NTA entrance standards.</p>
                  </div>

                  <div className="cp-pillar-item">
                    <h4 className="cp-pillar-title">Computer CBT Labs</h4>
                    <p className="cp-pillar-desc">National-level timed computer testing replicating exact exam conditions.</p>
                  </div>

                  <div className="cp-pillar-item">
                    <h4 className="cp-pillar-title">Residential Discipline</h4>
                    <p className="cp-pillar-desc">Air-conditioned, smartphone-free hostels with round-the-clock mentor guidance.</p>
                  </div>
                </div>
              </div>

              {/* Vision & Mission Panels */}
              <div className="cp-reveal cp-delay-200">
                {data.visionText && (
                  <div className="cp-vm-panel cp-vm-panel-vision">
                    <span className="cp-vm-label">Our Institutional Vision</span>
                    <p className="cp-vm-text">{data.visionText}</p>
                  </div>
                )}
                {data.missionText && (
                  <div className="cp-vm-panel cp-vm-panel-mission">
                    <span className="cp-vm-label">Our Core Mission</span>
                    <p className="cp-vm-text">{data.missionText}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 5: DIRECTOR AND LEADERSHIP MESSAGE (EXECUTIVE EDITORIAL)
          ========================================================================= */}
      {data.showDirectorSection !== false && data.directorName && (
        <section className="cp-section cp-section-linen">
          <div className="cp-container">
            <div className="cp-section-header cp-reveal">
              <span className="cp-section-marker">02 / LEADERSHIP ADDRESS</span>
            </div>
            <div className="cp-director-spread cp-reveal">
              <div className="cp-director-media">
                <div className="cp-director-portrait-frame">
                  {data.directorPhotoUrl ? (
                    <img src={data.directorPhotoUrl} alt={data.directorName} className="cp-director-portrait" />
                  ) : (
                    <div className="cp-director-portrait" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52, background: '#e2e8f0' }}>
                      🎓
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="cp-director-name">{data.directorName}</h4>
                  <p className="cp-director-title">{data.directorTitle || 'Founder & Academic Director'}</p>
                  {data.directorQualifications && (
                    <p className="cp-director-qual">{data.directorQualifications}</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="cp-director-headline">
                  "Committed to Nurturing Every Student's Highest Potential"
                </h3>
                <p className="cp-director-quote">
                  "{data.directorMessage || 'Success in competitive examinations like NEET and JEE is never an accident. It is the natural consequence of daily conceptual clarity, targeted practice, and fearless self-correction. At our institution, every student is known personally, guided patiently, and challenged systematically to realize their supreme potential.'}"
                </p>
                <div className="cp-signature-block">
                  <div>
                    <strong style={{ fontSize: 14, color: 'var(--cp-text-ink)' }}>{data.directorName}</strong>
                    <div className="cp-signature-sub">{data.directorTitle || 'Founder & Academic Director'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 6: WHY CHOOSE OUR COLLEGE?
          ========================================================================= */}
      {data.showWhyUsSection !== false && whyUsList.length > 0 && (
        <section id="whyus" className="cp-section cp-section-slate">
          <div className="cp-container">
            <div className="cp-section-header cp-reveal">
              <span className="cp-section-marker">03 / INSTITUTIONAL ADVANTAGES</span>
              <h3 className="cp-section-title">Why Choose Our College?</h3>
              <p className="cp-section-desc">Six proven educational pillars designed to guarantee top ranks and transformative student growth.</p>
            </div>

            <div className="cp-whyus-matrix">
              {whyUsList.map((item, idx) => (
                <div key={idx} className={`cp-whyus-cell cp-reveal cp-delay-${(idx % 3) * 100 + 100}`}>
                  <div className="cp-whyus-icon-frame">
                    {(item.icon === 'academic-cap' || (!item.icon && idx === 0)) && <IconGraduationCap />}
                    {(item.icon === 'document-text' || (!item.icon && idx === 1)) && <IconDocument />}
                    {(item.icon === 'desktop-computer' || (!item.icon && idx === 2)) && <IconComputer />}
                    {(item.icon === 'chat-bubble' || (!item.icon && idx === 3)) && <IconChat />}
                    {(item.icon === 'device-mobile' || (!item.icon && idx === 4)) && <IconDeviceMobile />}
                    {(item.icon === 'shield-check' || (!item.icon && idx >= 5) || (item.icon && !['academic-cap','document-text','desktop-computer','chat-bubble','device-mobile'].includes(item.icon))) && <IconShield />}
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
        <section id="courses" className="cp-section cp-section-white">
          <div className="cp-container">
            <div className="cp-section-header cp-reveal">
              <span className="cp-section-marker">04 / ACADEMIC PROGRAMMES</span>
              <h3 className="cp-section-title">Courses Offered</h3>
              <p className="cp-section-desc">Designed with rigorous pedagogy and high-speed accuracy training for national entrance exams.</p>
            </div>

            <div className="cp-courses-dossier-grid">
              {data.courses.map((c, idx) => (
                <div key={c.id} className={`cp-course-dossier cp-reveal cp-delay-${(idx % 2) * 100 + 100}`}>
                  <div>
                    <div className="cp-course-meta">
                      <span className="cp-stream-tag">{c.category}</span>
                      {c.duration && <span className="cp-duration-tag">⏱ {c.duration}</span>}
                    </div>
                    <h4 className="cp-course-heading">{c.courseName}</h4>
                    {c.targetExam && <div className="cp-target-exam">Target: {c.targetExam}</div>}
                    <p className="cp-course-body">{c.description}</p>
                    {c.eligibility && (
                      <div className="cp-eligibility-box">
                        <span className="cp-eligibility-label">Eligibility Requirement</span>
                        <span className="cp-eligibility-val">{c.eligibility}</span>
                      </div>
                    )}
                  </div>

                  <div className="cp-course-actions">
                    <button
                      onClick={() => openCourseEnquiry(c.courseName)}
                      className="cp-btn-course-apply"
                    >
                      Enquire for Course →
                    </button>
                    {c.brochureFilename ? (
                      <a
                        href={`/uploads/brochures/${c.brochureFilename}`}
                        target="_blank"
                        rel="noreferrer"
                        className="cp-btn-course-prospectus"
                      >
                        Download Prospectus
                      </a>
                    ) : (
                      <button
                        onClick={() => setIsBrochureModalOpen(true)}
                        className="cp-btn-course-prospectus"
                      >
                        View Syllabus & Fees
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
        <section id="faculty" className="cp-section cp-section-slate">
          <div className="cp-container">
            <div className="cp-section-header cp-reveal">
              <span className="cp-section-marker">05 / ACADEMIC LEADERSHIP</span>
              <h3 className="cp-section-title">Faculty and Academic Mentors</h3>
              <p className="cp-section-desc">Learn from seasoned educators and rank producers with master's degrees from IITs and premier national universities.</p>
            </div>

            <div className="cp-faculty-roster">
              {data.faculties.map((f, idx) => (
                <div key={f.id} className={`cp-faculty-dossier cp-reveal cp-delay-${(idx % 4) * 100 + 100}`}>
                  <div className="cp-faculty-avatar-frame">
                    {f.photoUrl ? (
                      <img src={f.photoUrl} alt={f.name} className="cp-faculty-avatar" />
                    ) : (
                      <div className="cp-faculty-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, background: '#f1f5f9' }}>
                        🎓
                      </div>
                    )}
                  </div>
                  <h4 className="cp-faculty-name">{f.name}</h4>
                  <p className="cp-faculty-desig">{f.designation}</p>
                  {f.department && (
                    <span className="cp-faculty-dept">{f.department}</span>
                  )}
                  {f.qualification && (
                    <p className="cp-faculty-qual">{f.qualification}</p>
                  )}
                  {f.bio && (
                    <p style={{ fontSize: 13, color: '#64748b', marginTop: 12, lineHeight: 1.55 }}>{f.bio}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 9: TEACHING METHODOLOGY
          ========================================================================= */}
      {data.showMethodologySection !== false && methodologyList.length > 0 && (
        <section id="methodology" className="cp-section cp-section-dark">
          <div className="cp-container">
            <div className="cp-section-header cp-dark-header cp-reveal">
              <span className="cp-section-marker" style={{ color: 'var(--cp-gold)' }}>06 / PEDAGOGICAL FRAMEWORK</span>
              <h3 className="cp-section-title">Teaching Methodology & Rigour</h3>
              <p className="cp-section-desc">Our closed-loop diagnostic learning model transforms average students into national competitive toppers.</p>
            </div>

            <div className="cp-methodology-timeline">
              {methodologyList.map((step, idx) => (
                <div key={idx} className={`cp-timeline-node cp-reveal cp-delay-${idx * 100 + 100}`}>
                  <div className="cp-timeline-step-index">{step.stepNumber || (idx < 9 ? `0${idx + 1}` : `${idx + 1}`)}</div>
                  {step.badge && (
                    <div className="cp-timeline-badge">{step.badge}</div>
                  )}
                  <h4 className="cp-timeline-title">{step.title}</h4>
                  <p className="cp-timeline-text">{step.description || step.desc}</p>
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
        <section id="campus" className="cp-section cp-section-white">
          <div className="cp-container">
            <div className="cp-section-header cp-reveal">
              <span className="cp-section-marker">07 / CAMPUS & INFRASTRUCTURE</span>
              <h3 className="cp-section-title">Campus & Infrastructure</h3>
              <p className="cp-section-desc">A safe, distraction-free residential and academic environment engineered for complete student focus.</p>
            </div>

            <div className="cp-facility-mosaic">
              {data.facilities.map((fac, idx) => (
                <div key={fac.id} className={`cp-facility-item cp-reveal cp-delay-${(idx % 3) * 100 + 100}`}>
                  <div className="cp-facility-media-wrap">
                    {fac.photoUrl ? (
                      <img src={fac.photoUrl} alt={fac.title} className="cp-facility-media" />
                    ) : (
                      <div className="cp-facility-media" style={{ background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>
                        🏛
                      </div>
                    )}
                  </div>
                  <div className="cp-facility-info">
                    {fac.category && (
                      <span className="cp-facility-category">{fac.category}</span>
                    )}
                    <h4 className="cp-facility-title">{fac.title}</h4>
                    <p className="cp-facility-caption">{fac.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 11: STUDENT RESULTS AND ROLL OF HONOR
          ========================================================================= */}
      {data.showResultsSection !== false && data.achievements?.length > 0 && (
        <section id="toppers" className="cp-section cp-section-dark">
          <div className="cp-container">
            <div className="cp-section-header cp-dark-header cp-reveal">
              <span className="cp-section-marker" style={{ color: 'var(--cp-gold)' }}>08 / ROLL OF HONOR</span>
              <h3 className="cp-section-title">Student Achievers & State Ranks</h3>
              <p className="cp-section-desc">Celebrating our stellar rankers who realized their medical and engineering dreams.</p>
            </div>

            {/* Summary Results Highlights Strip */}
            <div className="cp-honor-highlights-strip cp-reveal">
              <div className="cp-honor-highlight-item">
                <div className="cp-honor-highlight-val">140+</div>
                <div className="cp-honor-highlight-lbl">National Top 100 Ranks</div>
              </div>
              <div className="cp-honor-highlight-item">
                <div className="cp-honor-highlight-val">62</div>
                <div className="cp-honor-highlight-lbl">State Top 10 Ranks</div>
              </div>
              <div className="cp-honor-highlight-item">
                <div className="cp-honor-highlight-val">3,840+</div>
                <div className="cp-honor-highlight-lbl">NEET & JEE Selections</div>
              </div>
              <div className="cp-honor-highlight-item">
                <div className="cp-honor-highlight-val">100%</div>
                <div className="cp-honor-highlight-lbl">Intensive Batch Success</div>
              </div>
            </div>

            <div className="cp-honor-roll-grid">
              {data.achievements.map((a, idx) => (
                <div key={a.id} className={`cp-honor-dossier cp-reveal cp-delay-${(idx % 4) * 100 + 100}`}>
                  <div className="cp-honor-avatar-wrap">
                    {a.photoUrl ? (
                      <img src={a.photoUrl} alt={a.studentName} className="cp-honor-avatar" />
                    ) : (
                      <div className="cp-honor-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, background: '#1e293b' }}>
                        🎓
                      </div>
                    )}
                  </div>
                  <h4 className="cp-honor-name">{a.studentName}</h4>
                  <div className="cp-honor-award">{a.examOrAward}</div>
                  {a.rankOrScore && (
                    <span className="cp-honor-rank-pill">{a.rankOrScore}</span>
                  )}
                  {a.description && <p className="cp-honor-desc">{a.description}</p>}
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
        <section id="admissions" className="cp-section cp-section-linen">
          <div className="cp-container">
            <div className="cp-section-header cp-reveal">
              <span className="cp-section-marker">09 / ADMISSIONS & SCHOLARSHIPS</span>
              <h3 className="cp-section-title">Admissions & Merit Scholarships</h3>
              <p className="cp-section-desc">
                Secure your seat for intensive national medical & engineering batches for Academic Session 2026-27 with scholarship concessions up to 100% full tuition fee waiver.
              </p>
            </div>

            {/* Important Admissions Dates & Milestones Strip */}
            <div className="cp-admissions-dates-strip cp-reveal">
              <div className="cp-milestone-card">
                <div className="cp-milestone-date">📅 MARCH 31, 2026</div>
                <h4 className="cp-milestone-title">Phase 1 Application Deadline</h4>
                <p className="cp-milestone-desc">Early registration for batch allocation and scholarship test token booking.</p>
              </div>

              <div className="cp-milestone-card">
                <div className="cp-milestone-date">🎯 APRIL 12, 2026</div>
                <h4 className="cp-milestone-title">AITSE Scholarship Test</h4>
                <p className="cp-milestone-desc">All-India Talent & Scholarship Exam conducted online (CBT) and at campus centers.</p>
              </div>

              <div className="cp-milestone-card">
                <div className="cp-milestone-date">🏆 APRIL 18, 2026</div>
                <h4 className="cp-milestone-title">Merit List & Fee Concessions</h4>
                <p className="cp-milestone-desc">Individual scorecards released with fee concessions up to 100% full tuition waiver.</p>
              </div>

              <div className="cp-milestone-card">
                <div className="cp-milestone-date">🎓 JUNE 01, 2026</div>
                <h4 className="cp-milestone-title">Session Commencement</h4>
                <p className="cp-milestone-desc">Formal student induction, academic kit distribution, and commencement of classes.</p>
              </div>
            </div>

            {/* Quick Available Courses & Eligibility Ribbon */}
            {data.courses && data.courses.length > 0 && (
              <div className="cp-admissions-courses-ribbon cp-reveal">
                <div className="cp-ribbon-heading">
                  <span>Target Programmes & Academic Eligibility</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--cp-secondary)' }}>Academic Session 2026-27</span>
                </div>
                <div className="cp-ribbon-grid">
                  {data.courses.map((cr) => (
                    <div key={cr.id} className="cp-ribbon-item">
                      <div className="cp-ribbon-course-name">{cr.courseName}</div>
                      <div className="cp-ribbon-course-elig">
                        <strong>Eligibility:</strong> {cr.eligibility || 'Class 10 passed with 60%+ in Science & Maths'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="cp-admissions-campaign-grid">
              {/* 4-Step Process */}
              <div className="cp-admissions-timeline-col cp-reveal cp-delay-100">
                <h4 className="cp-admissions-col-heading">4-Step Admission Roadmap</h4>

                {(admissionProcessList.length > 0 ? admissionProcessList : [
                  { step: '01', title: 'Submit Online Enquiry', description: 'Complete our quick online registration form with student academic marks and stream preference.' },
                  { step: '02', title: 'Diagnostic Talent & Scholarship Test', description: 'Appear for the Annual Scholarship Test (AITSE) to evaluate baseline readiness and qualify for fee waivers.' },
                  { step: '03', title: 'Personal Academic Counseling', description: 'Meet with senior academic deans to map individual career targets and batch allocation.' },
                  { step: '04', title: 'Seat Allotment & Enrollment', description: 'Finalize document verification, collect curriculum kit, and attend the student induction program.' },
                ]).map((st, idx) => (
                  <div key={idx} className="cp-stage-item">
                    <div className="cp-stage-num">{st.step || (idx < 9 ? `0${idx + 1}` : `${idx + 1}`)}</div>
                    <div>
                      <h4 className="cp-stage-title">{st.title}</h4>
                      <p className="cp-stage-desc">{st.description || st.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Scholarship Tiers Card */}
              <div className="cp-scholarship-ledger-card cp-reveal cp-delay-200">
                <span className="cp-scholarship-eyebrow">Merit Concessions</span>
                <h4 className="cp-scholarship-title">Institutional Scholarship Tiers</h4>
                <p className="cp-scholarship-intro">
                  We reward academic dedication. Scholarship concessions apply directly to tuition fees for 2 full academic years.
                </p>

                <div>
                  {(scholarshipList.length > 0 ? scholarshipList : [
                    { name: 'State Ranker Scholarship', criteria: 'Top 50 Ranks in AITSE or 98%+ in 10th Board Exams', benefit: '100% Full Tuition Waiver for 2 Years' },
                    { name: 'Merit Excellence Scholarship', criteria: 'Ranks 51 - 150 in AITSE or 95% - 97.9% in 10th Board Exams', benefit: '75% Tuition Fee Waiver' },
                    { name: 'Academic Achiever Concession', criteria: 'Ranks 151 - 500 in AITSE or 90% - 94.9% in 10th Board Exams', benefit: '50% Tuition Fee Waiver' },
                    { name: 'Defense & Social Quota', criteria: 'Wards of Armed Forces / Police & Single Parent Girls', benefit: 'Special 25% Institutional Grant' },
                  ]).map((sc, idx) => (
                    <div key={idx} className="cp-tier-row">
                      <div>
                        <div className="cp-tier-name">{sc.name || sc.bracket || 'Merit Bracket'}</div>
                        <div className="cp-tier-criteria">{sc.criteria}</div>
                      </div>
                      <div className="cp-tier-benefit">{sc.benefit || sc.scholarship || 'Tuition Concession'}</div>
                    </div>
                  ))}
                </div>

                <div className="cp-scholarship-actions">
                  <button
                    onClick={() => setIsEnquiryModalOpen(true)}
                    className="cp-btn-scholarship-apply"
                  >
                    Apply for Scholarship Test →
                  </button>
                  <button
                    onClick={() => setIsBrochureModalOpen(true)}
                    className="cp-btn-scholarship-prospectus"
                  >
                    Prospectus & Syllabus
                  </button>
                </div>
              </div>
            </div>

            {/* Admissions Prominent Action Bar */}
            <div className="cp-admissions-cta-bar cp-reveal">
              <div className="cp-admissions-cta-text">
                <h4>Admissions Open for Academic Session 2026-27</h4>
                <p>Limited seats per batch to preserve our strict 1:25 faculty mentorship ratio.</p>
              </div>
              <div className="cp-admissions-cta-btns">
                <button
                  onClick={() => setIsEnquiryModalOpen(true)}
                  className="cp-btn-admissions-primary"
                >
                  Apply Online for 2026-27 →
                </button>
                {data.phone && (
                  <a href={`tel:${data.phone.replace(/[^0-9+]/g, '')}`} className="cp-btn-admissions-call">
                    📞 {data.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 13: OPEN CBT EXAMINATIONS
          ========================================================================= */}
      {data.hasOnlineExamModule && data.showOpenExamsSection !== false && data.openExams?.length > 0 && (
        <section id="exams" className="cp-section cp-section-white">
          <div className="cp-container">
            <div className="cp-section-header cp-reveal">
              <span className="cp-section-marker">10 / EXAMINATION PORTAL</span>
              <h3 className="cp-section-title">Open Mock & Scholarship Examinations</h3>
              <p className="cp-section-desc">
                Attempt these official timed CBT papers to benchmark your all-state rank under exact NTA exam conditions with instant diagnostic analytics.
              </p>
            </div>

            <div className="cp-exams-schedule-table">
              {data.openExams.map((test, idx) => (
                <div key={test.id} className={`cp-exam-voucher cp-reveal cp-delay-${(idx % 3) * 100 + 100}`}>
                  <div>
                    <div className="cp-voucher-tags">
                      <span className="cp-tag-status">● Free State-Level Mock Test</span>
                      <span className="cp-tag-category">{test.examName}</span>
                      <span className="cp-tag-category">NTA Pattern</span>
                    </div>

                    <h4 className="cp-voucher-title">{test.title}</h4>
                    {test.publicDescription && (
                      <p className="cp-voucher-desc">{test.publicDescription}</p>
                    )}

                    <div className="cp-voucher-specs">
                      <span>Duration: <strong>{test.durationMinutes} Mins</strong></span>
                      <span>Questions: <strong>{test.questionCount} Qs</strong></span>
                      <span>Marking: <strong>+{test.positiveMarks} / -{test.negativeMarks}</strong></span>
                      <span>Access Code: <code className="cp-voucher-code">{test.code}</code></span>
                    </div>
                  </div>

                  <div>
                    <a
                      href={test.cbtUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="cp-btn-launch-exam"
                    >
                      Start Examination →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 14: FACULTY CAREERS
          ========================================================================= */}
      {data.hasRecruitmentModule && data.showCareersSection !== false && data.jobPostings?.length > 0 && (
        <section id="careers" className="cp-section cp-section-slate">
          <div className="cp-container">
            <div className="cp-section-header cp-reveal">
              <span className="cp-section-marker">11 / FACULTY OPENINGS</span>
              <h3 className="cp-section-title">Faculty Careers & Openings</h3>
              <p className="cp-section-desc">We are always looking for passionate educators and academic leaders to mentor national rankers.</p>
            </div>

            <div className="cp-careers-notice-board">
              {data.jobPostings.map((job, idx) => (
                <div key={job.id} className={`cp-career-card cp-reveal cp-delay-${(idx % 3) * 100 + 100}`}>
                  <div>
                    <h4 className="cp-career-title">{job.jobTitle}</h4>
                    <div className="cp-career-badges">
                      <span className="cp-career-badge">Dept: {job.department}</span>
                      <span className="cp-career-badge">{job.employmentType}</span>
                      {job.minExperienceYrs > 0 && (
                        <span className="cp-career-badge">{job.minExperienceYrs}+ Yrs Exp</span>
                      )}
                      {job.location && (
                        <span className="cp-career-badge">{job.location}</span>
                      )}
                    </div>
                    <p className="cp-career-desc">{job.jobDescription}</p>
                    {job.requiredQualifications && (
                      <div className="cp-job-qual" style={{ marginTop: 12 }}>
                        <strong>Required:</strong> {job.requiredQualifications}
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
        <section id="gallery" className="cp-section cp-section-white">
          <div className="cp-container">
            <div className="cp-section-header cp-reveal">
              <span className="cp-section-marker">12 / CAMPUS GLIMPSES</span>
              <h3 className="cp-section-title">Campus Life & Photo Gallery</h3>
              <p className="cp-section-desc">Explore daily life, laboratories, convocation ceremonies, and sports activities.</p>
            </div>

            {/* Gallery Category Filter Tabs */}
            <div className="cp-gallery-tabs cp-reveal">
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

            <div className="cp-gallery-editorial-grid">
              {filteredGallery.map((item, idx) => (
                <div
                  key={item.id}
                  className={`cp-gallery-frame cp-reveal cp-delay-${(idx % 4) * 100 + 100}`}
                  onClick={() => setPreviewMedia(item)}
                >
                  <img src={item.mediaUrl} alt={item.title} className="cp-gallery-photo" />
                  <div className="cp-gallery-caption-overlay">
                    <span className="cp-badge-cat" style={{ width: 'fit-content', marginBottom: 6 }}>{item.category}</span>
                    <strong style={{ fontSize: 15 }}>{item.title}</strong>
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
        <section id="testimonials" className="cp-section cp-section-linen">
          <div className="cp-container">
            <div className="cp-section-header cp-reveal">
              <span className="cp-section-marker">13 / ALUMNI & PARENT PERSPECTIVES</span>
              <h3 className="cp-section-title">What They Say About Us</h3>
              <p className="cp-section-desc">Authentic experiences and reviews from our successful doctors, engineers, and their proud parents.</p>
            </div>

            <div className="cp-testimonial-wrap cp-reveal">
              {(() => {
                const t = data.testimonials[testimonialIndex] || data.testimonials[0];
                return (
                  <div className="cp-testimonial-card-editorial">
                    <div className="cp-test-stars">
                      {'★'.repeat(t.rating || 5)}
                    </div>
                    <p className="cp-test-quote">"{t.quote}"</p>
                    <div>
                      <h5 className="cp-test-author">{t.authorName}</h5>
                      <p className="cp-test-role">{t.authorRole}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Interactive Carousel Controls */}
              {data.testimonials.length > 1 && (
                <div className="cp-carousel-controls">
                  <button
                    className="cp-carousel-btn"
                    onClick={() => setTestimonialIndex((prev) => (prev === 0 ? data.testimonials.length - 1 : prev - 1))}
                    aria-label="Previous Testimonial"
                  >
                    ←
                  </button>

                  <div className="cp-carousel-dots">
                    {data.testimonials.map((_, idx) => (
                      <button
                        key={idx}
                        className={`cp-carousel-dot ${testimonialIndex === idx ? 'active' : ''}`}
                        onClick={() => setTestimonialIndex(idx)}
                        aria-label={`Slide ${idx + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    className="cp-carousel-btn"
                    onClick={() => setTestimonialIndex((prev) => (prev + 1) % data.testimonials.length)}
                    aria-label="Next Testimonial"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 17: FAQ ACCORDION, CONTACT & FINAL ADMISSION CTA
          ========================================================================= */}
      <section id="contact" className="cp-section cp-section-slate">
        <div className="cp-container">
          {/* FAQ Accordion */}
          {data.showFaqSection !== false && faqsList.length > 0 && (
            <div style={{ marginBottom: 70 }} className="cp-reveal">
              <div className="cp-section-header">
                <span className="cp-section-marker">14 / FREQUENTLY ASKED QUESTIONS</span>
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
          <div className="cp-section-header cp-reveal">
            <span className="cp-section-marker">15 / ADMISSIONS ENQUIRY DESK</span>
            <h3 className="cp-section-title">Apply for Admission or Enquire Today</h3>
            <p className="cp-section-desc">Our senior admissions counselors are ready to help you choose the right stream and answer all your queries.</p>
          </div>

          <div className="cp-contact-spread cp-reveal cp-delay-100">
            {/* Left: High-Conversion Admission Enquiry Form */}
            <div className="cp-desk-form-card">
              <h4 className="cp-desk-heading">
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
            <div className="cp-desk-info-card">
              <h4 style={{ fontSize: 19, fontWeight: 700, fontFamily: 'var(--cp-font-display)', color: 'var(--cp-text-ink)', margin: 0 }}>
                Campus Office & Helpline
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 14, color: 'var(--cp-text-body)' }}>
                {data.campusAddress && (
                  <div>
                    <strong style={{ color: 'var(--cp-text-ink)' }}>Campus Location:</strong>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--cp-text-muted)', lineHeight: 1.6 }}>{data.campusAddress}</p>
                  </div>
                )}

                {data.contactPhone && (
                  <div>
                    <strong style={{ color: 'var(--cp-text-ink)' }}>Admissions Hotline:</strong>{' '}
                    <a href={`tel:${data.contactPhone}`} style={{ color: 'var(--cp-primary)', fontWeight: 700, textDecoration: 'none' }}>
                      {data.contactPhone}
                    </a>
                  </div>
                )}

                {data.contactEmail && (
                  <div>
                    <strong style={{ color: 'var(--cp-text-ink)' }}>Email Desk:</strong>{' '}
                    <a href={`mailto:${data.contactEmail}`} style={{ color: 'var(--cp-primary)', fontWeight: 700, textDecoration: 'none' }}>
                      {data.contactEmail}
                    </a>
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
                  Chat with Counselor on WhatsApp
                </a>
              )}

              {/* Campus Location Map / Directions */}
              {data.googleMapEmbedUrl && (
                <div style={{ borderRadius: 'var(--cp-radius-sm)', overflow: 'hidden', height: 200, border: '1px solid var(--cp-border)' }}>
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
              <p style={{ color: '#94a3b8', lineHeight: 1.65, fontSize: 13, margin: '0 0 18px 0' }}>
                {data.mottoTagline || 'Shaping State Toppers & National Rankers in NEET, JEE & EAPCET with elite faculty mentorship and advanced computerized testing.'}
              </p>
              {data.accreditation && (
                <div style={{ display: 'inline-block', background: '#1e293b', border: '1px solid #334155', padding: '5px 12px', borderRadius: 8, fontSize: 11, color: '#e2e8f0', fontWeight: 600 }}>
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
                <li><button onClick={() => scrollToSection('faculty')}>Faculty Directory</button></li>
                <li><button onClick={() => scrollToSection('toppers')}>Hall of Fame</button></li>
                <li><button onClick={() => scrollToSection('admissions')}>Admissions & Scholarships</button></li>
              </ul>
            </div>

            {/* Col 3: Contact Details */}
            <div>
              <h5>Campus Office</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, color: '#94a3b8' }}>
                <p style={{ margin: 0, lineHeight: 1.6 }}>{data.campusAddress}</p>
                {data.contactPhone && (
                  <p style={{ margin: 0 }}>📞 {data.contactPhone}</p>
                )}
                {data.contactEmail && (
                  <p style={{ margin: 0 }}>✉ {data.contactEmail}</p>
                )}
              </div>
            </div>

            {/* Col 4: Platform & Administration */}
            <div>
              <h5>Administration</h5>
              <div style={{ background: '#1e293b', padding: 18, borderRadius: 16, border: '1px solid #334155' }}>
                <strong style={{ color: '#ffffff', fontSize: 13 }}>College Staff & Admin Portal</strong>
                <p style={{ color: '#94a3b8', fontSize: 12, margin: '6px 0 12px 0', lineHeight: 1.6 }}>
                  Sign in to access student admissions CRM, manage academic courses, update faculty, and publish updates.
                </p>
                <Link
                  to="/login"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#ffffff',
                    color: '#0b1a30',
                    fontWeight: 700,
                    fontSize: 12,
                    padding: '8px 16px',
                    borderRadius: 6,
                    textDecoration: 'none',
                  }}
                >
                  🔐 Staff / Admin Login →
                </Link>
              </div>
            </div>
          </div>

          <div className="cp-footer-bottom">
            <div>
              © {new Date().getFullYear()} {data.displayName || data.institute?.name}. All rights reserved.
            </div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <Link to="/login" style={{ color: '#cbd5e1', textDecoration: 'underline', fontSize: 12, fontWeight: 600 }}>
                🔐 Admin Login
              </Link>
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
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ fontSize: 52, marginBottom: 14 }}>🎉</div>
                  <h4 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 8px 0', color: '#065f46' }}>Enquiry Submitted!</h4>
                  <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.6 }}>
                    Thank you! Our admission counselor will get in touch with you at <strong>{enquiryForm.phone}</strong> shortly.
                  </p>
                  <button
                    onClick={() => {
                      setIsEnquiryModalOpen(false);
                      setEnquirySuccess(false);
                    }}
                    className="cp-btn-cta"
                    style={{ marginTop: 22 }}
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
                        placeholder="10-digit mobile"
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
                    style={{ marginTop: 12 }}
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
                <span style={{ fontSize: 13, color: 'var(--cp-primary)', fontWeight: 800 }}>
                  Department of {selectedJob.department}
                </span>
              </div>
              <button className="cp-modal-close" onClick={() => setSelectedJob(null)}>✕</button>
            </div>
            <div className="cp-modal-body">
              {jobSuccess ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ fontSize: 52, marginBottom: 14 }}>📄</div>
                  <h4 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 8px 0', color: '#065f46' }}>Application Submitted!</h4>
                  <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.6 }}>
                    Your application and resume have been securely forwarded to the academic selection board. Shortlisted candidates will be invited for interview and demo lecture.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedJob(null);
                      setJobSuccess(false);
                    }}
                    className="cp-btn-cta"
                    style={{ marginTop: 22 }}
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
                      style={{ padding: 10 }}
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
            <div className="cp-modal-body" style={{ textAlign: 'center', padding: '34px 24px' }}>
              <div style={{ fontSize: 56, marginBottom: 14 }}>📘</div>
              <h4 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 10px 0', color: 'var(--cp-dark)' }}>
                {data.displayName} Academic Guide
              </h4>
              <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.65, maxWidth: 440, margin: '0 auto 26px' }}>
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
          <div style={{ maxWidth: 880, width: '100%', background: '#000', borderRadius: 24, overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ position: 'relative' }}>
              <img
                src={previewMedia.mediaUrl}
                alt={previewMedia.title}
                style={{ width: '100%', maxHeight: '75vh', objectFit: 'contain', display: 'block' }}
              />
              <button
                onClick={() => setPreviewMedia(null)}
                style={{ position: 'absolute', top: 18, right: 18, background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none', width: 38, height: 38, borderRadius: '50%', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '18px 26px', background: '#0b132b', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: 16 }}>{previewMedia.title}</strong>
                <span style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginTop: 3 }}>Category: {previewMedia.category}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
