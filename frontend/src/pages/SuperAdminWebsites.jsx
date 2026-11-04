import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStoredToken } from '../lib/api';

function getAuthToken() {
  return getStoredToken();
}

export default function SuperAdminWebsites() {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filtered = websites.filter((w) => {
    const term = searchTerm.toLowerCase();
    const name = (w.displayName || w.institute?.name || '').toLowerCase();
    const slug = (w.slug || '').toLowerCase();
    const email = (w.institute?.users?.[0]?.email || '').toLowerCase();
    return name.includes(term) || slug.includes(term) || email.includes(term);
  });

  const isSessionExpired = error && (error.toLowerCase().includes('session') || error.toLowerCase().includes('logged in') || error.toLowerCase().includes('expired'));

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold">Loading College Websites & Feature Modules...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Platform Governance & Licensing</span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">College Websites & Features Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Supervise institutional portals, inspect admin credentials, and toggle modular features (CBT, CRM, Recruitment, Ads).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search by college, slug, or admin email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium w-72"
          />
          <button
            onClick={fetchWebsites}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Session Expired / Error Banner */}
      {isSessionExpired ? (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🔐</span>
              <h3 className="text-sm font-bold text-amber-900">Platform Administrator Session Expired</h3>
            </div>
            <p className="text-xs text-amber-800 mt-1">
              Your Super Admin session has expired. Sign in with your platform administrator credentials to manage college websites and feature modules.
            </p>
            <p className="text-[11px] text-slate-500 mt-2">
              Admin Account: <code className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold">admin@questionstudio.local</code>
            </p>
          </div>
          <Link
            to="/login?redirect=/admin/websites"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs whitespace-nowrap shadow-sm transition"
          >
            Sign In as Super Admin →
          </Link>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
          {error}
        </div>
      ) : null}

      {/* College Websites Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-400 border-b border-slate-200">
            <tr>
              <th className="py-3.5 px-4">College / Institute</th>
              <th className="py-3.5 px-4">Admin Login</th>
              <th className="py-3.5 px-4">Public URL</th>
              <th className="py-3.5 px-4">Licensed Features / Modules</th>
              <th className="py-3.5 px-4 text-center">Data Scale</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  {isSessionExpired
                    ? 'Please log in to view registered college websites.'
                    : 'No college websites found matching your search.'}
                </td>
              </tr>
            ) : (
              filtered.map((w) => {
                const adminUser = w.institute?.users?.[0];
                return (
                  <tr key={w.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">
                        {w.displayName || w.institute?.name}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>Slug: <strong className="text-slate-600">{w.slug}</strong></span>
                        <span>•</span>
                        {w.isPublished ? (
                          <span className="text-emerald-700 font-semibold">● Published v{w.publishedVersion}</span>
                        ) : (
                          <span className="text-slate-500 font-medium">○ Draft</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {adminUser ? (
                        <div>
                          <div className="font-mono text-xs font-bold text-slate-800">{adminUser.email}</div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            Role: {adminUser.role}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No admin assigned</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-blue-600">
                      <a
                        href={`/#/colleges/${w.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline flex items-center gap-1 font-semibold"
                      >
                        /colleges/{w.slug} ↗
                      </a>
                    </td>

                    {/* Active Licensed Modules */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Website
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            w.hasOnlineExamModule
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                          }`}
                        >
                          CBT Exams
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            w.hasCrmModule
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                          }`}
                        >
                          CRM Leads
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            w.hasRecruitmentModule
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                          }`}
                        >
                          Hiring
                        </span>
                        {w.hasAdvertisingModule && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Ads
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="text-[11px] font-medium text-slate-600">
                        <span>{w._count?.courses || 0} Courses</span> • <span>{w._count?.faculties || 0} Faculty</span>
                      </div>
                      <div className="text-[11px] font-bold text-blue-700 mt-0.5">
                        {w._count?.enquiries || 0} Student Leads
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          w.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {w.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedWebsite(w);
                          setPasswordMsg(null);
                          setNewPassword('');
                        }}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition"
                      >
                        ⚙ Features & Access
                      </button>
                      <button
                        onClick={() => handleToggleStatus(w.id, w.status)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                          w.status === 'ACTIVE'
                            ? 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {w.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Feature Licensing & Credentials Modal */}
      {selectedWebsite && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Institutional Governance</span>
                <h3 className="text-lg font-black text-slate-900">
                  {selectedWebsite.displayName || selectedWebsite.institute?.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Slug: /colleges/{selectedWebsite.slug}
                </p>
              </div>
              <button
                onClick={() => setSelectedWebsite(null)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* Product Modules Switchboard */}
              <div>
                <h4 className="font-bold text-sm text-slate-900 mb-1">Modular SaaS Product Subscriptions</h4>
                <p className="text-slate-500 mb-4">
                  Select which modules this institution has purchased. Enabling a module activates its controls on both their public website and private portal.
                </p>

                <div className="space-y-3">
                  {/* Product 1: Question Paper Generation */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>Product 1: Question Paper Generation Engine</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-800">CORE</span>
                      </div>
                      <p className="text-slate-500 text-[11px] mt-0.5">Central Question Bank, Blueprint Generator, ABCD Sets, Solutions & OMR</p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold text-[10px]">
                      Always Included
                    </span>
                  </div>

                  {/* Product 2: College Public Website */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">Product 2: Public College Website Portal</div>
                      <p className="text-slate-500 text-[11px] mt-0.5">Branded public portal, courses, faculty, results, and director spread</p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-[10px]">
                      Active ({selectedWebsite.isPublished ? 'Published' : 'Draft'})
                    </span>
                  </div>

                  {/* Product 3: Online CBT Examination System */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">Product 3: Online CBT Examination System</div>
                      <p className="text-slate-500 text-[11px] mt-0.5">NTA-style online exam engine, open mock tests, instant scorecards & percentiles</p>
                    </div>
                    <button
                      disabled={moduleUpdating}
                      onClick={() => handleToggleModule('hasOnlineExamModule', selectedWebsite.hasOnlineExamModule)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition ${
                        selectedWebsite.hasOnlineExamModule
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                      }`}
                    >
                      {selectedWebsite.hasOnlineExamModule ? '✓ Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {/* Product 4: Student Acquisition CRM */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">Product 4: Student Acquisition CRM</div>
                      <p className="text-slate-500 text-[11px] mt-0.5">Admission enquiries capture, talent exam lead funnel, counseling tracking</p>
                    </div>
                    <button
                      disabled={moduleUpdating}
                      onClick={() => handleToggleModule('hasCrmModule', selectedWebsite.hasCrmModule)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition ${
                        selectedWebsite.hasCrmModule
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                      }`}
                    >
                      {selectedWebsite.hasCrmModule ? '✓ Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {/* Product 5: Faculty Recruitment */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">Product 5: Faculty Recruitment Portal</div>
                      <p className="text-slate-500 text-[11px] mt-0.5">Public careers noticeboard, resume collection, and applicant database</p>
                    </div>
                    <button
                      disabled={moduleUpdating}
                      onClick={() => handleToggleModule('hasRecruitmentModule', selectedWebsite.hasRecruitmentModule)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition ${
                        selectedWebsite.hasRecruitmentModule
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                      }`}
                    >
                      {selectedWebsite.hasRecruitmentModule ? '✓ Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {/* Product 6: College Advertising */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">Product 6: College Advertising & Promotion</div>
                      <p className="text-slate-500 text-[11px] mt-0.5">Featured listings, sponsored promotion banners, and campaign alerts</p>
                    </div>
                    <button
                      disabled={moduleUpdating}
                      onClick={() => handleToggleModule('hasAdvertisingModule', selectedWebsite.hasAdvertisingModule)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition ${
                        selectedWebsite.hasAdvertisingModule
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                      }`}
                    >
                      {selectedWebsite.hasAdvertisingModule ? '✓ Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Administrator Login Credentials */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="font-bold text-sm text-slate-900">Institutional Administrator Account</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-semibold text-[10px] uppercase">Admin Email:</span>
                    <strong className="text-slate-900 font-mono text-xs">
                      {selectedWebsite.institute?.users?.[0]?.email || 'None'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold text-[10px] uppercase">Login URL:</span>
                    <a href="/#/login" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-mono">
                      /#/login ↗
                    </a>
                  </div>
                </div>

                {/* Reset Password Form */}
                <form onSubmit={handleResetPassword} className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="password"
                    placeholder="Enter new password (min 6 chars)..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-xs w-full sm:flex-1"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs whitespace-nowrap transition"
                  >
                    Reset Password
                  </button>
                </form>

                {passwordMsg && (
                  <div
                    className={`p-2.5 rounded-lg text-[11px] font-semibold ${
                      passwordMsg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {passwordMsg.text}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <a
                href={`/#/colleges/${selectedWebsite.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline font-bold text-xs"
              >
                View Public Website ↗
              </a>
              <button
                onClick={() => setSelectedWebsite(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
