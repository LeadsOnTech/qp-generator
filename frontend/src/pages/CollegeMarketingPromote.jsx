import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const PROMOTION_SERVICES = [
  { id: 'COURSE_ADMISSIONS', label: '🎓 College Admissions & Course Enrollments', desc: 'Intermediate, Degree, Engineering, NEET & JEE batches' },
  { id: 'ONLINE_EXAMS_MOCK', label: '📝 Online Mock Exams & Grand Scholarship Tests', desc: 'Promote your CBT tests to attract top regional talent' },
  { id: 'META_ADS', label: '📱 Meta Ads (Instagram & Facebook Campaigns)', desc: 'High-conversion sponsored creative ads targeting students & parents' },
  { id: 'YOUTUBE_REELS', label: '🎬 Creative Video Reels & YouTube Ad Spotlights', desc: 'Short-form promotional video content showcasing campus & faculty' },
  { id: 'WHATSAPP_BROADCAST', label: '💬 WhatsApp Verified Student Broadcasts', desc: 'Direct outreach to verified 10th & 12th grade aspirants' },
  { id: 'PORTAL_FEATURED', label: '🌐 Featured Spotlight on QuestionStudio Portal', desc: 'Top placement across student test portals & bookstore storefront' },
];

const BUDGET_RANGES = [
  { value: '₹5,000 - ₹10,000', label: '₹5,000 – ₹10,000 (Starter Outreach)' },
  { value: '₹10,000 - ₹25,000', label: '₹10,000 – ₹25,000 (Recommended Growth Campaign)' },
  { value: '₹25,000 - ₹50,000', label: '₹25,000 – ₹50,000 (Multi-City Admission Drive)' },
  { value: '₹50,000+', label: '₹50,000+ (Statewide Grand Campaign)' },
  { value: 'Custom / To Discuss', label: 'Custom / Discuss with Consultant' },
];

