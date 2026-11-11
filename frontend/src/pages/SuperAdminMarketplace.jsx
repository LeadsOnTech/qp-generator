import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import EcommerceBookEditorModal from '../components/EcommerceBookEditorModal';

export default function SuperAdminMarketplace() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Master Book Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAdminMarketplaceReconciliation();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load master marketplace reconciliation.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSaveMasterBook(formData) {
    if (editingBook) {
      await api.updateAdminMasterBook(editingBook.id, formData);
      alert('Master publication updated successfully!');
    } else {
      await api.uploadAdminMasterBook(formData);
      alert('Master publication created and syndicated to all 800 college websites!');
    }
    await loadData();
  }

  async function handleDeleteBook(bookId) {
    if (!window.confirm('Are you sure you want to remove this publication from all colleges?')) return;
    try {
      await api.deleteAdminMasterBook(bookId);
      await loadData();
      alert('Publication deleted successfully.');
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  }

  if (loading) {
    return (
      <div style={{ width: '100%', padding: '16px 0 48px 0' }}>
        <div className="skeleton" style={{ height: 180, borderRadius: 20, marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 16 }} />)}
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const books = data?.books || [];
  const orders = data?.orders || [];

  return (
    <div style={{ width: '100%', paddingBottom: 54 }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 55%, #1E1B4B 100%)',
          borderRadius: 24,
          padding: '32px 34px',
          color: '#FFFFFF',
          marginBottom: 28,
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.35)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ maxWidth: 720 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 999, background: 'rgba(255, 255, 255, 0.12)', border: '1px solid rgba(255, 255, 255, 0.2)', marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38BDF8', display: 'inline-block' }} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#E2E8F0' }}>
                Master E-Commerce &amp; Syndication Command
              </span>
            </div>

            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px 0', lineHeight: 1.2 }}>
              Master Bookstore &amp; Revenue Reconciliation
            </h1>

            <p style={{ fontSize: 14.5, color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
              Manage master study materials syndicated to all 800 colleges and schools. Every master book sold pays 10% affiliate commission to the selling college and 90% net profit to your platform.
            </p>
          </div>

          <button
            onClick={() => { setEditingBook(null); setModalOpen(true); }}
            className="btn btn-primary"
            style={{
              padding: '12px 24px',
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 14,
              boxShadow: '0 8px 20px -4px rgba(2, 132, 199, 0.4)',
            }}
          >
            + Upload Master Book to All Colleges
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: 24 }}>{error}</div>}

      {/* 4-Card Global Financial KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">GROSS BOOK SALES</div>
              <div className="stat-value" style={{ color: '#0F172A', marginTop: 4, fontWeight: 800 }}>
                ₹{summary.grossSalesRupees?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#E0F2FE', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              📈
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: '#64748B' }}>
            {summary.totalOrders || 0} Total Student Purchases
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">COLLEGE 10% COMMISSIONS</div>
              <div className="stat-value" style={{ color: '#D97706', marginTop: 4, fontWeight: 800 }}>
                ₹{summary.totalCollegePayoutsRupees?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              🤝
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: '#64748B' }}>
            Paid / Converted into QP Credits
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">NET PLATFORM PROFIT (90%)</div>
              <div className="stat-value" style={{ color: '#059669', marginTop: 4, fontWeight: 800 }}>
                ₹{summary.netPlatformRevenueRupees?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              💰
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: '#64748B' }}>
            Retained Platform Net Revenue
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">ACTIVE PUBLICATIONS</div>
              <div className="stat-value" style={{ color: '#0F172A', marginTop: 4, fontWeight: 800 }}>
                {summary.totalBooks || 0}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              📚
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: '#64748B' }}>
            {summary.masterBooksCount || 0} Master + {summary.collegeBooksCount || 0} College Books
          </div>
        </div>
      </div>

      {/* Publications Catalog Grid */}
      <div className="card card-pad" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
              Master Bookstore Publications
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
              Published centrally and auto-syndicated across the public website and all 800 college portals.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a
              href="/#/store"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              title="Preview official central bookstore as a student"
            >
              <span>🌐</span> Central Bookstore ↗
            </a>
            <a
              href="/#/colleges/andhra-inspire-academy#store"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              title="Preview how books appear inside a college portal with 10% affiliate share"
            >
              <span>🏫</span> College Portal ↗
            </a>
            <button
              onClick={() => { setEditingBook(null); setModalOpen(true); }}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: 13 }}
            >
              + Add Master Book
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {books.map((b) => (
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
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
            >
              {/* Cover Image Frame */}
              <div
                style={{
                  width: 90,
                  height: 125,
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: '#F1F5F9',
                  flexShrink: 0,
                  boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                  position: 'relative',
                }}
              >
                <img
                  src={b.coverImageUrl || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80'}
                  alt={b.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              {/* Info & Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span className="badge badge-neutral" style={{ fontWeight: 800, fontSize: 10 }}>
                      {b.examTarget}
                    </span>
                    {b.isGlobal ? (
                      <span className="badge badge-success" style={{ fontSize: 10 }}>
                        ⚡ All 800 Sites
                      </span>
                    ) : (
                      <span className="badge badge-gold" style={{ fontSize: 10 }}>
                        🏛️ {b.institute?.name?.substring(0, 15) || 'Private'}
                      </span>
                    )}
                  </div>

                  <h4 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0', lineHeight: 1.3 }}>
                    {b.title}
                  </h4>

                  <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 10px 0', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
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
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#059669' }}>
                      {b.salesCount || 0} Sold
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
                        fontSize: 11.5,
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                      title="View how this book appears in the public central store"
                    >
                      👁️ View Live ↗
                    </a>
                    <button
                      onClick={() => {
                        setEditingBook(b);
                        setModalOpen(true);
                      }}
                      style={{
                        flex: 1,
                        background: '#F1F5F9',
                        color: '#334155',
                        border: '1px solid #CBD5E1',
                        borderRadius: 8,
                        padding: '6px 10px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ✏️ Edit Book
                    </button>
                    <button
                      onClick={() => handleDeleteBook(b.id)}
                      style={{
                        background: '#FEE2E2',
                        color: '#DC2626',
                        border: 'none',
                        borderRadius: 8,
                        padding: '6px 10px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      title="Remove from platform"
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

      {/* Global Orders Ledger */}
      <div className="card card-pad">
        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
          Nationwide Student Purchase Transactions
        </h3>
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px 0' }}>
          All verified study material orders across all 800 schools and colleges.
        </p>

        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', background: '#F8FAFC', borderRadius: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🧾</div>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>No student orders yet</h4>
            <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0 0' }}>
              Student orders will appear here automatically when purchased from college websites.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Student Name</th>
                  <th>WhatsApp Phone</th>
                  <th>Book Title</th>
                  <th>Selling College (10% Share)</th>
                  <th>Amount</th>
                  <th>Platform Net (90%)</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 700, color: '#0284c7' }}>{o.orderNumber}</td>
                    <td style={{ fontWeight: 600, color: '#0F172A' }}>{o.buyerName}</td>
                    <td>📱 {o.buyerPhone}</td>
                    <td>{o.book?.title}</td>
                    <td style={{ fontWeight: 600, color: '#4338CA' }}>
                      {o.sellingInstitute ? o.sellingInstitute.name : 'QuestionStudio Master'}
                    </td>
                    <td>₹{o.amountRupees}</td>
                    <td style={{ fontWeight: 700, color: '#059669' }}>+₹{o.platformShareRupees.toFixed(2)}</td>
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

      {/* High-Impact E-Commerce Book Publisher Studio */}
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
    </div>
  );
}
