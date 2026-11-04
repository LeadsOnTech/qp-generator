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


// Course Domain Thumbnails matching the reference design
function getCourseThumbnail(c, idx) {
  const cat = (c?.category || '').toUpperCase();
  const name = (c?.courseName || '').toLowerCase();
  if (name.includes('medical') || cat === 'MEDICAL') {
    if (name.includes('repeater') || name.includes('dropper') || name.includes('long-term')) {
      return 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=85';
    }
    return 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=85';
  }
  if (name.includes('engineering') || name.includes('jee') || cat === 'ENGINEERING') {
    return 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=85';
  }
  if (name.includes('foundation') || cat === 'FOUNDATION') {
    return 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=85';
  }
  const defaults = [
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=85',
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=85',
    'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=85',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=85',
  ];
  return defaults[idx % defaults.length];
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
            <span style={{ opacity: 0.85, fontWeight: 600 }}>QuestionsStudio SaaS</span>
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
              className="cp-gold-pill-btn"
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

            <div style={{ paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
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
            </div>
          </div>
        </>
      )}

      {/* =========================================================================
          SECTION 2: FULL-BLEED CINEMATIC HERO BANNER
          ========================================================================= */}
      <section id="home" className="cp-ref-hero">
        <div className="cp-container">
          <div className="cp-ref-hero-grid">
            <div className="cp-hero-content cp-reveal">
              <div className="cp-ref-hero-badge">
                <span>✓ {data.accreditation || 'BIEAP Recognized & CBSE Affiliated'}</span>
              </div>

              <h2 className="cp-ref-hero-title">
                Empowering Future<br />
                Doctors & Engineers<br />
                with <span className="cp-gold-text">Elite Mentorship</span>
              </h2>
              <p className="cp-ref-hero-subtitle">
                {data.heroSubtitle || "Andhra Pradesh's Premier Residential Academy for NEET-UG, JEE Advanced & Intermediate Excellence"}
              </p>

              <div className="cp-ref-hero-actions">
                <button onClick={() => setIsEnquiryModalOpen(true)} className="cp-gold-pill-btn">
                  {data.heroCtaText || 'Apply for Admission 2026-27'} →
                </button>
                <button
                  onClick={() => scrollToSection('courses')}
                  className="cp-outline-pill-btn"
                  style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.08)' }}
                >
                  Explore Courses
                </button>
                {data.hasOnlineExamModule && data.openExams?.length > 0 && (
                  <button
                    onClick={() => scrollToSection('exams')}
                    className="cp-navy-pill-btn"
                    style={{ background: '#0284c7', borderColor: '#0284c7' }}
                  >
                    Open Mock Tests ({data.openExams.length})
                  </button>
                )}
              </div>
            </div>

            <div className="cp-hero-visual cp-reveal cp-delay-200">
              <div className="cp-ref-hero-img-frame">
                <img
                  src={data.heroBannerUrl || 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1600&q=85'}
                  alt="Campus"
                  className="cp-ref-hero-img"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="cp-ref-hero-curve" />
      </section>

      {/* =========================================================================
          SECTION 3: INSTITUTIONAL ACHIEVEMENTS (STATS STRIP)
          ========================================================================= */}
      {data.showStatsSection !== false && (
        <div className="cp-ref-stats-bar" ref={statsRef}>
          <div className="cp-container">
            <div className="cp-ref-stats-card cp-reveal">
              <div className="cp-ref-stat-item">
                <div className="cp-ref-stat-icon">🎓</div>
                <div>
                  <div className="cp-ref-stat-num">
                    <AnimatedCounter targetValue={statsList[0]?.value || '18,500+'} isVisible={statsVisible} />
                  </div>
                  <div className="cp-ref-stat-lbl">{statsList[0]?.label || 'Students Mentored'}</div>
                </div>
              </div>

              <div className="cp-ref-stat-item">
                <div className="cp-ref-stat-icon">🏅</div>
                <div>
                  <div className="cp-ref-stat-num">
                    <AnimatedCounter targetValue={statsList[1]?.value || '3,840+'} isVisible={statsVisible} />
                  </div>
                  <div className="cp-ref-stat-lbl">{statsList[1]?.label || 'NEET & JEE Selections'}</div>
                </div>
              </div>

              <div className="cp-ref-stat-item">
                <div className="cp-ref-stat-icon">🏆</div>
                <div>
                  <div className="cp-ref-stat-num">
                    <AnimatedCounter targetValue={statsList[2]?.value || '62'} isVisible={statsVisible} />
                  </div>
                  <div className="cp-ref-stat-lbl">{statsList[2]?.label || 'State Top 10 Ranks'}</div>
                </div>
              </div>

              <div className="cp-ref-stat-item">
                <div className="cp-ref-stat-icon">🌟</div>
                <div>
                  <div className="cp-ref-stat-num">
                    <AnimatedCounter targetValue={statsList[3]?.value || '140+'} isVisible={statsVisible} />
                  </div>
                  <div className="cp-ref-stat-lbl">{statsList[3]?.label || 'Olympiad & KVPY Scholars'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 4: ABOUT OUR INSTITUTION (14+ YEARS OF ACADEMIC INTEGRITY)
          ========================================================================= */}
      {data.showAboutSection !== false && (
        <section id="about" className="cp-section cp-section-white">
          <div className="cp-container">
            <div className="cp-ref-about-grid">
              <div className="cp-reveal cp-delay-100">
                <h3 className="cp-ref-about-title">
                  14+ Years of Academic Integrity &amp; Unmatched Results
                </h3>
                <p className="cp-ref-about-desc">
                  {data.aboutText ||
                    'Trusted by thousands of students and parents, Andhra Inspire Academy combines rigorous academics, expert mentorship and a results-driven culture to prepare students for NEET, JEE and competitive examinations.'}
                </p>

                <div className="cp-ref-checklist-grid">
                  <div className="cp-ref-check-item">
                    <span className="cp-ref-check-icon">✓</span>
                    <span>Result-focused academic system</span>
                  </div>
                  <div className="cp-ref-check-item">
                    <span className="cp-ref-check-icon">✓</span>
                    <span>Individual student mentoring</span>
                  </div>
                  <div className="cp-ref-check-item">
                    <span className="cp-ref-check-icon">✓</span>
                    <span>Experienced &amp; dedicated faculty</span>
                  </div>
                  <div className="cp-ref-check-item">
                    <span className="cp-ref-check-icon">✓</span>
                    <span>Strong conceptual foundation</span>
                  </div>
                  <div className="cp-ref-check-item">
                    <span className="cp-ref-check-icon">✓</span>
                    <span>Regular assessments &amp; analysis</span>
                  </div>
                  <div className="cp-ref-check-item">
                    <span className="cp-ref-check-icon">✓</span>
                    <span>Proven track record (14+ yrs)</span>
                  </div>
                </div>
              </div>

              <div className="cp-reveal cp-delay-200">
                <div className="cp-ref-about-img-frame">
                  <img
                    src="https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=85"
                    alt="Classroom Students"
                    className="cp-ref-about-img"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 5: DIRECTOR AND LEADERSHIP MESSAGE
          ========================================================================= */}
      {data.showDirectorSection !== false && data.directorName && (
        <section className="cp-section cp-section-white" style={{ paddingTop: 0 }}>
          <div className="cp-container">
            <div className="cp-ref-director-panel cp-reveal">
              <div className="cp-ref-director-quote-mark">”</div>

              <div className="cp-ref-director-photo-wrap">
                <img
                  src={data.directorPhotoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=85'}
                  alt={data.directorName}
                  className="cp-ref-director-photo"
                />
                <h4 className="cp-ref-director-name">{data.directorName}</h4>
                <p className="cp-ref-director-role">{data.directorTitle || 'Founder, Chairman & Academic Director'}</p>
                {data.directorQualifications && (
                  <p className="cp-ref-director-qual">{data.directorQualifications}</p>
                )}
              </div>

              <div>
                <div className="cp-ref-leadership-badge">
                  <span>🎓 LEADERSHIP MESSAGE</span>
                </div>
                <h3 className="cp-ref-director-headline">
                  "Committed to Nurturing Every Student's Highest Potential"
                </h3>
                <p className="cp-ref-director-quote">
                  "{data.directorMessage ||
                    'Success in competitive examinations like NEET and JEE is never an accident. It is the natural consequence of daily conceptual clarity, targeted practice, and fearless self-correction. At Andhra Inspire Academy, every student is known personally, guided patiently, and challenged systematically to realize their supreme potential.'}"
                </p>
                <div className="cp-ref-director-signature">K. S. R. Murthy</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 6: WHY CHOOSE OUR COLLEGE?
          ========================================================================= */}
      {data.showWhyUsSection !== false && (
        <section id="whyus" className="cp-section" style={{ background: '#fcfbf7' }}>
          <div className="cp-container">
            <div className="cp-section-header cp-reveal" style={{ textAlign: 'center', marginBottom: 44 }}>
              <h3 className="cp-section-title" style={{ fontSize: 32 }}>Why Choose Our College?</h3>
              <p className="cp-section-desc" style={{ maxWidth: 640, margin: '0 auto' }}>
                A result-oriented academic ecosystem designed for serious aspirants.
              </p>
            </div>

            <div className="cp-ref-whyus-grid">
              {[
                { title: 'Experienced Faculty', desc: 'Subject experts with proven mentoring excellence.', icon: '👨‍🏫' },
                { title: 'Personalised Attention', desc: 'Individual guidance and regular performance tracking.', icon: '🎯' },
                { title: 'Structured Academics', desc: 'Concept-based teaching with systematic revision and tests.', icon: '📚' },
                { title: 'Competitive Focus', desc: 'Integrated NEET, JEE & Olympiad preparation.', icon: '🏆' },
                { title: 'Holistic Development', desc: 'Academics, discipline and character building.', icon: '🌱' },
                { title: 'Safe & Supportive Campus', desc: 'A focused, student-friendly residential environment.', icon: '🛡️' },
              ].map((item, idx) => (
                <div key={idx} className={`cp-ref-whyus-card cp-reveal cp-delay-${(idx % 3) * 100 + 100}`}>
                  <div className="cp-ref-whyus-icon">{item.icon}</div>
                  <h4 className="cp-ref-whyus-title">{item.title}</h4>
                  <p className="cp-ref-whyus-desc">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 7: COURSES OFFERED
          ========================================================================= */}
      {data.showCoursesSection !== false && data.courses?.length > 0 && (
        <section id="courses" className="cp-section cp-section-white">
          <div className="cp-container">
            <div className="cp-section-header cp-reveal" style={{ textAlign: 'center', marginBottom: 44 }}>
              <h3 className="cp-section-title" style={{ fontSize: 32 }}>Courses Offered</h3>
              <p className="cp-section-desc" style={{ maxWidth: 640, margin: '0 auto' }}>
                Comprehensive academic programmes for intermediate and competitive examinations.
              </p>
            </div>

            <div className="cp-ref-courses-grid">
              {data.courses.map((c, idx) => (
                <div key={c.id} className={`cp-ref-course-card cp-reveal cp-delay-${(idx % 2) * 100 + 100}`}>
                  <div className="cp-ref-course-thumb-wrap">
                    <img
                      src={getCourseThumbnail(c, idx)}
                      alt={c.courseName}
                      className="cp-ref-course-thumb"
                    />
                  </div>
                  <div className="cp-ref-course-content">
                    <div>
                      <h4 className="cp-ref-course-title">{c.courseName}</h4>
                      <div className="cp-ref-course-class">
                        {c.duration ? c.duration : 'Classes 11 & 12'}
                      </div>
                      <p className="cp-ref-course-desc">{c.description}</p>
                    </div>

                    <div className="cp-ref-course-actions">
                      <button
                        onClick={() => openCourseEnquiry(c.courseName)}
                        className="cp-navy-pill-btn"
                      >
                        Enquire Now →
                      </button>
                      <button
                        onClick={() => setIsBrochureModalOpen(true)}
                        className="cp-outline-pill-btn"
                      >
                        View Details
                      </button>
                    </div>
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
        <section id="faculty" className="cp-section" style={{ background: '#fcfbf7' }}>
          <div className="cp-container">
            <div className="cp-section-header cp-reveal" style={{ textAlign: 'center', marginBottom: 44 }}>
              <h3 className="cp-section-title" style={{ fontSize: 32 }}>Faculty and Academic Leadership</h3>
              <p className="cp-section-desc" style={{ maxWidth: 640, margin: '0 auto' }}>
                A team of experienced educators dedicated to student success.
              </p>
            </div>

            <div className="cp-ref-faculty-grid">
              {data.faculties.map((f, idx) => (
                <div key={f.id} className={`cp-ref-faculty-card cp-reveal cp-delay-${(idx % 4) * 100 + 100}`}>
                  <img
                    src={f.photoUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80'}
                    alt={f.name}
                    className="cp-ref-faculty-avatar"
                  />
                  <h4 className="cp-ref-faculty-name">{f.name}</h4>
                  <p className="cp-ref-faculty-role">{f.designation}</p>
                  <p className="cp-ref-faculty-exp">{f.experienceYrs ? `${f.experienceYrs}+ Years Experience` : f.qualification}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 9: TEACHING METHODOLOGY & RIGOUR
          ========================================================================= */}
      {data.showMethodologySection !== false && (
        <section id="methodology" className="cp-ref-methodology-section">
          <div className="cp-container">
            <div className="cp-section-header cp-dark-header cp-reveal" style={{ textAlign: 'center', marginBottom: 30 }}>
              <h3 className="cp-section-title" style={{ color: '#ffffff', fontSize: 32 }}>
                Teaching Methodology &amp; Rigour
              </h3>
              <p className="cp-section-desc" style={{ color: '#cbd5e1', maxWidth: 640, margin: '0 auto' }}>
                A structured, test-driven and student-centric learning system.
              </p>
            </div>

            <div className="cp-ref-methodology-flow cp-reveal">
              {[
                { title: 'Conceptual Learning', icon: '📖' },
                { title: 'Daily Practice', icon: '📝' },
                { title: 'Weekly Tests', icon: '📑' },
                { title: 'Performance Analysis', icon: '📊' },
                { title: 'Doubt Clearing', icon: '👥' },
              ].map((step, idx) => (
                <div key={idx} style={{ display: 'contents' }}>
                  <div className="cp-ref-method-node">
                    <div className="cp-ref-method-icon">{step.icon}</div>
                    <div className="cp-ref-method-title">{step.title}</div>
                  </div>
                  {idx < 4 && <div className="cp-ref-method-arrow">→</div>}
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
            <div className="cp-section-header cp-reveal" style={{ textAlign: 'center', marginBottom: 44 }}>
              <h3 className="cp-section-title" style={{ fontSize: 32 }}>Campus &amp; Infrastructure</h3>
              <p className="cp-section-desc" style={{ maxWidth: 640, margin: '0 auto' }}>
                A modern learning environment with modern facilities.
              </p>
            </div>

            <div className="cp-ref-campus-grid">
              {data.facilities.map((fac, idx) => (
                <div key={fac.id} className={`cp-ref-campus-card cp-reveal cp-delay-${(idx % 4) * 100 + 100}`}>
                  <img
                    src={fac.photoUrl || 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=600&q=85'}
                    alt={fac.title}
                    className="cp-ref-campus-img"
                  />
                  <div className="cp-ref-campus-info">
                    <h4 className="cp-ref-campus-title">{fac.title}</h4>
                    <p className="cp-ref-campus-desc">{fac.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 11: STUDENT ACHIEVERS AND RANKS
          ========================================================================= */}
      {data.showResultsSection !== false && data.achievements?.length > 0 && (
        <section id="toppers" className="cp-ref-achievers-section">
          <div className="cp-container">
            <div className="cp-section-header cp-dark-header cp-reveal" style={{ textAlign: 'center', marginBottom: 44 }}>
              <h3 className="cp-section-title" style={{ color: '#ffffff', fontSize: 32 }}>
                Student Achievers &amp; Ranks
              </h3>
              <p className="cp-section-desc" style={{ color: '#cbd5e1', maxWidth: 640, margin: '0 auto' }}>
                Celebrating our outstanding students and their remarkable achievements.
              </p>
            </div>

            <div className="cp-ref-achievers-grid">
              {data.achievements.map((a, idx) => (
                <div key={a.id} className={`cp-ref-achiever-card cp-reveal cp-delay-${(idx % 4) * 100 + 100}`}>
                  <div className="cp-ref-achiever-avatar-wrap">
                    <img
                      src={a.photoUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=85'}
                      alt={a.studentName}
                      className="cp-ref-achiever-avatar"
                    />
                  </div>
                  <h4 className="cp-ref-achiever-name">{a.studentName}</h4>
                  <div className="cp-ref-achiever-exam">{a.examOrAward}</div>
                  <div className="cp-ref-achiever-rank">{a.rankOrScore}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 12: ADMISSIONS AND MERIT SCHOLARSHIPS
          ========================================================================= */}
      {data.showAdmissionsSection !== false && (
        <section id="admissions" className="cp-ref-admissions-section">
          <div className="cp-container">
            <div className="cp-section-header cp-reveal" style={{ textAlign: 'center', marginBottom: 44 }}>
              <div className="cp-ref-admissions-pill-badge">ADMISSIONS 2026-27</div>
              <h3 className="cp-section-title" style={{ fontSize: 32 }}>Admissions &amp; Merit Scholarships</h3>
              <p className="cp-section-desc" style={{ maxWidth: 640, margin: '0 auto' }}>
                Be a part of Andhra Inspire Academy and take the next step towards your dream career.
              </p>
            </div>

            <div className="cp-ref-admissions-grid">
              {/* Left Column: 4 Admission Highlights */}
              <div className="cp-ref-admission-feature-list cp-reveal cp-delay-100">
                <div className="cp-ref-adm-feature-item">
                  <div className="cp-ref-adm-feature-icon">🎓</div>
                  <div>
                    <h4 className="cp-ref-adm-feature-title">Wide Range of Courses</h4>
                    <p className="cp-ref-adm-feature-desc">Intermediate, NEET, JEE &amp; Foundation.</p>
                  </div>
                </div>

                <div className="cp-ref-adm-feature-item">
                  <div className="cp-ref-adm-feature-icon">🏅</div>
                  <div>
                    <h4 className="cp-ref-adm-feature-title">Merit-Based Scholarships</h4>
                    <p className="cp-ref-adm-feature-desc">Rewarding academic excellence.</p>
                  </div>
                </div>

                <div className="cp-ref-adm-feature-item">
                  <div className="cp-ref-adm-feature-icon">📝</div>
                  <div>
                    <h4 className="cp-ref-adm-feature-title">Simple Admission Process</h4>
                    <p className="cp-ref-adm-feature-desc">Inquiry → Counseling → Admission.</p>
                  </div>
                </div>

                <div className="cp-ref-adm-feature-item">
                  <div className="cp-ref-adm-feature-icon">⏳</div>
                  <div>
                    <h4 className="cp-ref-adm-feature-title">Limited Seats</h4>
                    <p className="cp-ref-adm-feature-desc">Apply early to secure your seat.</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Important Dates Card */}
              <div className="cp-ref-dates-card cp-reveal cp-delay-200">
                <h4 className="cp-ref-dates-title">📅 Important Dates</h4>

                <div className="cp-ref-date-row">
                  <span className="cp-ref-date-lbl">Application Start:</span>
                  <span className="cp-ref-date-val">15 January 2026</span>
                </div>
                <div className="cp-ref-date-row">
                  <span className="cp-ref-date-lbl">Last Date to Apply:</span>
                  <span className="cp-ref-date-val">30 April 2026</span>
                </div>
                <div className="cp-ref-date-row">
                  <span className="cp-ref-date-lbl">Entrance Test:</span>
                  <span className="cp-ref-date-val">10 May 2026</span>
                </div>
                <div className="cp-ref-date-row">
                  <span className="cp-ref-date-lbl">Result &amp; Counseling:</span>
                  <span className="cp-ref-date-val">18 May 2026</span>
                </div>

                <button
                  onClick={() => setIsEnquiryModalOpen(true)}
                  className="cp-gold-pill-btn"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
                >
                  Apply for Admission →
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 13: OPEN CBT EXAMINATIONS (MODULAR SAAS GUARD)
          ========================================================================= */}
      {data.hasOnlineExamModule && data.showOpenExamsSection !== false && data.openExams?.length > 0 && (
        <section id="exams" className="cp-section cp-section-white">
          <div className="cp-container">
            <div className="cp-section-header cp-reveal" style={{ textAlign: 'center', marginBottom: 44 }}>
              <h3 className="cp-section-title" style={{ fontSize: 32 }}>Open Mock &amp; Scholarship Examinations</h3>
              <p className="cp-section-desc" style={{ maxWidth: 640, margin: '0 auto' }}>
                Attempt these official timed CBT papers to benchmark your all-state rank under exact NTA exam conditions.
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
                      className="cp-navy-pill-btn"
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
          SECTION 14: FACULTY CAREERS AND OPENINGS
          ========================================================================= */}
      {data.hasRecruitmentModule && data.showCareersSection !== false && (
        <section id="careers" className="cp-section cp-section-white">
          <div className="cp-container">
            <div className="cp-section-header cp-reveal" style={{ textAlign: 'center', marginBottom: 44 }}>
              <h3 className="cp-section-title" style={{ fontSize: 32 }}>Faculty Careers &amp; Openings</h3>
              <p className="cp-section-desc" style={{ maxWidth: 640, margin: '0 auto' }}>
                Join our academic team and make a difference in student lives.
              </p>
            </div>

            <div className="cp-ref-careers-grid">
              {(data.jobPostings && data.jobPostings.length > 0 ? data.jobPostings : [
                { id: '1', jobTitle: 'Senior Mathematics Faculty', requiredQualifications: 'M.Sc., B.Ed.', minExperienceYrs: 5, location: 'Vijayawada', applicationDeadline: '2026-04-30' },
                { id: '2', jobTitle: 'NEET/JEE Chemistry Faculty', requiredQualifications: 'M.Sc., Ph.D. / Net Pref.', minExperienceYrs: 3, location: 'Vijayawada', applicationDeadline: '2026-04-30' },
              ]).map((job, idx) => (
                <div key={job.id} className={`cp-ref-career-card cp-reveal cp-delay-${idx * 100 + 100}`}>
                  <h4 className="cp-ref-career-title">{job.jobTitle}</h4>
                  <div className="cp-ref-career-meta-list">
                    <div><strong>Qualification:</strong> {job.requiredQualifications}</div>
                    <div><strong>Experience:</strong> {job.minExperienceYrs}+ Years</div>
                    <div><strong>Location:</strong> {job.location || 'Vijayawada'}</div>
                    <div><strong>Last Date:</strong> 30 April 2026</div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedJob(job);
                      setJobSuccess(false);
                      setJobError(null);
                    }}
                    className="cp-navy-pill-btn"
                  >
                    Apply Now →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 15: CAMPUS LIFE AND PHOTO GALLERY
          ========================================================================= */}
      {data.showGallerySection !== false && (
        <section id="gallery" className="cp-section" style={{ background: '#fcfbf7' }}>
          <div className="cp-container">
            <div className="cp-section-header cp-reveal" style={{ textAlign: 'center', marginBottom: 30 }}>
              <h3 className="cp-section-title" style={{ fontSize: 32 }}>Campus Life &amp; Photo Gallery</h3>
              <p className="cp-section-desc" style={{ maxWidth: 640, margin: '0 auto' }}>
                A glimpse of our academic and co-curricular activities.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="cp-ref-gallery-filters cp-reveal">
              {['ALL', 'ACADEMICS', 'EVENTS', 'SPORTS', 'CAMPUS'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setGalleryCategory(cat)}
                  className={`cp-ref-filter-pill ${galleryCategory === cat ? 'active' : ''}`}
                >
                  {cat === 'ALL' ? 'All' : cat.charAt(0) + cat.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            <div className="cp-ref-gallery-grid cp-reveal">
              {(filteredGallery.length > 0 ? filteredGallery : [
                { id: '1', mediaUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=600&q=85', title: 'Campus Lawn' },
                { id: '2', mediaUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=85', title: 'Chemistry Lab' },
                { id: '3', mediaUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=85', title: 'Interactive Learning' },
                { id: '4', mediaUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=600&q=85', title: 'Athletics & Sports' },
                { id: '5', mediaUrl: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=600&q=85', title: 'Convocation' },
              ]).slice(0, 5).map((item, idx) => (
                <img
                  key={item.id || idx}
                  src={item.mediaUrl}
                  alt={item.title}
                  className="cp-ref-gallery-img"
                  onClick={() => setPreviewMedia(item)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 16: PARENT AND STUDENT TESTIMONIALS
          ========================================================================= */}
      {data.showTestimonialsSection !== false && (
        <section id="testimonials" className="cp-section cp-section-white">
          <div className="cp-container">
            <div className="cp-section-header cp-reveal" style={{ textAlign: 'center', marginBottom: 44 }}>
              <h3 className="cp-section-title" style={{ fontSize: 32 }}>What They Say About Us</h3>
              <p className="cp-section-desc" style={{ maxWidth: 640, margin: '0 auto' }}>
                Trusted by students and parents for quality education and consistent results.
              </p>
            </div>

            <div className="cp-ref-testimonial-container cp-reveal">
              <button
                className="cp-ref-nav-arrow"
                onClick={() => setTestimonialIndex((prev) => (prev === 0 ? (data.testimonials?.length || 3) - 1 : prev - 1))}
                aria-label="Previous Testimonial"
              >
                ‹
              </button>

              <div className="cp-ref-testimonial-card">
                <div className="cp-ref-stars">★★★★★</div>
                <p className="cp-ref-testimonial-quote">
                  "{data.testimonials?.[testimonialIndex]?.quote ||
                    'The disciplined academic environment and personal attention at Andhra Inspire Academy helped my son develop confidence and secure a top rank in NEET. The faculty are truly committed to each student.'}"
                </p>
                <h5 className="cp-ref-testimonial-author">
                  {data.testimonials?.[testimonialIndex]?.authorName || 'V. Sambasiva Rao'}
                </h5>
                <p className="cp-ref-testimonial-role">
                  {data.testimonials?.[testimonialIndex]?.authorRole || 'Parent of Sneha Latha (State 1st Rank)'}
                </p>
              </div>

              <button
                className="cp-ref-nav-arrow"
                onClick={() => setTestimonialIndex((prev) => (prev + 1) % (data.testimonials?.length || 3))}
                aria-label="Next Testimonial"
              >
                ›
              </button>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 17: FREQUENTLY ASKED QUESTIONS
          ========================================================================= */}
      {data.showFaqSection !== false && (
        <section id="faqs" className="cp-section" style={{ background: '#fcfbf7' }}>
          <div className="cp-container">
            <div className="cp-section-header cp-reveal" style={{ textAlign: 'center', marginBottom: 44 }}>
              <h3 className="cp-section-title" style={{ fontSize: 32 }}>Frequently Asked Questions</h3>
              <p className="cp-section-desc" style={{ maxWidth: 640, margin: '0 auto' }}>
                Quick answers to common questions about admissions, courses and campus.
              </p>
            </div>

            <div className="cp-ref-faqs-container cp-reveal">
              {[
                {
                  question: 'What courses are offered at Andhra Inspire Academy?',
                  answer: 'We offer 2-Year Intensive Medical (NEET-UG), 2-Year Intensive Engineering (IIT-JEE Main & Advanced), 4-Year Foundation for Classes 8, 9 & 10, and Long-Term Repeater batches.'
                },
                {
                  question: 'Is the college residential or day-scholar?',
                  answer: 'We provide both comprehensive residential facilities with AC hostels and strict study hours, as well as day-scholar programs with supervised study hours.'
                },
                {
                  question: 'How are the classes conducted?',
                  answer: 'Classes combine deep concept lectures with daily practice worksheets (DPPs), error analysis sessions, and weekly simulated computer-based tests (CBT).'
                },
                {
                  question: 'Are there scholarships for meritorious students?',
                  answer: 'Yes! We offer merit scholarships up to 100% full tuition fee waivers based on performance in our annual scholarship test (AITSE) and board exam scores.'
                },
                {
                  question: 'How can I apply for admission?',
                  answer: 'You can submit the online enquiry form on this website, call our admissions helpline directly, or visit our campus at Benz Circle, Vijayawada.'
                },
                {
                  question: 'Can I appear for the entrance test from outside the city?',
                  answer: 'Yes, our talent search exam (AITSE) can be taken online in computer-based test (CBT) format from any location with a laptop or desktop computer.'
                },
              ].map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div key={idx} className={`cp-ref-faq-item ${isOpen ? 'open' : ''}`}>
                    <div
                      className="cp-ref-faq-question"
                      onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                    >
                      <span>{faq.question}</span>
                      <span style={{ fontSize: 13, color: '#94a3b8' }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                    {isOpen && (
                      <div className="cp-ref-faq-answer">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 18: APPLY FOR ADMISSION OR ENQUIRE TODAY
          ========================================================================= */}
      <section id="contact" className="cp-section cp-section-white">
        <div className="cp-container">
          <div className="cp-section-header cp-reveal" style={{ textAlign: 'center', marginBottom: 44 }}>
            <h3 className="cp-section-title" style={{ fontSize: 32 }}>Apply for Admission or Enquire Today</h3>
            <p className="cp-section-desc" style={{ maxWidth: 640, margin: '0 auto' }}>
              Get in touch with our admissions team for course details, eligibility and application process.
            </p>
          </div>

          <div className="cp-ref-contact-grid cp-reveal">
            {/* Left Column: Form */}
            <div className="cp-ref-form-card">
              {enquirySuccess && (
                <div className="cp-alert-success" style={{ marginBottom: 20 }}>
                  ✓ Thank you! Your enquiry has been received. Our admissions team will contact you shortly.
                </div>
              )}
              {enquiryError && (
                <div className="cp-alert-error" style={{ marginBottom: 20 }}>
                  {enquiryError}
                </div>
              )}

              <form onSubmit={handleEnquirySubmit}>
                <div className="cp-form-row">
                  <div>
                    <label className="cp-label">Student Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Student full name"
                      value={enquiryForm.studentName}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, studentName: e.target.value })}
                      className="cp-input"
                    />
                  </div>
                  <div>
                    <label className="cp-label">Parent Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Parent / Guardian name"
                      value={enquiryForm.parentName}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, parentName: e.target.value })}
                      className="cp-input"
                    />
                  </div>
                </div>

                <div className="cp-form-row">
                  <div>
                    <label className="cp-label">Course Seeking Admission *</label>
                    <select
                      required
                      value={enquiryForm.courseOfInterest}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, courseOfInterest: e.target.value })}
                      className="cp-select"
                    >
                      <option value="">Select Target Course</option>
                      <option value="NEET 2-Year Intensive Medical Batch">NEET 2-Year Intensive Medical Batch</option>
                      <option value="IIT-JEE Main & Advanced Elite Batch">IIT-JEE Main & Advanced Elite Batch</option>
                      <option value="4-Year IIT/NEET Foundation Program">4-Year IIT/NEET Foundation Program</option>
                      <option value="NEET Long-Term Achievers Batch (Repeater)">NEET Long-Term Achievers Batch (Repeater)</option>
                    </select>
                  </div>
                  <div>
                    <label className="cp-label">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="10-digit mobile number"
                      value={enquiryForm.phone}
                      onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                      className="cp-input"
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="cp-label">Email Address</label>
                  <input
                    type="email"
                    placeholder="student@example.com"
                    value={enquiryForm.email}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                    className="cp-input"
                  />
                </div>

                <div style={{ marginBottom: 22 }}>
                  <label className="cp-label">Message (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Any specific questions about hostel, batch timings, or syllabus..."
                    value={enquiryForm.message}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                    className="cp-textarea"
                  />
                </div>

                <button
                  type="submit"
                  disabled={enquirySubmitting}
                  className="cp-navy-pill-btn"
                  style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 14 }}
                >
                  {enquirySubmitting ? 'Submitting Enquiry...' : 'SUBMIT INQUIRY →'}
                </button>
              </form>
            </div>

            {/* Right Column: Contact Details + Map Snapshot */}
            <div>
              <div className="cp-ref-contact-info-card">
                <div className="cp-ref-info-row">
                  <div className="cp-ref-info-icon">📞</div>
                  <div>
                    <div className="cp-ref-info-lbl">Call Us</div>
                    <div className="cp-ref-info-val">
                      <a href={`tel:${data.contactPhone || '+918669212345'}`}>{data.contactPhone || '+91 86692 12345'}</a>
                    </div>
                  </div>
                </div>

                <div className="cp-ref-info-row">
                  <div className="cp-ref-info-icon">✉</div>
                  <div>
                    <div className="cp-ref-info-lbl">Email Address</div>
                    <div className="cp-ref-info-val">
                      <a href={`mailto:${data.contactEmail || 'admissions@andhrainspire.edu.in'}`}>{data.contactEmail || 'admissions@andhrainspire.edu.in'}</a>
                    </div>
                  </div>
                </div>

                <div className="cp-ref-info-row">
                  <div className="cp-ref-info-icon">📍</div>
                  <div>
                    <div className="cp-ref-info-lbl">Campus Location</div>
                    <div className="cp-ref-info-val">
                      {data.campusAddress || 'Plot 42, Benz Circle, MG Road, Vijayawada, Andhra Pradesh - 520010'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Map Snapshot */}
              <div className="cp-ref-map-card">
                <iframe
                  title="Campus Map"
                  src="https://maps.google.com/maps?q=Benz+Circle,+Vijayawada,+Andhra+Pradesh&t=&z=15&ie=UTF8&iwloc=&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 19: PROFESSIONAL INSTITUTIONAL FOOTER
          ========================================================================= */}
      <footer className="cp-ref-footer">
        <div className="cp-container">
          <div className="cp-ref-footer-grid">
            {/* Col 1: Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt={data.displayName}
                    style={{ height: 42, width: 'auto' }}
                  />
                )}
                <div>
                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#ffffff' }}>
                    {data.displayName}
                  </h4>
                  <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
                    {data.mottoTagline || 'Shaping State Toppers in NEET & JEE'}
                  </p>
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, maxWidth: 320 }}>
                Andhra Pradesh's leading residential academy for competitive medical and engineering entrance coaching.
              </p>
            </div>

            {/* Col 2: Quick Links */}
            <div className="cp-ref-footer-col">
              <h4>Quick Links</h4>
              <ul className="cp-ref-footer-links">
                <li><button onClick={() => scrollToSection('home')}>Home</button></li>
                <li><button onClick={() => scrollToSection('about')}>About Us</button></li>
                <li><button onClick={() => scrollToSection('courses')}>Courses</button></li>
                <li><button onClick={() => scrollToSection('faculty')}>Faculty</button></li>
                <li><button onClick={() => scrollToSection('campus')}>Campus</button></li>
                <li><button onClick={() => scrollToSection('toppers')}>Toppers</button></li>
                <li><button onClick={() => scrollToSection('contact')}>Contact</button></li>
              </ul>
            </div>

            {/* Col 3: Contact */}
            <div className="cp-ref-footer-col">
              <h4>Contact</h4>
              <ul className="cp-ref-footer-links">
                <li style={{ color: '#cbd5e1' }}>📞 {data.contactPhone || '+91 86692 12345'}</li>
                <li style={{ color: '#cbd5e1' }}>✉ {data.contactEmail || 'admissions@andhrainspire.edu.in'}</li>
                <li style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>
                  {data.campusAddress || 'Plot 42, Benz Circle, MG Road, Vijayawada - 520010'}
                </li>
              </ul>
            </div>

            {/* Col 4: QuestionsStudio SaaS */}
            <div className="cp-ref-footer-col">
              <h4>QuestionsStudio</h4>
              <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 12 }}>
                Powered by QuestionsStudio Educational SaaS. Centralized Question Bank, CBT Testing &amp; Examination Engine.
              </p>
              <Link
                to="/"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#f59e0b',
                  fontSize: 12,
                  fontWeight: 700,
                  textDecoration: 'none'
                }}
              >
                QuestionsStudio Portal →
              </Link>
            </div>
          </div>

          <div className="cp-ref-footer-bottom">
            <span>© {new Date().getFullYear()} {data.displayName}. All rights reserved.</span>
            <div style={{ display: 'flex', gap: 20 }}>
              <Link to="/privacy" style={{ color: '#94a3b8', textDecoration: 'none' }}>Privacy Policy</Link>
              <Link to="/terms" style={{ color: '#94a3b8', textDecoration: 'none' }}>Terms of Service</Link>
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
