import { useState, useEffect } from 'react';
import { api } from '../lib/api';

const STATUS_OPTIONS = [
  { value: 'NEW', label: '🟡 New / Uncontacted', color: '#b45309', bg: '#fef3c7' },
  { value: 'CONTACTED', label: '🔵 Contacted / In Discussion', color: '#0369a1', bg: '#e0f2fe' },
  { value: 'PROPOSAL_SENT', label: '🟣 Proposal Sent', color: '#6d28d9', bg: '#f3e8ff' },
  { value: 'CAMPAIGN_LIVE', label: '🟢 Campaign Live', color: '#15803d', bg: '#dcfce7' },
  { value: 'CONVERTED', label: '✅ Converted / Completed', color: '#047857', bg: '#d1fae5' },
  { value: 'CLOSED', label: '⚪ Closed / Archived', color: '#475569', bg: '#f1f5f9' },
];

export default function SuperAdminMarketingLeads() {
  const [leads, setLeads] = useState([]);
  const [summary, setSummary] = useState({ total: 0, NEW: 0, CONTACTED: 0, PROPOSAL_SENT: 0, CAMPAIGN_LIVE: 0, CONVERTED: 0, CLOSED: 0 });
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [editingNotesId, setEditingNotesId] = useState(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    loadLeads();
  }, [activeTab]);

  async function loadLeads() {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (activeTab !== 'ALL') params.status = activeTab;
      if (search.trim()) params.search = search.trim();
      const res = await api.getAdminMarketingLeads(params);
      if (res.ok) {
        setLeads(res.leads || []);
        if (res.summary) setSummary(res.summary);
      }
    } catch (err) {
      setError(err.message || 'Failed to load marketing leads');
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    loadLeads();
  }

  async function handleStatusChange(leadId, newStatus) {
    try {
      const res = await api.updateMarketingLead(leadId, { status: newStatus });
      if (res.ok) {
        setMessage(`Status updated to ${newStatus}`);
        setTimeout(() => setMessage(null), 3000);
        loadLeads();
      }
    } catch (err) {
      setError(err.message || 'Failed to update status');
    }
  }

  function startEditingNotes(lead) {
    setEditingNotesId(lead.id);
    setNotesDraft(lead.adminNotes || '');
  }

  async function saveNotes(leadId) {
    setSavingNotes(true);
    try {
      const res = await api.updateMarketingLead(leadId, { adminNotes: notesDraft.trim() || null });
      if (res.ok) {
        setEditingNotesId(null);
        setMessage('Internal admin note saved.');
        setTimeout(() => setMessage(null), 3000);
        loadLeads();
      }
    } catch (err) {
      setError(err.message || 'Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleDelete(leadId, collegeName) {
    if (!window.confirm(`Are you sure you want to delete the marketing request for "${collegeName}"?`)) {
      return;
    }
    try {
      await api.deleteMarketingLead(leadId);
      setMessage(`Deleted marketing lead for ${collegeName}.`);
      loadLeads();
    } catch (err) {
      setError(err.message || 'Failed to delete lead');
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
            📢 Promotion &amp; Marketing Leads Console
          </h1>
          <p style={{ fontSize: 13.5, color: '#64748b', margin: 0 }}>
            Manage college promotion requests, admissions campaigns, CBT exam sponsorships, and 1-click WhatsApp outreach.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a
            href="/#/promote"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
            style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span>🌐</span> View Public Form ↗
          </a>
          <button className="btn btn-primary" onClick={loadLeads} style={{ fontSize: 13 }}>
            🔄 Refresh Leads
          </button>
        </div>
      </div>

      {message && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#b91c1c', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="card card-pad" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>TOTAL REQUESTS</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{summary.total}</div>
        </div>
        <div className="card card-pad" style={{ padding: 14, borderLeft: '4px solid #b45309' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#b45309' }}>NEW / UNCONTACTED</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#b45309', marginTop: 4 }}>{summary.NEW}</div>
        </div>
        <div className="card card-pad" style={{ padding: 14, borderLeft: '4px solid #0369a1' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1' }}>CONTACTED</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0369a1', marginTop: 4 }}>{summary.CONTACTED}</div>
        </div>
        <div className="card card-pad" style={{ padding: 14, borderLeft: '4px solid #6d28d9' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#6d28d9' }}>PROPOSAL SENT</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#6d28d9', marginTop: 4 }}>{summary.PROPOSAL_SENT}</div>
        </div>
        <div className="card card-pad" style={{ padding: 14, borderLeft: '4px solid #15803d' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>CAMPAIGN LIVE</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#15803d', marginTop: 4 }}>{summary.CAMPAIGN_LIVE}</div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="card card-pad" style={{ padding: '12px 16px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['ALL', 'NEW', 'CONTACTED', 'PROPOSAL_SENT', 'CAMPAIGN_LIVE', 'CONVERTED', 'CLOSED'].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '6px 12px', fontSize: 12.5 }}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'ALL' ? 'All Leads' : tab.replace('_', ' ')}
                {tab !== 'ALL' && summary[tab] > 0 && ` (${summary[tab]})`}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Search college, person, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 220, fontSize: 13, padding: '6px 10px' }}
            />
            <button type="submit" className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }}>
              🔍
            </button>
          </form>
        </div>
      </div>

      {/* Leads List */}
      {loading ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : leads.length === 0 ? (
        <div className="card empty-state" style={{ padding: 40, textAlign: 'center' }}>
          <h3>No marketing leads found</h3>
          <p>Colleges requesting marketing and promotions will show up here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {leads.map((lead) => {
            const currentStatusOpt = STATUS_OPTIONS.find((s) => s.value === lead.status) || STATUS_OPTIONS[0];
            const cleanPhone = String(lead.phone || '').replace(/\D/g, '');
            const waGreeting = `Hello ${lead.contactPerson}, I am reaching out from QuestionStudio Digital Marketing & Promotions regarding your campaign request for ${lead.collegeName}. Would love to discuss target student reach and timeline.`;
            const waUrl = `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(waGreeting)}`;

            return (
              <div
                key={lead.id}
                className="card card-pad"
                style={{
                  borderRadius: 12,
                  borderLeft: `5px solid ${currentStatusOpt.color}`,
                  padding: '18px 20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                        🏛️ {lead.collegeName}
                      </h3>
                      {lead.institute && (
                        <span className="badge" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontSize: 11 }}>
                          Registered College (Balance: {lead.institute.creditBalance ?? 0} Credits)
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: currentStatusOpt.bg,
                          color: currentStatusOpt.color,
                        }}
                      >
                        {currentStatusOpt.label}
                      </span>
                    </div>

                    <div style={{ fontSize: 13, color: '#475569', marginTop: 4, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span>
                        👤 <b>{lead.contactPerson}</b> {lead.designation ? `(${lead.designation})` : ''}
                      </span>
                      <span>
                        📞 <b>+91 {cleanPhone.slice(-10)}</b>
                      </span>
                      {lead.email && <span>✉️ {lead.email}</span>}
                      <span>
                        📅 {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ background: '#25D366', borderColor: '#25D366', fontSize: 12.5, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <span>💬</span> WhatsApp College
                    </a>
                    <button
                      className="btn-danger-ghost"
                      style={{ fontSize: 12, padding: '6px 10px' }}
                      onClick={() => handleDelete(lead.id, lead.collegeName)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Campaign Scope & Details */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    padding: '12px 14px',
                    margin: '14px 0',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '10px 16px',
                    fontSize: 12.5,
                  }}
                >
                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600, display: 'block' }}>Requested Services:</span>
                    <span style={{ color: '#0f172a', fontWeight: 700 }}>{lead.promotionGoals}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600, display: 'block' }}>Target Cities / Districts:</span>
                    <span style={{ color: '#0f172a' }}>{lead.targetCities || 'Statewide / AP & Telangana'}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600, display: 'block' }}>Budget Range:</span>
                    <span style={{ color: '#0284c7', fontWeight: 700 }}>{lead.budgetRange || 'Flexible'}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600, display: 'block' }}>Target Student Intake:</span>
                    <span style={{ color: '#0f172a' }}>{lead.estimatedStudents || 'Not specified'}</span>
                  </div>
                </div>

                {lead.campaignNotes && (
                  <div style={{ fontSize: 12.5, color: '#334155', background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>
                    <b>Client Note:</b> &ldquo;{lead.campaignNotes}&rdquo;
                  </div>
                )}

                {/* Status Switcher & Admin Notes */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Update Status:</span>
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6 }}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {lead.contactedAt && (
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        (First contacted: {new Date(lead.contactedAt).toLocaleDateString('en-IN')})
                      </span>
                    )}
                  </div>

                  <div>
                    {editingNotesId === lead.id ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="Internal admin notes (e.g. called Principal Dr. Rao, proposal sent)"
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          style={{ width: 320, fontSize: 12, padding: '4px 8px' }}
                        />
                        <button className="btn btn-primary" style={{ fontSize: 11.5, padding: '4px 10px' }} onClick={() => saveNotes(lead.id)} disabled={savingNotes}>
                          Save
                        </button>
                        <button className="btn btn-ghost" style={{ fontSize: 11.5, padding: '4px 8px' }} onClick={() => setEditingNotesId(null)}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                        {lead.adminNotes ? (
                          <span style={{ color: '#475569', fontStyle: 'italic' }}>
                            📝 Admin Note: &ldquo;{lead.adminNotes}&rdquo;
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>No internal notes yet</span>
                        )}
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ fontSize: 11.5, padding: '2px 6px' }}
                          onClick={() => startEditingNotes(lead)}
                        >
                          ✏️ Edit Note
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
