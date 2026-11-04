import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function SuperAdminWebsites() {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchWebsites();
  }, []);

  async function fetchWebsites() {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
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
      const token = localStorage.getItem('token');
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

  const filtered = websites.filter((w) => {
    const term = searchTerm.toLowerCase();
    const name = (w.displayName || w.institute?.name || '').toLowerCase();
    const slug = (w.slug || '').toLowerCase();
    return name.includes(term) || slug.includes(term);
  });

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold">Loading College Websites Control Center...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Platform Governance</span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">College Websites Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Supervise all institutional public websites, publication status, leads, and moderation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search by college name or slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium w-64"
          />
          <button
            onClick={fetchWebsites}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-400 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">College / Institute</th>
              <th className="py-3 px-4">Public URL</th>
              <th className="py-3 px-4">Publication State</th>
              <th className="py-3 px-4 text-center">Courses</th>
              <th className="py-3 px-4 text-center">Faculty</th>
              <th className="py-3 px-4 text-center">Enquiries</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((w) => (
              <tr key={w.id} className="hover:bg-slate-50/80 transition">
                <td className="py-3.5 px-4">
                  <div className="font-bold text-slate-900 text-sm">
                    {w.displayName || w.institute?.name}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Created {new Date(w.createdAt).toLocaleDateString()}
                  </div>
                </td>

                <td className="py-3.5 px-4 font-mono text-blue-600">
                  <a
                    href={`/#/colleges/${w.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline flex items-center gap-1"
                  >
                    /colleges/{w.slug} ↗
                  </a>
                </td>

                <td className="py-3.5 px-4">
                  {w.isPublished ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      LIVE (v{w.publishedVersion})
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                      DRAFT
                    </span>
                  )}
                </td>

                <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                  {w._count?.courses || 0}
                </td>

                <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                  {w._count?.faculties || 0}
                </td>

                <td className="py-3.5 px-4 text-center font-bold text-blue-700">
                  {w._count?.enquiries || 0}
                </td>

                <td className="py-3.5 px-4 text-center">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      w.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {w.status}
                  </span>
                </td>

                <td className="py-3.5 px-4 text-right space-x-2">
                  <a
                    href={`/#/colleges/${w.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                  >
                    Visit
                  </a>
                  <button
                    onClick={() => handleToggleStatus(w.id, w.status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      w.status === 'ACTIVE'
                        ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {w.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
