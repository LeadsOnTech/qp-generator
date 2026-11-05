import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStoredToken } from '../lib/api';
import '../college-builder.css';

function getAuthToken() {
  return getStoredToken();
}

export default function SuperAdminWebsites() {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [moduleFilter, setModuleFilter] = useState('ALL');

  // Copy feedback state
  const [copyFeedback, setCopyFeedback] = useState(null);

  // Modal State for Feature Licensing & Credentials
  const [selectedWebsite, setSelectedWebsite] = useState(null);
  const [moduleUpdating, setModuleUpdating] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState(null);

  useEffect(() => {
    fetchWebsites();
  }, []);

  async function fetchWebsites() {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/admin/college-websites', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch college websites');
      setWebsites(data.websites || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleCopy = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  async function handleToggleStatus(websiteId, currentStatus) {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!window.confirm(`Are you sure you want to mark this website as ${newStatus}?`)) return;

    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/college-websites/${websiteId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');
      fetchWebsites();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleToggleModule(field, currentValue) {
    if (!selectedWebsite) return;
    setModuleUpdating(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/college-websites/${selectedWebsite.id}/modules`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [field]: !currentValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update feature module');

      // Update both modal and websites list
      setSelectedWebsite({ ...selectedWebsite, [field]: !currentValue });
      setWebsites((prev) =>
        prev.map((w) => (w.id === selectedWebsite.id ? { ...w, [field]: !currentValue } : w))
      );
    } catch (err) {
      alert(err.message);
    } finally {
      setModuleUpdating(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!selectedWebsite || !newPassword) return;
    setPasswordMsg(null);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/college-websites/${selectedWebsite.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      setPasswordMsg({ type: 'success', text: `Success: Password updated for ${data.email}` });
      setNewPassword('');
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message });
    }
  }

  // Calculate executive KPI metrics
  const totalColleges = websites.length;
  const publishedCount = websites.filter((w) => w.isPublished).length;
  const cbtActiveCount = websites.filter((w) => w.hasOnlineExamModule).length;
  const totalLeads = websites.reduce((acc, w) => acc + (w._count?.enquiries || 0), 0);

  // Filtered dataset
  const filtered = websites.filter((w) => {
    const term = searchTerm.toLowerCase();
    const name = (w.displayName || w.institute?.name || '').toLowerCase();
    const slug = (w.slug || '').toLowerCase();
    const email = (w.institute?.users?.[0]?.email || '').toLowerCase();
    const matchesTerm = name.includes(term) || slug.includes(term) || email.includes(term);

    const matchesStatus = statusFilter === 'ALL' || w.status === statusFilter;
    const matchesModule = moduleFilter === 'ALL' || Boolean(w[moduleFilter]);

    return matchesTerm && matchesStatus && matchesModule;
  });

  const isSessionExpired =
    error &&
    (error.toLowerCase().includes('session') ||
      error.toLowerCase().includes('logged in') ||
      error.toLowerCase().includes('expired'));

  if (loading) {
    return (
      <div className="sag-container" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <div
          style={{
            width: 44,
            height: 44,
            border: '4px solid #0284c7',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }}
        />
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Loading Platform Governance Console...</h3>
        <p style={{ fontSize: 13, color: '#64748b' }}>Fetching registered institutions, licensed modules & admin credentials.</p>
      </div>
    );
  }

  return (
    <div className="sag-container">
      {/* Toast Feedback for Copy */}
      {copyFeedback && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#0f172a',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 700,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>✓</span>
          <span>Copied {copyFeedback} to clipboard!</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="sag-header-card">
        <div className="sag-header-row">
          <div>
            <div className="sag-eyebrow">
              <span className="sag-eyebrow-dot" />
              <span>Platform Governance & Modular SaaS Licensing</span>
            </div>
            <h1 className="sag-title">College Websites & Features Management</h1>
            <p className="sag-desc">
              Supervise all multi-tenant college portals, inspect institute admin credentials, reset passwords, and toggle product modules (CBT, CRM, Recruitment, Ads).
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link to="/website-builder" className="sag-btn sag-btn-secondary">
              <span>🏛️ Launch Website Builder Studio</span>
            </Link>
            <button onClick={fetchWebsites} className="sag-btn sag-btn-primary">
              <span>🔄 Refresh Data</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="sag-toolbar">
          <div className="sag-search-box">
            <span className="sag-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by college name, slug, or admin email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="sag-search-input"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="sag-select"
          >
            <option value="ALL">All Account Statuses</option>
            <option value="ACTIVE">● Active Institutions</option>
            <option value="SUSPENDED">✕ Suspended Accounts</option>
          </select>

          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="sag-select"
          >
            <option value="ALL">All Modular Subscriptions</option>
            <option value="hasOnlineExamModule">💻 CBT Online Exams Active</option>
            <option value="hasCrmModule">👥 Student CRM Leads Active</option>
            <option value="hasRecruitmentModule">👔 Faculty Recruitment Active</option>
            <option value="hasAdvertisingModule">📢 College Advertising Active</option>
          </select>

          {(searchTerm || statusFilter !== 'ALL' || moduleFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setModuleFilter('ALL');
              }}
              className="sag-btn sag-btn-secondary"
              style={{ padding: '8px 12px', fontSize: 12 }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* KPI Metrics Ribbon */}
      <div className="sag-kpi-grid">
        <div className="sag-kpi-card">
          <div className="sag-kpi-icon-frame" style={{ background: '#e0f2fe', color: '#0369a1' }}>
            🏛️
          </div>
          <div>
            <div className="sag-kpi-val">{totalColleges}</div>
            <div className="sag-kpi-label">Registered Colleges</div>
          </div>
        </div>

        <div className="sag-kpi-card">
          <div className="sag-kpi-icon-frame" style={{ background: '#ecfdf5', color: '#059669' }}>
            🌐
          </div>
          <div>
            <div className="sag-kpi-val">{publishedCount}</div>
            <div className="sag-kpi-label">Live Published Portals</div>
          </div>
        </div>

        <div className="sag-kpi-card">
          <div className="sag-kpi-icon-frame" style={{ background: '#faf5ff', color: '#7c3aed' }}>
            💻
          </div>
          <div>
            <div className="sag-kpi-val">{cbtActiveCount}</div>
            <div className="sag-kpi-label">Active CBT Exam Engines</div>
          </div>
        </div>

        <div className="sag-kpi-card">
          <div className="sag-kpi-icon-frame" style={{ background: '#fef3c7', color: '#d97706' }}>
            🎯
          </div>
          <div>
            <div className="sag-kpi-val">{totalLeads}</div>
            <div className="sag-kpi-label">Total Student Admission Leads</div>
          </div>
        </div>
      </div>

      {/* Session Expired / Error Banner */}
      {isSessionExpired ? (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 14,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🔐</span>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#78350f', margin: 0 }}>
                Super Administrator Session Expired
              </h3>
            </div>
            <p style={{ fontSize: 13, color: '#92400e', margin: '4px 0 0 0' }}>
              Your platform admin authorization token has expired. Please sign in again with your super admin credentials to inspect colleges and manage subscriptions.
            </p>
            <p style={{ fontSize: 11, color: '#64748b', margin: '6px 0 0 0' }}>
              Default Super Admin: <code style={{ background: '#fef3c7', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>admin@questionstudio.local</code>
            </p>
          </div>
          <Link
            to="/login?redirect=/admin/websites"
            className="sag-btn sag-btn-primary"
            style={{ padding: '10px 18px' }}
          >
            Sign In as Super Admin →
          </Link>
        </div>
      ) : error ? (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 12,
            padding: '14px 18px',
            color: '#dc2626',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      ) : null}

      {/* College Websites Table */}
      <div className="sag-table-card">
        <div className="sag-table-responsive">
          <table className="sag-table">
            <thead>
              <tr>
                <th>College / Institute</th>
                <th>Admin Credentials</th>
                <th>Public Portal URL</th>
                <th>Licensed Product Modules</th>
                <th style={{ textAlign: 'center' }}>Data Scale</th>
                <th style={{ textAlign: 'center' }}>Account Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
                    {isSessionExpired
                      ? 'Please sign in to view registered college websites.'
                      : 'No college institutions found matching your search or filters.'}
                  </td>
                </tr>
              ) : (
                filtered.map((w) => {
                  const adminUser = w.institute?.users?.[0];
                  const collegeName = w.displayName || w.institute?.name || 'Unnamed Institution';
                  const initials = collegeName
                    .split(' ')
                    .slice(0, 2)
                    .map((word) => word[0])
                    .join('')
                    .toUpperCase() || 'CI';

                  return (
                    <tr key={w.id}>
                      {/* College / Institution Cell */}
                      <td>
                        <div className="sag-college-cell">
                          <div className="sag-college-avatar">{initials}</div>
                          <div>
                            <div className="sag-college-name">{collegeName}</div>
                            <div className="sag-college-meta">
                              <span className="sag-slug-tag">slug: {w.slug}</span>
                              {w.isPublished ? (
                                <span className="sag-pill-published">
                                  <span className="dot" />
                                  <span>Published v{w.publishedVersion || 1}</span>
                                </span>
                              ) : (
                                <span className="sag-pill-draft">
                                  <span>○ Draft</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Admin Credentials Cell */}
                      <td>
                        <div className="sag-admin-cell">
                          {adminUser ? (
                            <>
                              <div className="sag-admin-email-row">
                                <span className="sag-admin-email">{adminUser.email}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(adminUser.email, 'Admin Email')}
                                  className="sag-copy-btn"
                                  title="Copy Email"
                                >
                                  📋
                                </button>
                              </div>
                              <span className="sag-admin-role">Role: {adminUser.role || 'INSTITUTE'}</span>
                            </>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 12 }}>
                              No admin user attached
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Public Portal URL */}
                      <td>
                        <div className="sag-url-cell">
                          <a
                            href={`/#/colleges/${w.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="sag-url-link"
                          >
                            <span>🌐 /colleges/{w.slug}</span>
                            <span>↗</span>
                          </a>
                        </div>
                      </td>

                      {/* Licensed Product Modules Matrix */}
                      <td>
                        <div className="sag-modules-matrix">
                          <span className="sag-mod-pill sag-mod-blue" title="Product 2: Public College Website">
                            🌐 Website
                          </span>

                          <span
                            className={`sag-mod-pill ${
                              w.hasOnlineExamModule ? 'sag-mod-emerald' : 'sag-mod-disabled'
                            }`}
                            title="Product 3: Online CBT Examination Engine"
                          >
                            💻 CBT Exams
                          </span>

                          <span
                            className={`sag-mod-pill ${
                              w.hasCrmModule ? 'sag-mod-purple' : 'sag-mod-disabled'
                            }`}
                            title="Product 4: Student Acquisition CRM"
                          >
                            👥 CRM Leads
                          </span>

                          <span
                            className={`sag-mod-pill ${
                              w.hasRecruitmentModule ? 'sag-mod-amber' : 'sag-mod-disabled'
                            }`}
                            title="Product 5: Faculty Recruitment Portal"
                          >
                            👔 Careers
                          </span>

                          {w.hasAdvertisingModule && (
                            <span className="sag-mod-pill sag-mod-indigo" title="Product 6: Sponsored College Ads">
                              📢 Ads
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Data Scale Cell */}
                      <td>
                        <div className="sag-scale-cell">
                          <div className="sag-scale-row">
                            <strong>{w._count?.courses || 0}</strong> Courses • <strong>{w._count?.faculties || 0}</strong> Faculty
                          </div>
                          <div className="sag-scale-leads">
                            🎯 {w._count?.enquiries || 0} Leads
                          </div>
                        </div>
                      </td>

                      {/* Account Status Pill */}
                      <td style={{ textAlign: 'center' }}>
                        {w.status === 'ACTIVE' ? (
                          <span className="sag-status-active">
                            <span>●</span>
                            <span>ACTIVE</span>
                          </span>
                        ) : (
                          <span className="sag-status-suspended">
                            <span>✕</span>
                            <span>SUSPENDED</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="sag-actions-cell">
                          <button
                            onClick={() => {
                              setSelectedWebsite(w);
                              setPasswordMsg(null);
                              setNewPassword('');
                            }}
                            className="sag-btn-action sag-btn-action-primary"
                          >
                            <span>⚙️ Features & Access</span>
                          </button>

                          <Link
                            to={`/website-builder?instituteId=${w.instituteId || w.id}`}
                            className="sag-btn-action"
                            style={{ textDecoration: 'none' }}
                          >
                            <span>✏️ Studio CMS</span>
                          </Link>

                          <button
                            onClick={() => handleToggleStatus(w.id, w.status)}
                            className={`sag-btn-action ${
                              w.status === 'ACTIVE' ? 'sag-btn-action-danger' : 'sag-btn-action-success'
                            }`}
                          >
                            {w.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feature Licensing & Credentials Modal */}
      {selectedWebsite && (
        <div className="sag-modal-backdrop">
          <div className="sag-modal">
            {/* Modal Header */}
            <div className="sag-modal-header">
              <div>
                <span className="sag-eyebrow">Institutional SaaS Governance</span>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: '2px 0 0 0' }}>
                  {selectedWebsite.displayName || selectedWebsite.institute?.name}
                </h3>
                <p style={{ fontSize: 12, color: '#64748b', fontFamily: 'var(--font-mono, monospace)', margin: '2px 0 0 0' }}>
                  Slug: /colleges/{selectedWebsite.slug}
                </p>
              </div>
              <button
                onClick={() => setSelectedWebsite(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#e2e8f0',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 800,
                  color: '#475569',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="sag-modal-body">
              {/* Product Modules Switchboard */}
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 4px 0' }}>
                  Modular SaaS Product Subscriptions
                </h4>
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 14px 0' }}>
                  Choose which modules this college is licensed to use. Enabling a module unlocks its admin management tools and public sections.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Product 1: Question Paper Generation */}
                  <div className="sag-mod-card" style={{ background: '#f8fafc' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#0f172a' }}>
                        <span>Product 1: Question Paper Generation Engine</span>
                        <span style={{ fontSize: 9, fontWeight: 800, background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: 4 }}>
                          CORE
                        </span>
                      </div>
                      <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0 0' }}>
                        Central Question Bank, Blueprint Generator, ABCD Sets, Answer Keys, OMR & Homework Sheets.
                      </p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '4px 10px', borderRadius: 6 }}>
                      Included
                    </span>
                  </div>

                  {/* Product 2: College Public Website */}
                  <div className="sag-mod-card">
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>
                        Product 2: Public College Website Portal
                      </div>
                      <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0 0' }}>
                        Branded 17-section institutional website, faculty directory, courses, results & director spread.
                      </p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', background: '#f0f9ff', padding: '4px 10px', borderRadius: 6 }}>
                      Active ({selectedWebsite.isPublished ? 'Live' : 'Draft'})
                    </span>
                  </div>

                  {/* Product 3: Online CBT Examination System */}
                  <div className="sag-mod-card">
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>
                        Product 3: Online CBT Examination System
                      </div>
                      <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0 0' }}>
                        NTA-pattern online exam engine, timed tests, instant results, analytics & percentiles.
                      </p>
                    </div>
                    <button
                      disabled={moduleUpdating}
                      onClick={() => handleToggleModule('hasOnlineExamModule', selectedWebsite.hasOnlineExamModule)}
                      className={`sag-mod-toggle-btn ${
                        selectedWebsite.hasOnlineExamModule ? 'sag-mod-toggle-on' : 'sag-mod-toggle-off'
                      }`}
                    >
                      {selectedWebsite.hasOnlineExamModule ? '✓ Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {/* Product 4: Student Acquisition CRM */}
                  <div className="sag-mod-card">
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>
                        Product 4: Student Acquisition CRM
                      </div>
                      <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0 0' }}>
                        Direct admission inquiries desk, talent search exam leads, WhatsApp counseling tracking.
                      </p>
                    </div>
                    <button
                      disabled={moduleUpdating}
                      onClick={() => handleToggleModule('hasCrmModule', selectedWebsite.hasCrmModule)}
                      className={`sag-mod-toggle-btn ${
                        selectedWebsite.hasCrmModule ? 'sag-mod-toggle-on' : 'sag-mod-toggle-off'
                      }`}
                    >
                      {selectedWebsite.hasCrmModule ? '✓ Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {/* Product 5: Faculty Recruitment */}
                  <div className="sag-mod-card">
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>
                        Product 5: Faculty Recruitment Portal
                      </div>
                      <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0 0' }}>
                        Institutional careers noticeboard, resume applications collection, candidate shortlisting.
                      </p>
                    </div>
                    <button
                      disabled={moduleUpdating}
                      onClick={() => handleToggleModule('hasRecruitmentModule', selectedWebsite.hasRecruitmentModule)}
                      className={`sag-mod-toggle-btn ${
                        selectedWebsite.hasRecruitmentModule ? 'sag-mod-toggle-on' : 'sag-mod-toggle-off'
                      }`}
                    >
                      {selectedWebsite.hasRecruitmentModule ? '✓ Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {/* Product 6: College Advertising */}
                  <div className="sag-mod-card">
                    <div>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>
                        Product 6: College Advertising & Promotion
                      </div>
                      <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0 0' }}>
                        Sponsored admission banners, featured exam promotions, and campaign analytics.
                      </p>
                    </div>
                    <button
                      disabled={moduleUpdating}
                      onClick={() => handleToggleModule('hasAdvertisingModule', selectedWebsite.hasAdvertisingModule)}
                      className={`sag-mod-toggle-btn ${
                        selectedWebsite.hasAdvertisingModule ? 'sag-mod-toggle-on' : 'sag-mod-toggle-off'
                      }`}
                    >
                      {selectedWebsite.hasAdvertisingModule ? '✓ Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Administrator Login Credentials */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 10px 0' }}>
                  College Administrator Credentials
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block' }}>
                      Admin Account Email
                    </span>
                    <strong style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12, color: '#0f172a' }}>
                      {selectedWebsite.institute?.users?.[0]?.email || 'None'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', display: 'block' }}>
                      College Login URL
                    </span>
                    <a
                      href="/#/login"
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#0284c7', textDecoration: 'none', fontWeight: 700, fontSize: 12 }}
                    >
                      questionstudio.in/#/login ↗
                    </a>
                  </div>
                </div>

                {/* Reset Password Form */}
                <form
                  onSubmit={handleResetPassword}
                  style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid #e2e8f0' }}
                >
                  <input
                    type="password"
                    placeholder="Enter new password (minimum 6 characters)..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      fontSize: 12,
                      outline: 'none',
                    }}
                  />
                  <button type="submit" className="sag-btn sag-btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
                    Reset Password
                  </button>
                </form>

                {passwordMsg && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '8px 12px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      background: passwordMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
                      color: passwordMsg.type === 'success' ? '#065f46' : '#991b1b',
                      border: passwordMsg.type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca',
                    }}
                  >
                    {passwordMsg.text}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sag-modal-footer">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <a
                  href={`/#/colleges/${selectedWebsite.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#0284c7', fontWeight: 700, fontSize: 12, textDecoration: 'none' }}
                >
                  🌐 View Public Portal ↗
                </a>
                <Link
                  to={`/website-builder?instituteId=${selectedWebsite.instituteId || selectedWebsite.id}`}
                  style={{ color: '#059669', fontWeight: 700, fontSize: 12, textDecoration: 'none' }}
                >
                  ✏️ Edit in Website Studio →
                </Link>
              </div>
              <button onClick={() => setSelectedWebsite(null)} className="sag-btn sag-btn-secondary">
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
