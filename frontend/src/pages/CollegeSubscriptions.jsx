import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import SuperAdminFinancials from '../components/SuperAdminFinancials';

const NAVY = '#07154A';

const MODULES = [
  { key: 'OMR', name: 'OMR & Answer Keys', monthly: 999, annual: 9990, icon: '📝', desc: 'Scan and grade student answer sheets with instant key generation.' },
  { key: 'CBT', name: 'Online CBT Exams', monthly: 1999, annual: 19990, icon: '💻', desc: 'Computer-based test delivery with live candidate leaderboards.' },
  { key: 'COLLEGE_WEBSITE', name: 'College Website', monthly: 1499, annual: 14990, icon: '🌐', desc: 'Dynamic public portal, courses, admissions, and faculty showcase.' },
  { key: 'WHATSAPP', name: 'WhatsApp Automation', monthly: 499, annual: 4990, icon: '💬', desc: 'Automated student scorecard broadcasts & official college templates.' },
  { key: 'COMPLETE_BUNDLE', name: 'Complete Add-on Bundle', monthly: 4499, annual: 44990, icon: '⭐', desc: 'All 4 optional add-ons combined with priority infrastructure.' },
];

export default function CollegeSubscriptions() {
  const [institutes, setInstitutes] = useState([]);
  const [summary, setSummary] = useState({
    totalColleges: 0,
    activeSubscriptionsCount: 0,
    pendingRequestsCount: 0,
    expiredSubscriptionsCount: 0,
    suspendedSubscriptionsCount: 0,
    cancelledSubscriptionsCount: 0,
    totalMrr: 0,
    activeSubscriptionValue: 0,
    pendingSubscriptionValue: 0,
    collectedRevenue: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Active view tab: 'subscriptions' | 'pending' | 'matrix' | 'pricing' | 'history'
  const [activeTab, setActiveTab] = useState('subscriptions');

  // Search & Filter controls
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Global History feed
  const [globalHistory, setGlobalHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Modals state
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [activateForm, setActivateForm] = useState({
    instituteId: '',
    moduleKey: 'OMR',
    billingCycle: 'MONTHLY',
    durationDays: 30,
    priceRupeesSnapshot: 999,
    paymentMethod: 'MANUAL_UPI',
    paymentRef: '',
    note: '',
  });

  // Confirm Approve Modal
  const [approveTarget, setApproveTarget] = useState(null); // subscription object
  const [approveNote, setApproveNote] = useState('');
  const [approveDuration, setApproveDuration] = useState(30);

  // Confirm Reject Modal
  const [rejectTarget, setRejectTarget] = useState(null); // subscription object
  const [rejectReason, setRejectReason] = useState('');

  // Status Action Modal (Suspend / Reactivate / Cancel / Renew)
  const [actionModal, setActionModal] = useState(null); // { type, subscription, institute }
  const [actionNote, setActionNote] = useState('');
  const [renewDuration, setRenewDuration] = useState(30);

  // College Details Slide-over / Modal
  const [collegeDetails, setCollegeDetails] = useState(null);
  const [loadingCollege, setLoadingCollege] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // 1. Load Subscriptions & Metrics
  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.adminAllSubscriptions();
      if (res?.ok) {
        setInstitutes(res.institutes || []);
        setSummary({
          totalColleges: res.totalColleges ?? (res.institutes || []).length,
          activeSubscriptionsCount: res.activeSubscriptionsCount ?? 0,
          pendingRequestsCount: res.pendingRequestsCount ?? 0,
          expiredSubscriptionsCount: res.expiredSubscriptionsCount ?? 0,
          suspendedSubscriptionsCount: res.suspendedSubscriptionsCount ?? 0,
          cancelledSubscriptionsCount: res.cancelledSubscriptionsCount ?? 0,
          totalMrr: res.totalMrr ?? 0,
          activeSubscriptionValue: res.activeSubscriptionValue ?? 0,
          pendingSubscriptionValue: res.pendingSubscriptionValue ?? 0,
          collectedRevenue: res.collectedRevenue ?? 0,
        });

        // Default the instituteId in activateForm if empty
        if (!activateForm.instituteId && (res.institutes || []).length > 0) {
          setActivateForm((prev) => ({ ...prev, instituteId: res.institutes[0].id }));
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load college subscriptions.');
    } finally {
      setLoading(false);
    }
  }

  // 2. Load Global History
  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await api.getSubscriptionHistory({ limit: 100 });
      if (res?.ok) {
        setGlobalHistory(res.history || []);
      }
    } catch (err) {
      console.error('Failed to load audit history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  function showToast(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 5000);
  }

  // Flatten subscriptions across colleges for list view
  const allSubscriptionRows = useMemo(() => {
    const rows = [];
    institutes.forEach((inst) => {
      (inst.subscriptions || []).forEach((sub) => {
        rows.push({
          ...sub,
          instituteName: inst.name,
          instituteSlug: inst.slug,
          instituteCreditBalance: inst.creditBalance,
          instituteWaBalance: inst.whatsAppWalletBalance,
        });
      });
    });
    return rows;
  }, [institutes]);

  // Filtered rows for "All Subscriptions" tab
  const filteredSubscriptions = useMemo(() => {
    return allSubscriptionRows.filter((sub) => {
      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesName = (sub.instituteName || '').toLowerCase().includes(query);
        const matchesModule = (sub.moduleKey || '').toLowerCase().includes(query);
        const matchesSlug = (sub.instituteSlug || '').toLowerCase().includes(query);
        const matchesInstId = (sub.instituteId || '').toLowerCase().includes(query);
        if (!matchesName && !matchesModule && !matchesSlug && !matchesInstId) return false;
      }
      // Module filter
      if (moduleFilter !== 'ALL' && sub.moduleKey !== moduleFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'ALL' && sub.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [allSubscriptionRows, searchTerm, moduleFilter, statusFilter]);

  // Pending subscriptions queue
  const pendingRequests = useMemo(() => {
    return allSubscriptionRows.filter((sub) => sub.status === 'PENDING_VERIFICATION');
  }, [allSubscriptionRows]);

  // Helper: Open college details modal
  async function openCollegeDetails(instituteId) {
    setLoadingCollege(true);
    setCollegeDetails(null);
    try {
      const res = await api.getAdminCollegeSubscription(instituteId);
      if (res?.ok) {
        setCollegeDetails(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to load college details');
    } finally {
      setLoadingCollege(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Action Handlers (Approve, Reject, Suspend, Reactivate, Cancel, Renew, Activate)
  // ---------------------------------------------------------------------------

  // Handle Approve
  async function handleConfirmApprove() {
    if (!approveTarget) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.adminApproveSubscription({
        subscriptionId: approveTarget.id,
        instituteId: approveTarget.instituteId,
        moduleKey: approveTarget.moduleKey,
        durationDays: parseInt(approveDuration, 10) || 30,
        billingCycle: approveTarget.billingCycle,
        priceRupeesSnapshot: approveTarget.priceRupeesSnapshot,
        note: approveNote.trim() || 'Approved by Super Admin',
      });
      if (res?.ok) {
        showToast(res.message || `Approved ${approveTarget.moduleKey} for ${approveTarget.instituteName}`);
        setApproveTarget(null);
        setApproveNote('');
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to approve subscription');
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Reject
  async function handleConfirmReject() {
    if (!rejectTarget) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.adminRejectSubscription({
        instituteId: rejectTarget.instituteId,
        moduleKey: rejectTarget.moduleKey,
        note: rejectReason.trim() || 'Rejected by Super Admin',
      });
      if (res?.ok) {
        showToast(res.message || `Rejected request for ${rejectTarget.moduleKey}`);
        setRejectTarget(null);
        setRejectReason('');
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to reject request');
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Status Actions: Suspend | Reactivate | Cancel | Renew
  async function handleConfirmStatusAction() {
    if (!actionModal) return;
    const { type, subscription } = actionModal;
    setSubmitting(true);
    setError(null);

    try {
      let res;
      if (type === 'SUSPEND') {
        res = await api.adminSuspendSubscription({
          instituteId: subscription.instituteId,
          moduleKey: subscription.moduleKey,
          note: actionNote.trim() || 'Suspended by Super Admin',
        });
      } else if (type === 'REACTIVATE') {
        res = await api.adminReactivateSubscription({
          instituteId: subscription.instituteId,
          moduleKey: subscription.moduleKey,
          note: actionNote.trim() || 'Reactivated by Super Admin',
        });
      } else if (type === 'CANCEL') {
        res = await api.adminCancelSubscription({
          instituteId: subscription.instituteId,
          moduleKey: subscription.moduleKey,
          note: actionNote.trim() || 'Cancelled by Super Admin',
        });
      } else if (type === 'RENEW') {
        res = await api.adminRenewSubscription({
          instituteId: subscription.instituteId,
          moduleKey: subscription.moduleKey,
          durationDays: parseInt(renewDuration, 10) || 30,
          billingCycle: subscription.billingCycle,
          priceRupeesSnapshot: subscription.priceRupeesSnapshot,
          note: actionNote.trim() || 'Renewed by Super Admin',
        });
      }

      if (res?.ok) {
        showToast(res.message || `Action ${type} completed successfully`);
        setActionModal(null);
        setActionNote('');
        loadData();
      }
    } catch (err) {
      setError(err.message || `Failed to perform ${actionModal.type} action`);
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Provision / Manual Activation
  function openProvisionModal(instId = '', modKey = 'OMR') {
    const mod = MODULES.find((m) => m.key === modKey);
    setActivateForm({
      instituteId: instId || (institutes[0]?.id || ''),
      moduleKey: modKey,
      billingCycle: 'MONTHLY',
      durationDays: 30,
      priceRupeesSnapshot: mod?.monthly || 999,
      paymentMethod: 'MANUAL_UPI',
      paymentRef: '',
      note: '',
    });
    setShowActivateModal(true);
  }

  function handleModuleChangeInProvision(key) {
    const mod = MODULES.find((m) => m.key === key);
    const cycle = activateForm.billingCycle;
    const price = cycle === 'ANNUAL' ? (mod?.annual || 9990) : (mod?.monthly || 999);
    setActivateForm((prev) => ({
      ...prev,
      moduleKey: key,
      priceRupeesSnapshot: price,
    }));
  }

  function handleCycleChangeInProvision(cycle) {
    const mod = MODULES.find((m) => m.key === activateForm.moduleKey);
    const price = cycle === 'ANNUAL' ? (mod?.annual || 9990) : (mod?.monthly || 999);
    const days = cycle === 'ANNUAL' ? 365 : 30;
    setActivateForm((prev) => ({
      ...prev,
      billingCycle: cycle,
      priceRupeesSnapshot: price,
      durationDays: days,
    }));
  }

  async function handleProvisionSubmit(e) {
    e.preventDefault();
    if (!activateForm.instituteId) {
      setError('Please select an institute');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.adminActivateSubscription({
        instituteId: activateForm.instituteId,
        moduleKey: activateForm.moduleKey,
        billingCycle: activateForm.billingCycle,
        durationDays: parseInt(activateForm.durationDays, 10) || 30,
        priceRupeesSnapshot: parseInt(activateForm.priceRupeesSnapshot, 10) || 0,
        paymentMethod: activateForm.paymentMethod,
        paymentRef: activateForm.paymentRef.trim() || null,
        note: activateForm.note.trim() || null,
      });
      if (res?.ok) {
        showToast(res.message || 'Subscription provisioned and activated successfully!');
        setShowActivateModal(false);
        loadData();
      }
    } catch (err) {
      setError(err.message || 'Provisioning failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ width: '100%', padding: '0 4px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* =========================================================================
          PAGE HERO BANNER
          ========================================================================= */}
      <div className="studio-hero">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="studio-badge">
              <span>🏷️</span>
              <span>Platform Command &bull; Subscriptions &amp; Licensing</span>
            </div>
            <h1 className="studio-title">College Subscriptions &amp; Add-on Licensing</h1>
            <p className="studio-sub">
              Verify institutional subscription requests, manage active module entitlements, monitor renewals, and inspect recurring revenue.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => openProvisionModal()}
              className="btn btn-primary"
              style={{
                padding: '11px 20px',
                fontWeight: 800,
                fontSize: 13.5,
              }}
            >
              <span>＋</span> Provision Module / Bundle
            </button>

            <button
              type="button"
              onClick={loadData}
              className="btn btn-secondary"
              style={{
                padding: '10px 18px',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              🔄 Refresh Data
            </button>
          </div>
        </div>

        {/* Live Metrics Ribbon */}
        <div className="studio-chips">
          <div className="studio-chip">
            <span>Colleges:</span> <strong>{summary.totalColleges}</strong>
          </div>
          <div className="studio-chip">
            <span>Active Modules:</span> <strong style={{ color: '#4ADE80' }}>{summary.activeSubscriptionsCount}</strong>
          </div>
          <div className="studio-chip">
            <span>Pending Approvals:</span> <strong style={{ color: summary.pendingRequestsCount > 0 ? '#FBBF24' : '#94A3B8' }}>{summary.pendingRequestsCount}</strong>
          </div>
          <div className="studio-chip">
            <span>Monthly Run Rate:</span> <strong style={{ color: '#60A5FA' }}>₹{summary.totalMrr.toLocaleString('en-IN')}</strong>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 18px', borderRadius: 10, fontSize: 13.5, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '12px 18px', borderRadius: 10, fontSize: 13.5, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>✓</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* =========================================================================
          SECTION 1: 6 SUMMARY STAT CARDS (LIVE DATABASE VALUES ONLY)
          ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 20 }}>
        {/* Total Colleges */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Registered Colleges
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: NAVY, marginTop: 4 }}>
            {summary.totalColleges}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Platform institutions</div>
        </div>

        {/* Active Subscriptions */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Active Subscriptions
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a', marginTop: 4 }}>
            {summary.activeSubscriptionsCount}
          </div>
          <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2 }}>● Modules currently active</div>
        </div>

        {/* Pending Requests */}
        <div style={{
          background: summary.pendingRequestsCount > 0 ? '#fffbeb' : '#ffffff',
          border: summary.pendingRequestsCount > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '16px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: summary.pendingRequestsCount > 0 ? '#b45309' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Pending Requests
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: summary.pendingRequestsCount > 0 ? '#d97706' : '#64748b', marginTop: 4 }}>
            {summary.pendingRequestsCount}
          </div>
          <div style={{ fontSize: 11, color: summary.pendingRequestsCount > 0 ? '#b45309' : '#94a3b8', marginTop: 2 }}>
            {summary.pendingRequestsCount > 0 ? 'Action required in queue' : 'All requests reviewed'}
          </div>
        </div>

        {/* Expired Subscriptions */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Expired
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: summary.expiredSubscriptionsCount > 0 ? '#dc2626' : '#64748b', marginTop: 4 }}>
            {summary.expiredSubscriptionsCount}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Due for renewal</div>
        </div>

        {/* Suspended Subscriptions */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Suspended
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: summary.suspendedSubscriptionsCount > 0 ? '#ea580c' : '#64748b', marginTop: 4 }}>
            {summary.suspendedSubscriptionsCount}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Temporarily held</div>
        </div>

        {/* Monthly Recurring Value (MRR) */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Monthly Run Rate (MRR)
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: NAVY, marginTop: 4 }}>
            ₹{summary.totalMrr.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 11, color: '#0284c7', marginTop: 2 }}>Active monthly subscription value</div>
        </div>
      </div>

      {/* =========================================================================
          REVENUE & VALUE DISTINCTION BANNER (NO DUMMY DATA)
          ========================================================================= */}
      <div style={{
        background: 'linear-gradient(135deg, #07154A 0%, #0369a1 100%)',
        color: '#ffffff',
        padding: '18px 24px',
        borderRadius: 14,
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        boxShadow: '0 4px 16px rgba(7, 21, 74, 0.12)',
      }}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#93c5fd', fontWeight: 700 }}>
              Active Subscription Committed Value
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>
              ₹{summary.activeSubscriptionValue.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: 11, color: '#e0f2fe' }}>Total value of verified active terms</div>
          </div>

          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 24 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#86efac', fontWeight: 700 }}>
              Actual Realized Revenue
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>
              ₹{summary.collectedRevenue.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: 11, color: '#dcfce7' }}>Verified paid subscription revenue</div>
          </div>

          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 24 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fde047', fontWeight: 700 }}>
              Pending Pipeline Value
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>
              ₹{summary.pendingSubscriptionValue.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: 11, color: '#fef08a' }}>Awaiting Super Admin approval (not counted as revenue)</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {summary.pendingRequestsCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              style={{
                background: '#fef3c7',
                color: '#92400e',
                border: 'none',
                padding: '9px 16px',
                borderRadius: 8,
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>⏳</span> Review {summary.pendingRequestsCount} Pending Request{summary.pendingRequestsCount !== 1 ? 's' : ''} &rarr;
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('financials')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.4)',
              padding: '9px 16px',
              borderRadius: 8,
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>💰</span> Financial Command &rarr;
          </button>
        </div>
      </div>

      {/* =========================================================================
          INTERACTIVE NAVIGATION TABS
          ========================================================================= */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '2px solid #e2e8f0', marginBottom: 22, overflowX: 'auto' }}>
        <button
          type="button"
          onClick={() => setActiveTab('financials')}
          style={{
            padding: '11px 18px',
            border: 'none',
            background: activeTab === 'financials' ? '#f0fdf4' : 'transparent',
            borderBottom: activeTab === 'financials' ? '3px solid #16a34a' : '3px solid transparent',
            color: activeTab === 'financials' ? '#166534' : '#475569',
            fontWeight: activeTab === 'financials' ? 800 : 600,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: -2,
            borderRadius: '8px 8px 0 0',
          }}
        >
          <span>💰</span> Financials, Payments &amp; Invoices
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subscriptions')}
          style={{
            padding: '11px 18px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'subscriptions' ? `3px solid ${NAVY}` : '3px solid transparent',
            color: activeTab === 'subscriptions' ? NAVY : '#64748b',
            fontWeight: activeTab === 'subscriptions' ? 800 : 600,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: -2,
          }}
        >
          <span>📋</span> All Subscriptions ({allSubscriptionRows.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '11px 18px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'pending' ? `3px solid #d97706` : '3px solid transparent',
            color: activeTab === 'pending' ? '#d97706' : '#64748b',
            fontWeight: activeTab === 'pending' ? 800 : 600,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: -2,
          }}
        >
          <span>⏳</span> Pending Requests
          {pendingRequests.length > 0 && (
            <span style={{ background: '#f59e0b', color: '#ffffff', padding: '2px 7px', borderRadius: 12, fontSize: 11, fontWeight: 800 }}>
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          style={{
            padding: '11px 18px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'matrix' ? `3px solid ${NAVY}` : '3px solid transparent',
            color: activeTab === 'matrix' ? NAVY : '#64748b',
            fontWeight: activeTab === 'matrix' ? 800 : 600,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: -2,
          }}
        >
          <span>🏛️</span> College Matrix ({institutes.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pricing')}
          style={{
            padding: '11px 18px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'pricing' ? `3px solid ${NAVY}` : '3px solid transparent',
            color: activeTab === 'pricing' ? NAVY : '#64748b',
            fontWeight: activeTab === 'pricing' ? 800 : 600,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: -2,
          }}
        >
          <span>🏷️</span> Pricing Reference
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          style={{
            padding: '11px 18px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'history' ? `3px solid ${NAVY}` : '3px solid transparent',
            color: activeTab === 'history' ? NAVY : '#64748b',
            fontWeight: activeTab === 'history' ? 800 : 600,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: -2,
          }}
        >
          <span>📜</span> Audit History
        </button>
      </div>

      {/* =========================================================================
          TAB 0: SUPER ADMIN FINANCIAL COMMAND, RECONCILIATION & INVOICES (PHASE 3E)
          ========================================================================= */}
      {activeTab === 'financials' && (
        <SuperAdminFinancials onRefreshParent={loadData} />
      )}

      {/* =========================================================================
          TAB 1: ALL SUBSCRIPTIONS (SEARCHABLE & FILTERABLE TABLE)
          ========================================================================= */}
      {activeTab === 'subscriptions' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          {/* Filter Bar */}
          <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ flex: '1 1 240px', minWidth: 200 }}>
              <input
                type="text"
                placeholder="Search by college name, code, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            {/* Module Filter */}
            <div style={{ minWidth: 160 }}>
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600 }}
              >
                <option value="ALL">All Modules</option>
                <option value="OMR">📝 OMR &amp; Keys</option>
                <option value="CBT">💻 Online CBT</option>
                <option value="COLLEGE_WEBSITE">🌐 College Website</option>
                <option value="WHATSAPP">💬 WhatsApp Automation</option>
                <option value="COMPLETE_BUNDLE">⭐ Complete Bundle</option>
              </select>
            </div>

            {/* Status Filter */}
            <div style={{ minWidth: 150 }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600 }}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING_VERIFICATION">Pending Approval</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {(searchTerm || moduleFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setModuleFilter('ALL');
                  setStatusFilter('ALL');
                }}
                style={{ padding: '8px 12px', background: '#e2e8f0', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', color: '#475569' }}
              >
                Reset Filters
              </button>
            )}

            <div style={{ marginLeft: 'auto', fontSize: 12.5, color: '#64748b', fontWeight: 600 }}>
              Showing {filteredSubscriptions.length} of {allSubscriptionRows.length} subscriptions
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading subscriptions...</div>
          ) : filteredSubscriptions.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
              <h3 style={{ margin: '0 0 6px', color: '#1e293b' }}>No subscriptions found</h3>
              <p style={{ margin: 0, fontSize: 13.5 }}>
                {allSubscriptionRows.length === 0
                  ? 'No colleges have requested or activated subscriptions yet.'
                  : 'No subscription records match your search criteria.'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#475569', fontWeight: 700 }}>
                    <th style={{ padding: '12px 16px' }}>College Name</th>
                    <th style={{ padding: '12px 14px' }}>Module / License</th>
                    <th style={{ padding: '12px 12px' }}>Type &amp; Cycle</th>
                    <th style={{ padding: '12px 12px' }}>Amount</th>
                    <th style={{ padding: '12px 12px' }}>Start Date</th>
                    <th style={{ padding: '12px 12px' }}>Renewal Date</th>
                    <th style={{ padding: '12px 12px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscriptions.map((sub) => {
                    const mod = MODULES.find((m) => m.key === sub.moduleKey) || { name: sub.moduleKey, icon: '📦' };
                    const isBundle = sub.moduleKey === 'COMPLETE_BUNDLE';
                    const renewal = sub.renewalDate ? new Date(sub.renewalDate) : null;
                    const daysLeft = renewal ? Math.ceil((renewal.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

                    return (
                      <tr key={sub.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {/* College Name */}
                        <td style={{ padding: '14px 16px' }}>
                          <button
                            type="button"
                            onClick={() => openCollegeDetails(sub.instituteId)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              padding: 0,
                              fontWeight: 700,
                              color: NAVY,
                              fontSize: 13.5,
                              textAlign: 'left',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                            }}
                          >
                            {sub.instituteName}
                          </button>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>ID: {sub.instituteId}</div>
                        </td>

                        {/* Module */}
                        <td style={{ padding: '14px 14px' }}>
                          <span style={{ fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{mod.icon}</span> {mod.name}
                          </span>
                        </td>

                        {/* Type & Cycle */}
                        <td style={{ padding: '14px 12px' }}>
                          <span style={{
                            display: 'inline-block',
                            background: isBundle ? '#fae8ff' : '#f1f5f9',
                            color: isBundle ? '#86198f' : '#475569',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11.5,
                            fontWeight: 700,
                          }}>
                            {isBundle ? '⭐ Bundle' : 'Individual'} • {sub.billingCycle}
                          </span>
                        </td>

                        {/* Amount */}
                        <td style={{ padding: '14px 12px' }}>
                          <span style={{ fontWeight: 800, color: NAVY }}>
                            ₹{sub.priceRupeesSnapshot?.toLocaleString('en-IN') || 0}
                          </span>
                          <span style={{ fontSize: 11, color: '#64748b' }}>
                            /{sub.billingCycle === 'ANNUAL' ? 'yr' : 'mo'}
                          </span>
                        </td>

                        {/* Start Date */}
                        <td style={{ padding: '14px 12px', color: '#475569', fontSize: 12 }}>
                          {sub.startsAt ? new Date(sub.startsAt).toLocaleDateString() : '—'}
                        </td>

                        {/* Renewal Date */}
                        <td style={{ padding: '14px 12px' }}>
                          {renewal ? (
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                                {renewal.toLocaleDateString()}
                              </div>
                              {sub.status === 'ACTIVE' && (
                                <div style={{ fontSize: 11, color: daysLeft < 5 ? '#dc2626' : '#64748b', fontWeight: daysLeft < 5 ? 700 : 400 }}>
                                  {daysLeft > 0 ? `${daysLeft}d left` : 'Due today'}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 12px' }}>
                          <StatusBadge status={sub.status} isActive={sub.isActive} note={sub.note} />
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                            {/* If PENDING */}
                            {sub.status === 'PENDING_VERIFICATION' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setApproveTarget(sub);
                                    setApproveDuration(sub.billingCycle === 'ANNUAL' ? 365 : 30);
                                  }}
                                  style={{
                                    padding: '5px 10px',
                                    background: '#16a34a',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  ✓ Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRejectTarget(sub)}
                                  style={{
                                    padding: '5px 10px',
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    border: '1px solid #fca5a5',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  ✕ Reject
                                </button>
                              </>
                            )}

                            {/* If ACTIVE */}
                            {sub.status === 'ACTIVE' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setActionModal({ type: 'SUSPEND', subscription: sub })}
                                  style={{
                                    padding: '5px 9px',
                                    background: '#fffbeb',
                                    color: '#b45309',
                                    border: '1px solid #fde68a',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Suspend
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActionModal({ type: 'RENEW', subscription: sub })}
                                  style={{
                                    padding: '5px 9px',
                                    background: '#f0fdf4',
                                    color: '#15803d',
                                    border: '1px solid #bbf7d0',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  ↻ Renew
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActionModal({ type: 'CANCEL', subscription: sub })}
                                  style={{
                                    padding: '5px 9px',
                                    background: '#f8fafc',
                                    color: '#64748b',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Cancel
                                </button>
                              </>
                            )}

                            {/* If SUSPENDED */}
                            {sub.status === 'SUSPENDED' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setActionModal({ type: 'REACTIVATE', subscription: sub })}
                                  style={{
                                    padding: '5px 10px',
                                    background: '#16a34a',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  ▶ Reactivate
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActionModal({ type: 'CANCEL', subscription: sub })}
                                  style={{
                                    padding: '5px 9px',
                                    background: '#f8fafc',
                                    color: '#dc2626',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Cancel
                                </button>
                              </>
                            )}

                            {/* If EXPIRED or CANCELLED */}
                            {(sub.status === 'EXPIRED' || sub.status === 'CANCELLED') && (
                              <button
                                type="button"
                                onClick={() => setActionModal({ type: 'RENEW', subscription: sub })}
                                style={{
                                  padding: '5px 10px',
                                  background: '#0284c7',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                ↻ Re-provision
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: PENDING APPROVAL QUEUE
          ========================================================================= */}
      {activeTab === 'pending' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '16px 20px', background: '#fffbeb', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#92400e' }}>
                Pending Subscription Requests Queue ({pendingRequests.length})
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: '#b45309' }}>
                Requests submitted by College Administrators. Gated from platform access until approved below.
              </p>
            </div>
          </div>

          {pendingRequests.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
              <h3 style={{ margin: '0 0 6px', color: '#16a34a' }}>All caught up!</h3>
              <p style={{ margin: 0, fontSize: 13.5 }}>There are no pending subscription requests awaiting review.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#475569', fontWeight: 700 }}>
                    <th style={{ padding: '12px 16px' }}>College / Institution</th>
                    <th style={{ padding: '12px 14px' }}>Requested Module</th>
                    <th style={{ padding: '12px 12px' }}>Billing Cycle</th>
                    <th style={{ padding: '12px 12px' }}>Snapshot Value</th>
                    <th style={{ padding: '12px 12px' }}>Requested At</th>
                    <th style={{ padding: '12px 14px' }}>Notes / Request Details</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map((sub) => {
                    const mod = MODULES.find((m) => m.key === sub.moduleKey) || { name: sub.moduleKey, icon: '📦' };

                    return (
                      <tr key={sub.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 700, color: NAVY }}>{sub.instituteName}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>ID: {sub.instituteId}</div>
                        </td>

                        <td style={{ padding: '14px 14px' }}>
                          <span style={{ fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{mod.icon}</span> {mod.name}
                          </span>
                        </td>

                        <td style={{ padding: '14px 12px' }}>
                          <span style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11.5,
                            fontWeight: 700,
                          }}>
                            {sub.billingCycle}
                          </span>
                        </td>

                        <td style={{ padding: '14px 12px' }}>
                          <span style={{ fontWeight: 800, color: '#b45309', fontSize: 14 }}>
                            ₹{sub.priceRupeesSnapshot?.toLocaleString('en-IN') || 0}
                          </span>
                        </td>

                        <td style={{ padding: '14px 12px', fontSize: 12, color: '#64748b' }}>
                          {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : '—'}
                        </td>

                        <td style={{ padding: '14px 14px', fontSize: 12, color: '#475569' }}>
                          {sub.note || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Requested via dashboard</span>}
                        </td>

                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => {
                                setApproveTarget(sub);
                                setApproveDuration(sub.billingCycle === 'ANNUAL' ? 365 : 30);
                              }}
                              style={{
                                padding: '6px 12px',
                                background: '#16a34a',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: 6,
                                fontSize: 12.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              ✓ Approve &amp; Activate
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectTarget(sub)}
                              style={{
                                padding: '6px 12px',
                                background: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #fca5a5',
                                borderRadius: 6,
                                fontSize: 12.5,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              ✕ Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: COLLEGE MATRIX VIEW (5 MODULES AT A GLANCE)
          ========================================================================= */}
      {activeTab === 'matrix' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
              Institutional Licensing Matrix
            </h2>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Showing {institutes.length} registered institutions
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '12px 16px' }}>College / Institute</th>
                  <th style={{ padding: '12px 12px', textAlign: 'center' }}>Core Credits</th>
                  <th style={{ padding: '12px 12px', textAlign: 'center' }}>OMR (₹999)</th>
                  <th style={{ padding: '12px 12px', textAlign: 'center' }}>CBT (₹1,999)</th>
                  <th style={{ padding: '12px 12px', textAlign: 'center' }}>Website (₹1,499)</th>
                  <th style={{ padding: '12px 12px', textAlign: 'center' }}>WhatsApp (₹499)</th>
                  <th style={{ padding: '12px 12px', textAlign: 'center' }}>Bundle (₹4,499)</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {institutes.map((inst) => {
                  const subs = inst.subscriptions || [];
                  const getSub = (key) => subs.find((s) => s.moduleKey === key);
                  const hasBundle = Boolean(getSub('COMPLETE_BUNDLE')?.isActive && getSub('COMPLETE_BUNDLE')?.status === 'ACTIVE');

                  return (
                    <tr key={inst.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <button
                          type="button"
                          onClick={() => openCollegeDetails(inst.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            fontWeight: 700,
                            color: NAVY,
                            fontSize: 14,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          {inst.name}
                        </button>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>ID: {inst.id}</div>
                      </td>

                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: 6, fontWeight: 700 }}>
                          {(inst.creditBalance || 0).toLocaleString()} Cr
                        </span>
                      </td>

                      {/* OMR */}
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <ModuleStatusBadge
                          sub={getSub('OMR')}
                          inheritedFromBundle={hasBundle}
                          onActivate={() => openProvisionModal(inst.id, 'OMR')}
                          onAction={(type) => setActionModal({ type, subscription: { ...getSub('OMR'), instituteId: inst.id, moduleKey: 'OMR' } })}
                        />
                      </td>

                      {/* CBT */}
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <ModuleStatusBadge
                          sub={getSub('CBT')}
                          inheritedFromBundle={hasBundle}
                          onActivate={() => openProvisionModal(inst.id, 'CBT')}
                          onAction={(type) => setActionModal({ type, subscription: { ...getSub('CBT'), instituteId: inst.id, moduleKey: 'CBT' } })}
                        />
                      </td>

                      {/* Website */}
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <ModuleStatusBadge
                          sub={getSub('COLLEGE_WEBSITE')}
                          inheritedFromBundle={hasBundle}
                          onActivate={() => openProvisionModal(inst.id, 'COLLEGE_WEBSITE')}
                          onAction={(type) => setActionModal({ type, subscription: { ...getSub('COLLEGE_WEBSITE'), instituteId: inst.id, moduleKey: 'COLLEGE_WEBSITE' } })}
                        />
                      </td>

                      {/* WhatsApp */}
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <ModuleStatusBadge
                          sub={getSub('WHATSAPP')}
                          inheritedFromBundle={hasBundle}
                          onActivate={() => openProvisionModal(inst.id, 'WHATSAPP')}
                          onAction={(type) => setActionModal({ type, subscription: { ...getSub('WHATSAPP'), instituteId: inst.id, moduleKey: 'WHATSAPP' } })}
                        />
                      </td>

                      {/* Complete Bundle */}
                      <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                        <ModuleStatusBadge
                          sub={getSub('COMPLETE_BUNDLE')}
                          isBundle={true}
                          onActivate={() => openProvisionModal(inst.id, 'COMPLETE_BUNDLE')}
                          onAction={(type) => setActionModal({ type, subscription: { ...getSub('COMPLETE_BUNDLE'), instituteId: inst.id, moduleKey: 'COMPLETE_BUNDLE' } })}
                        />
                      </td>

                      {/* Row Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => openProvisionModal(inst.id)}
                          style={{
                            padding: '4px 10px',
                            background: '#e0f2fe',
                            color: '#0369a1',
                            border: '1px solid #bae6fd',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          + Provision
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: PRICING REFERENCE MANAGEMENT (SYSTEM CONFIGURED / READ-ONLY)
          ========================================================================= */}
      {activeTab === 'pricing' && (
        <div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: NAVY }}>
                Configured System Subscription Prices
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                Active baseline catalog prices for institutional billing. Annual billing provides 2 months free (10× monthly rate).
              </p>
            </div>
            <span style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
              System Managed (Read-Only)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {MODULES.map((mod) => (
              <div
                key={mod.key}
                style={{
                  background: '#ffffff',
                  border: mod.key === 'COMPLETE_BUNDLE' ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '20px',
                  boxShadow: mod.key === 'COMPLETE_BUNDLE' ? '0 8px 24px rgba(139, 92, 246, 0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                  position: 'relative',
                }}
              >
                {mod.key === 'COMPLETE_BUNDLE' && (
                  <span style={{ position: 'absolute', top: -11, right: 16, background: '#8b5cf6', color: '#ffffff', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>
                    All-in-One Best Value
                  </span>
                )}

                <div style={{ fontSize: 28, marginBottom: 8 }}>{mod.icon}</div>
                <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: NAVY }}>{mod.name}</h4>
                <p style={{ margin: '0 0 16px', fontSize: 12.5, color: '#64748b', minHeight: 34 }}>{mod.desc}</p>

                <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Monthly Plan</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: NAVY }}>₹{mod.monthly.toLocaleString('en-IN')}<span style={{ fontSize: 11, fontWeight: 400 }}>/mo</span></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Annual Plan</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>₹{mod.annual.toLocaleString('en-IN')}<span style={{ fontSize: 11, fontWeight: 400 }}>/yr</span></span>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700, textAlign: 'center' }}>
                  ✓ 2 Months Free on Annual Billing
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: GLOBAL AUDIT HISTORY LOG
          ========================================================================= */}
      {activeTab === 'history' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: NAVY }}>
                Subscription Administrative Audit Trail
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b' }}>
                Immutable historical event ledger of activations, renewals, suspensions, cancellations, and requests.
              </p>
            </div>
            <button
              type="button"
              onClick={loadHistory}
              disabled={historyLoading}
              style={{ padding: '6px 12px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              {historyLoading ? 'Refreshing...' : '↻ Refresh Log'}
            </button>
          </div>

          {historyLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading audit history...</div>
          ) : globalHistory.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📜</div>
              <h3 style={{ margin: '0 0 6px', color: '#1e293b' }}>No audit history recorded yet</h3>
              <p style={{ margin: 0, fontSize: 13.5 }}>Administrative actions taken on subscriptions will appear here automatically.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#475569', fontWeight: 700 }}>
                    <th style={{ padding: '10px 16px' }}>Date &amp; Time</th>
                    <th style={{ padding: '10px 14px' }}>College</th>
                    <th style={{ padding: '10px 12px' }}>Module</th>
                    <th style={{ padding: '10px 12px' }}>Action</th>
                    <th style={{ padding: '10px 12px' }}>Cycle &amp; Amount</th>
                    <th style={{ padding: '10px 14px' }}>Performed By</th>
                    <th style={{ padding: '10px 16px' }}>Audit Note</th>
                  </tr>
                </thead>
                <tbody>
                  {globalHistory.map((h) => (
                    <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {new Date(h.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: NAVY }}>
                        {h.institute?.name || h.instituteId}
                      </td>
                      <td style={{ padding: '12px 12px', fontWeight: 600 }}>
                        {h.moduleKey}
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <ActionBadge action={h.action} />
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <span style={{ fontWeight: 700 }}>₹{(h.priceRupeesSnapshot || 0).toLocaleString('en-IN')}</span>
                        <span style={{ fontSize: 11, color: '#64748b' }}> ({h.billingCycle})</span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#475569', fontSize: 12 }}>
                        {h.performedByEmail || 'system'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155', maxWidth: 300 }}>
                        {h.note || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL 1: CONFIRM APPROVE (WITH CONFIRMATION DIALOGUE)
          ========================================================================= */}
      {approveTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => !submitting && setApproveTarget(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              maxWidth: 480,
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ background: '#16a34a', color: '#ffffff', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
                ✓ Confirm Approval &amp; Activation
              </h3>
              <button
                type="button"
                onClick={() => setApproveTarget(null)}
                disabled={submitting}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: 18, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 20 }}>
              <p style={{ margin: '0 0 16px', fontSize: 14, color: '#334155', lineHeight: 1.5 }}>
                You are about to approve and activate the subscription request for:
              </p>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ fontWeight: 800, color: NAVY, fontSize: 15 }}>{approveTarget.instituteName}</div>
                <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 700, marginTop: 4 }}>
                  {approveTarget.moduleKey} ({approveTarget.billingCycle}) — ₹{approveTarget.priceRupeesSnapshot?.toLocaleString('en-IN')}
                </div>
                {approveTarget.note && (
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Note: {approveTarget.note}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Subscription Duration (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={approveDuration}
                  onChange={(e) => setApproveDuration(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Approval Note / Payment Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified bank transfer, approved for term"
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setApproveTarget(null)}
                  disabled={submitting}
                  style={{ padding: '9px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApprove}
                  disabled={submitting}
                  style={{ padding: '9px 18px', background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
                >
                  {submitting ? 'Activating...' : 'Confirm & Activate Access'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: CONFIRM REJECT (WITH CONFIRMATION DIALOGUE)
          ========================================================================= */}
      {rejectTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => !submitting && setRejectTarget(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              maxWidth: 460,
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ background: '#dc2626', color: '#ffffff', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
                ✕ Reject Subscription Request
              </h3>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                disabled={submitting}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: 18, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 20 }}>
              <p style={{ margin: '0 0 14px', fontSize: 14, color: '#334155', lineHeight: 1.5 }}>
                Are you sure you want to reject the subscription request for <strong>{rejectTarget.moduleKey}</strong> from <strong>{rejectTarget.instituteName}</strong>?
              </p>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Rejection Reason / Internal Audit Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Duplicate request, unconfirmed institutional contact"
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  disabled={submitting}
                  style={{ padding: '9px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={submitting}
                  style={{ padding: '9px 18px', background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
                >
                  {submitting ? 'Rejecting...' : 'Confirm & Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: STATUS ACTIONS (SUSPEND / REACTIVATE / CANCEL / RENEW)
          ========================================================================= */}
      {actionModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => !submitting && setActionModal(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              maxWidth: 460,
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              background: actionModal.type === 'SUSPEND' ? '#d97706' : actionModal.type === 'REACTIVATE' ? '#16a34a' : actionModal.type === 'CANCEL' ? '#dc2626' : NAVY,
              color: '#ffffff',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
                {actionModal.type === 'SUSPEND' && '⏸ Suspend Module Access'}
                {actionModal.type === 'REACTIVATE' && '▶ Reactivate Suspended Subscription'}
                {actionModal.type === 'CANCEL' && '✕ Cancel Subscription'}
                {actionModal.type === 'RENEW' && '↻ Renew Subscription Period'}
              </h3>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                disabled={submitting}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: 18, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 20 }}>
              <p style={{ margin: '0 0 14px', fontSize: 14, color: '#334155', lineHeight: 1.5 }}>
                Action for <strong>{actionModal.subscription.moduleKey}</strong> on <strong>{actionModal.subscription.instituteName || 'Selected Institute'}</strong>.
              </p>

              {actionModal.type === 'RENEW' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Extension Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={renewDuration}
                    onChange={(e) => setRenewDuration(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                  />
                </div>
              )}

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Audit Reason / Note
                </label>
                <input
                  type="text"
                  placeholder={`Reason for ${actionModal.type.toLowerCase()}...`}
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  disabled={submitting}
                  style={{ padding: '9px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmStatusAction}
                  disabled={submitting}
                  style={{
                    padding: '9px 18px',
                    background: actionModal.type === 'SUSPEND' ? '#d97706' : actionModal.type === 'REACTIVATE' ? '#16a34a' : actionModal.type === 'CANCEL' ? '#dc2626' : NAVY,
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {submitting ? 'Updating...' : `Confirm ${actionModal.type}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: PROVISION MODULE / BUNDLE (MANUAL OVERRIDE / NEW)
          ========================================================================= */}
      {showActivateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => !submitting && setShowActivateModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              maxWidth: 520,
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ background: NAVY, color: '#ffffff', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
                Provision College Module / Bundle
              </h3>
              <button
                type="button"
                onClick={() => setShowActivateModal(false)}
                disabled={submitting}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: 18, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProvisionSubmit} style={{ padding: 20 }}>
              {/* College Selection */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Target College / Institution
                </label>
                <select
                  value={activateForm.instituteId}
                  onChange={(e) => setActivateForm((prev) => ({ ...prev, instituteId: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                >
                  {institutes.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Module Selection */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Module or Bundle
                </label>
                <select
                  value={activateForm.moduleKey}
                  onChange={(e) => handleModuleChangeInProvision(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 600 }}
                >
                  {MODULES.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.icon} {m.name} — ₹{m.monthly.toLocaleString('en-IN')}/mo | ₹{m.annual.toLocaleString('en-IN')}/yr
                    </option>
                  ))}
                </select>
              </div>

              {/* Billing Cycle & Duration */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Billing Cycle
                  </label>
                  <select
                    value={activateForm.billingCycle}
                    onChange={(e) => handleCycleChangeInProvision(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                  >
                    <option value="MONTHLY">Monthly (30 Days)</option>
                    <option value="ANNUAL">Annual (365 Days — 2 Mo Free)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={activateForm.durationDays}
                    onChange={(e) => setActivateForm((prev) => ({ ...prev, durationDays: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                  />
                </div>
              </div>

              {/* Price Snapshot */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Price Snapshot (₹ Recorded)
                </label>
                <input
                  type="number"
                  min="0"
                  value={activateForm.priceRupeesSnapshot}
                  onChange={(e) => setActivateForm((prev) => ({ ...prev, priceRupeesSnapshot: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 700 }}
                />
              </div>

              {/* Payment Method & Ref */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Payment Method
                  </label>
                  <select
                    value={activateForm.paymentMethod}
                    onChange={(e) => setActivateForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                  >
                    <option value="MANUAL_UPI">Manual UPI / QR</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                    <option value="OFFLINE_CHEQUE">Offline Cheque / Cash</option>
                    <option value="ADMIN_COMPLIMENTARY">Admin Complimentary</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Payment Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="UTR / Cheque ref..."
                    value={activateForm.paymentRef}
                    onChange={(e) => setActivateForm((prev) => ({ ...prev, paymentRef: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                  />
                </div>
              </div>

              {/* Internal Note */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Internal Audit Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Approved per annual institutional MoU"
                  value={activateForm.note}
                  onChange={(e) => setActivateForm((prev) => ({ ...prev, note: e.target.value }))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14 }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowActivateModal(false)}
                  disabled={submitting}
                  style={{ padding: '9px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '9px 18px', background: NAVY, color: '#ffffff', border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
                >
                  {submitting ? 'Provisioning...' : 'Confirm & Activate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 5: COLLEGE SUBSCRIPTION PROFILE & AUDIT DETAILS
          ========================================================================= */}
      {collegeDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setCollegeDetails(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 14,
              maxWidth: 680,
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ background: NAVY, color: '#ffffff', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
                  {collegeDetails.institute?.name}
                </h3>
                <div style={{ fontSize: 12, color: '#93c5fd', marginTop: 2 }}>
                  ID: {collegeDetails.institute?.id} • Slug: {collegeDetails.institute?.slug}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCollegeDetails(null)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: 18, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 20 }}>
              {/* Account Balances */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Paper Generation Credits</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: NAVY, marginTop: 2 }}>
                    {(collegeDetails.institute?.creditBalance || 0).toLocaleString()} Cr
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>WhatsApp Wallet</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#047857', marginTop: 2 }}>
                    ₹{(collegeDetails.institute?.whatsAppWalletBalance || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Subscriptions */}
              <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800, color: NAVY }}>
                Subscribed Modules
              </h4>
              {(collegeDetails.subscriptions || []).length === 0 ? (
                <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px' }}>No subscription records found for this college.</p>
              ) : (
                <div style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
                  {(collegeDetails.subscriptions || []).map((sub) => (
                    <div key={sub.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff' }}>
                      <div>
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{sub.moduleKey}</span>
                        <span style={{ fontSize: 11.5, color: '#64748b', marginLeft: 8 }}>
                          ₹{sub.priceRupeesSnapshot?.toLocaleString('en-IN')} ({sub.billingCycle})
                        </span>
                        {sub.renewalDate && (
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            Renews: {new Date(sub.renewalDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <StatusBadge status={sub.status} isActive={sub.isActive} note={sub.note} />
                    </div>
                  ))}
                </div>
              )}

              {/* Recent History */}
              <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800, color: NAVY }}>
                Recent Audit History
              </h4>
              {(collegeDetails.history || []).length === 0 ? (
                <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>No audit history events recorded yet.</p>
              ) : (
                <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <tbody>
                      {(collegeDetails.history || []).map((h) => (
                        <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                            {new Date(h.createdAt).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>{h.moduleKey}</td>
                          <td style={{ padding: '8px 10px' }}><ActionBadge action={h.action} /></td>
                          <td style={{ padding: '8px 12px', color: '#475569' }}>{h.note || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Sub-components: Status Badge & Action Badge
// -----------------------------------------------------------------------------
function StatusBadge({ status, isActive, note }) {
  const isCancelReq = note && note.includes('Cancellation Requested');

  if (isCancelReq) {
    return (
      <span style={{ background: '#f3e8ff', color: '#7e22ce', border: '1px solid #d8b4fe', padding: '3px 8px', borderRadius: 12, fontSize: 11.5, fontWeight: 800 }}>
        📝 Cancel Requested
      </span>
    );
  }

  switch (status) {
    case 'ACTIVE':
      return (
        <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '3px 8px', borderRadius: 12, fontSize: 11.5, fontWeight: 800 }}>
          ✓ Active
        </span>
      );
    case 'PENDING_VERIFICATION':
      return (
        <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: 12, fontSize: 11.5, fontWeight: 800 }}>
          ⏳ Pending Approval
        </span>
      );
    case 'SUSPENDED':
      return (
        <span style={{ background: '#fffbeb', color: '#ea580c', border: '1px solid #fed7aa', padding: '3px 8px', borderRadius: 12, fontSize: 11.5, fontWeight: 800 }}>
          ⏸ Suspended
        </span>
      );
    case 'EXPIRED':
      return (
        <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', padding: '3px 8px', borderRadius: 12, fontSize: 11.5, fontWeight: 800 }}>
          ✕ Expired
        </span>
      );
    case 'CANCELLED':
      return (
        <span style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: 12, fontSize: 11.5, fontWeight: 700 }}>
          Cancelled
        </span>
      );
    default:
      return (
        <span style={{ background: '#f8fafc', color: '#94a3b8', padding: '3px 8px', borderRadius: 12, fontSize: 11.5 }}>
          {status}
        </span>
      );
  }
}

function ActionBadge({ action }) {
  let bg = '#f1f5f9';
  let color = '#475569';

  if (action === 'ACTIVATED' || action === 'APPROVED' || action === 'REACTIVATED') {
    bg = '#dcfce7';
    color = '#15803d';
  } else if (action === 'RENEWED') {
    bg = '#e0f2fe';
    color = '#0369a1';
  } else if (action === 'REQUESTED') {
    bg = '#fef3c7';
    color = '#b45309';
  } else if (action === 'SUSPENDED') {
    bg = '#fffbeb';
    color = '#ea580c';
  } else if (action === 'REJECTED' || action === 'CANCELLED') {
    bg = '#fee2e2';
    color = '#dc2626';
  } else if (action === 'CANCEL_REQUESTED') {
    bg = '#f3e8ff';
    color = '#7e22ce';
  }

  return (
    <span style={{ background: bg, color, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
      {action}
    </span>
  );
}

function ModuleStatusBadge({ sub, inheritedFromBundle = false, isBundle = false, onActivate, onAction }) {
  if (inheritedFromBundle) {
    return (
      <span
        title="Active via Complete Bundle"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: '#f3e8ff',
          color: '#6b21a8',
          padding: '3px 8px',
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        ✓ Bundle
      </span>
    );
  }

  if (!sub || !sub.isActive || sub.status !== 'ACTIVE') {
    const isPending = sub?.status === 'PENDING_VERIFICATION';
    const isCancelRequested = sub?.note && sub.note.includes('Cancellation Requested');
    const isExpired = sub?.status === 'EXPIRED';
    const isSuspended = sub?.status === 'SUSPENDED';

    if (isPending) {
      return (
        <span
          title="Pending Super Admin Approval"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: '#fef3c7',
            color: '#b45309',
            border: '1px solid #fde68a',
            padding: '3px 8px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          ⏳ Pending
        </span>
      );
    }

    if (isCancelRequested) {
      return (
        <span
          title="Cancellation Requested by College"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: '#f3e8ff',
            color: '#9333ea',
            border: '1px solid #e9d5ff',
            padding: '3px 8px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          📝 Cancel Req
        </span>
      );
    }

    if (isSuspended) {
      return (
        <button
          type="button"
          onClick={() => onAction && onAction('REACTIVATE')}
          title="Suspended — Click to Reactivate"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: '#fffbeb',
            color: '#d97706',
            border: '1px dashed #fcd34d',
            padding: '3px 8px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ⏸ Suspended
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={onActivate}
        title={isExpired ? 'Expired — Click to Renew' : 'Inactive — Click to Provision'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: isExpired ? '#fef2f2' : '#f8fafc',
          color: isExpired ? '#dc2626' : '#94a3b8',
          border: '1px dashed ' + (isExpired ? '#fca5a5' : '#cbd5e1'),
          padding: '3px 8px',
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {isExpired ? 'Expired ↻' : '+ Inactive'}
      </button>
    );
  }

  const renewal = sub.renewalDate ? new Date(sub.renewalDate) : null;
  const daysLeft = renewal ? Math.ceil((renewal.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <button
        type="button"
        onClick={() => onAction && onAction('SUSPEND')}
        title={`Click to Manage/Suspend. Renewal: ${renewal ? renewal.toLocaleDateString() : 'N/A'}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: isBundle ? '#fae8ff' : '#dcfce7',
          color: isBundle ? '#86198f' : '#15803d',
          border: 'none',
          padding: '3px 8px',
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        ✓ {isBundle ? 'Bundle Active' : 'Active'}
      </button>
      {daysLeft !== null && (
        <span style={{ fontSize: 10, color: daysLeft < 5 ? '#dc2626' : '#64748b' }}>
          {daysLeft > 0 ? `${daysLeft}d left` : 'Due today'}
        </span>
      )}
    </div>
  );
}
