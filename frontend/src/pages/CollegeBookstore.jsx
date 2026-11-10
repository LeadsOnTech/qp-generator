import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function CollegeBookstore() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'orders' | 'publish'

  // Publish Modal State
  const [publishModal, setPublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    examTarget: 'NEET',
    subject: 'Comprehensive',
    classYear: 'Class 12',
    author: '',
    priceRupees: 199,
    mrpRupees: 499,
    category: 'STUDY_MATERIAL',
    isGlobal: false,
    coverImageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
  });

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

  async function handlePublish(e) {
    e.preventDefault();
    if (!form.title.trim()) return alert('Please enter publication title');
    try {
      setPublishing(true);
      await api.uploadInstituteMarketplaceMaterial(form);
      setPublishModal(false);
      setForm({
        title: '',
        subtitle: '',
        description: '',
        examTarget: 'NEET',
        subject: 'Comprehensive',
        classYear: 'Class 12',
        author: '',
        priceRupees: 199,
        mrpRupees: 499,
        category: 'STUDY_MATERIAL',
        isGlobal: false,
        coverImageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
      });
      await loadData();
      alert('Publication successfully published to your college website!');
    } catch (err) {
      alert('Failed to publish material: ' + err.message);
    } finally {
      setPublishing(false);
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                {myBooks.map((b) => (
                  <div key={b.id} style={{ border: '1px solid #E2E8F0', borderRadius: 14, padding: 16, background: '#FFFFFF' }}>
                    <span className="badge badge-gold" style={{ fontSize: 10, marginBottom: 8 }}>{b.examTarget}</span>
                    <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>{b.title}</h4>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#059669', marginBottom: 8 }}>
                      Price: ₹{b.priceRupees} • Sales: {b.salesCount} copies
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>
                      You receive 90% (₹{(b.priceRupees * 0.9).toFixed(2)}) per sale.
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

      {/* 6. Publish College Material Modal */}
      {publishModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setPublishModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              maxWidth: 620,
              width: '100%',
              padding: '28px 30px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: '0 0 2px 0' }}>
                  Publish College Study Material
                </h3>
                <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>
                  You set the price and keep 90% of every sale. Watermarked automatically on download.
                </p>
              </div>
              <button
                onClick={() => setPublishModal(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 14, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePublish}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Publication Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dean's Special Organic Chemistry Reactions"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Subtitle / Quick Highlights
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50 Essential Named Reactions with Step-by-Step Mechanisms"
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Target Exam
                  </label>
                  <select
                    value={form.examTarget}
                    onChange={(e) => setForm({ ...form, examTarget: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13 }}
                  >
                    <option value="NEET">NEET UG</option>
                    <option value="JEE Main">JEE Main</option>
                    <option value="AP EAPCET">AP EAPCET</option>
                    <option value="TG EAPCET">TG EAPCET</option>
                    <option value="KCET">KCET</option>
                    <option value="CBSE 12">CBSE 12</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Subject
                  </label>
                  <select
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13 }}
                  >
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Biology">Biology</option>
                    <option value="Comprehensive">Comprehensive / All</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="49"
                    max="9999"
                    required
                    value={form.priceRupees}
                    onChange={(e) => setForm({ ...form, priceRupees: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                  <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>
                    You receive: ₹{(form.priceRupees * 0.9).toFixed(2)} (90%)
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Strikethrough MRP (₹)
                  </label>
                  <input
                    type="number"
                    value={form.mrpRupees}
                    onChange={(e) => setForm({ ...form, mrpRupees: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                  <span style={{ fontSize: 11, color: '#64748B' }}>
                    Discount tag: {Math.max(0, Math.round(((form.mrpRupees - form.priceRupees) / form.mrpRupees) * 100))}% off
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Overview &amp; Syllabus Coverage
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why students should buy this material and what topics are covered..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setPublishModal(false)}
                  style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={publishing}
                  className="btn btn-primary"
                  style={{ padding: '10px 22px', borderRadius: 10, fontWeight: 800 }}
                >
                  {publishing ? 'Publishing...' : 'Publish to College Portal 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
