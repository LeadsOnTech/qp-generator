import { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';

const NAVY = '#07154A';

const MODULE_NAMES = {
  OMR: 'OMR & Answer Keys',
  CBT: 'Online CBT Exams',
  COLLEGE_WEBSITE: 'College Website',
  WHATSAPP: 'WhatsApp Automation',
  COMPLETE_BUNDLE: 'Complete Add-on Bundle',
};

export default function SuperAdminFinancials({ onRefreshParent = null }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Active Financial Sub-tab: 'overview' | 'transactions' | 'invoices' | 'offline' | 'refunds' | 'reports'
  const [activeSubTab, setActiveSubTab] = useState('overview');

  // Server Data
  const [financialData, setFinancialData] = useState({
    summary: {
      totalCollectedPaise: 0,
      totalCollectedRupees: 0,
      monthlyRevenuePaise: 0,
      monthlyRevenueRupees: 0,
      annualRevenuePaise: 0,
      annualRevenueRupees: 0,
      pendingPaymentsCount: 0,
      pendingPaymentsPaise: 0,
      pendingPaymentsRupees: 0,
      failedPaymentsCount: 0,
      failedPaymentsPaise: 0,
      failedPaymentsRupees: 0,
      refundedPaymentsCount: 0,
      refundedPaymentsPaise: 0,
      refundedPaymentsRupees: 0,
      totalActivePaidSubscriptions: 0,
      outstandingOfflineRequestsCount: 0,
      totalInvoicesIssued: 0,
      totalTaxCollectedRupees: 0,
      totalGatewayFeesPaise: 0,
      totalNetSettledPaise: 0,
      whatsAppSoftwareRevenueRupees: 0,
      totalWhatsAppWalletBalance: 0,
    },
    reports: {
      daily: [],
      monthly: [],
      annual: [],
      moduleWise: [],
      collegeWise: [],
      gstSummary: { taxableBaseRupees: 0, cgstRupees: 0, sgstRupees: 0, igstRupees: 0, totalTaxRupees: 0 },
      refundSummary: { count: 0, totalRefundedRupees: 0 },
    },
    payments: [],
    invoices: [],
    offlineRequests: [],
    institutesList: [],
  });

  // Filter Controls
  const [searchTerm, setSearchTerm] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('ALL');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [cycleFilter, setCycleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals state
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [offlineModalTarget, setOfflineModalTarget] = useState(null);
  const [offlineForm, setOfflineForm] = useState({
    paymentMethod: 'NEFT_RTGS',
    paymentRef: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const [refundModalTarget, setRefundModalTarget] = useState(null);
  const [refundForm, setRefundForm] = useState({
    refundReference: '',
    refundAmountRupees: '',
    reason: '',
    deactivateSubscription: true,
  });

  const [rejectModalTarget, setRejectModalTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const [actionLoading, setActionLoading] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  // Tax & GST Configuration State (Phase 4A)
  const [taxConfig, setTaxConfig] = useState({
    gstRateBps: 1800,
    gstRatePercent: '18.00',
    sacCode: '998313',
    sellerGstin: '36AAACQ0000A1Z5',
    sellerName: 'QuestionsStudio EdTech Technologies Pvt. Ltd.',
    sellerAddress: 'Hyderabad, Telangana, India',
    sellerState: 'Telangana',
    invoicePrefix: 'QS',
    caApproved: false,
    notes: '',
  });
  const [loadingTaxConfig, setLoadingTaxConfig] = useState(false);
  const [savingTaxConfig, setSavingTaxConfig] = useState(false);

  function showToast(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 5000);
  }

  // Load Financial Data
  async function loadFinancials() {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (collegeFilter !== 'ALL') params.instituteId = collegeFilter;
      if (moduleFilter !== 'ALL') params.moduleKey = moduleFilter;
      if (cycleFilter !== 'ALL') params.billingCycle = cycleFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.getAdminPaymentReconciliation(params);
      if (res?.ok) {
        setFinancialData({
          summary: res.summary || {},
          reports: res.reports || {},
          payments: res.payments || [],
          invoices: res.invoices || [],
          offlineRequests: res.offlineRequests || [],
          institutesList: res.institutesList || [],
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load financial reconciliation report.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFinancials();
  }, [collegeFilter, moduleFilter, cycleFilter, statusFilter, startDate, endDate]);

  // Handle Search Input Debounce or Enter
  function handleSearchSubmit(e) {
    e.preventDefault();
    loadFinancials();
  }

  function resetFilters() {
    setSearchTerm('');
    setCollegeFilter('ALL');
    setModuleFilter('ALL');
    setCycleFilter('ALL');
    setStatusFilter('ALL');
    setStartDate('');
    setEndDate('');
  }

  // Record Verified Offline Payment
  async function handleRecordOfflineSubmit(e) {
    e.preventDefault();
    if (!offlineModalTarget) return;
    if (!offlineForm.paymentRef.trim()) {
      alert('Please enter a valid UTR, Cheque number, or Bank Transaction Reference.');
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const res = await api.recordAdminOfflinePayment({
        instituteId: offlineModalTarget.instituteId,
        moduleKey: offlineModalTarget.moduleKey,
        billingCycle: offlineModalTarget.billingCycle || 'MONTHLY',
        paymentMethod: offlineForm.paymentMethod,
        paymentRef: offlineForm.paymentRef.trim(),
        paymentDate: offlineForm.paymentDate,
        notes: offlineForm.notes.trim() || null,
        subscriptionId: offlineModalTarget.id,
      });

      if (res?.ok) {
        showToast(res.message || 'Offline payment verified and subscription activated!');
        setOfflineModalTarget(null);
        setOfflineForm({
          paymentMethod: 'NEFT_RTGS',
          paymentRef: '',
          paymentDate: new Date().toISOString().slice(0, 10),
          notes: '',
        });
        loadFinancials();
        if (onRefreshParent) onRefreshParent();
      }
    } catch (err) {
      setError(err.message || 'Failed to record offline payment.');
    } finally {
      setActionLoading(false);
    }
  }

  // Process Refund
  async function handleRefundSubmit(e) {
    e.preventDefault();
    if (!refundModalTarget) return;
    if (!refundForm.refundReference.trim()) {
      alert('Please enter a refund transaction reference / UTR.');
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const amountPaise = refundForm.refundAmountRupees
        ? Math.round(parseFloat(refundForm.refundAmountRupees) * 100)
        : refundModalTarget.totalAmountPaise;

      const res = await api.processAdminRefund({
        paymentId: refundModalTarget.id,
        refundReference: refundForm.refundReference.trim(),
        refundAmountPaise: amountPaise,
        reason: refundForm.reason.trim() || null,
        deactivateSubscription: refundForm.deactivateSubscription,
      });

      if (res?.ok) {
        showToast(res.message || 'Refund successfully processed and recorded.');
        setRefundModalTarget(null);
        setRefundForm({
          refundReference: '',
          refundAmountRupees: '',
          reason: '',
          deactivateSubscription: true,
        });
        loadFinancials();
        if (onRefreshParent) onRefreshParent();
      }
    } catch (err) {
      setError(err.message || 'Failed to process refund.');
    } finally {
      setActionLoading(false);
    }
  }

  // Reject Offline Request
  async function handleRejectOfflineSubmit(e) {
    e.preventDefault();
    if (!rejectModalTarget) return;
    setActionLoading(true);
    try {
      const res = await api.adminRejectSubscription({
        subscriptionId: rejectModalTarget.id,
        reason: rejectReason.trim() || 'Rejected by Super Admin',
      });
      if (res?.ok) {
        showToast('Subscription request rejected.');
        setRejectModalTarget(null);
        setRejectReason('');
        loadFinancials();
        if (onRefreshParent) onRefreshParent();
      }
    } catch (err) {
      setError(err.message || 'Failed to reject request.');
    } finally {
      setActionLoading(false);
    }
  }

  // Download CSV Export
  async function handleExportCsv() {
    setExportingCsv(true);
    try {
      const params = {};
      if (collegeFilter !== 'ALL') params.instituteId = collegeFilter;
      if (moduleFilter !== 'ALL') params.moduleKey = moduleFilter;
      if (cycleFilter !== 'ALL') params.billingCycle = cycleFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      await api.downloadAdminFinancialReportCsv(params);
      showToast('Financial transactions report exported successfully.');
    } catch (err) {
      alert('CSV Export failed: ' + err.message);
    } finally {
      setExportingCsv(false);
    }
  }

  // Load Tax Config
  async function loadTaxConfig() {
    setLoadingTaxConfig(true);
    try {
      const res = await api.getAdminTaxConfig();
      if (res?.ok && res.config) {
        setTaxConfig(res.config);
      }
    } catch (err) {
      console.error('Failed to load tax config:', err);
    } finally {
      setLoadingTaxConfig(false);
    }
  }

  // Save Tax Config
  async function handleSaveTaxConfig(e) {
    e.preventDefault();
    setSavingTaxConfig(true);
    try {
      const res = await api.updateAdminTaxConfig({
        gstRateBps: parseInt(taxConfig.gstRateBps, 10),
        sacCode: taxConfig.sacCode,
        sellerGstin: taxConfig.sellerGstin,
        sellerName: taxConfig.sellerName,
        sellerAddress: taxConfig.sellerAddress,
        sellerState: taxConfig.sellerState,
        invoicePrefix: taxConfig.invoicePrefix,
        caApproved: taxConfig.caApproved,
      });
      if (res?.ok) {
        showToast(res.message || 'Tax and GST configuration saved successfully.');
        loadTaxConfig();
      }
    } catch (err) {
      alert('Failed to save tax settings: ' + err.message);
    } finally {
      setSavingTaxConfig(false);
    }
  }

  useEffect(() => {
    if (activeSubTab === 'tax_config') {
      loadTaxConfig();
    }
  }, [activeSubTab]);

  const { summary, reports, payments, invoices, offlineRequests, institutesList } = financialData;

  return (
    <div style={{ marginTop: 20 }}>
      {/* Messages */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 18px', borderRadius: 10, fontSize: 13.5, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '12px 18px', borderRadius: 10, fontSize: 13.5, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>✓</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB NAVIGATION BAR
          ========================================================================= */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '2px solid #e2e8f0', marginBottom: 22, overflowX: 'auto', background: '#f8fafc', padding: '8px 12px', borderRadius: 12 }}>
        <button
          type="button"
          onClick={() => setActiveSubTab('overview')}
          style={{
            padding: '9px 16px',
            borderRadius: 8,
            border: 'none',
            background: activeSubTab === 'overview' ? NAVY : 'transparent',
            color: activeSubTab === 'overview' ? '#ffffff' : '#475569',
            fontWeight: activeSubTab === 'overview' ? 800 : 600,
            fontSize: 13.5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>📊</span> Financial Overview
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('transactions')}
          style={{
            padding: '9px 16px',
            borderRadius: 8,
            border: 'none',
            background: activeSubTab === 'transactions' ? NAVY : 'transparent',
            color: activeSubTab === 'transactions' ? '#ffffff' : '#475569',
            fontWeight: activeSubTab === 'transactions' ? 800 : 600,
            fontSize: 13.5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>💳</span> Payment Transactions ({payments.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('invoices')}
          style={{
            padding: '9px 16px',
            borderRadius: 8,
            border: 'none',
            background: activeSubTab === 'invoices' ? NAVY : 'transparent',
            color: activeSubTab === 'invoices' ? '#ffffff' : '#475569',
            fontWeight: activeSubTab === 'invoices' ? 800 : 600,
            fontSize: 13.5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>🧾</span> Invoice Repository ({invoices.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('offline')}
          style={{
            padding: '9px 16px',
            borderRadius: 8,
            border: 'none',
            background: activeSubTab === 'offline' ? '#d97706' : 'transparent',
            color: activeSubTab === 'offline' ? '#ffffff' : '#475569',
            fontWeight: activeSubTab === 'offline' ? 800 : 600,
            fontSize: 13.5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>🏛️</span> Offline Institutional Requests
          {offlineRequests.length > 0 && (
            <span style={{ background: activeSubTab === 'offline' ? '#ffffff' : '#f59e0b', color: activeSubTab === 'offline' ? '#d97706' : '#ffffff', padding: '1px 6px', borderRadius: 10, fontSize: 11, fontWeight: 900 }}>
              {offlineRequests.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('refunds')}
          style={{
            padding: '9px 16px',
            borderRadius: 8,
            border: 'none',
            background: activeSubTab === 'refunds' ? '#7c3aed' : 'transparent',
            color: activeSubTab === 'refunds' ? '#ffffff' : '#475569',
            fontWeight: activeSubTab === 'refunds' ? 800 : 600,
            fontSize: 13.5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>↩️</span> Refund Management ({summary.refundedPaymentsCount || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('reports')}
          style={{
            padding: '9px 16px',
            borderRadius: 8,
            border: 'none',
            background: activeSubTab === 'reports' ? NAVY : 'transparent',
            color: activeSubTab === 'reports' ? '#ffffff' : '#475569',
            fontWeight: activeSubTab === 'reports' ? 800 : 600,
            fontSize: 13.5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>📈</span> Reports &amp; CSV Export
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('tax_config')}
          style={{
            padding: '9px 16px',
            borderRadius: 8,
            border: 'none',
            background: activeSubTab === 'tax_config' ? '#0f766e' : 'transparent',
            color: activeSubTab === 'tax_config' ? '#ffffff' : '#475569',
            fontWeight: activeSubTab === 'tax_config' ? 800 : 600,
            fontSize: 13.5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>⚖️</span> Tax &amp; CA Compliance
          {!taxConfig.caApproved && (
            <span style={{ background: '#f59e0b', color: '#ffffff', padding: '1px 6px', borderRadius: 10, fontSize: 10, fontWeight: 800 }}>
              Audit Required
            </span>
          )}
        </button>
      </div>

      {/* =========================================================================
          SECTION 1: FINANCIAL OVERVIEW CARDS (LIVE DATABASE VALUES ONLY)
          ========================================================================= */}
      {activeSubTab === 'overview' && (
        <div>
          {/* Main 8 Real KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 22 }}>
            {/* Card 1: Total Subscription Payments Received */}
            <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: 12, padding: '18px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Revenue Collected (Gross)
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#15803d', marginTop: 4 }}>
                ₹{summary.totalCollectedRupees.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 11.5, color: '#166534', marginTop: 4 }}>
                {summary.successfulTransactionsCount} verified successful payment{summary.successfulTransactionsCount !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Card 2: Monthly Subscription Revenue */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Monthly Subscriptions
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#0284c7', marginTop: 4 }}>
                ₹{summary.monthlyRevenueRupees.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                Total collected from monthly cycle
              </div>
            </div>

            {/* Card 3: Annual Subscription Revenue */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Annual Subscriptions
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#7c3aed', marginTop: 4 }}>
                ₹{summary.annualRevenueRupees.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                Total collected from 365-day annual terms
              </div>
            </div>

            {/* Card 4: Total Active Paid Subscriptions */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active Paid Subscriptions
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: NAVY, marginTop: 4 }}>
                {summary.totalActivePaidSubscriptions}
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                Entitlements currently live and verified
              </div>
            </div>

            {/* Card 5: Pending Payments (Strictly NOT counted as revenue) */}
            <div style={{ background: '#fffbeb', border: '1px solid #fef08a', borderRadius: 12, padding: '18px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pending Gateway Orders
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#b45309', marginTop: 4 }}>
                {summary.pendingPaymentsCount} <span style={{ fontSize: 16, fontWeight: 600 }}>(₹{summary.pendingPaymentsRupees.toLocaleString('en-IN')})</span>
              </div>
              <div style={{ fontSize: 11.5, color: '#92400e', marginTop: 4 }}>
                Awaiting completion (0% revenue recognized)
              </div>
            </div>

            {/* Card 6: Failed Payments */}
            <div style={{ background: '#ffffff', border: '1px solid #fecaca', borderRadius: 12, padding: '18px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Failed / Abandoned Orders
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#dc2626', marginTop: 4 }}>
                {summary.failedPaymentsCount} <span style={{ fontSize: 16, fontWeight: 600 }}>(₹{summary.failedPaymentsRupees.toLocaleString('en-IN')})</span>
              </div>
              <div style={{ fontSize: 11.5, color: '#991b1b', marginTop: 4 }}>
                Payment rejected or timed out
              </div>
            </div>

            {/* Card 7: Refunded Payments */}
            <div style={{ background: '#ffffff', border: '1px solid #e9d5ff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#6b21a8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Refunded Transactions
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#7e22ce', marginTop: 4 }}>
                {summary.refundedPaymentsCount} <span style={{ fontSize: 16, fontWeight: 600 }}>(₹{summary.refundedPaymentsRupees.toLocaleString('en-IN')})</span>
              </div>
              <div style={{ fontSize: 11.5, color: '#6b21a8', marginTop: 4 }}>
                Settled refunds with revoked access
              </div>
            </div>

            {/* Card 8: Outstanding Offline Requests */}
            <div style={{ background: '#ffffff', border: '1px solid #fed7aa', borderRadius: 12, padding: '18px 20px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pending Offline PO Requests
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#c2410c', marginTop: 4 }}>
                {summary.outstandingOfflineRequestsCount}
              </div>
              <div style={{ fontSize: 11.5, color: '#9a3412', marginTop: 4 }}>
                Bank transfer &amp; NEFT requests to verify
              </div>
            </div>
          </div>

          {/* WhatsApp Billing Segregation & Strict Ledger Banner */}
          <div style={{ background: 'linear-gradient(135deg, #07154A 0%, #1e3a8a 100%)', color: '#ffffff', padding: '20px 24px', borderRadius: 14, marginBottom: 24, boxShadow: '0 4px 12px rgba(7, 21, 74, 0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>💬</span>
                  <span style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#93c5fd' }}>
                    Strict WhatsApp Billing &amp; Usage Separation Rule
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13.5, color: '#e0e7ff', maxWidth: 840, lineHeight: 1.5 }}>
                  The <strong>WhatsApp Automation software add-on subscription</strong> (₹499/month or ₹4,990/year) is included in subscription revenue.
                  Per enterprise accounting rules, <strong>Meta messaging fees and QuestionsStudio ₹0.20/delivered message wallet balances</strong> are maintained in an isolated wallet and are strictly excluded from subscription software revenue.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 24, background: 'rgba(255,255,255,0.1)', padding: '12px 20px', borderRadius: 10, backdropFilter: 'blur(8px)' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#93c5fd', textTransform: 'uppercase', fontWeight: 700 }}>WhatsApp Software Subscriptions</div>
                  <div style={{ fontSize: 20, fontWeight: 900, marginTop: 2 }}>₹{summary.whatsAppSoftwareRevenueRupees.toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: 10.5, color: '#cbd5e1' }}>Recognized in Subscription Ledger</div>
                </div>
                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 20 }}>
                  <div style={{ fontSize: 11, color: '#86efac', textTransform: 'uppercase', fontWeight: 700 }}>Active Colleges Messaging Wallet</div>
                  <div style={{ fontSize: 20, fontWeight: 900, marginTop: 2 }}>₹{summary.totalWhatsAppWalletBalance.toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: 10.5, color: '#cbd5e1' }}>Prepaid Message Balance (Excluded)</div>
                </div>
              </div>
            </div>
          </div>

          {/* GST Summary & Invoicing Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Taxable Base Amount</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginTop: 2 }}>₹{reports.gstSummary.taxableBaseRupees.toLocaleString('en-IN')}</div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Central GST (CGST @ 9%)</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginTop: 2 }}>₹{reports.gstSummary.cgstRupees.toLocaleString('en-IN')}</div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>State GST (SGST @ 9%)</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginTop: 2 }}>₹{reports.gstSummary.sgstRupees.toLocaleString('en-IN')}</div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total GST Collected</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a', marginTop: 2 }}>₹{reports.gstSummary.totalTaxRupees.toLocaleString('en-IN')}</div>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>B2B Tax Invoices Issued</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0284c7', marginTop: 2 }}>{summary.totalInvoicesIssued}</div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FILTER BAR (SHARED ACROSS TRANSACTIONS, INVOICES, REPORTS)
          ========================================================================= */}
      {(activeSubTab === 'transactions' || activeSubTab === 'invoices' || activeSubTab === 'reports') && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {/* Search Input */}
            <div style={{ flex: '1 1 200px', minWidth: 180 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Search Ledger
              </label>
              <input
                type="text"
                placeholder="College, order ID, payment ref, invoice #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>

            {/* College Filter */}
            <div style={{ flex: '1 1 160px', minWidth: 140 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                College
              </label>
              <select
                value={collegeFilter}
                onChange={(e) => setCollegeFilter(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#ffffff' }}
              >
                <option value="ALL">All Colleges</option>
                {institutesList.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </div>

            {/* Module Filter */}
            <div style={{ flex: '1 1 140px', minWidth: 130 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Module
              </label>
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#ffffff' }}
              >
                <option value="ALL">All Modules</option>
                <option value="OMR">OMR &amp; Keys</option>
                <option value="CBT">Online CBT</option>
                <option value="COLLEGE_WEBSITE">College Website</option>
                <option value="WHATSAPP">WhatsApp Automation</option>
                <option value="COMPLETE_BUNDLE">Complete Bundle</option>
              </select>
            </div>

            {/* Billing Cycle Filter */}
            <div style={{ flex: '1 1 110px', minWidth: 100 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Cycle
              </label>
              <select
                value={cycleFilter}
                onChange={(e) => setCycleFilter(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#ffffff' }}
              >
                <option value="ALL">All Cycles</option>
                <option value="MONTHLY">Monthly</option>
                <option value="ANNUAL">Annual</option>
              </select>
            </div>

            {/* Status Filter */}
            <div style={{ flex: '1 1 110px', minWidth: 100 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#ffffff' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="SUCCESS">Success</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>

            {/* Date Range */}
            <div style={{ flex: '1 1 120px', minWidth: 115 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '7px 8px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
              />
            </div>

            <div style={{ flex: '1 1 120px', minWidth: 115 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ width: '100%', padding: '7px 8px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5 }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="submit"
                style={{
                  padding: '9px 16px',
                  background: NAVY,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Filter
              </button>
              <button
                type="button"
                onClick={resetFilters}
                style={{
                  padding: '9px 12px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          SECTION 2: PAYMENT TRANSACTIONS TABLE
          ========================================================================= */}
      {activeSubTab === 'transactions' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: NAVY }}>
                Subscription Payment Transactions ({payments.length})
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#64748b' }}>
                Complete audit ledger of all online gateway orders, bank transfers, and manual payments.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exportingCsv || payments.length === 0}
              style={{
                padding: '8px 14px',
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: payments.length === 0 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>📥</span> {exportingCsv ? 'Exporting...' : 'Export Filtered Transactions (CSV)'}
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 14px' }}>Date</th>
                  <th style={{ padding: '12px 14px' }}>College</th>
                  <th style={{ padding: '12px 14px' }}>Module / Plan</th>
                  <th style={{ padding: '12px 14px' }}>Cycle</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Base (₹)</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>GST 18% (₹)</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Total (₹)</th>
                  <th style={{ padding: '12px 14px' }}>Payment Ref / UTR</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px' }}>Invoice</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                      No payment transactions match the active search and filter criteria.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => {
                    const statusBg =
                      p.status === 'SUCCESS' ? '#dcfce7' :
                      p.status === 'PENDING' ? '#fef3c7' :
                      p.status === 'REFUNDED' ? '#f3e8ff' : '#fee2e2';
                    const statusColor =
                      p.status === 'SUCCESS' ? '#15803d' :
                      p.status === 'PENDING' ? '#b45309' :
                      p.status === 'REFUNDED' ? '#7e22ce' : '#dc2626';

                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s ease' }}>
                        <td style={{ padding: '12px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: NAVY }}>
                          {p.institute?.name || 'N/A'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontWeight: 700, color: p.moduleKey === 'COMPLETE_BUNDLE' ? '#7e22ce' : '#0369a1' }}>
                            {MODULE_NAMES[p.moduleKey] || p.moduleKey}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            padding: '2px 7px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: p.billingCycle === 'ANNUAL' ? '#ede9fe' : '#e0f2fe',
                            color: p.billingCycle === 'ANNUAL' ? '#6d28d9' : '#0369a1',
                          }}>
                            {p.billingCycle}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600 }}>
                          ₹{(p.baseAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', color: '#64748b' }}>
                          ₹{(p.taxAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: NAVY }}>
                          ₹{(p.totalAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#475569', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <span title={p.gatewayPaymentId || p.gatewayOrderId}>
                            {p.gatewayPaymentId || p.gatewayOrderId || 'N/A'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 800, background: statusBg, color: statusColor }}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {p.invoice ? (
                            <button
                              type="button"
                              onClick={() => setSelectedInvoice(p.invoice)}
                              style={{ background: 'none', border: 'none', color: '#0284c7', textDecoration: 'underline', fontWeight: 700, fontSize: 12, cursor: 'pointer', padding: 0 }}
                            >
                              {p.invoice.invoiceNumber}
                            </button>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            {p.invoice && (
                              <button
                                type="button"
                                onClick={() => setSelectedInvoice(p.invoice)}
                                style={{ padding: '4px 8px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                              >
                                View Tax Invoice
                              </button>
                            )}
                            {p.status === 'SUCCESS' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRefundModalTarget(p);
                                  setRefundForm({
                                    refundReference: `RFND_${Date.now()}`,
                                    refundAmountRupees: (p.totalAmountPaise / 100).toFixed(2),
                                    reason: '',
                                    deactivateSubscription: true,
                                  });
                                }}
                                style={{ padding: '4px 8px', background: '#faf5ff', color: '#7e22ce', border: '1px solid #e9d5ff', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                              >
                                Refund
                              </button>
                            )}
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
      )}

      {/* =========================================================================
          SECTION 3: INVOICE MANAGEMENT
          ========================================================================= */}
      {activeSubTab === 'invoices' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: NAVY }}>
                Institutional GST Tax Invoices ({invoices.length})
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#64748b' }}>
                All generated B2B tax invoices with SAC 998313 classification and intra-state GST split.
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 14px' }}>Invoice #</th>
                  <th style={{ padding: '12px 14px' }}>Invoice Date</th>
                  <th style={{ padding: '12px 14px' }}>College / Tenant</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Taxable Base (₹)</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>CGST 9% (₹)</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>SGST 9% (₹)</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Gross Total (₹)</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                      No invoices issued yet.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0284c7' }}>
                        {inv.invoiceNumber}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>
                        {new Date(inv.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: NAVY }}>
                        {inv.institute?.name || 'N/A'}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 600 }}>
                        ₹{(inv.taxableAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#64748b' }}>
                        ₹{(inv.cgstAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', color: '#64748b' }}>
                        ₹{(inv.sgstAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 900, color: NAVY }}>
                        ₹{(inv.totalAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 800,
                          background: inv.status === 'PAID' ? '#dcfce7' : '#f3e8ff',
                          color: inv.status === 'PAID' ? '#15803d' : '#7e22ce',
                        }}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(inv)}
                          style={{
                            padding: '6px 12px',
                            background: '#0284c7',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <span>🖨️</span> View &amp; Print
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 4: OFFLINE INSTITUTIONAL PAYMENT REQUESTS
          ========================================================================= */}
      {activeSubTab === 'offline' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '16px 20px', background: '#fffbeb', borderBottom: '1px solid #fed7aa' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#9a3412' }}>
              Pending Offline Institutional Requests ({offlineRequests.length})
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9a3412' }}>
              Colleges that submitted offline Purchase Orders, Bank Transfer, or NEFT payment requests.
              <strong> Approving alone never counts as collected revenue.</strong> You must verify the bank transaction and record the payment reference.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 14px' }}>Request Date</th>
                  <th style={{ padding: '12px 14px' }}>College Name</th>
                  <th style={{ padding: '12px 14px' }}>Requested Module</th>
                  <th style={{ padding: '12px 14px' }}>Cycle</th>
                  <th style={{ padding: '12px 14px' }}>Price (₹)</th>
                  <th style={{ padding: '12px 14px' }}>College Reference / Note</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Super Admin Actions</th>
                </tr>
              </thead>
              <tbody>
                {offlineRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                      No pending offline payment requests at this time.
                    </td>
                  </tr>
                ) : (
                  offlineRequests.map((req) => (
                    <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>
                        {new Date(req.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: NAVY }}>
                        {req.institute?.name || 'N/A'}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: req.moduleKey === 'COMPLETE_BUNDLE' ? '#7e22ce' : '#0369a1' }}>
                        {MODULE_NAMES[req.moduleKey] || req.moduleKey}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ padding: '2px 7px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: req.billingCycle === 'ANNUAL' ? '#ede9fe' : '#e0f2fe', color: req.billingCycle === 'ANNUAL' ? '#6d28d9' : '#0369a1' }}>
                          {req.billingCycle}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 800 }}>
                        ₹{(req.priceRupeesSnapshot || 0).toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#475569' }}>
                        {req.paymentRef ? <div>Ref: <strong>{req.paymentRef}</strong></div> : null}
                        {req.note ? <div style={{ color: '#64748b' }}>{req.note}</div> : <span style={{ color: '#94a3b8' }}>None provided</span>}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setOfflineModalTarget(req);
                              setOfflineForm({
                                paymentMethod: req.paymentMethod || 'NEFT_RTGS',
                                paymentRef: req.paymentRef || '',
                                paymentDate: new Date().toISOString().slice(0, 10),
                                notes: req.note || '',
                              });
                            }}
                            style={{
                              padding: '6px 12px',
                              background: '#15803d',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span>✓</span> Record Payment &amp; Activate
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRejectModalTarget(req);
                              setRejectReason('');
                            }}
                            style={{
                              padding: '6px 10px',
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fca5a5',
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 5: REFUND MANAGEMENT
          ========================================================================= */}
      {activeSubTab === 'refunds' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ padding: '16px 20px', background: '#faf5ff', borderBottom: '1px solid #e9d5ff' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#7e22ce' }}>
              Refund Audit Ledger &amp; Management ({summary.refundedPaymentsCount || 0} Refunds Processed)
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b21a8' }}>
              Verified refund records. Refunds automatically update the payment ledger, revoke active module access, mark tax invoices as REFUNDED, and strictly block duplicate refund attempts.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 14px' }}>Refund Date</th>
                  <th style={{ padding: '12px 14px' }}>College Name</th>
                  <th style={{ padding: '12px 14px' }}>Module</th>
                  <th style={{ padding: '12px 14px' }}>Original Payment Ref</th>
                  <th style={{ padding: '12px 14px' }}>Refund Reference</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Refund Amount (₹)</th>
                  <th style={{ padding: '12px 14px' }}>Reason / Notes</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.filter((p) => p.status === 'REFUNDED').length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
                      No refund transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  payments.filter((p) => p.status === 'REFUNDED').map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', color: '#64748b' }}>
                        {p.refundedAt ? new Date(p.refundedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: NAVY }}>
                        {p.institute?.name || 'N/A'}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                        {MODULE_NAMES[p.moduleKey] || p.moduleKey}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b' }}>
                        {p.gatewayPaymentId || p.gatewayOrderId || 'N/A'}
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#7e22ce' }}>
                        {p.refundReference || 'N/A'}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>
                        ₹{((p.refundAmountPaise || p.totalAmountPaise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#475569' }}>
                        {p.notes || 'Super Admin processed refund'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 800, background: '#f3e8ff', color: '#7e22ce' }}>
                          REFUNDED
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 6: FINANCIAL REPORTS & AGGREGATIONS
          ========================================================================= */}
      {activeSubTab === 'reports' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
          {/* Module-wise Breakdown */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800, color: NAVY }}>
              Module-wise Revenue Breakdown
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: 11.5, textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px 0', textAlign: 'left' }}>Module</th>
                  <th style={{ padding: '8px 0', textAlign: 'center' }}>Transactions</th>
                  <th style={{ padding: '8px 0', textAlign: 'right' }}>Collected (₹)</th>
                </tr>
              </thead>
              <tbody>
                {reports.moduleWise.length === 0 ? (
                  <tr><td colSpan={3} style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8' }}>No data</td></tr>
                ) : (
                  reports.moduleWise.map((m) => (
                    <tr key={m.moduleKey} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 0', fontWeight: 700, color: NAVY }}>
                        {MODULE_NAMES[m.moduleKey] || m.moduleKey}
                      </td>
                      <td style={{ padding: '10px 0', textAlign: 'center' }}>{m.count}</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>
                        ₹{m.amountRupees.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* College-wise Breakdown */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800, color: NAVY }}>
              Top Colleges by Revenue
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: 11.5, textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px 0', textAlign: 'left' }}>College</th>
                  <th style={{ padding: '8px 0', textAlign: 'center' }}>Payments</th>
                  <th style={{ padding: '8px 0', textAlign: 'right' }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {reports.collegeWise.length === 0 ? (
                  <tr><td colSpan={3} style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8' }}>No data</td></tr>
                ) : (
                  reports.collegeWise.map((c) => (
                    <tr key={c.instituteId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 0', fontWeight: 700, color: NAVY }}>{c.name}</td>
                      <td style={{ padding: '10px 0', textAlign: 'center' }}>{c.count}</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 800, color: '#0284c7' }}>
                        ₹{c.amountRupees.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Daily Revenue Timeline */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800, color: NAVY }}>
              Daily Revenue Timeline
            </h4>
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: 11.5, textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 0', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '8px 0', textAlign: 'center' }}>Payments</th>
                    <th style={{ padding: '8px 0', textAlign: 'right' }}>Revenue (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.daily.length === 0 ? (
                    <tr><td colSpan={3} style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8' }}>No data</td></tr>
                  ) : (
                    reports.daily.map((d) => (
                      <tr key={d.date} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 0', color: '#64748b' }}>{d.date}</td>
                        <td style={{ padding: '8px 0', textAlign: 'center' }}>{d.count}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700, color: NAVY }}>
                          ₹{d.amountRupees.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly Revenue Timeline */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 800, color: NAVY }}>
              Monthly Revenue Aggregation
            </h4>
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: 11.5, textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 0', textAlign: 'left' }}>Month</th>
                    <th style={{ padding: '8px 0', textAlign: 'center' }}>Payments</th>
                    <th style={{ padding: '8px 0', textAlign: 'right' }}>Revenue (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.monthly.length === 0 ? (
                    <tr><td colSpan={3} style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8' }}>No data</td></tr>
                  ) : (
                    reports.monthly.map((m) => (
                      <tr key={m.month} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 0', fontWeight: 600, color: NAVY }}>{m.month}</td>
                        <td style={{ padding: '8px 0', textAlign: 'center' }}>{m.count}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>
                          ₹{m.amountRupees.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 7: TAX & CHARTERED ACCOUNTANT (CA) COMPLIANCE
          ========================================================================= */}
      {activeSubTab === 'tax_config' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, alignItems: 'start' }}>
          {/* Form Card */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: NAVY, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚖️</span> Statutory Tax &amp; GST Configuration
              </h3>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 800,
                  background: taxConfig.caApproved ? '#f0fdf4' : '#fffbeb',
                  color: taxConfig.caApproved ? '#16a34a' : '#d97706',
                  border: `1px solid ${taxConfig.caApproved ? '#bbf7d0' : '#fde68a'}`,
                }}
              >
                {taxConfig.caApproved ? '✓ CA Sign-off Active' : '⚠️ Pending CA Review'}
              </span>
            </div>

            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
              Configure your Indian Goods and Services Tax (GST) parameters, SAC codes, and seller identification. These parameters govern automatic B2B tax invoice generation and checkout fee calculations.
            </p>

            {loadingTaxConfig ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>Loading tax settings...</div>
            ) : (
              <form onSubmit={handleSaveTaxConfig}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                      Applicable GST Rate (Basis Points)
                    </label>
                    <input
                      type="number"
                      value={taxConfig.gstRateBps}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        setTaxConfig({
                          ...taxConfig,
                          gstRateBps: val,
                          gstRatePercent: (val / 100).toFixed(2),
                        });
                      }}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box' }}
                      required
                    />
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                      Current: <strong>{taxConfig.gstRatePercent}%</strong> (1800 bps = 18.00%)
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                      SAC Service Accounting Code
                    </label>
                    <input
                      type="text"
                      value={taxConfig.sacCode}
                      onChange={(e) => setTaxConfig({ ...taxConfig, sacCode: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box' }}
                      required
                      placeholder="e.g. 998313"
                    />
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                      Default: <strong>998313</strong> (IT Software SaaS Services)
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                      Seller Registered Legal Name
                    </label>
                    <input
                      type="text"
                      value={taxConfig.sellerName}
                      onChange={(e) => setTaxConfig({ ...taxConfig, sellerName: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                      Seller GSTIN
                    </label>
                    <input
                      type="text"
                      value={taxConfig.sellerGstin}
                      onChange={(e) => setTaxConfig({ ...taxConfig, sellerGstin: e.target.value.toUpperCase() })}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box', fontFamily: 'monospace' }}
                      required
                      maxLength={15}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                      Seller Registered Address
                    </label>
                    <input
                      type="text"
                      value={taxConfig.sellerAddress}
                      onChange={(e) => setTaxConfig({ ...taxConfig, sellerAddress: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                      Seller State (Place of Origin)
                    </label>
                    <input
                      type="text"
                      value={taxConfig.sellerState}
                      onChange={(e) => setTaxConfig({ ...taxConfig, sellerState: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 5 }}>
                    Invoice Number Prefix
                  </label>
                  <input
                    type="text"
                    value={taxConfig.invoicePrefix}
                    onChange={(e) => setTaxConfig({ ...taxConfig, invoicePrefix: e.target.value.toUpperCase() })}
                    style={{ width: 140, padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13.5, boxSizing: 'border-box', fontFamily: 'monospace' }}
                    required
                    maxLength={8}
                  />
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>
                    Preview format: <strong>{taxConfig.invoicePrefix || 'QS'}-2026-00001</strong>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 22 }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={taxConfig.caApproved}
                      onChange={(e) => setTaxConfig({ ...taxConfig, caApproved: e.target.checked })}
                      style={{ marginTop: 3, width: 16, height: 16, accentColor: '#0f766e' }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: NAVY }}>
                        Formal Chartered Accountant (CA) Sign-off Verified
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>
                        I certify that a qualified Chartered Accountant has formally reviewed our business operations, verified our SAC code classification, confirmed the applicable GST rate (18%), and approved this tax configuration for issuing commercial invoices.
                      </div>
                    </div>
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="submit"
                    disabled={savingTaxConfig}
                    style={{
                      background: '#0f766e',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '10px 22px',
                      fontSize: 13.5,
                      fontWeight: 700,
                      cursor: savingTaxConfig ? 'not-allowed' : 'pointer',
                      opacity: savingTaxConfig ? 0.7 : 1,
                    }}
                  >
                    {savingTaxConfig ? 'Saving Settings...' : 'Save Tax Configuration'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* CA Audit Notice & Checklist Side Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '18px 20px', color: '#92400e' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>⚠️</span> Mandatory CA Review Checklist
              </h4>
              <p style={{ margin: '0 0 12px', fontSize: 12.5, lineHeight: 1.5 }}>
                Before filing GSTR-1 or launching live commercial subscription payments, your Chartered Accountant must verify:
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6 }}>
                <li><strong>SAC Code Suitability:</strong> Verify if <em>SAC 998313</em> (Information Technology Software Services) or <em>SAC 999293</em> (Commercial Coaching/Education Services) applies.</li>
                <li><strong>Exemption Scrutiny:</strong> Confirm that software subscriptions provided to higher education institutes do NOT fall under the Section 12/2017 educational exemption.</li>
                <li><strong>Place of Supply:</strong> Ensure that inter-state sales (outside Telangana) charge IGST 18%, while intra-state sales charge CGST 9% + SGST 9%.</li>
                <li><strong>Invoice Compliance:</strong> Rule 46 of CGST Rules requires serial numbering, Buyer GSTIN, SAC Code, and reverse charge indicator.</li>
              </ul>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '18px 20px' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 13.5, fontWeight: 800, color: NAVY }}>
                Current Production Tax State
              </h4>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                <div>• Storage Format: <strong>Integer Basis Points (1800 = 18.00%)</strong></div>
                <div>• Financial Storage: <strong>Integer Paise (Zero Floating Point)</strong></div>
                <div>• Default SAC: <strong>998313</strong></div>
                <div>• Hardcoded Overrides: <strong>None (Fully Configurable via AppSetting)</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: RECORD VERIFIED OFFLINE PAYMENT MODAL
          ========================================================================= */}
      {offlineModalTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 14, maxWidth: 520, width: '100%', padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: NAVY }}>
              Record Verified Offline Payment
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: '#64748b' }}>
              Confirm verified institutional payment to activate the subscription, issue a B2B tax invoice, and record collected revenue.
            </p>

            <form onSubmit={handleRecordOfflineSubmit}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>College:</span>
                  <strong style={{ fontSize: 13, color: NAVY }}>{offlineModalTarget.institute?.name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Module:</span>
                  <strong style={{ fontSize: 13, color: '#0284c7' }}>{MODULE_NAMES[offlineModalTarget.moduleKey] || offlineModalTarget.moduleKey}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Cycle:</span>
                  <strong style={{ fontSize: 13, color: '#7c3aed' }}>{offlineModalTarget.billingCycle}</strong>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Payment Method *
                </label>
                <select
                  value={offlineForm.paymentMethod}
                  onChange={(e) => setOfflineForm({ ...offlineForm, paymentMethod: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                >
                  <option value="NEFT_RTGS">NEFT / RTGS Bank Transfer</option>
                  <option value="BANK_TRANSFER">Direct Net Banking</option>
                  <option value="CHEQUE">Institutional Cheque / DD</option>
                  <option value="MANUAL_UPI">Direct UPI Settlement</option>
                  <option value="CASH">Institutional Cash Deposit</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  UTR / Transaction Reference Number *
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-SBI-2026-990011 or Cheque # 440212"
                  value={offlineForm.paymentRef}
                  onChange={(e) => setOfflineForm({ ...offlineForm, paymentRef: e.target.value })}
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Payment Verified Date *
                </label>
                <input
                  type="date"
                  value={offlineForm.paymentDate}
                  onChange={(e) => setOfflineForm({ ...offlineForm, paymentDate: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Audit Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified against SBI current account credit statement"
                  value={offlineForm.notes}
                  onChange={(e) => setOfflineForm({ ...offlineForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setOfflineModalTarget(null)}
                  disabled={actionLoading}
                  style={{ padding: '9px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ padding: '9px 18px', background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
                >
                  {actionLoading ? 'Recording...' : '✓ Confirm & Activate Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: INITIATE REFUND MODAL
          ========================================================================= */}
      {refundModalTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 14, maxWidth: 500, width: '100%', padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#7e22ce' }}>
              Initiate &amp; Record Refund
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: '#64748b' }}>
              Record a settled refund against this verified transaction. This will update the invoice to REFUNDED, cancel active subscription access, and safeguard against duplicate refunds.
            </p>

            <form onSubmit={handleRefundSubmit}>
              <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>College:</span>
                  <strong style={{ fontSize: 13, color: NAVY }}>{refundModalTarget.institute?.name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Module:</span>
                  <strong style={{ fontSize: 13, color: '#7e22ce' }}>{MODULE_NAMES[refundModalTarget.moduleKey] || refundModalTarget.moduleKey}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Original Total Paid:</span>
                  <strong style={{ fontSize: 13, color: '#16a34a' }}>₹{(refundModalTarget.totalAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Refund Reference / UTR *
                </label>
                <input
                  type="text"
                  placeholder="e.g. RFND_RZP_112233 or BANK_REF_998877"
                  value={refundForm.refundReference}
                  onChange={(e) => setRefundForm({ ...refundForm, refundReference: e.target.value })}
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Refund Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={refundForm.refundAmountRupees}
                  onChange={(e) => setRefundForm({ ...refundForm, refundAmountRupees: e.target.value })}
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Reason for Refund
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mutual cancellation within grace period"
                  value={refundForm.reason}
                  onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={refundForm.deactivateSubscription}
                    onChange={(e) => setRefundForm({ ...refundForm, deactivateSubscription: e.target.checked })}
                  />
                  <span>Revoke module access and mark subscription CANCELLED</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setRefundModalTarget(null)}
                  disabled={actionLoading}
                  style={{ padding: '9px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ padding: '9px 18px', background: '#7e22ce', color: '#ffffff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
                >
                  {actionLoading ? 'Processing...' : 'Confirm Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: REJECT OFFLINE REQUEST MODAL
          ========================================================================= */}
      {rejectModalTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 14, maxWidth: 460, width: '100%', padding: 24 }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#dc2626' }}>
              Reject Subscription Request
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
              Reject the offline request from <strong>{rejectModalTarget.institute?.name}</strong> for {MODULE_NAMES[rejectModalTarget.moduleKey] || rejectModalTarget.moduleKey}.
            </p>
            <form onSubmit={handleRejectOfflineSubmit}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Rejection Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bank payment not received or invalid UTR"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setRejectModalTarget(null)}
                  disabled={actionLoading}
                  style={{ padding: '8px 14px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ padding: '8px 16px', background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
                >
                  {actionLoading ? 'Rejecting...' : 'Reject Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: B2B TAX INVOICE VIEWER & PRINT MODAL
          ========================================================================= */}
      {selectedInvoice && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 14, maxWidth: 680, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 32, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)' }}>
            {/* Invoice Printable View */}
            <div id="qs-printable-invoice">
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #07154A', paddingBottom: 16, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: NAVY }}>QuestionsStudio</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>EdTech Technologies Pvt. Ltd.</div>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4 }}>GSTIN: 36AAACQ0000A1Z5</div>
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>SAC Code: 998313 (Software as a Service)</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#0284c7' }}>TAX INVOICE</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: NAVY, marginTop: 4 }}>{selectedInvoice.invoiceNumber}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Date: {new Date(selectedInvoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 800,
                      background: selectedInvoice.status === 'PAID' ? '#dcfce7' : '#f3e8ff',
                      color: selectedInvoice.status === 'PAID' ? '#15803d' : '#7e22ce',
                    }}>
                      {selectedInvoice.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Billed To */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b', fontWeight: 700 }}>
                  BILLED TO (TENANT)
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: NAVY, marginTop: 2 }}>
                  {selectedInvoice.institute?.name || 'Institutional Subscriber'}
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                  Institutional Account ID: {selectedInvoice.instituteId}
                </div>
              </div>

              {/* Line Items */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 20 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: 11.5, textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Description</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>SAC</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Taxable Base</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 12px' }}>
                      <div style={{ fontWeight: 700, color: NAVY }}>Modular SaaS Subscription License</div>
                      <div style={{ fontSize: 11.5, color: '#64748b' }}>Platform Cloud Software License Term</div>
                    </td>
                    <td style={{ padding: '12px 12px', textAlign: 'center', color: '#64748b' }}>998313</td>
                    <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 700 }}>
                      ₹{(selectedInvoice.taxableAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Calculations Box */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                <div style={{ width: 260 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12.5, color: '#475569' }}>
                    <span>Taxable Base:</span>
                    <span>₹{(selectedInvoice.taxableAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12.5, color: '#475569' }}>
                    <span>CGST (9.00%):</span>
                    <span>₹{(selectedInvoice.cgstAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12.5, color: '#475569' }}>
                    <span>SGST (9.00%):</span>
                    <span>₹{(selectedInvoice.sgstAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid #07154A', marginTop: 4, fontSize: 15, fontWeight: 900, color: NAVY }}>
                    <span>Total Amount:</span>
                    <span>₹{(selectedInvoice.totalAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
                This is a computer-generated tax invoice and requires no physical signature under Indian Information Technology Act.
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                style={{ padding: '8px 18px', background: NAVY, color: '#ffffff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <span>🖨️</span> Print Tax Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