export default function CollegeMarketingPromote() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    collegeName: user?.instituteName || '',
    contactPerson: '',
    designation: '',
    phone: user?.institutePhone || '',
    email: user?.email || '',
    selectedServices: ['COURSE_ADMISSIONS', 'META_ADS'],
    targetCities: '',
    budgetRange: '₹10,000 - ₹25,000',
    estimatedStudents: '500 - 1,000 Students',
    campaignNotes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [successLead, setSuccessLead] = useState(null);
  const [error, setError] = useState(null);
  const [myLeads, setMyLeads] = useState([]);
  const [loadingMyLeads, setLoadingMyLeads] = useState(false);

  useEffect(() => {
    if (user?.instituteId) {
      loadMyLeads();
    }
  }, [user]);

  async function loadMyLeads() {
    setLoadingMyLeads(true);
    try {
      const res = await api.getMyMarketingLeads();
      if (res.ok) setMyLeads(res.leads || []);
    } catch (e) {
      // safe ignore if not logged in as institute
    } finally {
      setLoadingMyLeads(false);
    }
  }

  function toggleService(id) {
    setForm((prev) => {
      const exists = prev.selectedServices.includes(id);
      const updated = exists
        ? prev.selectedServices.filter((s) => s !== id)
        : [...prev.selectedServices, id];
      return { ...prev, selectedServices: updated };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.collegeName.trim()) {
      return setError('Please enter your college or institution name.');
    }
    if (!form.contactPerson.trim()) {
      return setError('Please enter the contact person name.');
    }
    const cleanPhone = form.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return setError('Please enter a valid 10-digit Indian mobile / WhatsApp number.');
    }
    if (form.selectedServices.length === 0) {
      return setError('Please select at least one promotion or marketing service.');
    }

    setSubmitting(true);
    setError(null);

    const goalsReadable = form.selectedServices
      .map((id) => {
        const item = PROMOTION_SERVICES.find((s) => s.id === id);
        return item ? item.label : id;
      })
      .join(', ');

    try {
      const res = await api.submitMarketingPromotion({
        collegeName: form.collegeName.trim(),
        contactPerson: form.contactPerson.trim(),
        designation: form.designation.trim() || null,
        phone: cleanPhone,
        email: form.email.trim() || null,
        promotionGoals: goalsReadable,
        targetCities: form.targetCities.trim() || null,
        budgetRange: form.budgetRange,
        estimatedStudents: form.estimatedStudents,
        campaignNotes: form.campaignNotes.trim() || null,
        instituteId: user?.instituteId || null,
      });

      if (res.ok) {
        setSuccessLead(res.lead);
        if (user?.instituteId) {
          loadMyLeads();
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to submit promotion request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: 1040, margin: '0 auto', padding: '24px 16px' }}>
      {/* Hero Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0369a1 100%)',
          borderRadius: 16,
          padding: '36px 32px',
          color: '#ffffff',
          marginBottom: 28,
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 20,
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              fontSize: 12.5,
              fontWeight: 700,
              marginBottom: 16,
              color: '#38bdf8',
            }}
          >
            <span>📢</span> Official Growth & Promotion Desk
          </div>
          <h1 style={{ fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 800, margin: '0 0 12px', lineHeight: 1.25 }}>
            Promote Your Courses & Online Exams
          </h1>
          <p style={{ fontSize: 15, color: '#cbd5e1', maxWidth: 720, lineHeight: 1.6, margin: 0 }}>
            Reach thousands of motivated students across Andhra Pradesh, Telangana, and Pan-India. We deliver targeted social media advertising, online scholarship mock exam campaigns, and direct WhatsApp admissions marketing for your institution.
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#e2e8f0' }}>
              <span style={{ color: '#10b981' }}>✓</span> High-ROI Meta Ads (Instagram & FB)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#e2e8f0' }}>
              <span style={{ color: '#10b981' }}>✓</span> CBT Grand Scholarship Exams
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#e2e8f0' }}>
              <span style={{ color: '#10b981' }}>✓</span> Dedicated Campaign Strategist
            </div>
          </div>
        </div>
      </div>

      {/* Main Form or Success Screen */}
      {successLead ? (
        <div
          className="card card-pad"
          style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '2px solid #10b981',
            padding: 32,
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.12)',
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#d1fae5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              margin: '0 auto 16px',
            }}
          >
            ✓
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#065f46', margin: '0 0 8px' }}>
            Promotion Request Submitted Successfully!
          </h2>
          <p style={{ fontSize: 15, color: '#475569', maxWidth: 600, margin: '0 auto 20px', lineHeight: 1.6 }}>
            Thank you, <b>{successLead.contactPerson}</b>. We have recorded your campaign request for <b>{successLead.collegeName}</b>.
            An automated confirmation message has been dispatched to your WhatsApp number <b>+91 {successLead.phone}</b>.
          </p>

          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: 16,
              maxWidth: 540,
              margin: '0 auto 24px',
              textAlign: 'left',
              fontSize: 13,
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px 12px' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Reference ID:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0284c7' }}>{successLead.id}</span>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Campaign Focus:</span>
              <span style={{ color: '#1e293b' }}>{successLead.promotionGoals}</span>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Budget Range:</span>
              <span style={{ color: '#1e293b' }}>{successLead.budgetRange || 'To be discussed'}</span>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Status:</span>
              <span style={{ color: '#059669', fontWeight: 700 }}>🟡 Under Review by Campaign Desk</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={`https://wa.me/919848012345?text=${encodeURIComponent(`Hello QuestionStudio Marketing Team, I just submitted campaign request ${successLead.id} for ${successLead.collegeName}. Would love to discuss strategy.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ background: '#25D366', borderColor: '#25D366', padding: '10px 20px', fontSize: 14 }}
            >
              💬 Connect Instantly on WhatsApp
            </a>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setSuccessLead(null);
                setForm((prev) => ({ ...prev, campaignNotes: '', targetCities: '' }));
              }}
            >
              Submit Another Campaign
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card card-pad" style={{ borderRadius: 16, marginBottom: 32 }}>
          <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 16, marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0f172a' }}>
              📋 Campaign Request Form
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
              Fill in your institution details and growth goals. Our educational marketing strategists will prepare a custom proposal and reach out via phone & WhatsApp within 24 hours.
            </p>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#b91c1c', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Section 1: Institution Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div className="field">
              <label style={{ fontWeight: 700, fontSize: 13 }}>College / Institution Name *</label>
              <input
                type="text"
                placeholder="e.g. Sri Chaitanya / Narayana Junior College / Aditya Degree"
                value={form.collegeName}
                onChange={(e) => setForm({ ...form, collegeName: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label style={{ fontWeight: 700, fontSize: 13 }}>Contact Person Name *</label>
              <input
                type="text"
                placeholder="e.g. Dr. K. Satyanarayana / Mr. Ramesh Babu"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label style={{ fontWeight: 700, fontSize: 13 }}>Designation / Role</label>
              <input
                type="text"
                placeholder="e.g. Principal / Director / Correspondent / Dean"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
              />
            </div>

            <div className="field">
              <label style={{ fontWeight: 700, fontSize: 13 }}>Mobile / WhatsApp Number *</label>
              <input
                type="tel"
                placeholder="e.g. 9848012345"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
              <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                We send status updates and campaign previews directly to this WhatsApp number.
              </span>
            </div>

            <div className="field">
              <label style={{ fontWeight: 700, fontSize: 13 }}>Official Email Address</label>
              <input
                type="email"
                placeholder="e.g. admissions@college.edu.in"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="field">
              <label style={{ fontWeight: 700, fontSize: 13 }}>Target Cities / Districts</label>
              <input
                type="text"
                placeholder="e.g. Hyderabad, Vijayawada, Guntur, Vizag, or All AP/Telangana"
                value={form.targetCities}
                onChange={(e) => setForm({ ...form, targetCities: e.target.value })}
              />
            </div>
          </div>

          {/* Section 2: Services Selection */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontWeight: 800, fontSize: 13.5, display: 'block', marginBottom: 10, color: '#0f172a' }}>
              Select Promotion & Marketing Channels Required *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 10 }}>
              {PROMOTION_SERVICES.map((serv) => {
                const selected = form.selectedServices.includes(serv.id);
                return (
                  <div
                    key={serv.id}
                    onClick={() => toggleService(serv.id)}
                    style={{
                      border: selected ? '2px solid #0284c7' : '1px solid #cbd5e1',
                      background: selected ? '#f0f9ff' : '#ffffff',
                      borderRadius: 10,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => {}}
                      style={{ marginTop: 3, cursor: 'pointer', accentColor: '#0284c7' }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: selected ? '#0369a1' : '#1e293b' }}>
                        {serv.label}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>
                        {serv.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Budget & Reach */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div className="field">
              <label style={{ fontWeight: 700, fontSize: 13 }}>Estimated Campaign Budget</label>
              <select
                value={form.budgetRange}
                onChange={(e) => setForm({ ...form, budgetRange: e.target.value })}
              >
                {BUDGET_RANGES.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label style={{ fontWeight: 700, fontSize: 13 }}>Expected Student Reach / Intake Target</label>
              <input
                type="text"
                placeholder="e.g. 500 – 1000 Students or 50 New Admissions"
                value={form.estimatedStudents}
                onChange={(e) => setForm({ ...form, estimatedStudents: e.target.value })}
              />
            </div>
          </div>

          {/* Section 4: Campaign Notes */}
          <div className="field" style={{ marginBottom: 24 }}>
            <label style={{ fontWeight: 700, fontSize: 13 }}>Campaign Details & Specific Requirements (Optional)</label>
            <textarea
              rows={3}
              placeholder="Tell us about specific courses (e.g. MPC, BiPC, Long-Term NEET), upcoming scholarship dates, branch locations, or specific goals..."
              value={form.campaignNotes}
              onChange={(e) => setForm({ ...form, campaignNotes: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              🔒 Your details are secure. QuestionStudio never shares your contact info with third parties.
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '10px 24px', fontSize: 14, fontWeight: 800 }}
              disabled={submitting}
            >
              {submitting ? 'Submitting Request…' : '🚀 Submit Promotion Request'}
            </button>
          </div>
        </form>
      )}

      {/* College's Previous Campaign Submissions (if logged in) */}
      {user?.instituteId && (
        <div className="card card-pad" style={{ borderRadius: 16, marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
              📊 Your College Promotion Requests
            </h3>
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={loadMyLeads}>
              🔄 Refresh
            </button>
          </div>

          {loadingMyLeads ? (
            <div className="skeleton" style={{ height: 90 }} />
          ) : myLeads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 16px', color: '#64748b', fontSize: 13 }}>
              No active promotion requests yet. Submit a request above to launch your first digital marketing campaign!
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {myLeads.map((lead) => (
                <div
                  key={lead.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '14px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>
                        {lead.collegeName}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: lead.status === 'CAMPAIGN_LIVE' ? '#dcfce7' : lead.status === 'CONTACTED' ? '#e0f2fe' : '#fef3c7',
                          color: lead.status === 'CAMPAIGN_LIVE' ? '#15803d' : lead.status === 'CONTACTED' ? '#0369a1' : '#b45309',
                        }}
                      >
                        {lead.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, color: '#475569' }}>
                      <b>Goals:</b> {lead.promotionGoals}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                      Submitted: {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • Budget: {lead.budgetRange || 'Flexible'}
                    </div>
                  </div>

                  <a
                    href={`https://wa.me/919848012345?text=${encodeURIComponent(`Hi QuestionStudio Support, inquiring about our promotion request ${lead.id} for ${lead.collegeName}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost"
                    style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}
                  >
                    💬 WhatsApp Update
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
