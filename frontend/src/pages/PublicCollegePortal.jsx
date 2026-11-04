import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-slate-800">Loading College Portal...</h2>
        <p className="text-sm text-slate-500 mt-1">Fetching official courses, faculty, and academic profile</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-200">
          <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
            🏛
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Portal Unavailable</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            {error || 'The requested college website could not be found or is not published yet.'}
          </p>
          <Link
            to="/"
            className="inline-block px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition"
          >
            Go to QuestionsStudio Home
          </Link>
        </div>
      </div>
    );
  }

  const primary = data.primaryColor || '#1e40af';
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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-blue-500 selection:text-white">
      {/* Top Banner Notice (if accredited or phone available) */}
      <div
        className="text-white text-xs py-2 px-4 shadow-sm"
        style={{ backgroundColor: secondary }}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {data.accreditation && (
              <span className="bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full font-semibold">
                ✓ {data.accreditation}
              </span>
            )}
            {data.estYear && (
              <span className="opacity-90 hidden sm:inline">Established in {data.estYear}</span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            {data.contactPhone && (
              <a href={`tel:${data.contactPhone}`} className="hover:underline flex items-center gap-1">
                <span>📞</span> {data.contactPhone}
              </a>
            )}
            {data.contactEmail && (
              <a href={`mailto:${data.contactEmail}`} className="hover:underline flex items-center gap-1 hidden md:flex">
                <span>✉</span> {data.contactEmail}
              </a>
            )}
            <span className="opacity-75">Powered by QuestionsStudio</span>
          </div>
        </div>
      </div>

      {/* Main Header / Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm transition">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <Link to={`/colleges/${slug}`} onClick={() => setActiveTab('home')} className="flex items-center gap-3 group">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={data.displayName || data.institute?.name}
                className="h-12 w-auto max-w-[180px] object-contain rounded-lg p-0.5 border border-slate-100 group-hover:scale-105 transition"
              />
            ) : (
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md"
                style={{ backgroundColor: primary }}
              >
                {(data.displayName || data.institute?.name || 'C')[0]}
              </div>
            )}
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 group-hover:text-blue-700 transition leading-snug">
                {data.displayName || data.institute?.name}
              </h1>
              {data.mottoTagline && (
                <p className="text-xs text-slate-500 font-medium truncate max-w-xs sm:max-w-md">
                  {data.mottoTagline}
                </p>
              )}
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {[
              { id: 'home', label: 'Home' },
              { id: 'about', label: 'About Us' },
              { id: 'courses', label: 'Courses' },
              { id: 'faculty', label: 'Faculty' },
              { id: 'facilities', label: 'Campus' },
              { id: 'achievements', label: 'Achievements' },
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
                className={`px-3 py-2 text-xs font-semibold rounded-lg transition relative ${
                  activeTab === tab.id
                    ? 'text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                style={activeTab === tab.id ? { backgroundColor: primary } : {}}
              >
                {tab.label}
                {Boolean(tab.badge) && (
                  <span
                    className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Header Action Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('admissions');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md hover:brightness-110 active:scale-95 transition flex items-center gap-1.5"
              style={{ backgroundColor: primary }}
            >
              <span>🎓</span> Apply Now
            </button>
          </div>
        </div>

        {/* Mobile Navigation Scrollbar */}
        <div className="lg:hidden flex items-center gap-2 px-4 py-2 overflow-x-auto border-t border-slate-100 no-scrollbar">
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
              className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-full transition ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              style={activeTab === tab.id ? { backgroundColor: primary } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Areas */}
      <main className="flex-1">
        {/* ===================== TAB: HOME ===================== */}
        {activeTab === 'home' && (
          <div>
            {/* Hero Section */}
            <section
              className="relative overflow-hidden text-white py-16 lg:py-24"
              style={{
                background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
              }}
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                  <div className="lg:col-span-7 space-y-6">
                    {data.accreditation && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md border border-white/20 rounded-full text-xs font-semibold text-white tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        {data.accreditation}
                      </div>
                    )}
                    <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                      {data.heroTitle || 'Empowering Future Leaders & Achievers'}
                    </h2>
                    <p className="text-sm sm:text-lg text-slate-100/90 font-normal leading-relaxed max-w-2xl">
                      {data.heroSubtitle ||
                        'Excellence in Academic Preparation, Competitive Ranks & Holistic Development.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 pt-2">
                      <button
                        onClick={() => setActiveTab('admissions')}
                        className="px-6 py-3.5 rounded-xl font-bold text-sm bg-white text-slate-900 shadow-xl hover:bg-slate-100 transition active:scale-95"
                      >
                        {data.heroCtaText || 'Apply for Admission'} →
                      </button>
                      <button
                        onClick={() => setActiveTab('courses')}
                        className="px-6 py-3.5 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/20 border border-white/30 text-white backdrop-blur-sm transition active:scale-95"
                      >
                        Explore Courses
                      </button>
                      {data.openExams?.length > 0 && (
                        <button
                          onClick={() => setActiveTab('exams')}
                          className="px-5 py-3.5 rounded-xl font-bold text-sm text-white shadow-lg transition active:scale-95 flex items-center gap-1.5"
                          style={{ backgroundColor: accent }}
                        >
                          <span>📝</span> Open Mock Exams ({data.openExams.length})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Hero Right Visual / Card */}
                  <div className="lg:col-span-5">
                    {data.heroBannerUrl ? (
                      <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20 aspect-[4/3]">
                        <img
                          src={data.heroBannerUrl}
                          alt="Campus Banner"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 sm:p-8 rounded-3xl shadow-2xl space-y-6">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                          <span>⚡</span> Quick Admission Enquiry
                        </h3>
                        <p className="text-xs text-slate-200">
                          Register your interest and our expert academic counselors will guide you with syllabus, seats & scholarships.
                        </p>
                        <form onSubmit={handleEnquirySubmit} className="space-y-3">
                          <input
                            type="text"
                            required
                            placeholder="Student Full Name *"
                            value={enquiryForm.studentName}
                            onChange={(e) => setEnquiryForm({ ...enquiryForm, studentName: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl bg-white/95 text-slate-800 placeholder-slate-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                          <input
                            type="tel"
                            required
                            placeholder="Mobile / WhatsApp Number *"
                            value={enquiryForm.phone}
                            onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl bg-white/95 text-slate-800 placeholder-slate-400 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                          <select
                            value={enquiryForm.courseOfInterest}
                            onChange={(e) => setEnquiryForm({ ...enquiryForm, courseOfInterest: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl bg-white/95 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                          >
                            <option value="">Select Target Course</option>
                            {data.courses?.map((c) => (
                              <option key={c.id} value={c.courseName}>
                                {c.courseName}
                              </option>
                            ))}
                            <option value="NEET Medical">NEET (Medical)</option>
                            <option value="JEE Main & Adv">JEE (Main & Advanced)</option>
                            <option value="Foundation">Foundation / Intermediate</option>
                          </select>
                          <button
                            type="submit"
                            disabled={enquirySubmitting}
                            className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-900 shadow-lg hover:brightness-110 transition active:scale-95"
                            style={{ backgroundColor: accent }}
                          >
                            {enquirySubmitting ? 'Submitting...' : 'Submit Enquiry'}
                          </button>
                          {enquirySuccess && (
                            <p className="text-xs text-emerald-300 font-semibold text-center">
                              ✓ Enquiry received! We will call you shortly.
                            </p>
                          )}
                          {enquiryError && (
                            <p className="text-xs text-rose-300 font-semibold text-center">
                              {enquiryError}
                            </p>
                          )}
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Impact Numbers / Stats Counter */}
            {statsList.length > 0 && (
              <section className="bg-white border-b border-slate-200 py-10 shadow-sm relative z-20 -mt-6 max-w-6xl mx-auto rounded-2xl px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-x divide-slate-100">
                  {statsList.map((st, idx) => (
                    <div key={idx} className="px-4">
                      <div
                        className="text-2xl sm:text-4xl font-black tracking-tight"
                        style={{ color: primary }}
                      >
                        {st.value}
                      </div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">
                        {st.label}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Director's Corner */}
            {data.directorName && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-8 sm:p-12">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <div className="lg:col-span-4 text-center">
                      <div className="w-40 h-40 sm:w-48 sm:h-48 mx-auto rounded-3xl overflow-hidden shadow-xl border-4 border-slate-100 mb-4 bg-slate-50 flex items-center justify-center">
                        {data.directorPhotoUrl ? (
                          <img
                            src={data.directorPhotoUrl}
                            alt={data.directorName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-5xl">👨‍🏫</span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">{data.directorName}</h3>
                      <p className="text-xs text-slate-500 font-medium">{data.directorTitle || 'Director / Principal'}</p>
                      {data.directorQualifications && (
                        <p className="text-[11px] text-blue-700 font-semibold mt-1">
                          {data.directorQualifications}
                        </p>
                      )}
                    </div>
                    <div className="lg:col-span-8 space-y-4">
                      <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 text-blue-700">
                        Leadership Message
                      </span>
                      <h4 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug">
                        "Committed to Nurturing Every Student's Highest Potential"
                      </h4>
                      <p className="text-slate-600 text-sm sm:text-base leading-relaxed italic border-l-4 border-blue-600 pl-4 py-1">
                        "{data.directorMessage ||
                          'Our goal is to provide world-class mentoring, rigorous problem-solving practice, and supportive counseling so our students lead national ranks with confidence.'}"
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Featured Academic Courses */}
            {data.courses?.length > 0 && (
              <section className="bg-slate-100/70 py-16 border-y border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                        Academic Programs
                      </span>
                      <h3 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">
                        Featured Courses Offered
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('courses')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group"
                    >
                      View All Programs <span className="group-hover:translate-x-1 transition">→</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.courses.slice(0, 6).map((c) => (
                      <div
                        key={c.id}
                        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700">
                              {c.category}
                            </span>
                            {c.duration && (
                              <span className="text-xs text-slate-400 font-medium">⏱ {c.duration}</span>
                            )}
                          </div>
                          <h4 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition">
                            {c.courseName}
                          </h4>
                          {c.targetExam && (
                            <p className="text-xs font-semibold text-slate-500 mt-1">
                              🎯 Target: {c.targetExam}
                            </p>
                          )}
                          <p className="text-xs text-slate-600 mt-3 line-clamp-3 leading-relaxed">
                            {c.description || 'Comprehensive curriculum designed for competitive excellence, state ranks, and strong conceptual depth.'}
                          </p>
                        </div>

                        <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between">
                          <button
                            onClick={() => {
                              setEnquiryForm({ ...enquiryForm, courseOfInterest: c.courseName });
                              setActiveTab('admissions');
                            }}
                            className="text-xs font-bold text-blue-700 hover:underline"
                          >
                            Enquire Now →
                          </button>
                          {c.brochureFilename && (
                            <a
                              href={`/uploads/brochures/${c.brochureFilename}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1"
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

            {/* Open Mock Examinations Banner (if any) */}
            {data.openExams?.length > 0 && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div
                  className="rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden"
                  style={{ backgroundColor: primary }}
                >
                  <div className="max-w-2xl relative z-10 space-y-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20">
                      CBT Diagnostic Portal
                    </span>
                    <h3 className="text-2xl sm:text-4xl font-black">
                      Attempt Free Open Practice Examinations
                    </h3>
                    <p className="text-sm text-slate-100 leading-relaxed">
                      Experience official NTA NEET and JEE pattern testing online. Get instant marks, rank analysis, and speed breakdown without any charges.
                    </p>
                    <button
                      onClick={() => setActiveTab('exams')}
                      className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-amber-400 text-slate-900 shadow-lg hover:bg-amber-300 transition"
                    >
                      Browse Open Tests ({data.openExams.length}) →
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Student Achievements / Hall of Fame */}
            {data.achievements?.length > 0 && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center max-w-3xl mx-auto mb-12">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                    Proven Track Record
                  </span>
                  <h3 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">
                    Student Hall of Fame & Toppers
                  </h3>
                  <p className="text-sm text-slate-500 mt-2">
                    Our outstanding rankers who realized their medical and engineering dreams with consistent preparation.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                  {data.achievements.map((a) => (
                    <div
                      key={a.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center flex flex-col items-center hover:shadow-md transition"
                    >
                      <div className="w-20 h-20 rounded-full overflow-hidden mb-3 bg-slate-100 border-2 border-amber-400/80 shadow flex items-center justify-center">
                        {a.photoUrl ? (
                          <img src={a.photoUrl} alt={a.studentName || 'Ranker'} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">🏆</span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{a.studentName || 'Student Achiever'}</h4>
                      <p className="text-xs font-extrabold text-blue-700 mt-0.5">{a.examOrAward}</p>
                      {a.rankOrScore && (
                        <span className="mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800">
                          {a.rankOrScore}
                        </span>
                      )}
                      <p className="text-[10px] text-slate-400 mt-2">Batch {a.year}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Testimonials */}
            {data.testimonials?.length > 0 && (
              <section className="bg-slate-100/60 py-16 border-t border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-center max-w-2xl mx-auto mb-10">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                      Real Experiences
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                      What Students & Parents Say
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {data.testimonials.map((t) => (
                      <div
                        key={t.id}
                        className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between"
                      >
                        <div>
                          <div className="text-amber-400 text-sm mb-3">
                            {'★'.repeat(t.rating || 5)}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed italic">
                            "{t.quote}"
                          </p>
                        </div>
                        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-100">
                          <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-600">
                            {t.avatarUrl ? (
                              <img src={t.avatarUrl} alt={t.authorName} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              t.authorName[0]
                            )}
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-slate-900">{t.authorName}</h5>
                            <p className="text-[11px] text-slate-500">{t.authorRole}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {/* ===================== TAB: ABOUT US ===================== */}
        {activeTab === 'about' && (
          <div className="max-w-5xl mx-auto px-4 py-12 space-y-10">
            <div className="text-center space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Institutional Heritage</span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">{data.aboutTitle || `About ${data.displayName || data.institute?.name}`}</h2>
              {data.mottoTagline && <p className="text-sm text-slate-500 italic">{data.mottoTagline}</p>}
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm leading-relaxed text-slate-700 text-sm sm:text-base space-y-4">
              <p>{data.aboutText || 'Our institution stands at the pinnacle of competitive coaching and academic excellence.'}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-2xl mb-2">🎯</div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Our Vision</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {data.visionText || 'To nurture every student into a distinguished professional, national ranker, and ethical citizen equipped for 21st-century global challenges.'}
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-2xl mb-2">🚀</div>
                <h3 className="text-base font-bold text-slate-900 mb-2">Our Mission</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {data.missionText || 'Provide rigorous pedagogical coaching, concept clarity, daily practice worksheets, and continuous personalized counseling.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB: COURSES ===================== */}
        {activeTab === 'courses' && (
          <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Curriculum & Streams</span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Academic Programs Offered</h2>
              <p className="text-xs text-slate-500">Comprehensive competitive coaching tailored for top ranks</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.courses?.map((c) => (
                <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700">
                      {c.category}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">{c.courseName}</h3>
                    {c.targetExam && <p className="text-xs font-semibold text-slate-500">🎯 Target: {c.targetExam}</p>}
                    {c.duration && <p className="text-xs text-slate-500">⏱ Duration: {c.duration}</p>}
                    {c.eligibility && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                        <strong>Eligibility:</strong> {c.eligibility}
                      </p>
                    )}
                    <p className="text-xs text-slate-600 leading-relaxed">{c.description}</p>
                    {c.syllabusOverview && (
                      <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                        <strong>Syllabus:</strong> {c.syllabusOverview}
                      </div>
                    )}
                  </div>

                  <div className="pt-6 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setEnquiryForm({ ...enquiryForm, courseOfInterest: c.courseName });
                        setActiveTab('admissions');
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
                    >
                      Enquire for Course
                    </button>
                    {c.brochureFilename && (
                      <a
                        href={`/uploads/brochures/${c.brochureFilename}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-500 hover:text-slate-800"
                      >
                        Download PDF
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== TAB: FACULTY ===================== */}
        {activeTab === 'faculty' && (
          <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Academic Mentors</span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Distinguished Faculty Directory</h2>
              <p className="text-xs text-slate-500">Learn from top subject masters, authors, and competitive exam specialists</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {data.faculties?.map((f) => (
                <div key={f.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center flex flex-col items-center">
                  <div className="w-28 h-28 rounded-2xl overflow-hidden mb-4 bg-slate-100 border border-slate-200 shadow flex items-center justify-center">
                    {f.photoUrl ? (
                      <img src={f.photoUrl} alt={f.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">👨‍🏫</span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{f.name}</h3>
                  <p className="text-xs font-semibold text-blue-700">{f.designation}</p>
                  <span className="mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                    {f.department}
                  </span>
                  {f.qualification && (
                    <p className="text-xs text-slate-500 mt-2 font-medium">{f.qualification}</p>
                  )}
                  {f.experienceYrs && (
                    <p className="text-[11px] text-slate-400 mt-1">💼 {f.experienceYrs}+ Years Experience</p>
                  )}
                  {f.bio && <p className="text-xs text-slate-600 mt-3 italic line-clamp-3">"{f.bio}"</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== TAB: CAMPUS & FACILITIES ===================== */}
        {activeTab === 'facilities' && (
          <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">World-Class Infrastructure</span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Campus Facilities & Learning Spaces</h2>
              <p className="text-xs text-slate-500">Equipped with state-of-the-art laboratories, digital libraries, and smart study environments</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.facilities?.map((fc) => (
                <div key={fc.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                  {fc.photoUrl && (
                    <div className="h-48 overflow-hidden bg-slate-100">
                      <img src={fc.photoUrl} alt={fc.title} className="w-full h-full object-cover hover:scale-105 transition duration-300" />
                    </div>
                  )}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-teal-50 text-teal-700">
                        {fc.category}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-2">{fc.title}</h3>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">{fc.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== TAB: OPEN EXAMINATIONS (CBT LINK) ===================== */}
        {activeTab === 'exams' && (
          <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Online Examination Hub</span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Open Mock Examinations & Diagnostics</h2>
              <p className="text-xs text-slate-500">Attempt practice papers online using our official Computer-Based Test (CBT) portal</p>
            </div>

            {data.openExams?.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
                <span className="text-4xl">📝</span>
                <h3 className="text-base font-bold text-slate-700 mt-2">No Open Examinations Scheduled Right Now</h3>
                <p className="text-xs text-slate-500 mt-1">Check back soon or register for admission enquiry to receive alerts.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.openExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          FREE OPEN PRACTICE
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {exam.examName} • {exam.questionCount} Questions
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">{exam.title}</h3>
                      {exam.publicDescription && (
                        <p className="text-xs text-slate-600">{exam.publicDescription}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-1">
                        <span>⏱ Duration: <strong>{exam.durationMinutes} Mins</strong></span>
                        <span>🎯 Marking: <strong>+{exam.positiveMarks} / -{exam.negativeMarks}</strong></span>
                      </div>
                    </div>

                    <a
                      href={exam.cbtUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white shadow-md text-center transition active:scale-95 whitespace-nowrap"
                    >
                      Start Examination →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB: GALLERY ===================== */}
        {activeTab === 'gallery' && (
          <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Campus Moments</span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Photo & Event Gallery</h2>
              <p className="text-xs text-slate-500">A glimpse into academic life, science fairs, sports, and celebrations</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {data.galleryItems?.map((g) => (
                <div
                  key={g.id}
                  onClick={() => setPreviewMedia(g)}
                  className="group relative rounded-2xl overflow-hidden aspect-square bg-slate-100 cursor-pointer shadow-sm hover:shadow-xl transition"
                >
                  <img src={g.mediaUrl} alt={g.title || 'Campus'} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition p-4 flex flex-col justify-end text-white">
                    <span className="text-[10px] font-bold uppercase text-amber-300">{g.category}</span>
                    <p className="text-xs font-semibold">{g.title || 'Campus Photograph'}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Media Lightbox */}
            {previewMedia && (
              <div
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setPreviewMedia(null)}
              >
                <div className="max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setPreviewMedia(null)}
                    className="absolute top-3 right-3 bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold hover:bg-black"
                  >
                    ✕
                  </button>
                  <img src={previewMedia.mediaUrl} alt={previewMedia.title} className="max-w-full max-h-[75vh] object-contain mx-auto" />
                  <div className="p-4 bg-white text-center">
                    <h4 className="font-bold text-sm text-slate-800">{previewMedia.title || 'Campus Moment'}</h4>
                    <span className="text-xs text-slate-400 font-semibold uppercase">{previewMedia.category}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB: FACULTY CAREERS ===================== */}
        {activeTab === 'careers' && (
          <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Join Our Academic Team</span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Faculty Careers & Vacancies</h2>
              <p className="text-xs text-slate-500">Build the future with us. We offer attractive compensation, academic autonomy, and continuous growth.</p>
            </div>

            {data.jobPostings?.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
                <span className="text-4xl">💼</span>
                <h3 className="text-base font-bold text-slate-700 mt-2">No Active Openings Currently</h3>
                <p className="text-xs text-slate-500 mt-1">You may still write to {data.contactEmail || 'our HR office'} with your CV.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.jobPostings.map((job) => (
                  <div
                    key={job.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                          {job.department}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {job.employmentType} • {job.vacanciesCount} Vacancy
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">{job.jobTitle}</h3>
                      <p className="text-xs text-slate-600 line-clamp-2">{job.jobDescription}</p>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-1">
                        <span>🎓 Req: <strong>{job.requiredQualifications}</strong></span>
                        <span>💼 Min Exp: <strong>{job.minExperienceYrs} yrs</strong></span>
                        {job.location && <span>📍 <strong>{job.location}</strong></span>}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedJob(job);
                        setJobSuccess(false);
                        setJobError(null);
                      }}
                      className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-slate-900 hover:bg-blue-600 text-white shadow-md transition active:scale-95 whitespace-nowrap"
                    >
                      Apply Now →
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Application Modal */}
            {selectedJob && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Apply: {selectedJob.jobTitle}</h3>
                      <p className="text-xs text-slate-500">{selectedJob.department} Department</p>
                    </div>
                    <button
                      onClick={() => setSelectedJob(null)}
                      className="text-slate-400 hover:text-slate-700 text-lg font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  {jobSuccess ? (
                    <div className="py-8 text-center space-y-3">
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-3xl mx-auto">
                        ✓
                      </div>
                      <h4 className="text-lg font-bold text-slate-900">Application Submitted!</h4>
                      <p className="text-xs text-slate-600">
                        Our recruitment committee will review your profile and contact you if shortlisted.
                      </p>
                      <button
                        onClick={() => setSelectedJob(null)}
                        className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl mt-4"
                      >
                        Close
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleJobApplySubmit} className="space-y-4 pt-4">
                      {jobError && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                          {jobError}
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={jobForm.applicantName}
                          onChange={(e) => setJobForm({ ...jobForm, applicantName: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                          <input
                            type="email"
                            required
                            value={jobForm.email}
                            onChange={(e) => setJobForm({ ...jobForm, email: e.target.value })}
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                          <input
                            type="tel"
                            required
                            value={jobForm.phone}
                            onChange={(e) => setJobForm({ ...jobForm, phone: e.target.value })}
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Total Exp (Years) *</label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={jobForm.experienceYrs}
                            onChange={(e) => setJobForm({ ...jobForm, experienceYrs: e.target.value })}
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Current City</label>
                          <input
                            type="text"
                            value={jobForm.currentLocation}
                            onChange={(e) => setJobForm({ ...jobForm, currentLocation: e.target.value })}
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Attach Resume (PDF/DOCX max 10MB) *</label>
                        <input
                          type="file"
                          required
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => setResumeFile(e.target.files[0])}
                          className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                      </div>

                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedJob(null)}
                          className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={jobSubmitting}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition"
                        >
                          {jobSubmitting ? 'Uploading...' : 'Submit Profile'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB: ADMISSIONS & CONTACT ===================== */}
        {(activeTab === 'admissions' || activeTab === 'contact') && (
          <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Get In Touch</span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
                {activeTab === 'admissions' ? 'Admission Enquiry & Registration' : 'Contact Us & Campus Location'}
              </h2>
              <p className="text-xs text-slate-500">Reach out directly to our admissions office for counseling and enrollment details</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Enquiry Form */}
              <div className="lg:col-span-7 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <h3 className="text-lg font-bold text-slate-900">Submit an Academic Enquiry</h3>

                {enquirySuccess ? (
                  <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                    <span className="text-3xl">🎉</span>
                    <h4 className="text-base font-bold text-emerald-800">Thank you for your enquiry!</h4>
                    <p className="text-xs text-emerald-700">
                      Our admissions counseling team has received your details and will call you shortly.
                    </p>
                    <button
                      onClick={() => setEnquirySuccess(false)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold mt-2"
                    >
                      Send Another Enquiry
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleEnquirySubmit} className="space-y-4">
                    {enquiryError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                        {enquiryError}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Student Full Name *</label>
                        <input
                          type="text"
                          required
                          value={enquiryForm.studentName}
                          onChange={(e) => setEnquiryForm({ ...enquiryForm, studentName: e.target.value })}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Parent / Guardian Name</label>
                        <input
                          type="text"
                          value={enquiryForm.parentName}
                          onChange={(e) => setEnquiryForm({ ...enquiryForm, parentName: e.target.value })}
                          placeholder="e.g. S. Sharma"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Mobile / WhatsApp Number *</label>
                        <input
                          type="tel"
                          required
                          value={enquiryForm.phone}
                          onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                          placeholder="10-digit mobile"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                        <input
                          type="email"
                          value={enquiryForm.email}
                          onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                          placeholder="student@example.com"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Target Course of Interest</label>
                        <select
                          value={enquiryForm.courseOfInterest}
                          onChange={(e) => setEnquiryForm({ ...enquiryForm, courseOfInterest: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Target Course</option>
                          {data.courses?.map((c) => (
                            <option key={c.id} value={c.courseName}>
                              {c.courseName}
                            </option>
                          ))}
                          <option value="NEET Long Term">NEET Medical Long Term</option>
                          <option value="JEE Main & Adv">JEE Main & Advanced</option>
                          <option value="Foundation">IIT Foundation Class 8-10</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">City / Town</label>
                        <input
                          type="text"
                          value={enquiryForm.cityOrTown}
                          onChange={(e) => setEnquiryForm({ ...enquiryForm, cityOrTown: e.target.value })}
                          placeholder="e.g. Vijayawada, Guntur"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Specific Query / Notes</label>
                      <textarea
                        rows={3}
                        value={enquiryForm.message}
                        onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                        placeholder="Mention previous marks, hostel requirements, or scholarship queries..."
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={enquirySubmitting}
                      className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-lg transition active:scale-95"
                      style={{ backgroundColor: primary }}
                    >
                      {enquirySubmitting ? 'Submitting Details...' : 'Submit Admission Enquiry'}
                    </button>
                  </form>
                )}
              </div>

              {/* Contact Info & Location */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                  <h3 className="text-lg font-bold text-slate-900">Campus Contact Information</h3>

                  <div className="space-y-4 text-xs text-slate-600">
                    {data.campusAddress && (
                      <div className="flex items-start gap-3">
                        <span className="text-base text-blue-600">📍</span>
                        <div>
                          <strong className="block text-slate-800">Campus Address:</strong>
                          <span className="leading-relaxed">{data.campusAddress}</span>
                        </div>
                      </div>
                    )}

                    {data.contactPhone && (
                      <div className="flex items-start gap-3">
                        <span className="text-base text-blue-600">📞</span>
                        <div>
                          <strong className="block text-slate-800">Telephone / Helpdesk:</strong>
                          <a href={`tel:${data.contactPhone}`} className="text-blue-700 hover:underline">
                            {data.contactPhone}
                          </a>
                        </div>
                      </div>
                    )}

                    {data.contactEmail && (
                      <div className="flex items-start gap-3">
                        <span className="text-base text-blue-600">✉</span>
                        <div>
                          <strong className="block text-slate-800">Official Admissions Email:</strong>
                          <a href={`mailto:${data.contactEmail}`} className="text-blue-700 hover:underline">
                            {data.contactEmail}
                          </a>
                        </div>
                      </div>
                    )}

                    {data.whatsappNumber && (
                      <div className="flex items-start gap-3 pt-2">
                        <a
                          href={`https://wa.me/${data.whatsappNumber.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow"
                        >
                          <span>💬</span> Chat on Official WhatsApp
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {data.googleMapEmbedUrl && (
                  <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-sm h-64 bg-slate-100">
                    <iframe
                      src={data.googleMapEmbedUrl}
                      title="Campus Location"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen=""
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm">{data.displayName || data.institute?.name}</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {data.mottoTagline || 'Dedicated to academic excellence, state and national ranks.'}
            </p>
            {data.accreditation && (
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300">
                ✓ {data.accreditation}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <h5 className="text-white font-bold text-xs uppercase tracking-wider">Quick Navigation</h5>
            <ul className="space-y-1.5">
              <li><button onClick={() => setActiveTab('home')} className="hover:text-white transition">Home</button></li>
              <li><button onClick={() => setActiveTab('about')} className="hover:text-white transition">About Us</button></li>
              <li><button onClick={() => setActiveTab('courses')} className="hover:text-white transition">Academic Courses</button></li>
              <li><button onClick={() => setActiveTab('faculty')} className="hover:text-white transition">Faculty Mentors</button></li>
              <li><button onClick={() => setActiveTab('exams')} className="hover:text-white transition">Open Mock Examinations</button></li>
              <li><button onClick={() => setActiveTab('careers')} className="hover:text-white transition">Faculty Careers</button></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h5 className="text-white font-bold text-xs uppercase tracking-wider">Contact & Admissions</h5>
            <p className="text-slate-400 leading-relaxed">{data.campusAddress}</p>
            {data.contactPhone && <p>📞 {data.contactPhone}</p>}
            {data.contactEmail && <p>✉ {data.contactEmail}</p>}
          </div>

          <div className="space-y-3">
            <h5 className="text-white font-bold text-xs uppercase tracking-wider">Platform Certification</h5>
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-1">
              <span className="text-[11px] font-bold text-slate-200">Powered by QuestionsStudio</span>
              <p className="text-[10px] text-slate-400 leading-tight">
                Centralized Question Bank, Computer-Based Testing & Academic Results Engine.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <p>© {new Date().getFullYear()} {data.displayName || data.institute?.name}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-slate-400 hover:text-white transition">QuestionsStudio Platform</Link>
            <Link to="/privacy" className="text-slate-400 hover:text-white transition">Privacy Policy</Link>
            <Link to="/terms" className="text-slate-400 hover:text-white transition">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
