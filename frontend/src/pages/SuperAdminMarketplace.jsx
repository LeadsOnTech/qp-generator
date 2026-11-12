import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import EcommerceBookEditorModal from '../components/EcommerceBookEditorModal';

export default function SuperAdminMarketplace() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(false);

  // Active navigation tab
  // 'overview' | 'global-books' | 'college-books' | 'moderation' | 'analytics' | 'orders' | 'commissions' | 'settings'
  const [activeTab, setActiveTab] = useState('overview');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [examFilter, setExamFilter] = useState('ALL');
  const [fulfillmentFilter, setFulfillmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Master Book Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);

  // Moderation Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetBook, setRejectTargetBook] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [moderatingId, setModeratingId] = useState(null);

  // Settlement Payout Requests State
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [payoutProcessModal, setPayoutProcessModal] = useState(null);
  const [payoutProcessForm, setPayoutProcessForm] = useState({
    action: 'SETTLE',
    transactionRef: '',
    adminNotes: '',
  });
  const [processingPayout, setProcessingPayout] = useState(false);

  async function loadAllData() {
    try {
      setLoading(true);
      setError(null);
      const [reconRes, queueRes, payoutsRes] = await Promise.all([
        api.getAdminMarketplaceReconciliation(),
        api.getAdminModerationQueue().catch((err) => {
          console.warn('Could not load moderation queue:', err.message);
          return { queue: [] };
        }),
        api.getAdminMarketplacePayoutRequests().catch(() => ({ requests: [] })),
      ]);
      setData(reconRes);
      setQueue(queueRes?.queue || []);
      setPayoutRequests(payoutsRes?.requests || []);
    } catch (err) {
      setError(err.message || 'Failed to load master marketplace reconciliation data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllData();
  }, []);

  async function handleSaveMasterBook(formData) {
    try {
      if (editingBook) {
        await api.updateAdminMasterBook(editingBook.id, formData);
        alert('Master publication updated successfully!');
      } else {
        await api.uploadAdminMasterBook(formData);
        alert('Master publication created and syndicated to all ' + (summary.totalActiveColleges || 0) + ' college websites!');
      }
      setModalOpen(false);
      setEditingBook(null);
      await loadAllData();
    } catch (err) {
      alert('Save failed: ' + (err.message || 'Check connection'));
    }
  }

  async function handleDeleteBook(bookId) {
    if (!window.confirm('Are you sure you want to remove this publication from all colleges? This action cannot be undone.')) return;
    try {
      await api.deleteAdminMasterBook(bookId);
      await loadAllData();
      alert('Publication deleted successfully.');
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  }

  async function handleApprove(book) {
    if (!window.confirm(`Approve "${book.title}" and syndicate globally across all college portals?`)) return;
    try {
      setModeratingId(book.id);
      await api.moderateBook(book.id, { action: 'APPROVE' });
      alert(`"${book.title}" approved and syndicated globally!`);
      await loadAllData();
    } catch (err) {
      alert('Approval failed: ' + err.message);
    } finally {
      setModeratingId(null);
    }
  }

  function handleOpenRejectModal(book) {
    setRejectTargetBook(book);
    setRejectionReason('');
    setRejectModalOpen(true);
  }

  async function handleProcessPayout(e) {
    e.preventDefault();
    if (!payoutProcessModal) return;
    try {
      setProcessingPayout(true);
      await api.processAdminMarketplacePayoutRequest(payoutProcessModal.id, payoutProcessForm);
      setPayoutProcessModal(null);
      setPayoutProcessForm({ action: 'SETTLE', transactionRef: '', adminNotes: '' });
      await loadAllData();
    } catch (err) {
      alert(err.message || 'Failed to process payout request.');
    } finally {
      setProcessingPayout(false);
    }
  }

  async function handleConfirmReject() {
    if (!rejectionReason.trim()) {
      alert('Please provide a constructive rejection reason for the college faculty.');
      return;
    }
    try {
      setModeratingId(rejectTargetBook.id);
      await api.moderateBook(rejectTargetBook.id, {
        action: 'REJECT',
        rejectionReason: rejectionReason.trim(),
      });
      alert(`Publication rejected and returned with feedback.`);
      setRejectModalOpen(false);
      setRejectTargetBook(null);
      setRejectionReason('');
      await loadAllData();
    } catch (err) {
      alert('Rejection failed: ' + err.message);
    } finally {
      setModeratingId(null);
    }
  }

  // Summary Metrics
  const summary = data?.summary || {};
  const books = data?.books || [];
  const orders = data?.orders || [];

  // Filtered Global Master Books
  const masterBooks = useMemo(() => {
    return books.filter((b) => !b.instituteId);
  }, [books]);

  // Filtered College Books
  const collegeBooks = useMemo(() => {
    return books.filter((b) => b.instituteId);
  }, [books]);

  // Filtered views based on search & filters
  const filteredMasterBooks = useMemo(() => {
    return masterBooks.filter((b) => {
      const matchSearch = !searchQuery || b.title?.toLowerCase().includes(searchQuery.toLowerCase()) || b.author?.toLowerCase().includes(searchQuery.toLowerCase()) || b.sku?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchExam = examFilter === 'ALL' || b.examTarget === examFilter;
      const matchType = fulfillmentFilter === 'ALL' || (b.fulfillmentType || 'DIGITAL_PDF') === fulfillmentFilter;
      return matchSearch && matchExam && matchType;
    });
  }, [masterBooks, searchQuery, examFilter, fulfillmentFilter]);

  const filteredCollegeBooks = useMemo(() => {
    return collegeBooks.filter((b) => {
      const matchSearch = !searchQuery || b.title?.toLowerCase().includes(searchQuery.toLowerCase()) || b.institute?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchExam = examFilter === 'ALL' || b.examTarget === examFilter;
      const matchType = fulfillmentFilter === 'ALL' || (b.fulfillmentType || 'DIGITAL_PDF') === fulfillmentFilter;
      const matchStatus = statusFilter === 'ALL' || (b.moderationStatus || 'APPROVED_GLOBAL') === statusFilter;
      return matchSearch && matchExam && matchType && matchStatus;
    });
  }, [collegeBooks, searchQuery, examFilter, fulfillmentFilter, statusFilter]);

  if (loading) {
    return (
      <div style={{ width: '100%', padding: '24px 0 48px 0' }}>
        <div className="skeleton" style={{ height: 180, borderRadius: 20, marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 16 }} />)}
        </div>
      </div>
    );
  }

  const pendingApprovalsCount = queue.length;

  return (
    <div style={{ width: '100%', paddingBottom: 64, color: '#0F172A' }}>
      {/* 1. Header Hero Command Centre Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 55%, #1E1B4B 100%)',
          borderRadius: 24,
          padding: '32px 34px',
          color: '#FFFFFF',
          marginBottom: 24,
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.4)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ maxWidth: 740 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 999, background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)', marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38BDF8', display: 'inline-block' }} />
              <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#E2E8F0' }}>
                Master E-Commerce &amp; Syndication Command
              </span>
            </div>

            <h1 style={{ fontSize: 30, fontWeight: 900, color: '#FFFFFF', margin: '0 0 8px 0', lineHeight: 1.25, letterSpacing: '-0.02em' }}>
              Super Admin Marketplace Command Centre
            </h1>

            <p style={{ fontSize: 14, color: '#94A3B8', margin: 0, lineHeight: 1.55 }}>
              Central control for study materials syndicated across {summary.totalActiveColleges || 0} participating college portals. Manage master book syndication, review college global publications, track platform vs. referral royalties, and protect digital IP.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a
              href="/#/store"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                padding: '10px 18px',
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>🌐</span> Preview Central Store ↗
            </a>

            <button
              onClick={() => { setEditingBook(null); setModalOpen(true); }}
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                border: 'none',
                padding: '10px 22px',
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 13.5,
                boxShadow: '0 8px 20px -4px rgba(2, 132, 199, 0.5)',
              }}
            >
              + Syndicate Master Book
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={loadAllData} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}>Retry</button>
        </div>
      )}

      {/* 2. Horizontal Navigation Tabs Bar */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 14,
          padding: 6,
          marginBottom: 24,
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'global-books', label: `🌐 Global Master Books (${masterBooks.length})` },
          { id: 'college-books', label: `🏛️ College Publications (${collegeBooks.length})` },
          {
            id: 'moderation',
            label: `🛡️ Moderation Queue`,
            badge: pendingApprovalsCount,
            badgeColor: '#EF4444',
          },
          { id: 'analytics', label: '📈 Marketplace Analytics' },
          { id: 'orders', label: `🧾 Orders Ledger (${orders.length})` },
          { id: 'commissions', label: '💰 Commission Reports' },
          { id: 'settings', label: '⚙️ Marketplace Settings' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                border: 'none',
                background: isActive ? '#0F172A' : 'transparent',
                color: isActive ? '#FFFFFF' : '#475569',
                padding: '9px 16px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: isActive ? 800 : 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.label}</span>
              {Boolean(tab.badge && tab.badge > 0) && (
                <span
                  style={{
                    background: tab.badgeColor || '#EF4444',
                    color: '#FFFFFF',
                    borderRadius: 999,
                    padding: '2px 7px',
                    fontSize: 11,
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ==================================================================== */}
      {/* SECTION 1: OVERVIEW TAB                                              */}
      {/* ==================================================================== */}
      {activeTab === 'overview' && (
        <div>
          {/* 6-Card High Impact Financial & Catalog KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
            <div className="stat-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="stat-label" style={{ fontSize: 11, fontWeight: 800, color: '#64748B', letterSpacing: '0.05em' }}>GROSS BOOK SALES</div>
                  <div className="stat-value" style={{ color: '#0F172A', marginTop: 4, fontWeight: 900, fontSize: 24 }}>
                    ₹{summary.grossSalesRupees?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#E0F2FE', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  📈
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: '#64748B' }}>
                {summary.totalOrders || 0} Total Student Purchases
              </div>
            </div>

            <div className="stat-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="stat-label" style={{ fontSize: 11, fontWeight: 800, color: '#64748B', letterSpacing: '0.05em' }}>NET PLATFORM SHARE (90%)</div>
                  <div className="stat-value" style={{ color: '#059669', marginTop: 4, fontWeight: 900, fontSize: 24 }}>
                    ₹{summary.netPlatformRevenueRupees?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  💰
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: '#64748B' }}>
                Retained Platform Net Revenue
              </div>
            </div>

            <div className="stat-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="stat-label" style={{ fontSize: 11, fontWeight: 800, color: '#64748B', letterSpacing: '0.05em' }}>COLLEGE REFERRAL SHARE (10%)</div>
                  <div className="stat-value" style={{ color: '#D97706', marginTop: 4, fontWeight: 900, fontSize: 24 }}>
                    ₹{summary.totalCollegePayoutsRupees?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  🤝
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: '#64748B' }}>
                Accrued Referral Royalties in Ledger
              </div>
            </div>

            <div className="stat-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="stat-label" style={{ fontSize: 11, fontWeight: 800, color: '#64748B', letterSpacing: '0.05em' }}>TOTAL PUBLICATIONS</div>
                  <div className="stat-value" style={{ color: '#0F172A', marginTop: 4, fontWeight: 900, fontSize: 24 }}>
                    {summary.totalBooks || 0}
                  </div>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  📚
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: '#64748B' }}>
                {summary.masterBooksCount || 0} Master + {summary.collegeBooksCount || 0} College
              </div>
            </div>

            <div className="stat-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="stat-label" style={{ fontSize: 11, fontWeight: 800, color: '#64748B', letterSpacing: '0.05em' }}>PENDING MODERATION</div>
                  <div className="stat-value" style={{ color: pendingApprovalsCount > 0 ? '#DC2626' : '#059669', marginTop: 4, fontWeight: 900, fontSize: 24 }}>
                    {pendingApprovalsCount}
                  </div>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: pendingApprovalsCount > 0 ? '#FEE2E2' : '#ECFDF5', color: pendingApprovalsCount > 0 ? '#DC2626' : '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  🛡️
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: '#64748B' }}>
                {pendingApprovalsCount > 0 ? 'Awaiting Super Admin Review' : 'Queue Clear & Approved'}
              </div>
            </div>

            <div className="stat-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="stat-label" style={{ fontSize: 11, fontWeight: 800, color: '#64748B', letterSpacing: '0.05em' }}>ACCRUED COMMISSIONS</div>
                  <div className="stat-value" style={{ color: '#4338CA', marginTop: 4, fontWeight: 900, fontSize: 24 }}>
                    ₹{(summary.accruedCommissionsRupees ?? summary.totalCollegePayoutsRupees ?? 0).toFixed(2)}
                  </div>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EEF2FF', color: '#4338CA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  🏦
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: '#64748B' }}>
                Accrued in ledger (Settlements pending)
              </div>
            </div>
          </div>

          {/* Pending Moderation Callout Banner (if items exist) */}
          {pendingApprovalsCount > 0 && (
            <div
              style={{
                background: 'linear-gradient(135deg, #FEF2F2 0%, #FFF1F2 100%)',
                border: '1px solid #FECDD3',
                borderRadius: 16,
                padding: '18px 22px',
                marginBottom: 24,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 26 }}>⏳</span>
                <div>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#991B1B' }}>
                    {pendingApprovalsCount} College Publication{pendingApprovalsCount > 1 ? 's' : ''} Awaiting Global Syndication Approval
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: 13, color: '#B91C1C' }}>
                    Review submitted textbooks, check faculty author details and approve to publish across {summary.totalActiveColleges || 0} participating college websites.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('moderation')}
                className="btn btn-primary"
                style={{ background: '#DC2626', borderColor: '#DC2626', padding: '8px 18px', fontSize: 13 }}
              >
                Open Moderation Queue →
              </button>
            </div>
          )}

          {/* Quick Overview Split: Top Master Books + Nationwide Orders Snapshot */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24 }}>
            {/* Master Books Highlight */}
            <div className="card card-pad" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Global Master Publications</h3>
                  <p style={{ fontSize: 12.5, color: '#64748B', margin: '2px 0 0 0' }}>Auto-syndicated across {summary.totalActiveColleges || 0} active colleges</p>
                </div>
                <button
                  onClick={() => setActiveTab('global-books')}
                  style={{ background: 'none', border: 'none', color: '#0284c7', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}
                >
                  View All ({masterBooks.length}) →
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {masterBooks.slice(0, 4).map((b) => (
                  <div
                    key={b.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 10,
                      borderRadius: 12,
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <img
                      src={b.coverImageUrl || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=300&q=80'}
                      alt={b.title}
                      style={{ width: 44, height: 58, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span className="badge badge-neutral" style={{ fontSize: 9.5, padding: '2px 6px' }}>{b.examTarget}</span>
                        <span className="badge badge-success" style={{ fontSize: 9.5, padding: '2px 6px' }}>
                          {b.fulfillmentType === 'PHYSICAL_PRINT' ? '📦 Print' : '📄 Digital'}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {b.title}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748B' }}>
                        ₹{b.priceRupees} • <strong style={{ color: '#059669' }}>{b.verifiedSalesCount ?? b.salesCount ?? 0} verified orders</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nationwide Orders Preview */}
            <div className="card card-pad" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>Recent Student Purchases</h3>
                  <p style={{ fontSize: 12.5, color: '#64748B', margin: '2px 0 0 0' }}>Live transactions from college portals</p>
                </div>
                <button
                  onClick={() => setActiveTab('orders')}
                  style={{ background: 'none', border: 'none', color: '#0284c7', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}
                >
                  View All Orders ({orders.length}) →
                </button>
              </div>

              {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', background: '#F8FAFC', borderRadius: 12 }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>🧾</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>No Student Orders Recorded Yet</div>
                  <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0 0' }}>Purchases made from college websites will show up here instantly.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {orders.slice(0, 5).map((o) => (
                    <div
                      key={o.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        borderRadius: 12,
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        fontSize: 12.5,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{o.buyerName}</div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>
                          {o.book?.title?.slice(0, 32)}... • 📱 {o.buyerPhone}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: '#0F172A' }}>₹{o.amountRupees}</div>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: '#059669' }}>+₹{o.platformShareRupees?.toFixed(2)} Platform</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 2: GLOBAL MASTER BOOKS CATALOGUE                             */}
      {/* ==================================================================== */}
      {activeTab === 'global-books' && (
        <div className="card card-pad" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px 0' }}>
                Master Bookstore Catalogue ({filteredMasterBooks.length} titles)
              </h3>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                High-yield books, formula handbooks &amp; PYQs syndicated centrally to every college portal.
              </p>
            </div>
            <button
              onClick={() => { setEditingBook(null); setModalOpen(true); }}
              className="btn btn-primary"
              style={{ padding: '9px 18px', fontSize: 13 }}
            >
              + Upload Master Publication
            </button>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, padding: 12, background: '#F8FAFC', borderRadius: 14 }}>
            <input
              type="text"
              placeholder="Search by title, SKU, or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}
            />
            <select
              value={examFilter}
              onChange={(e) => setExamFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}
            >
              <option value="ALL">All Exams</option>
              <option value="NEET">NEET UG</option>
              <option value="JEE Main">JEE Main</option>
              <option value="JEE Advanced">JEE Advanced</option>
              <option value="AP EAPCET">AP EAPCET</option>
              <option value="TG EAPCET">TG EAPCET</option>
              <option value="CBSE 12">CBSE 12</option>
            </select>
            <select
              value={fulfillmentFilter}
              onChange={(e) => setFulfillmentFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}
            >
              <option value="ALL">All Fulfillment Modes</option>
              <option value="DIGITAL_PDF">📄 Digital PDF</option>
              <option value="PHYSICAL_PRINT">📦 Physical Printed Book</option>
              <option value="BUNDLE_HYBRID">⚡ Hybrid Bundle</option>
            </select>
          </div>

          {/* Books Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {filteredMasterBooks.map((b) => (
              <div
                key={b.id}
                style={{
                  border: '1px solid #E2E8F0',
                  borderRadius: 18,
                  padding: 18,
                  background: '#FFFFFF',
                  display: 'flex',
                  gap: 16,
                  boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.05)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ width: 92, height: 130, borderRadius: 10, overflow: 'hidden', background: '#F1F5F9', flexShrink: 0, boxShadow: '0 4px 8px rgba(0,0,0,0.12)' }}>
                  <img
                    src={b.coverImageUrl || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=400&q=80'}
                    alt={b.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, minWidth: 0 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span className="badge badge-neutral" style={{ fontSize: 10, fontWeight: 800 }}>{b.examTarget}</span>
                      <span className="badge badge-success" style={{ fontSize: 9.5 }}>
                        {b.fulfillmentType === 'PHYSICAL_PRINT' ? '📦 Physical' : '📄 Digital DRM'}
                      </span>
                    </div>

                    <h4 style={{ fontSize: 14.5, fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0', lineHeight: 1.3 }}>
                      {b.title}
                    </h4>

                    {b.sku && (
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>
                        SKU: <span style={{ fontFamily: 'monospace', color: '#0284c7' }}>{b.sku}</span>
                      </div>
                    )}

                    <p style={{ fontSize: 11.5, color: '#64748B', margin: '0 0 8px 0', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {b.subtitle || b.description || 'Comprehensive exam preparation material'}
                    </p>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                      <div>
                        <span style={{ fontSize: 17, fontWeight: 900, color: '#0284c7' }}>₹{b.priceRupees}</span>
                        {b.mrpRupees && b.mrpRupees > b.priceRupees && (
                          <span style={{ fontSize: 12, color: '#94A3B8', textDecoration: 'line-through', marginLeft: 6 }}>
                            ₹{b.mrpRupees}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>
                        {b.verifiedSalesCount ?? b.salesCount ?? 0} Verified Orders
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <a
                        href="/#/store"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: '#EFF6FF',
                          color: '#0284c7',
                          border: '1px solid #BFDBFE',
                          borderRadius: 8,
                          padding: '6px 8px',
                          fontSize: 11,
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                      >
                        👁️ Live
                      </a>
                      <button
                        onClick={() => { setEditingBook(b); setModalOpen(true); }}
                        style={{
                          flex: 1,
                          background: '#F1F5F9',
                          color: '#334155',
                          border: '1px solid #CBD5E1',
                          borderRadius: 8,
                          padding: '6px 10px',
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBook(b.id)}
                        style={{
                          background: '#FEE2E2',
                          color: '#DC2626',
                          border: 'none',
                          borderRadius: 8,
                          padding: '6px 10px',
                          fontSize: 11.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                        title="Delete publication"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 3: COLLEGE PUBLICATIONS TAB                                  */}
      {/* ==================================================================== */}
      {activeTab === 'college-books' && (
        <div className="card card-pad" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20 }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px 0' }}>
              College Proprietary Publications ({filteredCollegeBooks.length} titles)
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
              All study materials authored by registered colleges. College-only titles appear on their private website; approved global titles syndicate platform-wide.
            </p>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, padding: 12, background: '#F8FAFC', borderRadius: 14 }}>
            <input
              type="text"
              placeholder="Search by title or college name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}
            >
              <option value="ALL">All Moderation Statuses</option>
              <option value="APPROVED_GLOBAL">Approved Global (Syndicated)</option>
              <option value="SUBMITTED_FOR_REVIEW">Submitted for Review</option>
              <option value="DRAFT">College Only (Draft)</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <select
              value={fulfillmentFilter}
              onChange={(e) => setFulfillmentFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}
            >
              <option value="ALL">All Fulfillment Modes</option>
              <option value="DIGITAL_PDF">📄 Digital PDF</option>
              <option value="PHYSICAL_PRINT">📦 Physical Printed Book</option>
            </select>
          </div>

          {filteredCollegeBooks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', background: '#F8FAFC', borderRadius: 16 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏛️</div>
              <h4 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>No College Publications Found</h4>
              <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0 0' }}>Colleges can publish their materials via the College Seller Studio.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Publication</th>
                    <th>Publishing College</th>
                    <th>Exam / Subject</th>
                    <th>Type</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Royalty Model</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCollegeBooks.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <img
                            src={b.coverImageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=150&q=80'}
                            alt=""
                            style={{ width: 34, height: 46, objectFit: 'cover', borderRadius: 4 }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 13 }}>{b.title}</div>
                            <div style={{ fontSize: 11, color: '#64748B' }}>By {b.author || 'College Faculty'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600, color: '#4338CA' }}>
                        {b.institute ? (
                          <a href={`/#/colleges/${b.institute.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: '#4338CA', textDecoration: 'none' }}>
                            {b.institute.name} ↗
                          </a>
                        ) : 'Platform'}
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: 10.5 }}>{b.examTarget}</span>
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: 10.5 }}>
                          {b.fulfillmentType === 'PHYSICAL_PRINT' ? '📦 Print' : '📄 PDF'}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: '#0284c7' }}>₹{b.priceRupees}</strong>
                      </td>
                      <td>
                        {b.moderationStatus === 'APPROVED_GLOBAL' && <span className="badge badge-success">⚡ Global Live</span>}
                        {b.moderationStatus === 'SUBMITTED_FOR_REVIEW' && <span className="badge badge-gold">⏳ In Review</span>}
                        {b.moderationStatus === 'DRAFT' && <span className="badge badge-neutral">🔒 College Only</span>}
                        {b.moderationStatus === 'REJECTED' && <span className="badge badge-danger">❌ Rejected</span>}
                      </td>
                      <td style={{ fontSize: 11.5, color: '#64748B' }}>
                        {b.isGlobal ? '80% Pub / 10% Ref / 10% Plat' : '90% College / 10% Plat'}
                      </td>
                      <td>
                        <button
                          onClick={() => handleDeleteBook(b.id)}
                          style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}
                          title="Remove publication"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 4: MODERATION QUEUE TAB                                      */}
      {/* ==================================================================== */}
      {activeTab === 'moderation' && (
        <div>
          <div className="card card-pad" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px 0' }}>
                  College Publications Moderation Queue ({queue.length} Pending)
                </h3>
                <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                  Review study materials submitted by colleges for national syndication across {summary.totalActiveColleges || 0} participating college websites.
                </p>
              </div>
              <button onClick={loadAllData} className="btn btn-secondary" style={{ padding: '7px 14px', fontSize: 12.5 }}>
                🔄 Refresh Queue
              </button>
            </div>

            {queue.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '56px 16px', background: '#F8FAFC', borderRadius: 16 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                <h4 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>Moderation Queue is Clear!</h4>
                <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0 0' }}>
                  All college submissions have been reviewed. When colleges request global publication, they will appear here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {queue.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: 18,
                      padding: 22,
                      background: '#FFFFFF',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 20,
                      boxShadow: '0 4px 14px -3px rgba(15, 23, 42, 0.06)',
                    }}
                  >
                    {/* Cover Frame */}
                    <div style={{ width: 100, height: 140, borderRadius: 10, overflow: 'hidden', background: '#F1F5F9', flexShrink: 0, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                      <img
                        src={item.coverImageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80'}
                        alt={item.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>

                    {/* Metadata & Details */}
                    <div style={{ flex: 1, minWidth: 280 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span className="badge badge-gold" style={{ fontSize: 11, fontWeight: 800 }}>
                          ⏳ Awaiting Super Admin Review
                        </span>
                        <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                          {item.examTarget} • {item.subject}
                        </span>
                        <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                          {item.fulfillmentType === 'PHYSICAL_PRINT' ? '📦 Physical Print' : '📄 Digital PDF'}
                        </span>
                      </div>

                      <h4 style={{ fontSize: 17, fontWeight: 900, color: '#0F172A', margin: '0 0 6px 0' }}>
                        {item.title}
                      </h4>

                      <p style={{ fontSize: 13, color: '#475569', margin: '0 0 12px 0', lineHeight: 1.45 }}>
                        {item.subtitle || item.description || 'No subtitle provided by faculty.'}
                      </p>

                      {/* Originating College Info Box */}
                      <div
                        style={{
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: 12,
                          padding: '10px 14px',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: 8,
                          fontSize: 12,
                          marginBottom: 14,
                        }}
                      >
                        <div>
                          <span style={{ color: '#64748B' }}>Publishing College:</span>{' '}
                          <strong style={{ color: '#4338CA' }}>{item.institute?.name || 'Partner College'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748B' }}>Faculty Author:</span>{' '}
                          <strong>{item.author || 'Senior Faculty'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748B' }}>Proposed Price:</span>{' '}
                          <strong style={{ color: '#0284c7' }}>₹{item.priceRupees} (MRP: ₹{item.mrpRupees || item.priceRupees})</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748B' }}>Submission Date:</span>{' '}
                          <strong>{new Date(item.createdAt).toLocaleDateString()}</strong>
                        </div>
                      </div>

                      {/* Economics Snapshot */}
                      <div style={{ fontSize: 12, color: '#059669', marginBottom: 16 }}>
                        💡 <strong>National Syndication Revenue Split:</strong> Publishing College gets 80% (₹{(item.priceRupees * 0.8).toFixed(2)}) • Selling/Referral College gets 10% (₹{(item.priceRupees * 0.1).toFixed(2)}) • Platform gets 10% (₹{(item.priceRupees * 0.1).toFixed(2)}).
                      </div>

                      {/* Moderation Actions */}
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <button
                          disabled={moderatingId === item.id}
                          onClick={() => handleApprove(item)}
                          className="btn btn-primary"
                          style={{
                            background: '#059669',
                            borderColor: '#059669',
                            padding: '9px 20px',
                            fontSize: 13,
                            fontWeight: 800,
                          }}
                        >
                          {moderatingId === item.id ? 'Processing...' : '✅ Approve & Syndicate to Participating Colleges'}
                        </button>

                        <button
                          disabled={moderatingId === item.id}
                          onClick={() => handleOpenRejectModal(item)}
                          style={{
                            background: '#FEE2E2',
                            color: '#DC2626',
                            border: '1px solid #FECDD3',
                            borderRadius: 10,
                            padding: '9px 18px',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          ❌ Reject with Feedback
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 5: MARKETPLACE ANALYTICS TAB                                 */}
      {/* ==================================================================== */}
      {activeTab === 'analytics' && (
        <div>
          {/* Top Level Distribution Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 28 }}>
            <div className="card card-pad" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20 }}>
              <h4 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 14px 0' }}>Catalogue Composition</h4>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                  <span>Super Admin Master Books</span>
                  <strong>{masterBooks.length} ({Math.round((masterBooks.length / Math.max(books.length, 1)) * 100)}%)</strong>
                </div>
                <div style={{ width: '100%', height: 8, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${(masterBooks.length / Math.max(books.length, 1)) * 100}%`, height: '100%', background: '#0284c7' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                  <span>College Proprietary Books</span>
                  <strong>{collegeBooks.length} ({Math.round((collegeBooks.length / Math.max(books.length, 1)) * 100)}%)</strong>
                </div>
                <div style={{ width: '100%', height: 8, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${(collegeBooks.length / Math.max(books.length, 1)) * 100}%`, height: '100%', background: '#7C3AED' }} />
                </div>
              </div>
            </div>

            <div className="card card-pad" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20 }}>
              <h4 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 14px 0' }}>Fulfillment Distribution</h4>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                  <span>📄 Digital DRM Watermarked PDFs</span>
                  <strong>{books.filter(b => (b.fulfillmentType || 'DIGITAL_PDF') === 'DIGITAL_PDF').length} titles</strong>
                </div>
                <div style={{ width: '100%', height: 8, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: '85%', height: '100%', background: '#059669' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                  <span>📦 Physical Print Books &amp; Kits</span>
                  <strong>{books.filter(b => b.fulfillmentType === 'PHYSICAL_PRINT').length} titles</strong>
                </div>
                <div style={{ width: '100%', height: 8, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: '15%', height: '100%', background: '#D97706' }} />
                </div>
              </div>
            </div>

            <div className="card card-pad" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20 }}>
              <h4 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 14px 0' }}>Royalty Settlement Snapshot</h4>
              <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Platform Net Retained:</span>
                  <strong style={{ color: '#059669' }}>₹{summary.netPlatformRevenueRupees?.toFixed(2) || '0.00'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Accrued College Royalties:</span>
                  <strong style={{ color: '#D97706' }}>₹{summary.totalCollegePayoutsRupees?.toFixed(2) || '0.00'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Active Participating Colleges:</span>
                  <strong style={{ color: '#0F172A' }}>{summary.totalActiveColleges || 0} Institutions</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Best Selling Books Table */}
          <div className="card card-pad" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20 }}>
            <h4 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 14px 0' }}>🏆 Top Selling Study Materials (Verified Transactions)</h4>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Book Title</th>
                    <th>Exam Target</th>
                    <th>Publisher</th>
                    <th>Verified Purchases</th>
                    <th>Selling Price</th>
                    <th>Gross Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {books.filter(b => (b.verifiedSalesCount ?? b.salesCount ?? 0) > 0).length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '36px 16px', color: '#64748B' }}>
                        <div style={{ fontSize: 26, marginBottom: 6 }}>📊</div>
                        <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 14 }}>No Verified Student Purchases Yet</div>
                        <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>
                          Study materials will be dynamically ranked here as verified orders are placed. Demonstration and placeholder figures are strictly suppressed.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    [...books]
                      .filter(b => (b.verifiedSalesCount ?? b.salesCount ?? 0) > 0)
                      .sort((a, b) => (b.verifiedSalesCount ?? b.salesCount ?? 0) - (a.verifiedSalesCount ?? a.salesCount ?? 0))
                      .slice(0, 8)
                      .map((b, idx) => (
                        <tr key={b.id}>
                          <td style={{ fontWeight: 800, color: idx < 3 ? '#D97706' : '#64748B' }}>#{idx + 1}</td>
                          <td style={{ fontWeight: 700, color: '#0F172A' }}>{b.title}</td>
                          <td><span className="badge badge-neutral">{b.examTarget}</span></td>
                          <td>{b.institute ? b.institute.name : 'Super Admin Master'}</td>
                          <td><strong style={{ color: '#059669' }}>{b.verifiedSalesCount ?? b.salesCount ?? 0}</strong></td>
                          <td>₹{b.priceRupees}</td>
                          <td style={{ fontWeight: 800, color: '#0284c7' }}>₹{(((b.verifiedSalesCount ?? b.salesCount ?? 0)) * b.priceRupees).toFixed(2)}</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 6: ORDERS LEDGER TAB                                         */}
      {/* ==================================================================== */}
      {activeTab === 'orders' && (
        <div className="card card-pad" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px 0' }}>
                Nationwide Student Purchase Transactions ({orders.length} Orders)
              </h3>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                Verified purchases with anti-piracy DRM watermarking and automated affiliate attribution.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="badge badge-neutral" style={{ padding: '6px 12px', fontSize: 12 }}>
                🔒 Export CSV Audit (Phase 3 Ledger)
              </span>
            </div>
          </div>

          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', background: '#F8FAFC', borderRadius: 16 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🧾</div>
              <h4 style={{ fontSize: 15, fontWeight: 800 }}>No Orders Recorded Yet</h4>
              <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0 0' }}>
                Orders placed through any college website or central bookstore will show up here automatically.
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Student Name</th>
                    <th>Mobile Phone</th>
                    <th>Book Title</th>
                    <th>Selling College (10% Share)</th>
                    <th>Gross Amount</th>
                    <th>Platform Net (90%)</th>
                    <th>Payment Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 700, color: '#0284c7' }}>{o.orderNumber}</td>
                      <td style={{ fontWeight: 700, color: '#0F172A' }}>{o.buyerName}</td>
                      <td>📱 {o.buyerPhone}</td>
                      <td style={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {o.book?.title}
                      </td>
                      <td style={{ fontWeight: 600, color: '#4338CA' }}>
                        {o.sellingInstitute ? o.sellingInstitute.name : 'QuestionStudio Master'}
                      </td>
                      <td style={{ fontWeight: 800 }}>₹{o.amountRupees}</td>
                      <td style={{ fontWeight: 800, color: '#059669' }}>+₹{o.platformShareRupees.toFixed(2)}</td>
                      <td>
                        <span className="badge badge-success" style={{ fontSize: 11 }}>
                          ✓ Completed
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: '#64748B' }}>
                        {new Date(o.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 7: COMMISSION REPORTS TAB                                    */}
      {/* ==================================================================== */}
      {activeTab === 'commissions' && (
        <div>
          <div className="card card-pad" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px 0' }}>
                  Marketplace Financial Ledger &amp; Commission Architecture
                </h3>
                <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                  Accrued financial ledger strictly isolated from the QuestionStudio QP credit system. Real payouts remain pending official policy approval.
                </p>
              </div>
              <span className="badge badge-neutral" style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' }}>
                🏦 Accrued Earnings Mode (Settlement Policy Pending Approval)
              </span>
            </div>

            {/* 6-Category Financial Ledger Reconciliation Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', letterSpacing: '0.04em' }}>1. GROSS SALES (GMV)</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', marginTop: 4 }}>
                  ₹{summary.grossSalesRupees?.toFixed(2) || '0.00'}
                </div>
                <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>{summary.totalOrders || 0} Total Orders</div>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', letterSpacing: '0.04em' }}>2. REFUNDS &amp; REVERSALS</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#DC2626', marginTop: 4 }}>
                  ₹{(summary.refundsRupees || 0).toFixed(2)}
                </div>
                <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>0 Chargebacks / Reversals</div>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', letterSpacing: '0.04em' }}>3. ACCRUED COMMISSIONS</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#4338CA', marginTop: 4 }}>
                  ₹{(summary.accruedCommissionsRupees ?? summary.totalCollegePayoutsRupees ?? 0).toFixed(2)}
                </div>
                <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>Accrued in Financial Ledger</div>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', letterSpacing: '0.04em' }}>4. AVAILABLE BALANCES</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#059669', marginTop: 4 }}>
                  ₹{(summary.availableBalancesRupees ?? summary.totalCollegePayoutsRupees ?? 0).toFixed(2)}
                </div>
                <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>Eligible for Settlement</div>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', letterSpacing: '0.04em' }}>5. APPROVED SETTLEMENTS</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#D97706', marginTop: 4 }}>
                  ₹{(summary.approvedSettlementsRupees || 0).toFixed(2)}
                </div>
                <div style={{ fontSize: 11.5, color: '#D97706', marginTop: 2 }}>Policy Pending Approval</div>
              </div>

              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', letterSpacing: '0.04em' }}>6. COMPLETED PAYOUTS</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#64748B', marginTop: 4 }}>
                  ₹{(summary.completedPayoutsRupees || 0).toFixed(2)}
                </div>
                <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>Payouts Inactive (Phase 3)</div>
              </div>
            </div>

            {/* 4 Rule Scenario Boxes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 14, padding: 16 }}>
                <div style={{ fontWeight: 800, color: '#1E40AF', fontSize: 13.5, marginBottom: 4 }}>Case A: Super Admin Global Book</div>
                <p style={{ fontSize: 12, color: '#1E3A8A', margin: '0 0 10px 0' }}>Sold through a participating college website</p>
                <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Selling College:</span> <strong style={{ color: '#D97706' }}>10% Referral</strong>
                </div>
                <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 4 }}>
                  <span>QuestionsStudio:</span> <strong style={{ color: '#059669' }}>90% Platform</strong>
                </div>
              </div>

              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 14, padding: 16 }}>
                <div style={{ fontWeight: 800, color: '#065F46', fontSize: 13.5, marginBottom: 4 }}>Case B: College Proprietary Book</div>
                <p style={{ fontSize: 12, color: '#047857', margin: '0 0 10px 0' }}>Sold on college's own private website</p>
                <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Publishing College:</span> <strong style={{ color: '#059669' }}>90% Revenue</strong>
                </div>
                <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 4 }}>
                  <span>QuestionsStudio:</span> <strong style={{ color: '#0284c7' }}>10% Platform</strong>
                </div>
              </div>

              <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 14, padding: 16 }}>
                <div style={{ fontWeight: 800, color: '#92400E', fontSize: 13.5, marginBottom: 4 }}>Case C: Cross-College Global Book</div>
                <p style={{ fontSize: 12, color: '#B45309', margin: '0 0 10px 0' }}>College A book sold via College B store</p>
                <div style={{ fontSize: 12.5, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Author College:</span> <strong style={{ color: '#059669' }}>80% Publisher</strong>
                </div>
                <div style={{ fontSize: 12.5, display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 2 }}>
                  <span>Selling College:</span> <strong style={{ color: '#D97706' }}>10% Referral</strong>
                </div>
                <div style={{ fontSize: 12.5, display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 2 }}>
                  <span>QuestionsStudio:</span> <strong style={{ color: '#0284c7' }}>10% Platform</strong>
                </div>
              </div>

              <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 14, padding: 16 }}>
                <div style={{ fontWeight: 800, color: '#5B21B6', fontSize: 13.5, marginBottom: 4 }}>Case D: Central Marketplace Sale</div>
                <p style={{ fontSize: 12, color: '#6D28D9', margin: '0 0 10px 0' }}>College book bought on central store</p>
                <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Publishing College:</span> <strong style={{ color: '#059669' }}>90% Revenue</strong>
                </div>
                <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 4 }}>
                  <span>QuestionsStudio:</span> <strong style={{ color: '#0284c7' }}>10% Platform</strong>
                </div>
              </div>
            </div>

            {/* College Settlement & Bank Payout Requests Queue */}
            <div style={{ marginTop: 24, marginBottom: 24, background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h4 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: '0 0 3px 0' }}>
                    🏦 College Settlement &amp; Bank Disbursement Queue ({payoutRequests.length} Total Requests)
                  </h4>
                  <p style={{ fontSize: 12.5, color: '#64748B', margin: 0 }}>
                    Process pending college withdrawal requests and input bank UTR reference numbers to confirm fund transfers.
                  </p>
                </div>
                <span className="badge badge-primary" style={{ padding: '6px 12px', fontSize: 11.5 }}>
                  {payoutRequests.filter(p => p.status === 'PENDING').length} Pending Settlement
                </span>
              </div>

              {payoutRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 16px', background: '#F8FAFC', borderRadius: 12, border: '1px dashed #CBD5E1', color: '#64748B', fontSize: 13 }}>
                  No college payout requests currently logged in the ledger.
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>College Institution</th>
                        <th>Requested Amount</th>
                        <th>Bank Account &amp; IFSC</th>
                        <th>UPI VPA</th>
                        <th>Requested Date</th>
                        <th>Status</th>
                        <th>Disbursement UTR</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payoutRequests.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <div style={{ fontWeight: 800, color: '#0F172A' }}>{p.institute?.name || 'College'}</div>
                            <code style={{ fontSize: 11, color: '#64748B' }}>{p.institute?.slug}</code>
                          </td>
                          <td>
                            <strong style={{ color: '#059669', fontSize: 14 }}>₹{p.requestedAmountRupees.toFixed(2)}</strong>
                          </td>
                          <td style={{ fontSize: 12 }}>
                            <div>Name: <strong>{p.bankAccountName}</strong></div>
                            <div>A/C: <code>{p.bankAccountNumber}</code></div>
                            <div>IFSC: <code>{p.bankIfsc}</code> {p.bankName ? '(' + p.bankName + ')' : ''}</div>
                          </td>
                          <td style={{ fontSize: 12 }}>
                            {p.upiId ? <code style={{ color: '#0284c7' }}>{p.upiId}</code> : <span style={{ color: '#94A3B8' }}>—</span>}
                          </td>
                          <td style={{ fontSize: 12, color: '#64748B' }}>
                            {new Date(p.requestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td>
                            {p.status === 'SETTLED' ? (
                              <span className="badge badge-success" style={{ background: '#DCFCE7', color: '#166534', border: '1px solid #BBF7D0' }}>
                                ✓ SETTLED
                              </span>
                            ) : p.status === 'REJECTED' ? (
                              <span className="badge badge-danger" style={{ background: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' }}>
                                ✕ REJECTED
                              </span>
                            ) : (
                              <span className="badge badge-warning" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
                                ⏳ PENDING APPROVAL
                              </span>
                            )}
                          </td>
                          <td>
                            {p.transactionRef ? (
                              <code style={{ fontSize: 11.5, color: '#059669', fontWeight: 800 }}>{p.transactionRef}</code>
                            ) : (
                              <span style={{ fontSize: 12, color: '#94A3B8' }}>—</span>
                            )}
                          </td>
                          <td>
                            {p.status === 'PENDING' ? (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  onClick={() => {
                                    setPayoutProcessModal(p);
                                    setPayoutProcessForm({ action: 'SETTLE', transactionRef: '', adminNotes: '' });
                                  }}
                                  style={{
                                    background: '#059669',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: 6,
                                    padding: '5px 12px',
                                    fontSize: 11.5,
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                  }}
                                >
                                  ✓ Settle &amp; UTR
                                </button>
                                <button
                                  onClick={() => {
                                    setPayoutProcessModal(p);
                                    setPayoutProcessForm({ action: 'REJECT', transactionRef: '', adminNotes: 'Bank details verification issue' });
                                  }}
                                  style={{
                                    background: '#F1F5F9',
                                    color: '#DC2626',
                                    border: '1px solid #FECACA',
                                    borderRadius: 6,
                                    padding: '5px 10px',
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: 11, color: '#64748B' }}>Processed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Payout & Settlement Phase Note */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 24 }}>🛡️</span>
              <div>
                <strong style={{ fontSize: 13.5, color: '#0F172A' }}>Financial Settlement &amp; Bank Payout Status: Accrued Earnings Mode</strong>
                <p style={{ margin: '2px 0 0 0', fontSize: 12.5, color: '#64748B' }}>
                  Marketplace commission records remain strictly accrued in the financial ledger until an official settlement and bank payout policy is approved. The existing QuestionStudio QP question credit system is strictly isolated and unaffected.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 8: MARKETPLACE SETTINGS TAB                                  */}
      {/* ==================================================================== */}
      {activeTab === 'settings' && (
        <div className="card card-pad" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 6px 0' }}>Platform Marketplace Parameters</h3>
          <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 24px 0' }}>
            System configuration governing revenue splits, digital copyright protection, and syndication defaults.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 16, padding: 18, background: '#F8FAFC' }}>
              <h4 style={{ fontSize: 14.5, fontWeight: 800, margin: '0 0 8px 0' }}>🔒 DRM Anti-Piracy Protection</h4>
              <p style={{ fontSize: 12.5, color: '#64748B', margin: '0 0 14px 0' }}>
                Active digital protection enforced by backend PDF rendering and token-gated download endpoints.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Watermark Attributes:</span>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ display: 'block' }}>Student Name + Phone + Order #</strong>
                    <span className="badge badge-success" style={{ fontSize: 10, padding: '2px 8px' }}>✅ Enforced (pdf-lib Engine)</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Max Download Retries:</span>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ display: 'block' }}>10 Downloads per Order</strong>
                    <span className="badge badge-success" style={{ fontSize: 10, padding: '2px 8px' }}>✅ Enforced via Token Gate</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Download Link Expiry:</span>
                  <div style={{ textAlign: 'right' }}>
                    <strong style={{ display: 'block' }}>30 Days from Purchase</strong>
                    <span className="badge badge-success" style={{ fontSize: 10, padding: '2px 8px' }}>✅ Enforced via Token Gate</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Copy/Paste &amp; Print Hardware DRM:</span>
                  <span className="badge badge-neutral" style={{ fontSize: 10, padding: '2px 8px' }}>Coming Soon (Phase 3)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>IP Geofencing &amp; Device Lock:</span>
                  <span className="badge badge-neutral" style={{ fontSize: 10, padding: '2px 8px' }}>Coming Soon (Phase 3)</span>
                </div>
              </div>
            </div>

            <div style={{ border: '1px solid #E2E8F0', borderRadius: 16, padding: 18, background: '#F8FAFC' }}>
              <h4 style={{ fontSize: 14.5, fontWeight: 800, margin: '0 0 8px 0' }}>🤝 Syndication &amp; Royalties</h4>
              <p style={{ fontSize: 12.5, color: '#64748B', margin: '0 0 14px 0' }}>
                Fixed multi-tenant commission percentages enforced by backend schema.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Default College Referral:</span>
                  <strong style={{ color: '#D97706' }}>10.0% (₹10 on ₹100 sale)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Default Publisher Share:</span>
                  <strong style={{ color: '#059669' }}>90.0% (Own) / 80.0% (Cross)</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Commission Settlement Mode:</span>
                  <strong style={{ color: '#4338CA' }}>Accrued Earnings Ledger</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Automated Bank Payouts:</span>
                  <span className="badge badge-neutral" style={{ fontSize: 10, padding: '2px 8px' }}>Coming Soon (Phase 3)</span>
                </div>
              </div>
            </div>

            <div style={{ border: '1px solid #E2E8F0', borderRadius: 16, padding: 18, background: '#F8FAFC' }}>
              <h4 style={{ fontSize: 14.5, fontWeight: 800, margin: '0 0 8px 0' }}>📦 Physical Logistics Integrations</h4>
              <p style={{ fontSize: 12.5, color: '#64748B', margin: '0 0 14px 0' }}>
                Courier tracking and doorstep shipping integrations for printed study kits.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Shiprocket / Delhivery API:</span>
                  <span className="badge badge-neutral">Coming Soon (Phase 4)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Automated Waybill Generation:</span>
                  <span className="badge badge-neutral">Coming Soon</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Pincode Serviceability Check:</span>
                  <span className="badge badge-neutral">Coming Soon</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: MASTER BOOK EDITOR MODAL                                    */}
      {/* ==================================================================== */}
      <EcommerceBookEditorModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingBook(null);
        }}
        initialData={editingBook}
        isMaster={true}
        onSave={handleSaveMasterBook}
      />

      {/* ==================================================================== */}
      {/* MODAL 2: REJECTION WITH FEEDBACK MODAL                               */}
      {/* ==================================================================== */}
      {rejectModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              width: '100%',
              maxWidth: 520,
              padding: 24,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>⚠️</span>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#DC2626' }}>
                  Reject Publication Submission
                </h3>
              </div>
              <button
                onClick={() => setRejectModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, color: '#64748B', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 13, color: '#475569', margin: '0 0 14px 0' }}>
              Please provide constructive feedback for <strong>{rejectTargetBook?.institute?.name || 'the college faculty'}</strong>. This explanation will appear in their College Seller Studio so they can rectify the issue and resubmit.
            </p>

            <div style={{ background: '#F8FAFC', padding: 10, borderRadius: 10, marginBottom: 14, fontSize: 12 }}>
              <strong>Title:</strong> {rejectTargetBook?.title}
            </div>

            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
              Reason for Rejection *
            </label>
            <textarea
              rows={4}
              placeholder="e.g. The first chapter sample preview is missing diagrams, or the proposed pricing exceeds the competitive threshold for this subject..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid #CBD5E1',
                fontSize: 13,
                boxSizing: 'border-box',
                marginBottom: 20,
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: 13 }}
              >
                Cancel
              </button>
              <button
                disabled={moderatingId === rejectTargetBook?.id || !rejectionReason.trim()}
                onClick={handleConfirmReject}
                className="btn btn-primary"
                style={{
                  background: '#DC2626',
                  borderColor: '#DC2626',
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {moderatingId === rejectTargetBook?.id ? 'Submitting...' : 'Confirm Rejection & Send Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
