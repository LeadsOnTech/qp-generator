import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import EcommerceBookEditorModal from '../components/EcommerceBookEditorModal';

export default function CollegeBookstore() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Core Data State
  const [earningsData, setEarningsData] = useState(null);
  const [productsData, setProductsData] = useState({
    products: [],
    statusCounts: { TOTAL: 0, DRAFT: 0, SUBMITTED_FOR_REVIEW: 0, APPROVED_GLOBAL: 0, REJECTED: 0, ARCHIVED: 0 },
  });

  // Active Tab: 'my-products' | 'moderation' | 'inventory' | 'orders' | 'commissions'
  const [activeTab, setActiveTab] = useState('my-products');

  // Filter & Search Controls
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Editor Modal State
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);

  // Quick Stock Update State
  const [updatingStockId, setUpdatingStockId] = useState(null);

  async function loadAllSellerData() {
    try {
      setLoading(true);
      setError(null);

      const [earningsRes, productsRes] = await Promise.all([
        api.getInstituteMarketplaceEarnings().catch(() => null),
        api.getSellerMyProducts({
          status: statusFilter,
          fulfillmentType: formatFilter,
          search: searchQuery,
        }).catch(() => null),
      ]);

      if (earningsRes) setEarningsData(earningsRes);
      if (productsRes) {
        setProductsData({
          products: productsRes.products || [],
          statusCounts: productsRes.statusCounts || { TOTAL: 0, DRAFT: 0, SUBMITTED_FOR_REVIEW: 0, APPROVED_GLOBAL: 0, REJECTED: 0, ARCHIVED: 0 },
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load seller studio data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllSellerData();
  }, [statusFilter, formatFilter]);

  async function handleSearchSubmit(e) {
    e.preventDefault();
    await loadAllSellerData();
  }

  async function handleSaveProduct(formData) {
    try {
      setSavingProduct(true);
      if (editingProduct) {
        await api.updateSellerProduct(editingProduct.id, formData);
        alert('Publication details updated successfully!');
      } else {
        await api.createSellerProduct(formData);
        if (formData.requestedScope === 'GLOBAL') {
          alert('Study material submitted to Super Admin for Global Marketplace syndication review!');
        } else {
          alert('Study material published to your private college portal! Your students can purchase it immediately.');
        }
      }
      setEditorModalOpen(false);
      setEditingProduct(null);
      await loadAllSellerData();
    } catch (err) {
      alert('Save failed: ' + (err.message || 'Please check all required fields.'));
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleDeleteProduct(productId) {
    if (!window.confirm('Are you sure you want to remove this publication? It will be taken down from your college store.')) return;
    try {
      await api.deleteSellerProduct(productId);
      alert('Publication removed.');
      await loadAllSellerData();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  }

  async function handleQuickStockUpdate(productId, newQty) {
    try {
      setUpdatingStockId(productId);
      await api.updateSellerProduct(productId, { stockQuantity: parseInt(newQty) || 0 });
      await loadAllSellerData();
      setUpdatingStockId(null);
    } catch (err) {
      alert('Stock update failed: ' + err.message);
      setUpdatingStockId(null);
    }
  }

  const inst = earningsData?.institute || {};
  const stats = earningsData?.stats || {};
  const orders = earningsData?.recentOrders || [];
  const products = productsData.products || [];
  const statusCounts = productsData.statusCounts || {};

  const TABS = [
    { id: 'my-products', label: `📚 My Publications (${statusCounts.TOTAL || 0})` },
    { id: 'moderation', label: `🛡️ Global Moderation (${statusCounts.SUBMITTED_FOR_REVIEW || 0})`, badge: statusCounts.SUBMITTED_FOR_REVIEW > 0 ? `${statusCounts.SUBMITTED_FOR_REVIEW}` : null },
    { id: 'inventory', label: `📦 Physical Inventory & Stock` },
    { id: 'orders', label: `🧾 Sales & Orders (${orders.length})` },
    { id: 'commissions', label: `💰 Commission Statements` },
  ];

  if (loading && !earningsData && products.length === 0) {
    return (
      <div style={{ width: '100%', padding: '24px 0 60px 0' }}>
        <div className="skeleton" style={{ height: 180, borderRadius: 20, marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', paddingBottom: 64, color: '#0F172A' }}>
      {/* 1. Header Command Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F2D54 100%)',
          borderRadius: 24,
          padding: '30px 34px',
          color: '#FFFFFF',
          marginBottom: 24,
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.45)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ maxWidth: 760 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 999, background: 'rgba(255, 255, 255, 0.12)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.2)', marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 10px #10B981' }} />
              <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#FFFFFF' }}>
                {inst.name || 'College Seller Studio'} • Verified Publisher
              </span>
            </div>

            <h1 style={{ fontSize: 30, fontWeight: 900, color: '#FFFFFF', margin: '0 0 8px 0', lineHeight: 1.25, letterSpacing: '-0.02em' }}>
              College Admin Seller Studio
            </h1>

            <p style={{ fontSize: 14, color: '#94A3B8', margin: 0, lineHeight: 1.55 }}>
              Publish study materials to your private college portal (<strong>90% publisher revenue</strong>) or syndicate nationally on the central marketplace upon Super Admin approval (<strong>80% publisher revenue</strong>).
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setEditingProduct(null);
                setEditorModalOpen(true);
              }}
              style={{
                background: '#0284c7',
                color: '#FFFFFF',
                padding: '10px 20px',
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 13.5,
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
              }}
            >
              <span>+</span> Add New Publication
            </button>

            {inst.slug && (
              <a
                href={`/#/colleges/${inst.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  padding: '10px 18px',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 13.5,
                  textDecoration: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>🌐</span> Public Store ↗
              </a>
            )}
          </div>
        </div>

        {/* Status Pill Sub-bar */}
        <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid rgba(255, 255, 255, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: 12, color: '#94A3B8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>Marketplace Mode:</span>
            <strong style={{ color: '#F8FAFC' }}>Accrued Earnings Ledger (Bank Payouts Coming Soon)</strong>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <span>✓ Anti-Piracy DRM Watermarking Enforced</span>
            <span>✓ Multi-College Syndication Active</span>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: 20 }}>{error}</div>}

      {/* 2. Top-Level Metric Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div className="stat-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', letterSpacing: '0.04em' }}>TOTAL PUBLICATIONS</div>
              <div style={{ color: '#0F172A', marginTop: 4, fontWeight: 900, fontSize: 22 }}>
                {statusCounts.TOTAL || 0}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EFF6FF', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              📚
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 11.5, color: '#64748B' }}>
            {statusCounts.DRAFT || 0} Private • {statusCounts.APPROVED_GLOBAL || 0} Global Live
          </div>
        </div>

        <div className="stat-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', letterSpacing: '0.04em' }}>IN MODERATION REVIEW</div>
              <div style={{ color: statusCounts.SUBMITTED_FOR_REVIEW > 0 ? '#D97706' : '#059669', marginTop: 4, fontWeight: 900, fontSize: 22 }}>
                {statusCounts.SUBMITTED_FOR_REVIEW || 0}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: statusCounts.SUBMITTED_FOR_REVIEW > 0 ? '#FEF3C7' : '#ECFDF5', color: statusCounts.SUBMITTED_FOR_REVIEW > 0 ? '#D97706' : '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              🛡️
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 11.5, color: '#64748B' }}>
            {statusCounts.SUBMITTED_FOR_REVIEW > 0 ? 'Awaiting Super Admin Approval' : 'No Submissions Pending'}
          </div>
        </div>

        <div className="stat-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', letterSpacing: '0.04em' }}>STUDENT PURCHASES</div>
              <div style={{ color: '#0F172A', marginTop: 4, fontWeight: 900, fontSize: 22 }}>
                {stats.totalSold || 0}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              🛍️
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 11.5, color: '#64748B' }}>
            Verified Completed Orders
          </div>
        </div>

        <div className="stat-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', letterSpacing: '0.04em' }}>ACCRUED ROYALTIES</div>
              <div style={{ color: '#059669', marginTop: 4, fontWeight: 900, fontSize: 22 }}>
                ₹{stats.totalEarningsRupees?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              💰
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 11.5, color: '#64748B' }}>
            Accrued in Ledger (Settlement Pending)
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #E2E8F0', paddingBottom: 10, marginBottom: 24, overflowX: 'auto' }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: isActive ? '#0F172A' : '#F1F5F9',
                color: isActive ? '#FFFFFF' : '#475569',
                padding: '9px 18px',
                borderRadius: 10,
                border: 'none',
                fontWeight: isActive ? 800 : 600,
                fontSize: 13,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span style={{ background: '#DC2626', color: '#FFFFFF', padding: '1px 6px', borderRadius: 999, fontSize: 10, fontWeight: 900 }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: MY PUBLICATIONS                                               */}
      {/* ==================================================================== */}
      {activeTab === 'my-products' && (
        <div>
          {/* Filter Bar */}
          <div className="card card-pad" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Filter Scope:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12.5, fontWeight: 600 }}
                >
                  <option value="ALL">All Publications ({statusCounts.TOTAL || 0})</option>
                  <option value="DRAFT">🏛️ College Website Only ({statusCounts.DRAFT || 0})</option>
                  <option value="SUBMITTED_FOR_REVIEW">⏳ Under Review ({statusCounts.SUBMITTED_FOR_REVIEW || 0})</option>
                  <option value="APPROVED_GLOBAL">🌐 Global Marketplace Live ({statusCounts.APPROVED_GLOBAL || 0})</option>
                  <option value="REJECTED">⚠️ Revisions Requested ({statusCounts.REJECTED || 0})</option>
                </select>

                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginLeft: 8 }}>Format:</span>
                <select
                  value={formatFilter}
                  onChange={(e) => setFormatFilter(e.target.value)}
                  style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12.5, fontWeight: 600 }}
                >
                  <option value="ALL">All Formats</option>
                  <option value="DIGITAL_PDF">📄 Digital PDF</option>
                  <option value="PHYSICAL_PRINT">📦 Physical Printed Book</option>
                  <option value="BUNDLE_HYBRID">⚡ Hybrid Bundle</option>
                </select>
              </div>

              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Search by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12.5, minWidth: 200 }}
                />
                <button type="submit" className="btn btn-secondary" style={{ padding: '7px 14px', fontSize: 12.5 }}>
                  Search
                </button>
              </form>
            </div>
          </div>

          {/* Publications List */}
          {products.length === 0 ? (
            <div className="card card-pad" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, textAlign: 'center', padding: '56px 20px' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📚</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
                No Publications Found in this Category
              </h3>
              <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px 0', maxWidth: 480, marginInline: 'auto' }}>
                Publish study materials, previous question blueprints, or chapter summaries. Sell directly to your students or syndicate across participating colleges.
              </p>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setEditorModalOpen(true);
                }}
                className="btn btn-primary"
                style={{ padding: '10px 22px', fontSize: 13.5 }}
              >
                + Publish Your First Study Material
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {products.map((p) => {
                const isGlobalApproved = p.moderationStatus === 'APPROVED_GLOBAL' || p.isGlobal;
                const isPendingReview = p.moderationStatus === 'SUBMITTED_FOR_REVIEW';
                const isRejected = p.moderationStatus === 'REJECTED';
                const isCollegeOnly = p.moderationStatus === 'DRAFT' || (!p.isGlobal && !isPendingReview && !isRejected);

                return (
                  <div
                    key={p.id}
                    className="card"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: 18,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                    }}
                  >
                    {/* Header Image Strip */}
                    <div style={{ height: 140, background: '#F1F5F9', position: 'relative', overflow: 'hidden' }}>
                      <img
                        src={p.coverImageUrl}
                        alt={p.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {isGlobalApproved && (
                          <span style={{ background: '#059669', color: '#FFFFFF', padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800 }}>
                            🌐 Global Live
                          </span>
                        )}
                        {isPendingReview && (
                          <span style={{ background: '#D97706', color: '#FFFFFF', padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800 }}>
                            ⏳ Under Review
                          </span>
                        )}
                        {isRejected && (
                          <span style={{ background: '#DC2626', color: '#FFFFFF', padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800 }}>
                            ⚠️ Revisions Needed
                          </span>
                        )}
                        {isCollegeOnly && (
                          <span style={{ background: '#0284c7', color: '#FFFFFF', padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800 }}>
                            🏛️ College Only
                          </span>
                        )}
                        <span style={{ background: 'rgba(15, 23, 42, 0.75)', color: '#FFFFFF', padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>
                          {p.fulfillmentType === 'PHYSICAL_PRINT' ? '📦 Print' : (p.fulfillmentType === 'BUNDLE_HYBRID' ? '⚡ Hybrid' : '📄 PDF')}
                        </span>
                      </div>
                    </div>

                    {/* Content Body */}
                    <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span className="badge badge-neutral" style={{ fontSize: 10, fontWeight: 800 }}>{p.examTarget}</span>
                        <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>{p.subject}</span>
                      </div>

                      <h4 style={{ fontSize: 14.5, fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0', lineHeight: 1.3 }}>
                        {p.title}
                      </h4>
                      {p.subtitle && (
                        <p style={{ fontSize: 11.5, color: '#64748B', margin: '0 0 10px 0', lineHeight: 1.4, flex: 1 }}>
                          {p.subtitle}
                        </p>
                      )}

                      {/* Rejection Alert Box */}
                      {isRejected && p.rejectionReason && (
                        <div style={{ background: '#FEF2F2', border: '1px solid #FECDD3', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 11.5, color: '#991B1B' }}>
                          <strong>Super Admin Feedback:</strong> {p.rejectionReason}
                        </div>
                      )}

                      {/* Pricing & Stock Meta */}
                      <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 10, marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <div>
                            <span style={{ fontSize: 18, fontWeight: 900, color: '#0F172A' }}>₹{p.priceRupees}</span>
                            {p.mrpRupees > p.priceRupees && (
                              <span style={{ fontSize: 12, color: '#94A3B8', textDecoration: 'line-through', marginLeft: 6 }}>
                                ₹{p.mrpRupees}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: '#059669' }}>
                            {isGlobalApproved ? '80% Publisher Share' : '90% Publisher Share'}
                          </div>
                        </div>

                        {p.fulfillmentType !== 'DIGITAL_PDF' && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: '#475569' }}>
                            <span>Stock In Hand: <strong>{p.stockQuantity ?? 0} units</strong></span>
                            {p.sku && <span>SKU: <strong>{p.sku}</strong></span>}
                          </div>
                        )}
                      </div>

                      {/* Card Actions */}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => {
                            setEditingProduct(p);
                            setEditorModalOpen(true);
                          }}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: '#F1F5F9',
                            color: '#0F172A',
                            border: '1px solid #CBD5E1',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          ✏️ Edit / Scope
                        </button>

                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          style={{
                            padding: '8px 12px',
                            background: '#FFF1F2',
                            color: '#DC2626',
                            border: '1px solid #FECDD3',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: GLOBAL MODERATION STATUS TRACKER                              */}
      {/* ==================================================================== */}
      {activeTab === 'moderation' && (
        <div className="card card-pad" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20 }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px 0' }}>
              Global Marketplace Moderation Tracker
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
              Track approval progress for publications submitted to syndicate across all participating college portals.
            </p>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cover</th>
                  <th>Title &amp; Exam</th>
                  <th>Submitted Status</th>
                  <th>Format &amp; Price</th>
                  <th>Moderation Feedback</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.filter((p) => p.isGlobal || p.moderationStatus === 'SUBMITTED_FOR_REVIEW' || p.moderationStatus === 'REJECTED' || p.moderationStatus === 'APPROVED_GLOBAL').length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px 16px', color: '#64748B' }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>🌐</div>
                      <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 14 }}>No Global Submissions Found</div>
                      <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>
                        When you submit a study material with "Global Marketplace" scope, it will appear here for review tracking.
                      </div>
                    </td>
                  </tr>
                ) : (
                  products
                    .filter((p) => p.isGlobal || p.moderationStatus === 'SUBMITTED_FOR_REVIEW' || p.moderationStatus === 'REJECTED' || p.moderationStatus === 'APPROVED_GLOBAL')
                    .map((p) => (
                      <tr key={p.id}>
                        <td style={{ width: 50 }}>
                          <img src={p.coverImageUrl} alt={p.title} style={{ width: 44, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                        </td>
                        <td>
                          <div style={{ fontWeight: 800, color: '#0F172A' }}>{p.title}</div>
                          <div style={{ fontSize: 11, color: '#64748B' }}>{p.examTarget} • {p.subject}</div>
                        </td>
                        <td>
                          {p.moderationStatus === 'APPROVED_GLOBAL' || p.isGlobal ? (
                            <span className="badge badge-success" style={{ fontWeight: 800 }}>✅ Approved &amp; Live Globally</span>
                          ) : p.moderationStatus === 'SUBMITTED_FOR_REVIEW' ? (
                            <span className="badge badge-gold" style={{ fontWeight: 800 }}>⏳ Under Super Admin Review</span>
                          ) : (
                            <span className="badge badge-danger" style={{ fontWeight: 800 }}>⚠️ Revisions Requested</span>
                          )}
                        </td>
                        <td>
                          <div><strong>₹{p.priceRupees}</strong></div>
                          <span style={{ fontSize: 10.5, color: '#64748B' }}>{p.fulfillmentType}</span>
                        </td>
                        <td style={{ maxWidth: 260 }}>
                          {p.rejectionReason ? (
                            <div style={{ background: '#FEF2F2', padding: '6px 10px', borderRadius: 6, fontSize: 11.5, color: '#991B1B', border: '1px solid #FECDD3' }}>
                              {p.rejectionReason}
                            </div>
                          ) : p.moderationStatus === 'APPROVED_GLOBAL' ? (
                            <span style={{ fontSize: 11.5, color: '#059669' }}>Approved for national distribution.</span>
                          ) : (
                            <span style={{ fontSize: 11.5, color: '#64748B' }}>Queued for editorial quality review.</span>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setEditorModalOpen(true);
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: 11.5 }}
                          >
                            {p.moderationStatus === 'REJECTED' ? 'Revise & Resubmit' : 'Edit'}
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

      {/* ==================================================================== */}
      {/* TAB 3: PHYSICAL INVENTORY & STOCK MANAGEMENT                         */}
      {/* ==================================================================== */}
      {activeTab === 'inventory' && (
        <div className="card card-pad" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20 }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px 0' }}>
              Physical Inventory &amp; Logistics Control
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
              Track print inventory stock, custom SKUs, and replenish book quantities for printed materials.
            </p>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Fulfillment Format</th>
                  <th>Stock In Hand</th>
                  <th>Weight (g)</th>
                  <th>Status</th>
                  <th>Quick Replenish</th>
                </tr>
              </thead>
              <tbody>
                {products.filter((p) => p.fulfillmentType !== 'DIGITAL_PDF').length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px 16px', color: '#64748B' }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>📦</div>
                      <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 14 }}>No Physical Print Publications</div>
                      <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>
                        When you publish a book with "Physical Printed Book" or "Hybrid Bundle" fulfillment, it will appear here for stock tracking.
                      </div>
                    </td>
                  </tr>
                ) : (
                  products
                    .filter((p) => p.fulfillmentType !== 'DIGITAL_PDF')
                    .map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ fontWeight: 800, color: '#0F172A' }}>{p.title}</div>
                          <div style={{ fontSize: 11, color: '#64748B' }}>₹{p.priceRupees}</div>
                        </td>
                        <td><code>{p.sku || 'N/A'}</code></td>
                        <td>
                          <span className="badge badge-neutral">
                            {p.fulfillmentType === 'PHYSICAL_PRINT' ? '📦 Printed Book' : '⚡ Hybrid Print+PDF'}
                          </span>
                        </td>
                        <td>
                          <strong style={{ fontSize: 14, color: (p.stockQuantity ?? 0) < (p.lowStockThreshold ?? 10) ? '#DC2626' : '#059669' }}>
                            {p.stockQuantity ?? 0} Units
                          </strong>
                        </td>
                        <td>{p.weightGrams ?? 300}g</td>
                        <td>
                          {(p.stockQuantity ?? 0) <= 0 ? (
                            <span className="badge badge-danger">Out of Stock</span>
                          ) : (p.stockQuantity ?? 0) < (p.lowStockThreshold ?? 10) ? (
                            <span className="badge badge-gold">Low Stock Alert</span>
                          ) : (
                            <span className="badge badge-success">In Stock</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              placeholder="Qty"
                              style={{ width: 70, padding: '5px 8px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12 }}
                              defaultValue={p.stockQuantity ?? 0}
                              onBlur={(e) => {
                                if (parseInt(e.target.value) !== p.stockQuantity) {
                                  handleQuickStockUpdate(p.id, e.target.value);
                                }
                              }}
                            />
                            {updatingStockId === p.id && <span style={{ fontSize: 11, color: '#0284c7' }}>Saving...</span>}
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

      {/* ==================================================================== */}
      {/* TAB 4: SALES & ORDERS LEDGER                                         */}
      {/* ==================================================================== */}
      {activeTab === 'orders' && (
        <div className="card card-pad" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px 0' }}>
                Sales &amp; Orders Statement ({orders.length} Verified Purchases)
              </h3>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                Verified transactions for study materials sold via your college website or generated through affiliate referrals.
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Student Buyer</th>
                  <th>Study Material</th>
                  <th>Origin</th>
                  <th>Order Value</th>
                  <th>College Royalty</th>
                  <th>DRM Delivery</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px 16px', color: '#64748B' }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>🧾</div>
                      <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 14 }}>No Student Purchases Recorded Yet</div>
                      <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>
                        When students purchase study materials on your portal, verified orders will be logged here in real-time.
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id}>
                      <td><code>{o.orderNumber}</code></td>
                      <td style={{ fontSize: 12, color: '#64748B' }}>
                        {new Date(o.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{o.buyerName}</div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>{o.buyerPhone}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{o.bookTitle}</div>
                        <span className="badge badge-neutral" style={{ fontSize: 10 }}>{o.examTarget}</span>
                      </td>
                      <td>
                        {o.isOwnBook ? (
                          <span className="badge badge-success">Own Publication (90%)</span>
                        ) : (
                          <span className="badge badge-gold">Master Referral (10%)</span>
                        )}
                      </td>
                      <td><strong>₹{o.amountRupees}</strong></td>
                      <td>
                        <strong style={{ color: '#059669' }}>+₹{o.collegeShareRupees.toFixed(2)}</strong>
                      </td>
                      <td>
                        <span style={{ fontSize: 11, color: '#059669', fontWeight: 700 }}>
                          ✓ Watermarked PDF
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

      {/* ==================================================================== */}
      {/* TAB 5: COMMISSION STATEMENTS & FINANCIAL POLICIES                    */}
      {/* ==================================================================== */}
      {activeTab === 'commissions' && (
        <div>
          <div className="card card-pad" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px 0' }}>
                  College Publisher Commission Statement &amp; Revenue Architecture
                </h3>
                <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                  Confirmed institutional revenue shares enforced by QuestionsStudio multi-tenant transaction engine.
                </p>
              </div>
              <span className="badge badge-neutral" style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' }}>
                🏦 Accrued Earnings Mode (Settlement Policy Pending Approval)
              </span>
            </div>

            {/* 4 Revenue Rules for Colleges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 14, padding: 16 }}>
                <div style={{ fontWeight: 800, color: '#065F46', fontSize: 13.5, marginBottom: 4 }}>Own Publication on Your Portal</div>
                <p style={{ fontSize: 12, color: '#047857', margin: '0 0 10px 0' }}>Study material owned by your college sold to your students</p>
                <div style={{ fontSize: 14, display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                  <span>Your College Retains:</span> <span style={{ color: '#059669' }}>90% Revenue</span>
                </div>
                <div style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', marginTop: 4, color: '#065F46' }}>
                  <span>Platform Service Fee:</span> <span>10%</span>
                </div>
              </div>

              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 14, padding: 16 }}>
                <div style={{ fontWeight: 800, color: '#1E40AF', fontSize: 13.5, marginBottom: 4 }}>Global Master Book Referral</div>
                <p style={{ fontSize: 12, color: '#1E3A8A', margin: '0 0 10px 0' }}>Central QuestionsStudio book sold via your college store</p>
                <div style={{ fontSize: 14, display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                  <span>Your College Earns:</span> <span style={{ color: '#D97706' }}>10% Referral Share</span>
                </div>
                <div style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', marginTop: 4, color: '#1E40AF' }}>
                  <span>Platform Retains:</span> <span>90%</span>
                </div>
              </div>

              <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 14, padding: 16 }}>
                <div style={{ fontWeight: 800, color: '#92400E', fontSize: 13.5, marginBottom: 4 }}>Global Syndicated Cross-Sale</div>
                <p style={{ fontSize: 12, color: '#B45309', margin: '0 0 10px 0' }}>Your approved global book sold through another college portal</p>
                <div style={{ fontSize: 14, display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                  <span>Your College (Author):</span> <span style={{ color: '#059669' }}>80% Publisher</span>
                </div>
                <div style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', marginTop: 4, color: '#92400E' }}>
                  <span>Selling College / Platform:</span> <span>10% / 10%</span>
                </div>
              </div>

              <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 14, padding: 16 }}>
                <div style={{ fontWeight: 800, color: '#5B21B6', fontSize: 13.5, marginBottom: 4 }}>Central Marketplace Direct Sale</div>
                <p style={{ fontSize: 12, color: '#6D28D9', margin: '0 0 10px 0' }}>Your approved global book sold directly on main store</p>
                <div style={{ fontSize: 14, display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                  <span>Your College Earns:</span> <span style={{ color: '#059669' }}>90% Publisher</span>
                </div>
                <div style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between', marginTop: 4, color: '#5B21B6' }}>
                  <span>Platform Fee:</span> <span>10%</span>
                </div>
              </div>
            </div>

            {/* Financial Ledger Accrual Note */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 24 }}>🛡️</span>
              <div>
                <strong style={{ fontSize: 13.5, color: '#0F172A' }}>Financial Ledger &amp; Settlement Protection Policy</strong>
                <p style={{ margin: '2px 0 0 0', fontSize: 12.5, color: '#64748B' }}>
                  All royalty and affiliate commissions are accrued in your college's financial ledger. In accordance with safety policies, automated bank disbursements and QP question credit auto-conversions remain inactive pending authorized settlement approval.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Publication Creator/Editor Modal */}
      <EcommerceBookEditorModal
        isOpen={editorModalOpen}
        onClose={() => {
          setEditorModalOpen(false);
          setEditingProduct(null);
        }}
        initialData={editingProduct}
        isMaster={false}
        onSave={handleSaveProduct}
      />
    </div>
  );
}
