import React, { useState, useRef } from 'react';
import { BOOK_COVER_PRESETS } from '../lib/marketplacePresets';
import { api } from '../lib/api';

export default function EcommerceBookEditorModal({
  isOpen,
  onClose,
  initialData = null,
  isMaster = true,
  onSave,
}) {
  const [form, setForm] = useState(
    initialData || {
      title: '',
      subtitle: '',
      description: '',
      examTarget: 'NEET',
      subject: 'Comprehensive',
      classYear: 'Class 12',
      author: isMaster ? 'QuestionStudio Academic Editorial Board' : 'Senior Department Faculty',
      priceRupees: 199,
      mrpRupees: 499,
      category: 'FORMULA_BOOK',
      coverImageUrl: BOOK_COVER_PRESETS[0].coverUrl,
      samplePreviewText: BOOK_COVER_PRESETS[0].samplePreviewText,
      pageCount: 240,
    }
  );

  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverSource, setCoverSource] = useState('preset'); // 'preset' | 'upload' | 'url'
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const price = parseFloat(form.priceRupees) || 0;
  const mrp = parseFloat(form.mrpRupees) || 0;
  const discountPct = mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const savings = mrp > price ? mrp - price : 0;

  // 10% / 90% Revenue calculation
  const collegeShare = isMaster ? Math.round(price * 0.1 * 100) / 100 : Math.round(price * 0.9 * 100) / 100;
  const platformShare = isMaster ? Math.round(price * 0.9 * 100) / 100 : Math.round(price * 0.1 * 100) / 100;
  const creditsAwarded = Math.round(collegeShare);

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingCover(true);
      const res = await api.uploadMarketplaceCover(file);
      setForm((prev) => ({ ...prev, coverImageUrl: res.imageUrl }));
      setCoverSource('url');
    } catch (err) {
      alert('Cover upload failed: ' + (err.message || 'Please check file format.'));
    } finally {
      setUploadingCover(false);
    }
  }

  function handleSelectPreset(preset) {
    setForm((prev) => ({
      ...prev,
      coverImageUrl: preset.coverUrl,
      examTarget: preset.exam.split('/')[0].trim(),
      subject: preset.subject,
      description: prev.description ? prev.description : preset.description,
      samplePreviewText: prev.samplePreviewText ? prev.samplePreviewText : preset.samplePreviewText,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return alert('Please enter a book title');
    try {
      setSaving(true);
      await onSave(form);
      onClose();
    } catch (err) {
      alert('Failed to save publication: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: 16,
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 24,
          maxWidth: 1040,
          width: '100%',
          maxHeight: '94vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          padding: '28px 32px',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, borderBottom: '1px solid #F1F5F9', paddingBottom: 16 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              <span>📚</span> {isMaster ? 'Master E-Commerce Syndication' : 'College Study Material Publisher'}
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>
              {initialData ? 'Edit Publication Details' : isMaster ? 'Syndicate Master Book to All 800 Colleges' : 'Publish College Study Material'}
            </h2>
            <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0 0' }}>
              {isMaster
                ? 'This publication will immediately appear on all 800 college websites. Colleges earn 10% affiliate commission per sale.'
                : 'Publish your own notes or mock series. You set the price and keep 90% revenue per sale.'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: '#F1F5F9', border: 'none', borderRadius: 999, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer', color: '#64748B' }}
          >
            ✕
          </button>
        </div>

        {/* 2-Column E-Commerce Studio Layout */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
            {/* Left Column: Live Real-Time 3D Book & E-Commerce Card Preview */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
                👁️ Live E-Commerce Storefront Preview
              </div>

              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 20,
                  border: '1px solid #CBD5E1',
                  padding: 20,
                  boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.1)',
                  marginBottom: 16,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* 3D Book Cover Frame */}
                <div
                  style={{
                    height: 220,
                    borderRadius: 14,
                    overflow: 'hidden',
                    marginBottom: 14,
                    position: 'relative',
                    background: '#F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={form.coverImageUrl || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80'}
                    alt={form.title || 'Book Preview'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: '#0284c7', color: '#FFFFFF' }}>
                      {form.examTarget || 'COMPETITIVE'}
                    </span>
                    {discountPct > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: '#10B981', color: '#FFFFFF' }}>
                        {discountPct}% OFF
                      </span>
                    )}
                  </div>
                </div>

                {/* Title & Author */}
                <h4 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0', lineHeight: 1.3 }}>
                  {form.title || 'Book Title Will Appear Here'}
                </h4>
                <p style={{ fontSize: 12.5, color: '#64748B', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                  {form.subtitle || form.description?.substring(0, 90) || 'Subtitle or key problem-solving features...'}
                </p>

                {/* Rating & Downloads */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#0284c7', fontWeight: 600, marginBottom: 12 }}>
                  <span style={{ color: '#F59E0B' }}>★★★★★</span>
                  <span>4.9 (1,480 reviews)</span>
                  <span>•</span>
                  <span>{form.pageCount || 240} Pages</span>
                </div>

                {/* Price Strip */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12, paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: 24, fontWeight: 900, color: '#0F172A' }}>₹{price}</span>
                  {mrp > price && (
                    <span style={{ fontSize: 14, color: '#94A3B8', textDecoration: 'line-through' }}>₹{mrp}</span>
                  )}
                  {savings > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', marginLeft: 'auto' }}>
                      Save ₹{savings}
                    </span>
                  )}
                </div>

                {/* Watermark Protection Badge */}
                <div style={{ fontSize: 11, color: '#059669', background: '#ECFDF5', padding: '6px 10px', borderRadius: 8, border: '1px solid #A7F3D0', fontWeight: 600 }}>
                  🛡️ Anti-Piracy Watermark: Licensed to Buyer WhatsApp
                </div>
              </div>

              {/* Financial Revenue Split Box */}
              <div
                style={{
                  background: isMaster ? '#EFF6FF' : '#ECFDF5',
                  border: isMaster ? '1px solid #BFDBFE' : '1px solid #A7F3D0',
                  borderRadius: 14,
                  padding: '14px 16px',
                  fontSize: 12.5,
                  color: isMaster ? '#1E40AF' : '#065F46',
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>💰</span> E-Commerce Revenue Accounting ({isMaster ? 'Master Syndication' : 'College Publication'})
                </div>
                {isMaster ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Selling College Affiliate (10%):</span>
                      <strong>₹{collegeShare.toFixed(2)} ({creditsAwarded} Free QP Credits)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Your Net Platform Profit (90%):</span>
                      <strong>₹{platformShare.toFixed(2)}</strong>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Your College Retains (90%):</span>
                      <strong>₹{collegeShare.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>QuestionStudio Platform Fee (10%):</span>
                      <strong>₹{platformShare.toFixed(2)}</strong>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Column: E-Commerce Fields Form */}
            <div>
              {/* Section 1: Book Cover Studio */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
                  1. Book Cover Image Selection *
                </label>

                {/* Preset Cover Selector */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                  {BOOK_COVER_PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      style={{
                        border: form.coverImageUrl === preset.coverUrl ? '2px solid #0284c7' : '1px solid #E2E8F0',
                        borderRadius: 10,
                        padding: '6px',
                        cursor: 'pointer',
                        background: form.coverImageUrl === preset.coverUrl ? '#E0F2FE' : '#F8FAFC',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <img src={preset.coverUrl} alt={preset.name} style={{ width: 34, height: 42, objectFit: 'cover', borderRadius: 4 }} />
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#1E293B', lineHeight: 1.2 }}>
                        {preset.exam}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Custom Upload or URL Options */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingCover}
                    style={{
                      background: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      borderRadius: 8,
                      padding: '8px 14px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {uploadingCover ? 'Uploading...' : '📁 Upload Image File'}
                  </button>
                  <input
                    type="url"
                    placeholder="Or paste custom image URL here..."
                    value={form.coverImageUrl}
                    onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 12,
                    }}
                  />
                </div>
              </div>

              {/* Section 2: Core Details */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
                  2. Master Book Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NEET 2026 High-Yield Organic Chemistry Maps"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13.5, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
                  Subtitle / Solved Features Hook
                </label>
                <input
                  type="text"
                  placeholder="e.g. Complete Solved PYQs with Step-by-Step Graphical Approaches"
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              {/* Exam, Subject & Category Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Target Exam
                  </label>
                  <select
                    value={form.examTarget}
                    onChange={(e) => setForm({ ...form, examTarget: e.target.value })}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12.5 }}
                  >
                    <option value="NEET">NEET UG</option>
                    <option value="JEE Main">JEE Main</option>
                    <option value="JEE Advanced">JEE Advanced</option>
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
                    style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12.5 }}
                  >
                    <option value="Chemistry">Chemistry</option>
                    <option value="Physics">Physics</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Biology">Biology</option>
                    <option value="Comprehensive">Comprehensive / All</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12.5 }}
                  >
                    <option value="FORMULA_BOOK">Formula Handbook</option>
                    <option value="PYQ_SOLUTIONS">PYQ Solutions</option>
                    <option value="MOCK_TEST_SERIES">Mock Test Series</option>
                    <option value="STUDY_MATERIAL">Study Material</option>
                    <option value="HANDBOOK">Visual Diagram Atlas</option>
                  </select>
                </div>
              </div>

              {/* Pricing Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
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
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Strikethrough MRP (₹)
                  </label>
                  <input
                    type="number"
                    value={form.mrpRupees}
                    onChange={(e) => setForm({ ...form, mrpRupees: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Total Pages
                  </label>
                  <input
                    type="number"
                    value={form.pageCount}
                    onChange={(e) => setForm({ ...form, pageCount: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Section 4: Detailed Description */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
                  3. Full Book Description &amp; Syllabus Coverage
                </label>
                <textarea
                  rows={4}
                  placeholder="Explain why students should buy this material, what problem-solving tricks are included, and how it prepares them for national entrance exams..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              {/* Section 5: Free Look Inside Sample Excerpt */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>
                  4. Free Look Inside Sample / Table of Contents
                </label>
                <textarea
                  rows={3}
                  placeholder="Paste table of contents or sample excerpt that students can preview before buying..."
                  value={form.samplePreviewText}
                  onChange={(e) => setForm({ ...form, samplePreviewText: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 12.5, fontFamily: 'serif', boxSizing: 'border-box' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ padding: '10px 24px', borderRadius: 10, fontWeight: 800 }}
                >
                  {saving ? 'Publishing...' : initialData ? 'Save Changes' : isMaster ? 'Syndicate to All 800 Colleges 🚀' : 'Publish to College Portal 🚀'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
