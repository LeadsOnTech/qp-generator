import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import EcommerceBookEditorModal from '../components/EcommerceBookEditorModal';

export default function CollegeBookstore() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'orders' | 'publish'

  // Publish Modal State
  const [publishModal, setPublishModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getInstituteMarketplaceEarnings();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load bookstore earnings and catalog.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSaveMaterial(formData) {
    if (editingBook) {
      await api.updateInstituteMarketplaceMaterial(editingBook.id, formData);
      alert('Publication updated successfully!');
    } else {
      await api.uploadInstituteMarketplaceMaterial(formData);
      alert('Study material published to your college portal! Students can now purchase and download it.');
    }
    await loadData();
  }

  async function handleDeleteCollegeBook(bookId) {
    if (!window.confirm('Are you sure you want to remove this publication from your college portal?')) return;
    try {
      await api.deleteInstituteMarketplaceMaterial(bookId);
      await loadData();
      alert('Study material removed.');
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  }

  if (loading) {
    return (
      <div style={{ width: '100%', padding: '16px 0 48px 0' }}>
        <div className="skeleton" style={{ height: 200, borderRadius: 20, marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 16 }} />)}
        </div>
      </div>
    );
  }

  const inst = data?.institute || {};
  const stats = data?.stats || {};
  const orders = data?.recentOrders || [];
  const myBooks = data?.myBooks || [];

  return (
    <div style={{ width: '100%', paddingBottom: 54 }}>
      {/* 1. Header Command Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 45%, #075985 100%)',
          borderRadius: 24,
          padding: '32px 34px',
          color: '#FFFFFF',
          marginBottom: 28,
          boxShadow: '0 20px 40px -15px rgba(2, 132, 199, 0.35)',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 740 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', borderRadius: 999, background: 'rgba(255, 255, 255, 0.14)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.25)', marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399', display: 'inline-block', boxShadow: '0 0 10px #34D399' }} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#FFFFFF' }}>
                Institutional Bookstore &amp; Affiliate Engine
              </span>
            </div>

            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px 0', lineHeight: 1.2 }}>
              Study Materials &amp; Books Marketplace
            </h1>

            <p style={{ fontSize: 14.5, color: '#E0F2FE', margin: 0, lineHeight: 1.5 }}>
              Earn <strong>10% affiliate commission</strong> (or free Question Paper credits) on every master publication sold through your website, plus <strong>90% revenue</strong> on your college’s own uploaded study materials.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => setPublishModal(true)}
              style={{
                background: '#FFFFFF',
                color: '#0284c7',
                padding: '11px 22px',
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 14,
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
              }}
            >
              <span>+</span> Publish College Material
            </button>

            {inst.slug && (
              <a
                href={`/#/colleges/${inst.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  color: '#FFFFFF',
                  padding: '11px 18px',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: 'none',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>🌐</span> View College Store ↗
              </a>
            )}
          </div>
        </div>

        {/* Footer info pill */}
        <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid rgba(255, 255, 255, 0.18)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: 12, color: '#BAE6FD' }}>
          <div>
            Auto-Credit Conversion: <strong style={{ color: '#FFFFFF' }}>Active (₹1 Earned = 1 Free Question Paper Credit)</strong>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <span>✓ Anti-Piracy DRM Watermarking Active</span>
            <span>✓ Instant UPI Student Payments</span>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: 24 }}>{error}</div>}

      {/* 2. 4-Tile Financial Performance Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">TOTAL STORE EARNINGS</div>
              <div className="stat-value" style={{ color: '#059669', marginTop: 4, fontWeight: 800 }}>
                ₹{stats.totalEarningsRupees?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              💰
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: '#64748B' }}>
            10% Master Books + 90% College Books
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">AUTO-AWARDED QP CREDITS</div>
              <div className="stat-value" style={{ color: '#0284c7', marginTop: 4, fontWeight: 800 }}>
                +{stats.totalCreditsEarned?.toLocaleString() || '0'}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#E0F2FE', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              ⚡
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: '#64748B' }}>
            Usable for Question Paper Generation
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">STUDENT PURCHASES</div>
              <div className="stat-value" style={{ color: '#0F172A', marginTop: 4, fontWeight: 800 }}>
                {stats.totalSold || 0}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              📦
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: '#64748B' }}>
            Verified Watermarked Deliveries
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">OUR PUBLISHED MATERIALS</div>
              <div className="stat-value" style={{ color: '#0F172A', marginTop: 4, fontWeight: 800 }}>
                {stats.myPublishedBooksCount || 0}
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              🎓
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: '#64748B' }}>
            Proprietary College Materials
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 22, borderBottom: '1px solid #E2E8F0', paddingBottom: 12 }}>
        <button
          onClick={() => setActiveTab('catalog')}
          style={{
            background: activeTab === 'catalog' ? '#0284c7' : '#F1F5F9',
            color: activeTab === 'catalog' ? '#FFFFFF' : '#475569',
            padding: '9px 18px',
            borderRadius: 10,
            border: 'none',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>📚</span> Active Store Catalog ({myBooks.length + 4})
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          style={{
            background: activeTab === 'orders' ? '#0284c7' : '#F1F5F9',
            color: activeTab === 'orders' ? '#FFFFFF' : '#475569',
            padding: '9px 18px',
            borderRadius: 10,
            border: 'none',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>🧾</span> Student Orders &amp; Sales ({orders.length})
        </button>
      </div>

      {/* 4. Tab 1: Catalog View */}
      {activeTab === 'catalog' && (
        <div>
          {/* Master Books Section */}
          <div className="card card-pad" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                  Super Admin Master Publications (You Earn 10% on Every Sale)
                </h3>
                <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                  These national high-yield handbooks and PYQs are automatically published on your college portal.
                </p>
              </div>
              <span className="badge badge-success" style={{ fontWeight: 700 }}>
                10% Affiliate Commission Active
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div style={{ border: '1px solid #E2E8F0', borderRadius: 14, padding: 16, background: '#F8FAFC' }}>
                <span className="badge badge-neutral" style={{ fontSize: 10, marginBottom: 8 }}>NEET UG</span>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
                  NEET 2026 Physics &amp; Chemistry Formula Handbook
                </h4>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0284c7', marginBottom: 8 }}>
                  Price: ₹199 <span style={{ fontSize: 11, color: '#94A3B8', textDecoration: 'line-through' }}>₹499</span>
                </div>
                <div style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>
                  Your Earnings: ₹19.90 / 20 Credits per sale
                </div>
              </div>

              <div style={{ border: '1px solid #E2E8F0', borderRadius: 14, padding: 16, background: '#F8FAFC' }}>
                <span className="badge badge-neutral" style={{ fontSize: 10, marginBottom: 8 }}>JEE MAIN</span>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
                  JEE Main 10-Year Chapterwise PYQ Blueprint
                </h4>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0284c7', marginBottom: 8 }}>
                  Price: ₹249 <span style={{ fontSize: 11, color: '#94A3B8', textDecoration: 'line-through' }}>₹599</span>
                </div>
                <div style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>
                  Your Earnings: ₹24.90 / 25 Credits per sale
                </div>
              </div>

              <div style={{ border: '1px solid #E2E8F0', borderRadius: 14, padding: 16, background: '#F8FAFC' }}>
                <span className="badge badge-neutral" style={{ fontSize: 10, marginBottom: 8 }}>AP &amp; TG EAPCET</span>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
                  EAPCET 2026 Ultimate 10-Full Mock Test Series
                </h4>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0284c7', marginBottom: 8 }}>
                  Price: ₹299 <span style={{ fontSize: 11, color: '#94A3B8', textDecoration: 'line-through' }}>₹699</span>
                </div>
                <div style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>
                  Your Earnings: ₹29.90 / 30 Credits per sale
                </div>
              </div>
            </div>
          </div>

          {/* College's Own Publications Section */}
          <div className="card card-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                  Your College's Proprietary Materials (You Keep 90%)
                </h3>
                <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                  Upload study materials, notes, or test sets authored by your own faculty.
                </p>
              </div>
              <button
                onClick={() => setPublishModal(true)}
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: 12, borderRadius: 8, fontWeight: 700 }}
              >
                + Publish New Material
              </button>
            </div>

            {myBooks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', background: '#F8FAFC', borderRadius: 14, border: '1px dashed #CBD5E1' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎓</div>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
                  No College Materials Published Yet
                </h4>
                <p style={{ fontSize: 13, color: '#64748B', maxWidth: 420, margin: '0 auto 14px auto' }}>
                  Upload your college's faculty notes or question sets to sell directly to your students. You keep 90% of every sale!
                </p>
                <button
                  onClick={() => setPublishModal(true)}
                  className="btn btn-primary"
                  style={{ padding: '9px 18px', fontSize: 13 }}
                >
                  Publish First Material
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
                {myBooks.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: 16,
                      padding: 16,
                      background: '#FFFFFF',
                      display: 'flex',
                      gap: 14,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div
                      style={{
                        width: 80,
                        height: 110,
                        borderRadius: 8,
                        overflow: 'hidden',
                        background: '#F1F5F9',
                        flexShrink: 0,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                      }}
                    >
                      <img
                        src={b.coverImageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80'}
                        alt={b.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                      <div>
                        <span className="badge badge-gold" style={{ fontSize: 10, marginBottom: 4 }}>
                          {b.examTarget}
                        </span>
                        <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0', lineHeight: 1.3 }}>
                          {b.title}
                        </h4>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#059669', marginBottom: 4 }}>
                          ₹{b.priceRupees} <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 500 }}>• You keep 90% (₹{(b.priceRupees * 0.9).toFixed(2)})</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button
                          onClick={() => {
                            setEditingBook(b);
                            setPublishModal(true);
                          }}
                          style={{
                            flex: 1,
                            background: '#F1F5F9',
                            color: '#334155',
                            border: '1px solid #CBD5E1',
                            borderRadius: 6,
                            padding: '5px 8px',
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCollegeBook(b.id)}
                          style={{
                            background: '#FEE2E2',
                            color: '#DC2626',
                            border: 'none',
                            borderRadius: 6,
                            padding: '5px 8px',
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                          title="Delete Material"
                        >
                          🗑️
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

      {/* 5. Tab 2: Orders & Sales Ledger */}
      {activeTab === 'orders' && (
        <div className="card card-pad">
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
            Student Purchases &amp; Affiliate Commission Ledger
          </h3>
          <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px 0' }}>
            Real-time tracking of study materials purchased by students through your college website.
          </p>

          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', background: '#F8FAFC', borderRadius: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🧾</div>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>No student purchases recorded yet</h4>
              <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0 0' }}>
                When students buy study materials through your college portal, their orders and your 10% commission will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Student Name</th>
                    <th>WhatsApp Mobile</th>
                    <th>Book Title</th>
                    <th>Amount Paid</th>
                    <th>Your Share (10% / 90%)</th>
                    <th>Credits Earned</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 700, color: '#0284c7' }}>{o.orderNumber}</td>
                      <td style={{ fontWeight: 600, color: '#0F172A' }}>{o.buyerName}</td>
                      <td>📱 {o.buyerPhone}</td>
                      <td>{o.bookTitle}</td>
                      <td>₹{o.amountRupees}</td>
                      <td style={{ color: '#059669', fontWeight: 700 }}>+₹{o.collegeShareRupees.toFixed(2)}</td>
                      <td>
                        <span className="badge badge-success">+{o.creditsAwarded} Qs</span>
                      </td>
                      <td style={{ fontSize: 12, color: '#64748B' }}>
                        {new Date(o.date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. High-Impact E-Commerce Publisher Studio Modal */}
      <EcommerceBookEditorModal
        isOpen={publishModal}
        onClose={() => {
          setPublishModal(false);
          setEditingBook(null);
        }}
        initialData={editingBook}
        isMaster={false}
        onSave={handleSaveMaterial}
      />
    </div>
  );
}
