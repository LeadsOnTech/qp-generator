import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function CollegeWebsiteBuilder() {
  const [website, setWebsite] = useState(null);
  const [institute, setInstitute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Core Form state for Website record
  const [form, setForm] = useState({});

  // Sub-items states
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [openExams, setOpenExams] = useState([]);

  // Modals for creating/editing sub-items
  const [editingItem, setEditingItem] = useState(null);
  const [modalType, setModalType] = useState(null); // 'course' | 'faculty' | 'facility' | 'achievement' | 'testimonial' | 'gallery' | 'job'
  const [modalForm, setModalForm] = useState({});

  // Live preview device view
  const [previewDevice, setPreviewDevice] = useState('desktop'); // desktop | tablet | mobile

  useEffect(() => {
    fetchWebsite();
  }, []);

  async function fetchWebsite() {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/college-cms/website', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load college website configuration');

      setWebsite(data.website);
      setInstitute(data.institute);
      setForm(data.website);
      setCourses(data.website.courses || []);
      setFaculty(data.website.faculties || []);
      setFacilities(data.website.facilities || []);
      setAchievements(data.website.achievements || []);
      setTestimonials(data.website.testimonials || []);
      setGallery(data.website.galleryItems || []);
      setEnquiries(data.website.enquiries || []);
      setJobs(data.website.jobPostings || []);

      // Fetch exams & applications
      fetchExams(token);
      fetchApplications(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchExams(token) {
    try {
      const res = await fetch('/api/college-cms/exams', {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (res.ok) setOpenExams(data.exams || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchApplications(token) {
    try {
      const res = await fetch('/api/college-cms/applications', {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` },
      });
      const data = await res.json();
      if (res.ok) setApplications(data.applications || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSaveWebsiteSettings(e) {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/college-cms/website', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save changes');
      setWebsite(data.website);
      setForm(data.website);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublishToggle(publish) {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const endpoint = publish ? '/api/college-cms/publish' : '/api/college-cms/unpublish';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change publish status');
      setWebsite(data.website);
      setForm(data.website);
      alert(data.message);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Upload helper
  async function handleFileUpload(file, targetField) {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/college-cms/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      return data.url;
    } catch (err) {
      alert(err.message);
      return null;
    }
  }

  // Sub-items management (Courses, Faculty, Facilities, etc.)
  async function handleSaveSubItem() {
    try {
      const token = localStorage.getItem('token');
      const isEdit = Boolean(editingItem?.id);
      const endpoint = `/api/college-cms/${modalType}${isEdit ? `/${editingItem.id}` : ''}`;
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(modalForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed');

      // Refresh data
      fetchWebsite();
      setEditingItem(null);
      setModalType(null);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteSubItem(type, id) {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/college-cms/${type}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete item');
      fetchWebsite();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleToggleExamVisible(examId, currentVal) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/college-cms/exams/${examId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPublicWebsiteVisible: !currentVal }),
      });
      if (!res.ok) throw new Error('Failed to update exam visibility');
      fetchExams(token);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleUpdateEnquiryStatus(enquiryId, status) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/college-cms/enquiries/${enquiryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update lead status');
      fetchWebsite();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold">Loading College Website Studio...</p>
      </div>
    );
  }

  if (error || !website) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center bg-white rounded-2xl border border-rose-200 shadow-sm mt-8">
        <span className="text-4xl">⚠️</span>
        <h3 className="text-base font-bold text-slate-800 mt-2">Error Loading Website</h3>
        <p className="text-xs text-slate-600 mt-1">{error}</p>
        <button
          onClick={fetchWebsite}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
        >
          Try Again
        </button>
      </div>
    );
  }

  const publicUrl = `/#/colleges/${website.slug}`;
  const fullLiveUrl = `${window.location.origin}/#/colleges/${website.slug}`;

  const navMenuItems = [
    { id: 'overview', label: '1. Website Overview', icon: '📊' },
    { id: 'profile', label: '2. College Profile', icon: '🏛' },
    { id: 'theme', label: '3. Branding & Theme', icon: '🎨' },
    { id: 'hero', label: '4. Homepage Hero Banner', icon: '⚡' },
    { id: 'director', label: '5. Director Profile & Message', icon: '👨‍💼' },
    { id: 'about', label: '6. About College & Vision', icon: '📖' },
    { id: 'courses', label: '7. Courses Offered', icon: '🎓', count: courses.length },
    { id: 'faculty', label: '8. Faculty Directory', icon: '👨‍🏫', count: faculty.length },
    { id: 'facilities', label: '9. Campus Infrastructure', icon: '🏢', count: facilities.length },
    { id: 'gallery', label: '10. Photo & Media Gallery', icon: '🖼', count: gallery.length },
    { id: 'achievements', label: '11. Achievements & Hall of Fame', icon: '🏆', count: achievements.length },
    { id: 'testimonials', label: '12. Testimonials & Reviews', icon: '💬', count: testimonials.length },
    { id: 'admissions', label: '13. Admissions & Prospectus', icon: '📜' },
    { id: 'exams', label: '14. Open Mock Examinations', icon: '📝', count: openExams.filter((e) => e.isPublicWebsiteVisible).length },
    { id: 'careers', label: '15. Faculty Careers', icon: '💼', count: jobs.length },
    { id: 'enquiries', label: '16. Enquiries & Leads Inbox', icon: '📥', count: enquiries.length },
    { id: 'seo', label: '17. SEO & OpenGraph', icon: '🔍' },
    { id: 'preview', label: '18. Website Interactive Preview', icon: '📱' },
    { id: 'publish', label: '19. Publish Website', icon: '🚀' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center text-2xl font-bold shadow-md">
            🌐
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {website.displayName || institute?.name}
              </h1>
              {website.isPublished ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  LIVE (v{website.publishedVersion})
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                  DRAFT MODE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
              <span>Public Link:</span>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline font-semibold"
              >
                questionsstudio.in/colleges/{website.slug}
              </a>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition"
          >
            <span>↗</span> Open Live Website
          </a>

          <button
            onClick={() => setActiveTab('preview')}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition"
          >
            Preview Layout
          </button>

          {website.isPublished ? (
            <button
              onClick={() => handlePublishToggle(false)}
              disabled={saving}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition"
            >
              Unpublish
            </button>
          ) : (
            <button
              onClick={() => handlePublishToggle(true)}
              disabled={saving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition"
            >
              🚀 Publish Website
            </button>
          )}
        </div>
      </div>

      {/* Main Builder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sub-Menu Navigation */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Website Studio Menus
          </div>
          {navMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
                activeTab === item.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <span>{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </span>
              {item.count !== undefined && item.count > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    activeTab === item.id ? 'bg-white/30 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right Content Panel */}
        <div className="lg:col-span-9 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-between">
              <span>✓ Website changes saved successfully to draft!</span>
            </div>
          )}

          {/* ==================== 1. OVERVIEW ==================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-900">Website Overview & Health Score</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100 space-y-1">
                  <span className="text-xs font-bold text-blue-700 uppercase">Admission Leads</span>
                  <div className="text-2xl font-black text-blue-900">{enquiries.length}</div>
                  <p className="text-[11px] text-blue-600">Prospective student inquiries</p>
                </div>

                <div className="p-5 rounded-2xl bg-teal-50 border border-teal-100 space-y-1">
                  <span className="text-xs font-bold text-teal-700 uppercase">Courses Published</span>
                  <div className="text-2xl font-black text-teal-900">{courses.length}</div>
                  <p className="text-[11px] text-teal-600">Competitive academic streams</p>
                </div>

                <div className="p-5 rounded-2xl bg-purple-50 border border-purple-100 space-y-1">
                  <span className="text-xs font-bold text-purple-700 uppercase">Open CBT Exams</span>
                  <div className="text-2xl font-black text-purple-900">
                    {openExams.filter((e) => e.isPublicWebsiteVisible).length}
                  </div>
                  <p className="text-[11px] text-purple-600">Tests open for public practice</p>
                </div>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Quick Share & Outreach
                </h3>
                <p className="text-xs text-slate-500">
                  Share your public portal URL on official brochures, hoardings, and WhatsApp messages:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={fullLiveUrl}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono text-slate-700 select-all"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(fullLiveUrl);
                      alert('URL copied to clipboard!');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition"
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 2. COLLEGE PROFILE ==================== */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveWebsiteSettings} className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">College Profile & Identity</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Display College Name</label>
                  <input
                    type="text"
                    value={form.displayName || ''}
                    onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Motto / Tagline</label>
                  <input
                    type="text"
                    value={form.mottoTagline || ''}
                    onChange={(e) => setForm({ ...form, mottoTagline: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Establishment Year</label>
                  <input
                    type="number"
                    value={form.estYear || ''}
                    onChange={(e) => setForm({ ...form, estYear: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Accreditation / Affiliation</label>
                  <input
                    type="text"
                    placeholder="e.g. CBSE Affiliated / NAAC A+"
                    value={form.accreditation || ''}
                    onChange={(e) => setForm({ ...form, accreditation: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Telephone</label>
                  <input
                    type="tel"
                    value={form.contactPhone || ''}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={form.contactEmail || ''}
                    onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Helpline Number</label>
                  <input
                    type="tel"
                    placeholder="10-digit number for WhatsApp button"
                    value={form.whatsappNumber || ''}
                    onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Google Maps Embed URL</label>
                  <input
                    type="url"
                    placeholder="https://maps.google.com/..."
                    value={form.googleMapEmbedUrl || ''}
                    onChange={(e) => setForm({ ...form, googleMapEmbedUrl: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Campus Full Address</label>
                <textarea
                  rows={2}
                  value={form.campusAddress || ''}
                  onChange={(e) => setForm({ ...form, campusAddress: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition"
              >
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </form>
          )}

          {/* ==================== 3. BRANDING & THEME ==================== */}
          {activeTab === 'theme' && (
            <form onSubmit={handleSaveWebsiteSettings} className="space-y-6">
              <h2 className="text-lg font-bold text-slate-900">Branding, Colors & Design Palettes</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Primary Brand Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.primaryColor || '#1e40af'}
                      onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300"
                    />
                    <input
                      type="text"
                      value={form.primaryColor || '#1e40af'}
                      onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                      className="flex-1 px-3 py-2 border border-slate-200 text-xs rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Secondary Tone Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.secondaryColor || '#0f766e'}
                      onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300"
                    />
                    <input
                      type="text"
                      value={form.secondaryColor || '#0f766e'}
                      onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                      className="flex-1 px-3 py-2 border border-slate-200 text-xs rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Accent Highlight Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.accentColor || '#f59e0b'}
                      onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                      className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300"
                    />
                    <input
                      type="text"
                      value={form.accentColor || '#f59e0b'}
                      onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                      className="flex-1 px-3 py-2 border border-slate-200 text-xs rounded-xl font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Curated Theme Presets */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Recommended Institutional Palettes</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { name: 'Oxford Royal Blue', p: '#1e3a8a', s: '#0369a1', a: '#f59e0b' },
                    { name: 'Emerald Ivy League', p: '#064e3b', s: '#0f766e', a: '#eab308' },
                    { name: 'Burgundy Excellence', p: '#831843', s: '#9f1239', a: '#f97316' },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setForm({
                        ...form,
                        primaryColor: preset.p,
                        secondaryColor: preset.s,
                        accentColor: preset.a,
                      })}
                      className="p-3 border border-slate-200 rounded-xl flex items-center justify-between hover:border-blue-500 transition"
                    >
                      <span className="text-xs font-semibold text-slate-800">{preset.name}</span>
                      <div className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.p }} />
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.s }} />
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.a }} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition"
              >
                Save Theme Colors
              </button>
            </form>
          )}

          {/* ==================== 4. HERO BANNER ==================== */}
          {activeTab === 'hero' && (
            <form onSubmit={handleSaveWebsiteSettings} className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Homepage Hero Section Management</h2>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hero Main Headline</label>
                <input
                  type="text"
                  value={form.heroTitle || ''}
                  onChange={(e) => setForm({ ...form, heroTitle: e.target.value })}
                  placeholder="e.g. Empowering Future Doctors & Engineers"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hero Subtitle</label>
                <textarea
                  rows={2}
                  value={form.heroSubtitle || ''}
                  onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Upload Hero Banner Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const url = await handleFileUpload(file, 'heroBannerUrl');
                      if (url) setForm({ ...form, heroBannerUrl: url });
                    }
                  }}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700"
                />
                {form.heroBannerUrl && (
                  <div className="mt-2 w-48 h-28 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                    <img src={form.heroBannerUrl} alt="Hero Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition"
              >
                Save Hero Section
              </button>
            </form>
          )}

          {/* ==================== 5. DIRECTOR PROFILE ==================== */}
          {activeTab === 'director' && (
            <form onSubmit={handleSaveWebsiteSettings} className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Director / Leadership Profile</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Director Name</label>
                  <input
                    type="text"
                    value={form.directorName || ''}
                    onChange={(e) => setForm({ ...form, directorName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={form.directorTitle || 'Director / Chairman'}
                    onChange={(e) => setForm({ ...form, directorTitle: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Qualifications & Experience</label>
                <input
                  type="text"
                  placeholder="e.g. M.Sc. Physics (IIT Madras), 25+ Years Mentoring"
                  value={form.directorQualifications || ''}
                  onChange={(e) => setForm({ ...form, directorQualifications: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Director's Message to Students</label>
                <textarea
                  rows={4}
                  value={form.directorMessage || ''}
                  onChange={(e) => setForm({ ...form, directorMessage: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Director Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const url = await handleFileUpload(file, 'directorPhotoUrl');
                      if (url) setForm({ ...form, directorPhotoUrl: url });
                    }
                  }}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700"
                />
                {form.directorPhotoUrl && (
                  <div className="mt-2 w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                    <img src={form.directorPhotoUrl} alt="Director" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition"
              >
                Save Director Profile
              </button>
            </form>
          )}

          {/* ==================== 6. ABOUT COLLEGE ==================== */}
          {activeTab === 'about' && (
            <form onSubmit={handleSaveWebsiteSettings} className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">About College, Vision & Mission</h2>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">About Section Headline</label>
                <input
                  type="text"
                  value={form.aboutTitle || ''}
                  onChange={(e) => setForm({ ...form, aboutTitle: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">About College Narrative</label>
                <textarea
                  rows={4}
                  value={form.aboutText || ''}
                  onChange={(e) => setForm({ ...form, aboutText: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vision Statement</label>
                  <textarea
                    rows={3}
                    value={form.visionText || ''}
                    onChange={(e) => setForm({ ...form, visionText: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mission Statement</label>
                  <textarea
                    rows={3}
                    value={form.missionText || ''}
                    onChange={(e) => setForm({ ...form, missionText: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition"
              >
                Save About Details
              </button>
            </form>
          )}

          {/* ==================== 7. COURSES OFFERED ==================== */}
          {activeTab === 'courses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Courses Offered ({courses.length})</h2>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setModalType('courses');
                    setModalForm({
                      courseName: '',
                      category: 'MEDICAL',
                      targetExam: 'NEET',
                      duration: '2 Academic Years',
                      eligibility: '',
                      description: '',
                    });
                  }}
                  className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
                >
                  + Add New Course
                </button>
              </div>

              <div className="space-y-3">
                {courses.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{c.courseName}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                          {c.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        🎯 {c.targetExam || 'General'} • ⏱ {c.duration || 'Flexible'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingItem(c);
                          setModalType('courses');
                          setModalForm(c);
                        }}
                        className="px-3 py-1.5 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSubItem('courses', c.id)}
                        className="px-3 py-1.5 text-rose-600 rounded-lg text-xs font-semibold hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== 8. FACULTY DIRECTORY ==================== */}
          {activeTab === 'faculty' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Faculty Profiles ({faculty.length})</h2>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setModalType('faculty');
                    setModalForm({
                      name: '',
                      designation: 'Senior Faculty',
                      department: 'Physics',
                      qualification: '',
                      experienceYrs: 5,
                      bio: '',
                    });
                  }}
                  className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
                >
                  + Add Faculty Member
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {faculty.map((f) => (
                  <div key={f.id} className="p-4 rounded-xl border border-slate-200 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                      {f.photoUrl ? <img src={f.photoUrl} alt={f.name} className="w-full h-full object-cover" /> : '👨‍🏫'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-slate-900 truncate">{f.name}</h4>
                      <p className="text-[11px] text-blue-700 font-semibold">{f.designation}</p>
                      <p className="text-[10px] text-slate-400">{f.department}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => {
                          setEditingItem(f);
                          setModalType('faculty');
                          setModalForm(f);
                        }}
                        className="text-xs text-slate-600 hover:text-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSubItem('faculty', f.id)}
                        className="text-xs text-rose-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== 9. CAMPUS INFRASTRUCTURE ==================== */}
          {activeTab === 'facilities' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Campus Facilities ({facilities.length})</h2>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setModalType('facilities');
                    setModalForm({
                      title: '',
                      category: 'LAB',
                      description: '',
                    });
                  }}
                  className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
                >
                  + Add Facility
                </button>
              </div>

              <div className="space-y-3">
                {facilities.map((fc) => (
                  <div key={fc.id} className="p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700">
                        {fc.category}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 mt-1">{fc.title}</h4>
                      <p className="text-xs text-slate-500">{fc.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingItem(fc);
                          setModalType('facilities');
                          setModalForm(fc);
                        }}
                        className="text-xs text-slate-600 hover:text-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSubItem('facilities', fc.id)}
                        className="text-xs text-rose-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== 10. PHOTO GALLERY ==================== */}
          {activeTab === 'gallery' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Campus Photo Gallery ({gallery.length})</h2>
                <div>
                  <input
                    type="file"
                    id="gallery-file-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const url = await handleFileUpload(file, 'gallery');
                        if (url) {
                          const token = localStorage.getItem('token');
                          await fetch('/api/college-cms/gallery', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                              mediaUrl: url,
                              title: file.name.replace(/\.[^/.]+$/, ''),
                              category: 'CAMPUS',
                            }),
                          });
                          fetchWebsite();
                        }
                      }
                    }}
                  />
                  <label
                    htmlFor="gallery-file-upload"
                    className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition cursor-pointer"
                  >
                    + Upload Photo
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {gallery.map((g) => (
                  <div key={g.id} className="relative rounded-xl overflow-hidden aspect-square border border-slate-200 group">
                    <img src={g.mediaUrl} alt={g.title} className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleDeleteSubItem('gallery', g.id)}
                      className="absolute top-2 right-2 bg-rose-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition shadow"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== 11. ACHIEVEMENTS ==================== */}
          {activeTab === 'achievements' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Student Achievements & Hall of Fame ({achievements.length})</h2>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setModalType('achievements');
                    setModalForm({
                      studentName: '',
                      examOrAward: 'NEET AIR 42',
                      rankOrScore: 'Score: 710/720',
                      year: 2025,
                      category: 'COMPETITIVE_EXAM',
                    });
                  }}
                  className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
                >
                  + Add Achiever
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {achievements.map((a) => (
                  <div key={a.id} className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{a.studentName}</h4>
                      <p className="text-xs font-bold text-blue-700">{a.examOrAward}</p>
                      <p className="text-[11px] text-amber-700 font-semibold">{a.rankOrScore}</p>
                      <span className="text-[10px] text-slate-400">Batch {a.year}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteSubItem('achievements', a.id)}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== 12. TESTIMONIALS ==================== */}
          {activeTab === 'testimonials' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Student & Parent Testimonials ({testimonials.length})</h2>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setModalType('testimonials');
                    setModalForm({
                      authorName: '',
                      authorRole: 'Alumni (AIIMS New Delhi)',
                      quote: '',
                      rating: 5,
                    });
                  }}
                  className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
                >
                  + Add Testimonial
                </button>
              </div>

              <div className="space-y-3">
                {testimonials.map((t) => (
                  <div key={t.id} className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-amber-400 text-xs">{'★'.repeat(t.rating)}</div>
                      <p className="text-xs text-slate-700 italic mt-1">"{t.quote}"</p>
                      <h5 className="text-xs font-bold text-slate-900 mt-2">— {t.authorName} ({t.authorRole})</h5>
                    </div>
                    <button
                      onClick={() => handleDeleteSubItem('testimonials', t.id)}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== 14. OPEN CBT EXAMINATIONS ==================== */}
          {activeTab === 'exams' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Open CBT Examinations Showcase</h2>
                  <p className="text-xs text-slate-500">
                    Enable existing online tests so prospective students can attempt them on your website
                  </p>
                </div>
              </div>

              {openExams.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-3xl">📝</span>
                  <p className="text-xs text-slate-600 mt-2">
                    No CBT tests found for your college. Generate a paper and launch a CBT test first!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {openExams.map((exam) => (
                    <div
                      key={exam.id}
                      className="p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-slate-900">{exam.title}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {exam.examName} • {exam.durationMinutes} mins
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Access Code: <code className="font-mono text-blue-700">{exam.code}</code>
                        </p>
                      </div>

                      <button
                        onClick={() => handleToggleExamVisible(exam.id, exam.isPublicWebsiteVisible)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                          exam.isPublicWebsiteVisible
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {exam.isPublicWebsiteVisible ? '✓ Visible on Website' : '+ Make Visible'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== 15. CAREERS ==================== */}
          {activeTab === 'careers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Faculty Careers & Vacancies ({jobs.length})</h2>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setModalType('jobs');
                    setModalForm({
                      jobTitle: '',
                      department: 'Physics',
                      employmentType: 'FULL_TIME',
                      vacanciesCount: 1,
                      minExperienceYrs: 3,
                      requiredQualifications: 'M.Sc.',
                      jobDescription: '',
                      isActive: true,
                    });
                  }}
                  className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
                >
                  + Post Job Vacancy
                </button>
              </div>

              {/* Jobs list */}
              <div className="space-y-3">
                {jobs.map((j) => (
                  <div key={j.id} className="p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-slate-900">{j.jobTitle}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                          {j.department}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Applications received: <strong>{j._count?.applications || 0}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteSubItem('jobs', j.id)}
                        className="text-xs text-rose-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Received Applications */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <h3 className="text-sm font-bold text-slate-800">
                  Received Job Applications ({applications.length})
                </h3>
                {applications.length === 0 ? (
                  <p className="text-xs text-slate-400">No candidate applications received yet.</p>
                ) : (
                  <div className="space-y-2">
                    {applications.map((app) => (
                      <div
                        key={app.id}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <strong className="block text-slate-900">{app.applicantName}</strong>
                          <span className="text-slate-500">
                            {app.email} • {app.phone} • {app.experienceYrs} yrs exp
                          </span>
                        </div>
                        <a
                          href={`/uploads/resumes/${app.resumeFilename}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
                        >
                          📄 Download Resume
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== 16. ENQUIRIES ==================== */}
          {activeTab === 'enquiries' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">
                Admission Enquiries & Leads Inbox ({enquiries.length})
              </h2>

              {enquiries.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-3xl">📬</span>
                  <p className="text-xs text-slate-500 mt-2">
                    No admission leads received yet. Once students submit enquiries on your website, they appear here instantly!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {enquiries.map((enq) => (
                    <div
                      key={enq.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-slate-900">{enq.studentName}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              enq.status === 'NEW'
                                ? 'bg-amber-100 text-amber-800'
                                : enq.status === 'CONTACTED'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {enq.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">
                          📞 <strong>{enq.phone}</strong> {enq.email && `• ✉ ${enq.email}`}
                        </p>
                        {enq.courseOfInterest && (
                          <p className="text-[11px] text-blue-700 font-semibold">
                            Target Course: {enq.courseOfInterest} {enq.cityOrTown && `(${enq.cityOrTown})`}
                          </p>
                        )}
                        {enq.message && <p className="text-xs text-slate-500 italic">"{enq.message}"</p>}
                        <span className="text-[10px] text-slate-400 block">
                          Submitted on {new Date(enq.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={enq.status}
                          onChange={(e) => handleUpdateEnquiryStatus(enq.id, e.target.value)}
                          className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium"
                        >
                          <option value="NEW">New</option>
                          <option value="CONTACTED">Contacted</option>
                          <option value="COUNSELED">Counseled</option>
                          <option value="ENROLLED">Enrolled</option>
                          <option value="CLOSED">Closed</option>
                        </select>
                        <a
                          href={`https://wa.me/${enq.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 flex items-center gap-1"
                        >
                          <span>💬</span> WhatsApp
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== 17. SEO ==================== */}
          {activeTab === 'seo' && (
            <form onSubmit={handleSaveWebsiteSettings} className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Search Engine Optimization (SEO) & Social Meta</h2>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Page Meta Title</label>
                <input
                  type="text"
                  placeholder="e.g. Best NEET & IIT-JEE Coaching College in Vijayawada"
                  value={form.metaTitle || ''}
                  onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Meta Description</label>
                <textarea
                  rows={3}
                  placeholder="Summary shown in Google search results (150-160 characters)"
                  value={form.metaDescription || ''}
                  onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Search Keywords</label>
                <input
                  type="text"
                  placeholder="NEET coaching, JEE Main, IIT preparation, best junior college"
                  value={form.metaKeywords || ''}
                  onChange={(e) => setForm({ ...form, metaKeywords: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition"
              >
                Save SEO Settings
              </button>
            </form>
          )}

          {/* ==================== 18. PREVIEW ==================== */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Interactive Website Preview</h2>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  {['desktop', 'tablet', 'mobile'].map((d) => (
                    <button
                      key={d}
                      onClick={() => setPreviewDevice(d)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${
                        previewDevice === d ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-center bg-slate-200/80 p-4 rounded-2xl overflow-hidden">
                <div
                  className={`bg-white rounded-xl shadow-2xl overflow-hidden transition-all duration-300 border-4 border-slate-800 ${
                    previewDevice === 'mobile'
                      ? 'w-[375px] h-[640px]'
                      : previewDevice === 'tablet'
                      ? 'w-[768px] h-[700px]'
                      : 'w-full h-[700px]'
                  }`}
                >
                  <iframe
                    src={publicUrl}
                    title="Website Preview"
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ==================== 19. PUBLISH ==================== */}
          {activeTab === 'publish' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-900">Publish Website & Version Management</h2>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Current Status</span>
                    <h3 className="text-base font-bold text-slate-800">
                      {website.isPublished ? 'Published & Live to World' : 'Draft / Unpublished'}
                    </h3>
                  </div>
                  {website.isPublished ? (
                    <button
                      onClick={() => handlePublishToggle(false)}
                      disabled={saving}
                      className="px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700"
                    >
                      Take Website Offline
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePublishToggle(true)}
                      disabled={saving}
                      className="px-6 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow hover:bg-emerald-700"
                    >
                      🚀 Publish to Live URL
                    </button>
                  )}
                </div>

                <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-200">
                  <p>Published Version: <strong>v{website.publishedVersion}</strong></p>
                  {website.publishedAt && (
                    <p>Last Published: <strong>{new Date(website.publishedAt).toLocaleString()}</strong></p>
                  )}
                  <p>
                    Target Live URL:{' '}
                    <a href={publicUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                      {fullLiveUrl}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sub-item Create / Edit Modal */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase">
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            {/* Courses Modal Form */}
            {modalType === 'courses' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Course Name *</label>
                  <input
                    type="text"
                    value={modalForm.courseName || ''}
                    onChange={(e) => setModalForm({ ...modalForm, courseName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={modalForm.category || 'MEDICAL'}
                    onChange={(e) => setModalForm({ ...modalForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  >
                    <option value="MEDICAL">Medical (NEET)</option>
                    <option value="ENGINEERING">Engineering (JEE)</option>
                    <option value="FOUNDATION">Foundation</option>
                    <option value="DEGREE">Degree / Intermediate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 2 Academic Years"
                    value={modalForm.duration || ''}
                    onChange={(e) => setModalForm({ ...modalForm, duration: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Eligibility Criteria</label>
                  <input
                    type="text"
                    placeholder="e.g. Class 10th with 60% marks"
                    value={modalForm.eligibility || ''}
                    onChange={(e) => setModalForm({ ...modalForm, eligibility: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={modalForm.description || ''}
                    onChange={(e) => setModalForm({ ...modalForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>
            )}

            {/* Faculty Modal Form */}
            {modalType === 'faculty' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={modalForm.name || ''}
                    onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Designation *</label>
                  <input
                    type="text"
                    value={modalForm.designation || ''}
                    onChange={(e) => setModalForm({ ...modalForm, designation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department *</label>
                  <input
                    type="text"
                    value={modalForm.department || ''}
                    onChange={(e) => setModalForm({ ...modalForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Qualification</label>
                  <input
                    type="text"
                    value={modalForm.qualification || ''}
                    onChange={(e) => setModalForm({ ...modalForm, qualification: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    value={modalForm.experienceYrs || ''}
                    onChange={(e) => setModalForm({ ...modalForm, experienceYrs: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const url = await handleFileUpload(file, 'faculty');
                        if (url) setModalForm({ ...modalForm, photoUrl: url });
                      }
                    }}
                    className="w-full text-xs"
                  />
                </div>
              </div>
            )}

            {/* Achievements Modal Form */}
            {modalType === 'achievements' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Student Name *</label>
                  <input
                    type="text"
                    value={modalForm.studentName || ''}
                    onChange={(e) => setModalForm({ ...modalForm, studentName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Exam / Award *</label>
                  <input
                    type="text"
                    value={modalForm.examOrAward || ''}
                    onChange={(e) => setModalForm({ ...modalForm, examOrAward: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rank or Score</label>
                  <input
                    type="text"
                    value={modalForm.rankOrScore || ''}
                    onChange={(e) => setModalForm({ ...modalForm, rankOrScore: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Year</label>
                  <input
                    type="number"
                    value={modalForm.year || 2025}
                    onChange={(e) => setModalForm({ ...modalForm, year: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>
            )}

            {/* Jobs Modal Form */}
            {modalType === 'jobs' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Job Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior NEET Biology Lecturer"
                    value={modalForm.jobTitle || ''}
                    onChange={(e) => setModalForm({ ...modalForm, jobTitle: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department *</label>
                  <input
                    type="text"
                    placeholder="e.g. Zoology / Mathematics"
                    value={modalForm.department || ''}
                    onChange={(e) => setModalForm({ ...modalForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Required Qualifications</label>
                  <input
                    type="text"
                    value={modalForm.requiredQualifications || ''}
                    onChange={(e) => setModalForm({ ...modalForm, requiredQualifications: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Job Description *</label>
                  <textarea
                    rows={3}
                    value={modalForm.jobDescription || ''}
                    onChange={(e) => setModalForm({ ...modalForm, jobDescription: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSubItem}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
              >
                Save Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
