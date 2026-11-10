import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function SuperAdminMarketplace() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // New Master Book Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    examTarget: 'NEET',
    subject: 'Comprehensive',
    classYear: 'Class 12',
    author: 'QuestionStudio Academic Editorial Board',
    priceRupees: 199,
    mrpRupees: 499,
    category: 'FORMULA_BOOK',
    coverImageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80',
    pageCount: 160,
  });

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

  async function handleCreateMasterBook(e) {
    e.preventDefault();
    if (!form.title.trim()) return alert('Please enter book title');
    try {
      setSaving(true);
      await api.uploadAdminMasterBook(form);
      setModalOpen(false);
      setForm({
        title: '',
        subtitle: '',
        description: '',
        examTarget: 'NEET',
        subject: 'Comprehensive',
        classYear: 'Class 12',
        author: 'QuestionStudio Academic Editorial Board',
        priceRupees: 199,
        mrpRupees: 499,
        category: 'FORMULA_BOOK',
        coverImageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80',
        pageCount: 160,
      });
      await loadData();
      alert('Master publication created and syndicated to all 800 college websites!');
    } catch (err) {
      alert('Failed to create publication: ' + err.message);
    } finally {
      setSaving(false);
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
            onClick={() => setModalOpen(true)}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
              Master Bookstore Publications
            </h3>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
              Published centrally and auto-syndicated across all 800 college and school portals.
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: 13 }}
          >
            + Add Master Book
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
          {books.map((b) => (
            <div
              key={b.id}
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: 16,
                padding: 18,
                background: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <span className="badge badge-neutral" style={{ fontWeight: 700, fontSize: 11 }}>
                    {b.examTarget}
                  </span>
                  {b.isGlobal ? (
                    <span className="badge badge-success" style={{ fontSize: 10 }}>
                      ⚡ Syndicated to 800 Sites
                    </span>
                  ) : (
                    <span className="badge badge-gold" style={{ fontSize: 10 }}>
                      🏛️ {b.institute?.name || 'Private'}
                    </span>
                  )}
                </div>

                <h4 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0', lineHeight: 1.3 }}>
                  {b.title}
                </h4>

                <p style={{ fontSize: 12.5, color: '#64748B', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                  {b.subtitle || b.description?.substring(0, 80) + '...'}
                </p>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                  <div>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#0284c7' }}>₹{b.priceRupees}</span>
                    <span style={{ fontSize: 12, color: '#94A3B8', textDecoration: 'line-through', marginLeft: 6 }}>₹{b.mrpRupees}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>
                    {b.salesCount} Copies Sold
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

      {/* Upload Master Book Modal */}
      {modalOpen && (
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
          onClick={() => setModalOpen(false)}
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
                  Syndicate Master Book to All 800 Colleges
                </h3>
                <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>
                  This publication will instantly appear in every college's public bookstore.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 14, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMasterBook}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Master Book Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NEET 2026 High-Yield Organic Chemistry Maps"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Subtitle / Solved Features
                </label>
                <input
                  type="text"
                  placeholder="e.g. Complete Solved PYQs with Step-by-Step Graphical Approaches"
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
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13 }}
                  >
                    <option value="FORMULA_BOOK">Formula Handbook</option>
                    <option value="PYQ_SOLUTIONS">PYQ Solutions</option>
                    <option value="MOCK_TEST_SERIES">Mock Test Series</option>
                    <option value="STUDY_MATERIAL">Study Material</option>
                    <option value="HANDBOOK">Handy Visual Atlas</option>
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
                    required
                    value={form.priceRupees}
                    onChange={(e) => setForm({ ...form, priceRupees: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                  <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>
                    College affiliate gets 10%: ₹{(form.priceRupees * 0.1).toFixed(2)}
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
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ padding: '10px 22px', borderRadius: 10, fontWeight: 800 }}
                >
                  {saving ? 'Syndicating...' : 'Syndicate to All 800 Colleges 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
