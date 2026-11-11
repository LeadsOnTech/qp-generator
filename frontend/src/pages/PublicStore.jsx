import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import MarketingHeader from '../components/MarketingHeader';
import EcommerceBookModal from '../components/EcommerceBookModal';

export default function PublicStore() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedProductBook, setSelectedProductBook] = useState(null);
  const [sampleModalBook, setSampleModalBook] = useState(null);
  const [buyModalBook, setBuyModalBook] = useState(null);
  const [buyForm, setBuyForm] = useState({ buyerName: '', buyerPhone: '', buyerEmail: '' });
  const [buying, setBuying] = useState(false);
  const [purchasedOrder, setPurchasedOrder] = useState(null);

  useEffect(() => {
    loadBooks();
  }, []);

  async function loadBooks() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getMarketplaceCatalog();
      setBooks(res.books || []);
    } catch (err) {
      setError(err.message || 'Failed to load bookstore catalog');
    } finally {
      setLoading(false);
    }
  }

  // Handle instant checkout and DRM watermarked PDF generation
  async function handleBuyBook(e) {
    e.preventDefault();
    if (!buyForm.buyerName.trim() || !buyForm.buyerPhone.trim()) {
      return alert('Please enter student full name and valid WhatsApp mobile number.');
    }
    try {
      setBuying(true);
      const res = await api.createMarketplaceOrder({
        bookId: buyModalBook.id,
        buyerName: buyForm.buyerName.trim(),
        buyerPhone: buyForm.buyerPhone.trim(),
        buyerEmail: buyForm.buyerEmail.trim(),
        paymentMethod: 'UPI_RAZORPAY',
      });
      setPurchasedOrder(res);
    } catch (err) {
      alert('Checkout failed: ' + (err.message || 'Please try again.'));
    } finally {
      setBuying(false);
    }
  }

  const filteredBooks = books.filter((b) => {
    const matchesFilter =
      activeFilter === 'ALL' ||
      (b.examTarget || '').toUpperCase().includes(activeFilter) ||
      (b.category || '').toUpperCase().includes(activeFilter);

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      b.title.toLowerCase().includes(q) ||
      (b.subtitle && b.subtitle.toLowerCase().includes(q)) ||
      (b.description && b.description.toLowerCase().includes(q)) ||
      (b.subject && b.subject.toLowerCase().includes(q));

    return matchesFilter && matchesSearch;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* 1. Global Navigation Header */}
      <MarketingHeader activePage="store" />

      {/* 2. Hero Command Banner */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #075985 100%)',
          padding: '60px 24px 64px',
          color: '#FFFFFF',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -100,
            right: -100,
            width: 380,
            height: 380,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            left: -80,
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: 840, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.16)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.28)',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#FFFFFF',
              marginBottom: 16,
            }}
          >
            <span>📚</span>
            <span>Official E-Commerce Bookstore &amp; Solved PYQ Repository</span>
          </div>

          <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 16px 0', lineHeight: 1.2 }}>
            Master Entrance Publications &amp; Solved Blueprints
          </h1>

          <p style={{ fontSize: 16, color: '#E0F2FE', maxWidth: 680, margin: '0 auto 28px', lineHeight: 1.6 }}>
            Curated by top entrance faculty across Andhra Pradesh, Telangana, and Karnataka. Download verified solved PYQs, high-yield formula handbooks, and topic mindmaps with instant anti-piracy watermarking.
          </p>

          {/* Quick Trust Ribbons */}
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 14, fontSize: 12.5, fontWeight: 700 }}>
            <span style={{ background: 'rgba(255,255,255,0.18)', padding: '5px 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)' }}>
              ⚡ Instant PDF Delivery
            </span>
            <span style={{ background: 'rgba(255,255,255,0.18)', padding: '5px 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)' }}>
              🛡️ Diagonal Watermark with Student Mobile
            </span>
            <span style={{ background: 'rgba(255,255,255,0.18)', padding: '5px 14px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)' }}>
              ⭐ 4.9 Rating from 24,000+ Students
            </span>
          </div>
        </div>
      </section>

      {/* 3. Catalog Explorer & Search Section */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Search & Exam Filter Bar */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            padding: '20px 24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.05)',
            marginBottom: 36,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#94A3B8' }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by book title, subject (Physics, Chemistry, Biology, Maths), or exam blueprint..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px 14px 46px',
                borderRadius: 12,
                border: '1px solid #CBD5E1',
                fontSize: 14.5,
                fontWeight: 500,
                color: '#0F172A',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#0284c7')}
              onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
            />
          </div>

          {/* Exam Filter Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: 4 }}>
              Filter by Exam:
            </span>
            {[
              { id: 'ALL', label: 'All Publications' },
              { id: 'NEET', label: 'NEET UG' },
              { id: 'JEE', label: 'JEE Main & Adv' },
              { id: 'EAPCET', label: 'AP & TG EAPCET' },
              { id: 'KCET', label: 'KCET' },
              { id: 'FORMULA', label: 'Formula Handbooks' },
              { id: 'PYQ', label: 'PYQ Banks' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: activeFilter === f.id ? '#0284c7' : '#F1F5F9',
                  color: activeFilter === f.id ? '#FFFFFF' : '#475569',
                  boxShadow: activeFilter === f.id ? '0 4px 12px rgba(2, 132, 199, 0.3)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Status Readout */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', margin: 0 }}>
            Available Publications ({filteredBooks.length})
          </h2>
          <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>
            Showing verified titles with instant PDF downloads
          </span>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ height: 380, borderRadius: 16, background: '#E2E8F0', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: 24, borderRadius: 16, textAlign: 'center', color: '#991B1B' }}>
            <p style={{ margin: 0, fontWeight: 700 }}>Failed to load bookstore: {error}</p>
            <button onClick={loadBooks} style={{ marginTop: 12, padding: '8px 16px', background: '#DC2626', color: '#FFF', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
              Retry Loading
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredBooks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FFFFFF', borderRadius: 20, border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📚</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0' }}>No Publications Found</h3>
            <p style={{ fontSize: 14, color: '#64748B', maxWidth: 420, margin: '0 auto 18px' }}>
              No books matched your search or exam filter. Try resetting your filter to view all available titles.
            </p>
            <button
              onClick={() => { setActiveFilter('ALL'); setSearchQuery(''); }}
              style={{ padding: '9px 18px', background: '#0284c7', color: '#FFFFFF', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* 4. Publications Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
          {filteredBooks.map((b) => (
            <div
              key={b.id}
              onClick={() => setSelectedProductBook(b)}
              style={{
                background: '#FFFFFF',
                borderRadius: 18,
                border: '1px solid #E2E8F0',
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 15px -3px rgba(15, 23, 42, 0.05)',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 16px 32px -6px rgba(2, 132, 199, 0.18)';
                e.currentTarget.style.borderColor = '#38bdf8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px -3px rgba(15, 23, 42, 0.05)';
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
            >
              <div>
                {/* 3D Cover Mockup with Perspective Spine */}
                <div
                  style={{
                    height: 190,
                    borderRadius: 14,
                    overflow: 'hidden',
                    marginBottom: 16,
                    position: 'relative',
                    background: '#0F172A',
                    boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <img
                    src={b.coverImageUrl || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80'}
                    alt={b.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {/* Spine Simulation Shadow */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      bottom: 0,
                      width: 14,
                      background: 'linear-gradient(to right, rgba(0,0,0,0.5), transparent)',
                      pointerEvents: 'none',
                    }}
                  />
                  {/* Floating Badges */}
                  <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: '#0284c7', color: '#FFFFFF', letterSpacing: '0.04em' }}>
                      {b.examTarget || 'COMPETITIVE'}
                    </span>
                    {b.discountPct > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: '#10B981', color: '#FFFFFF' }}>
                        {b.discountPct}% OFF
                      </span>
                    )}
                  </div>
                </div>

                <h4 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0', lineHeight: 1.35 }}>
                  {b.title}
                </h4>

                <p style={{ fontSize: 12.5, color: '#64748B', margin: '0 0 10px 0', lineHeight: 1.45 }}>
                  {b.subtitle || b.description}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#0284c7', fontWeight: 600, marginBottom: 10 }}>
                  <span>⭐ {b.rating || 4.9} ({b.reviewsCount || 24} reviews)</span>
                  <span>•</span>
                  <span>{b.salesCount || 120}+ downloads</span>
                </div>

                <div style={{ fontSize: 11, color: '#059669', background: '#ECFDF5', padding: '5px 10px', borderRadius: 8, border: '1px solid #A7F3D0', marginBottom: 14, fontWeight: 600 }}>
                  🛡️ Anti-Piracy Watermark: Licensed to Buyer
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12, paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: 24, fontWeight: 900, color: '#0F172A' }}>₹{b.priceRupees}</span>
                  {b.mrpRupees && (
                    <span style={{ fontSize: 13, color: '#94A3B8', textDecoration: 'line-through' }}>₹{b.mrpRupees}</span>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', marginLeft: 'auto' }}>
                    Instant PDF Delivery
                  </span>
                </div>

                <div style={{ textAlign: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11.5, color: '#0284c7', fontWeight: 700 }}>
                    👁️ Click to view full 3D preview, sample &amp; reviews
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSampleModalBook(b);
                    }}
                    style={{
                      background: '#F1F5F9',
                      color: '#334155',
                      border: 'none',
                      borderRadius: 10,
                      padding: '10px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    📖 Read Sample
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPurchasedOrder(null);
                      setBuyModalBook(b);
                    }}
                    style={{
                      background: '#0284c7',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 10,
                      padding: '10px 12px',
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
                    }}
                  >
                    ⚡ Buy Now (₹{b.priceRupees})
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          MODAL 1: AMAZON/FLIPKART STYLE PRODUCT PAGE MODAL
          ========================================================================= */}
      {selectedProductBook && (
        <EcommerceBookModal
          book={selectedProductBook}
          onClose={() => setSelectedProductBook(null)}
          onBuyClick={(b) => {
            setSelectedProductBook(null);
            setPurchasedOrder(null);
            setBuyModalBook(b);
          }}
          onSampleClick={(b) => {
            setSelectedProductBook(null);
            setSampleModalBook(b);
          }}
        />
      )}

      {/* =========================================================================
          MODAL 2: FREE SAMPLE / TABLE OF CONTENTS VIEWER
          ========================================================================= */}
      {sampleModalBook && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              maxWidth: 720,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            }}
          >
            <div style={{ padding: '24px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#0284c7', letterSpacing: '0.05em' }}>
                  Free Sample &bull; Look Inside
                </span>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '4px 0 0 0' }}>
                  {sampleModalBook.title}
                </h3>
              </div>
              <button
                onClick={() => setSampleModalBook(null)}
                style={{ background: '#f1f5f9', border: 'none', width: 36, height: 36, borderRadius: '50%', fontSize: 18, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '28px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, marginBottom: 24, lineHeight: 1.7, fontSize: 14, color: '#334155' }}>
                <h4 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 10px 0' }}>📖 Table of Contents &amp; Sample Topic Map:</h4>
                <p style={{ margin: '0 0 12px 0' }}>
                  {sampleModalBook.description || 'Comprehensive solved handbook with chapter-wise blueprints and formula mappings.'}
                </p>
                <div style={{ padding: '12px 16px', background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: 12.5, color: '#475569' }}>
                  &bull; Chapter 1: High-Yield Weightage &amp; 10-Year Question Frequency<br/>
                  &bull; Chapter 2: Essential Formulas, Constants &amp; Graphical Approximations<br/>
                  &bull; Chapter 3: Verified Solved Questions with Diagnostic Remedial Tips<br/>
                  &bull; Chapter 4: Speed Hacks &amp; Elimination Strategies for Speed Tests
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setSampleModalBook(null)}
                  style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '12px 20px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}
                >
                  Close Sample
                </button>
                <button
                  onClick={() => {
                    const b = sampleModalBook;
                    setSampleModalBook(null);
                    setPurchasedOrder(null);
                    setBuyModalBook(b);
                  }}
                  style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '12px 24px', borderRadius: 10, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)' }}
                >
                  ⚡ Unlock Full Book (₹{sampleModalBook.priceRupees})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: INSTANT CHECKOUT & WATERMARKED PDF DOWNLOAD
          ========================================================================= */}
      {buyModalBook && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              maxWidth: 520,
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#059669', letterSpacing: '0.05em' }}>
                  ⚡ Instant Digital Download
                </span>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '4px 0 0 0' }}>
                  {purchasedOrder ? 'Payment Successful!' : 'Student Purchase & DRM License'}
                </h3>
              </div>
              <button
                onClick={() => { setBuyModalBook(null); setPurchasedOrder(null); }}
                style={{ background: '#f1f5f9', border: 'none', width: 34, height: 34, borderRadius: '50%', fontSize: 16, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {purchasedOrder ? (
              <div style={{ padding: '28px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
                <h4 style={{ fontSize: 20, fontWeight: 900, color: '#059669', margin: '0 0 6px 0' }}>Order Confirmed!</h4>
                <p style={{ fontSize: 13.5, color: '#64748b', margin: '0 0 20px 0' }}>
                  Your licensed study material has been generated with custom anti-piracy watermarks.
                </p>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, textAlign: 'left', marginBottom: 24, fontSize: 13, lineHeight: 1.6 }}>
                  <div><strong>Publication:</strong> {purchasedOrder.order?.book?.title || buyModalBook.title}</div>
                  <div><strong>Order ID:</strong> <span style={{ fontFamily: 'monospace' }}>{purchasedOrder.order?.id}</span></div>
                  <div><strong>Licensed To:</strong> {purchasedOrder.order?.buyerName} ({purchasedOrder.order?.buyerPhone})</div>
                  <div><strong>Delivery:</strong> High-Resolution Protected PDF</div>
                </div>

                <a
                  href={purchasedOrder.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  style={{
                    display: 'block',
                    width: '100%',
                    background: '#059669',
                    color: '#ffffff',
                    padding: '14px 20px',
                    borderRadius: 12,
                    fontWeight: 800,
                    fontSize: 15,
                    textDecoration: 'none',
                    textAlign: 'center',
                    boxShadow: '0 4px 15px rgba(5, 150, 105, 0.35)',
                    boxSizing: 'border-box',
                  }}
                >
                  📥 Download Watermarked PDF Now
                </a>
              </div>
            ) : (
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', gap: 14, marginBottom: 20, padding: 14, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <img
                    src={buyModalBook.coverImageUrl || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80'}
                    alt={buyModalBook.title}
                    style={{ width: 56, height: 74, objectFit: 'cover', borderRadius: 6 }}
                  />
                  <div>
                    <h5 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                      {buyModalBook.title}
                    </h5>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                      {buyModalBook.examTarget} &bull; {buyModalBook.category}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#0284c7' }}>
                      ₹{buyModalBook.priceRupees}
                    </div>
                  </div>
                </div>

                <form onSubmit={handleBuyBook}>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Student Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={buyForm.buyerName}
                      onChange={(e) => setBuyForm({ ...buyForm, buyerName: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13.5, boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      WhatsApp Mobile Number * (Embedded on PDF)
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={buyForm.buyerPhone}
                      onChange={(e) => setBuyForm({ ...buyForm, buyerPhone: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13.5, boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ marginBottom: 18 }}>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. student@gmail.com"
                      value={buyForm.buyerEmail}
                      onChange={(e) => setBuyForm({ ...buyForm, buyerEmail: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13.5, boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px', fontSize: 11.5, color: '#92400e', marginBottom: 18, lineHeight: 1.45 }}>
                    🛡️ <strong>Anti-Piracy Security:</strong> Your name and mobile number will be indelibly watermarked diagonally across every page of your PDF to trace unauthorized distribution.
                  </div>

                  <button
                    type="submit"
                    disabled={buying}
                    style={{
                      width: '100%',
                      background: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      padding: '13px 20px',
                      borderRadius: 10,
                      fontWeight: 800,
                      fontSize: 14,
                      cursor: buying ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
                    }}
                  >
                    {buying ? 'Generating Watermarked PDF...' : `Pay ₹${buyModalBook.priceRupees} & Download Instantly`}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
