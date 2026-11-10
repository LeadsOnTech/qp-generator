import React, { useState } from 'react';
import { MOCK_BOOK_REVIEWS } from '../lib/marketplacePresets';

export default function EcommerceBookModal({ book, collegeSlug, onClose, onBuyClick, onSampleClick }) {
  const [activeTab, setActiveTab] = useState('description');
  const [activeImgThumb, setActiveImgThumb] = useState(0);

  if (!book) return null;

  const price = book.priceRupees || 199;
  const mrp = book.mrpRupees || (price > 250 ? Math.round(price * 2.2) : 499);
  const discountPct = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const savings = mrp - price;

  const coverUrl = book.coverImageUrl || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80';

  const defaultDescription = book.description || `${book.title} is an authoritative, high-yield entrance examination handbook specifically prepared for competitive aspirants. Curated by senior subject faculty and national rankers, this publication synthesizes 10 years of solved question papers, NTA pattern trends, shortcut methods, and high-speed calculation tricks into one comprehensive digital compendium.`;

  const highlights = [
    '10-Year Chapterwise Solved Previous Year Questions (PYQs)',
    'High-Yield Formula Reference & 60-Second Calculation Shortcuts',
    'Common Pitfalls & Examiner Trap Elimination Techniques',
    'Color-Illustrated Diagram & Graph Interpretation Maps',
    '5 Full-Length Predicted Practice Mock Papers with Detailed Key',
    'Anti-Piracy DRM Protected: Dynamically Stamped with Your Credentials',
  ];

  const defaultToc = book.samplePreviewText || `DETAILED TABLE OF CONTENTS:
Chapter 1: Foundational Core Principles & Dimensional Formulas
Chapter 2: High-Yield Topic Synthesis & Theory Summary
Chapter 3: Previous 10 Years Solved Exam Questions (Chronological)
Chapter 4: Advanced Application Problems with Multi-Concept Steps
Chapter 5: Rapid Elimination Techniques & 60-Second Shortcuts
Chapter 6: Comprehensive Practice Mock Tests with Answer Keys & Explanations`;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 24,
          maxWidth: 960,
          width: '100%',
          maxHeight: '94vh',
          overflowY: 'auto',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
          position: 'relative',
          padding: '28px 32px',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Breadcrumb & Close Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid #F1F5F9', paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#64748B' }}>
            <span style={{ cursor: 'pointer', color: '#0284c7', fontWeight: 600 }} onClick={onClose}>
              ← Back to Bookstore
            </span>
            <span>/</span>
            <span>{book.examTarget || 'Entrance Exam'}</span>
            <span>/</span>
            <span style={{ color: '#0F172A', fontWeight: 700, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {book.title}
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: 999,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              cursor: 'pointer',
              color: '#64748B',
              transition: 'background 0.2s',
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* E-Commerce Top Two-Column Presentation */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32, marginBottom: 32 }}>
          {/* Left Column: 3D Book Graphic & Trust Badges */}
          <div>
            <div
              style={{
                background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2F6 100%)',
                borderRadius: 20,
                padding: '24px',
                textAlign: 'center',
                position: 'relative',
                border: '1px solid #E2E8F0',
                boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.8), 0 10px 25px -5px rgba(15, 23, 42, 0.08)',
                marginBottom: 16,
              }}
            >
              {/* Badges Overlay */}
              <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 8, background: '#0284c7', color: '#FFFFFF', boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)' }}>
                  🔥 #1 BESTSELLER
                </span>
                {discountPct > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 8, background: '#10B981', color: '#FFFFFF', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)' }}>
                    ⚡ {discountPct}% OFF
                  </span>
                )}
              </div>

              {/* 3D Book Presentation Mockup */}
              <div
                style={{
                  display: 'inline-block',
                  position: 'relative',
                  perspective: 1000,
                  padding: '10px',
                }}
              >
                <img
                  src={coverUrl}
                  alt={book.title}
                  style={{
                    width: '100%',
                    maxWidth: 240,
                    height: 320,
                    objectFit: 'cover',
                    borderRadius: '4px 14px 14px 4px',
                    boxShadow: '-8px 12px 24px rgba(15, 23, 42, 0.25), -2px 0 6px rgba(0, 0, 0, 0.15)',
                    borderLeft: '5px solid #CBD5E1',
                    transform: 'rotateY(-6deg) rotateX(2deg)',
                    transition: 'transform 0.3s ease',
                  }}
                />
              </div>

              {/* Star Rating Strip */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 }}>
                <span style={{ color: '#F59E0B', fontSize: 16, letterSpacing: 2 }}>★★★★★</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{book.rating || '4.9'}</span>
                <span style={{ fontSize: 12, color: '#64748B' }}>({book.reviewsCount || '1,480+'} student ratings)</span>
              </div>
            </div>

            {/* Trust and Delivery Strip */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 14,
                padding: '14px 16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
                fontSize: 12,
                color: '#334155',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>⚡</span>
                <span><strong>Instant Download</strong> (PDF)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>📱</span>
                <span><strong>Mobile &amp; Laptop</strong> Ready</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>🛡️</span>
                <span><strong>DRM Stamped</strong> with Name</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>🔒</span>
                <span><strong>100% Secure</strong> UPI Checkout</span>
              </div>
            </div>
          </div>

          {/* Right Column: E-Commerce Buy Box, Price & Specifications */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              {/* Category & Exam Tag */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 6, background: '#E0F2FE', color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {book.examTarget || 'COMPETITIVE ENTRANCE'}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: '#F1F5F9', color: '#475569' }}>
                  {book.category?.replace(/_/g, ' ') || 'STUDY MATERIAL'}
                </span>
                {book.subject && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: '#F5F3FF', color: '#6D28D9' }}>
                    {book.subject}
                  </span>
                )}
              </div>

              {/* Title & Subtitle */}
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0', lineHeight: 1.3 }}>
                {book.title}
              </h1>

              <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                {book.subtitle || 'High-Yield Concept Compendium, Chapterwise Solved PYQs, and Rapid Examination Formulas'}
              </p>

              <div style={{ fontSize: 12.5, color: '#475569', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Published by:</span>
                <strong style={{ color: '#0284c7' }}>{book.author || 'QuestionStudio Academic Editorial Board'}</strong>
                <span style={{ color: '#10B981', fontSize: 14 }}>✓</span>
              </div>

              {/* Price & Savings Box */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                  border: '1px solid #86EFAC',
                  borderRadius: 16,
                  padding: '16px 20px',
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: '#166534', fontWeight: 700 }}>Deal Price:</span>
                  <span style={{ fontSize: 30, fontWeight: 900, color: '#0F172A' }}>₹{price}</span>
                  {mrp > price && (
                    <span style={{ fontSize: 16, color: '#64748B', textDecoration: 'line-through' }}>₹{mrp}</span>
                  )}
                  {savings > 0 && (
                    <span style={{ fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: '#16A34A', color: '#FFFFFF', marginLeft: 'auto' }}>
                      Save ₹{savings} ({discountPct}% OFF)
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#15803D', fontWeight: 600 }}>
                  ✓ Inclusive of all taxes • Instant PDF Delivery with 30-Day Re-download Access
                </div>
              </div>

              {/* 4 Quick Spec Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, marginBottom: 2 }}>📄</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>{book.pageCount || 240}+</div>
                  <div style={{ fontSize: 10, color: '#64748B' }}>Pages</div>
                </div>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, marginBottom: 2 }}>🎯</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>500+</div>
                  <div style={{ fontSize: 10, color: '#64748B' }}>PYQs</div>
                </div>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, marginBottom: 2 }}>🌐</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>English</div>
                  <div style={{ fontSize: 10, color: '#64748B' }}>Medium</div>
                </div>
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, marginBottom: 2 }}>⚡</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>Instant</div>
                  <div style={{ fontSize: 10, color: '#64748B' }}>Delivery</div>
                </div>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
                <button
                  onClick={() => {
                    if (onSampleClick) onSampleClick(book);
                  }}
                  style={{
                    background: '#F1F5F9',
                    color: '#1E293B',
                    border: '1px solid #CBD5E1',
                    borderRadius: 12,
                    padding: '13px 18px',
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    transition: 'background 0.2s',
                  }}
                >
                  <span>📖</span> Look Inside (Sample)
                </button>

                <button
                  onClick={() => {
                    if (onBuyClick) onBuyClick(book);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 12,
                    padding: '13px 22px',
                    fontSize: 14.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 6px 18px -3px rgba(2, 132, 199, 0.45)',
                  }}
                >
                  <span>⚡</span> Buy Now &bull; ₹{price}
                </button>
              </div>

              {/* Anti-Piracy Watermark Notice */}
              <div
                style={{
                  background: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  borderRadius: 10,
                  padding: '9px 12px',
                  fontSize: 11,
                  color: '#92400E',
                  lineHeight: 1.45,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 16 }}>🛡️</span>
                <span>
                  <strong>Anti-Piracy Protected:</strong> Downloaded copy is dynamically stamped with your Name &amp; Phone diagonally across all pages.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* E-Commerce Tabbed Dossier below the fold */}
        <div>
          {/* Tabs Navigation */}
          <div style={{ display: 'flex', borderBottom: '2px solid #E2E8F0', gap: 24, marginBottom: 20 }}>
            {[
              { id: 'description', label: '📖 Book Overview', count: null },
              { id: 'highlights', label: '🎯 Key Highlights', count: highlights.length },
              { id: 'toc', label: '📑 Table of Contents', count: null },
              { id: 'reviews', label: '⭐ Student Reviews', count: '1.4k+' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '3px solid #0284c7' : '3px solid transparent',
                  padding: '10px 4px 12px 4px',
                  fontSize: 13.5,
                  fontWeight: activeTab === tab.id ? 800 : 600,
                  color: activeTab === tab.id ? '#0284c7' : '#64748B',
                  cursor: 'pointer',
                  marginBottom: -2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{tab.label}</span>
                {tab.count && (
                  <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 999, background: activeTab === tab.id ? '#E0F2FE' : '#F1F5F9', color: activeTab === tab.id ? '#0369a1' : '#64748B' }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab 1: Book Overview & Description */}
          {activeTab === 'description' && (
            <div style={{ lineHeight: 1.7, fontSize: 14, color: '#334155' }}>
              <p style={{ marginTop: 0 }}>{defaultDescription}</p>
              <h4 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: '20px 0 8px 0' }}>
                Why This Material Is Essential For Your Entrance Exam:
              </h4>
              <ul style={{ paddingLeft: 20, margin: 0 }}>
                <li><strong>100% Syllabus Alignment:</strong> Updated strictly according to the latest NTA / State CET guidelines.</li>
                <li><strong>High-Speed Elimination Tricks:</strong> Designed to cut problem solving time from 3 minutes to under 50 seconds.</li>
                <li><strong>Verified Answer Keys:</strong> Every problem is fully cross-checked with official answer keys and step-by-step rationales.</li>
              </ul>
            </div>
          )}

          {/* Tab 2: What's Inside & Key Features */}
          {activeTab === 'highlights' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {highlights.map((h, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    fontSize: 13,
                    color: '#1E293B',
                  }}
                >
                  <span style={{ color: '#10B981', fontWeight: 800, fontSize: 15 }}>✓</span>
                  <span style={{ lineHeight: 1.4 }}>{h}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Table of Contents / Index */}
          {activeTab === 'toc' && (
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 14,
                padding: '20px 24px',
                fontFamily: 'serif',
                fontSize: 13.5,
                lineHeight: 1.7,
                color: '#334155',
                whiteSpace: 'pre-wrap',
                maxHeight: 280,
                overflowY: 'auto',
              }}
            >
              {defaultToc}
            </div>
          )}

          {/* Tab 4: Verified Student Reviews */}
          {activeTab === 'reviews' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                {MOCK_BOOK_REVIEWS.map((rev, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 14,
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ color: '#F59E0B', fontSize: 13 }}>★★★★★</span>
                      <span style={{ fontSize: 11, color: '#94A3B8' }}>{rev.date}</span>
                    </div>
                    <p style={{ fontSize: 12.5, color: '#334155', margin: '0 0 10px 0', lineHeight: 1.45, fontStyle: 'italic' }}>
                      "{rev.comment}"
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <strong style={{ fontSize: 12, color: '#0F172A' }}>{rev.name}</strong>
                      <span style={{ fontSize: 11, color: '#10B981', fontWeight: 700 }}>✓ Verified Purchase</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>{rev.college}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
