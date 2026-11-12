import React, { useState } from 'react';
import { api } from '../lib/api';

// Helper to dynamically inject Razorpay standard checkout script
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.getElementById('razorpay-checkout-script');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function StudentCheckoutModal({
  book,
  collegeSlug,
  isOpen,
  onClose,
  onSuccess,
  primaryColor = '#0284c7',
}) {
  const [form, setForm] = useState({
    buyerName: '',
    buyerPhone: '',
    buyerEmail: '',
    // Shipping Address fields for physical print / hybrid bundle
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    city: '',
    district: '',
    state: 'Andhra Pradesh',
    pincode: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState('');
  const [error, setError] = useState(null);
  const [completedOrder, setCompletedOrder] = useState(null);

  if (!isOpen || !book) return null;

  const isPhysical = book.fulfillmentType === 'PHYSICAL_PRINT' || book.fulfillmentType === 'BUNDLE_HYBRID';
  const isHybrid = book.fulfillmentType === 'BUNDLE_HYBRID';
  const isDigital = book.fulfillmentType === 'DIGITAL_PDF' || !book.fulfillmentType;

  const isOutOfStock = isPhysical && (book.stockQuantity ?? 100) <= 0;

  // Progressive Weight Slab Courier Calculation
  const weightGrams = Math.max(100, book.weightGrams || 300);
  const weightKg = (weightGrams / 1000).toFixed(1);
  const slabs = Math.max(1, Math.ceil(weightGrams / 500));

  let shippingFee = 0;
  let zoneName = 'Regional / Intra-State Surface';
  if (isPhysical && form.pincode.length === 6) {
    const prefix2 = form.pincode.substring(0, 2);
    let baseRate = 45;
    let additionalSlabRate = 25;

    if (['78', '79', '18', '19', '74'].includes(prefix2)) {
      baseRate = 95;
      additionalSlabRate = 45;
      zoneName = 'Special Remote (NE / J&K / Islands)';
    } else if (['50', '51', '52', '53', '56', '57', '60', '61'].includes(prefix2)) {
      baseRate = 40;
      additionalSlabRate = 20;
      zoneName = 'Local / Intra-State Surface';
    } else {
      baseRate = 65;
      additionalSlabRate = 35;
      zoneName = 'National Express Surface';
    }
    shippingFee = baseRate + ((slabs - 1) * additionalSlabRate);
  }

  const totalPayableRupees = book.priceRupees + (isPhysical ? shippingFee : 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!form.buyerName.trim()) {
      setError('Please enter student full name.');
      return;
    }
    const cleanPhone = form.buyerPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (isPhysical) {
      if (!form.addressLine1.trim() || !form.city.trim() || !form.state.trim() || !form.pincode.trim()) {
        setError('Please complete all required shipping address fields (Address, City, State, Pincode).');
        return;
      }
      if (!/^\d{6}$/.test(form.pincode.trim())) {
        setError('Please enter a valid 6-digit Indian postal Pincode.');
        return;
      }
    }

    try {
      setSubmitting(true);
      setGatewayStatus('Connecting to secure payment gateway...');

      const payload = {
        bookId: book.id,
        collegeSlug: collegeSlug || '',
        buyerName: form.buyerName.trim(),
        buyerPhone: cleanPhone,
        buyerEmail: form.buyerEmail.trim() || `${cleanPhone}@student.questionstudio.in`,
        paymentMethod: 'UPI_RAZORPAY',
      };

      if (isPhysical) {
        payload.shippingAmountRupees = shippingFee;
        payload.shippingAddress = {
          fullName: form.buyerName.trim(),
          phone: cleanPhone,
          addressLine1: form.addressLine1.trim(),
          addressLine2: form.addressLine2.trim() || null,
          landmark: form.landmark.trim() || null,
          city: form.city.trim(),
          district: form.district.trim() || form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim(),
        };
      }

      // Step 1: Create Razorpay Order
      const rzpOrder = await api.createMarketplaceRazorpayOrder(payload);

      // Step 2: Handle Simulation or Live Gateway
      if (rzpOrder.isMockMode || rzpOrder.razorpayOrderId.startsWith('order_mock_')) {
        // Test Simulation Mode
        setGatewayStatus('Authorizing test transaction (Simulation Mode)...');
        await new Promise((r) => setTimeout(r, 600));

        const verifyRes = await api.verifyMarketplacePayment({
          razorpay_order_id: rzpOrder.razorpayOrderId,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: 'mock_signature_valid_2026',
        });

        setCompletedOrder(verifyRes);
        if (onSuccess) onSuccess(verifyRes);
        setSubmitting(false);
      } else {
        // Live / Sandbox Gateway
        setGatewayStatus('Opening Razorpay UPI & Cards Gateway...');
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded || !window.Razorpay) {
          throw new Error('Could not load Razorpay payment SDK. Please check your internet connection.');
        }

        const options = {
          key: rzpOrder.keyId,
          amount: rzpOrder.amountPaise,
          currency: rzpOrder.currency || 'INR',
          name: rzpOrder.collegeName || 'QuestionStudio Bookstore',
          description: `${book.title} (${isPhysical ? 'Printed Book' : 'Digital PDF'})`,
          image: book.coverImageUrl || undefined,
          order_id: rzpOrder.razorpayOrderId,
          prefill: {
            name: rzpOrder.buyerName,
            contact: rzpOrder.buyerPhone,
            email: rzpOrder.buyerEmail,
          },
          theme: {
            color: primaryColor || '#0284c7',
          },
          handler: async function (response) {
            try {
              setSubmitting(true);
              setGatewayStatus('Verifying cryptographic payment signature...');
              const verifyRes = await api.verifyMarketplacePayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              setCompletedOrder(verifyRes);
              if (onSuccess) onSuccess(verifyRes);
            } catch (vErr) {
              setError(vErr.message || 'Payment verification failed.');
            } finally {
              setSubmitting(false);
              setGatewayStatus('');
            }
          },
          modal: {
            ondismiss: function () {
              setSubmitting(false);
              setGatewayStatus('');
            },
          },
        };

        const rzpInstance = new window.Razorpay(options);
        rzpInstance.open();
      }
    } catch (err) {
      setError(err.message || 'Checkout failed. Please try again.');
      setSubmitting(false);
      setGatewayStatus('');
    }
  }

  function handleModalClose() {
    if (submitting) return;
    setCompletedOrder(null);
    setError(null);
    setGatewayStatus('');
    onClose();
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
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
        padding: 16,
        boxSizing: 'border-box',
      }}
      onClick={handleModalClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 24,
          maxWidth: completedOrder ? 580 : 880,
          width: '100%',
          maxHeight: '94vh',
          overflowY: 'auto',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
          position: 'relative',
          padding: '28px 32px',
          boxSizing: 'border-box',
          border: '1px solid #E2E8F0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid #F1F5F9', paddingBottom: 14 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: primaryColor }}>
              {completedOrder ? 'Order Confirmation' : 'Instant Checkout & Delivery'}
            </span>
            <h2 style={{ fontSize: 19, fontWeight: 900, color: '#0F172A', margin: '3px 0 0' }}>
              {completedOrder ? '🎉 Congratulations on Your Publication!' : 'Complete Your Purchase'}
            </h2>
          </div>
          <button
            onClick={handleModalClose}
            disabled={submitting}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: 999,
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              cursor: submitting ? 'not-allowed' : 'pointer',
              color: '#64748B',
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {/* ======================================================== */}
        {/* SUCCESS STATE                                            */}
        {/* ======================================================== */}
        {completedOrder ? (
          <div>
            <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  background: '#ECFDF5',
                  border: '2px solid #10B981',
                  color: '#059669',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                  margin: '0 auto 14px',
                }}
              >
                ✓
              </div>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#059669', background: '#ECFDF5', padding: '4px 12px', borderRadius: 20, border: '1px solid #A7F3D0' }}>
                PAYMENT VERIFIED • ORDER ID: {completedOrder.orderNumber}
              </span>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginTop: 12, marginBottom: 4 }}>
                Thank you, {completedOrder.buyerName}!
              </h3>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
                A confirmation receipt has been assigned to your WhatsApp number <strong>+{completedOrder.buyerPhone}</strong>.
              </p>
            </div>

            {/* Digital PDF Download Action Card */}
            {(isDigital || isHybrid) && completedOrder.downloadUrl && (
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 16, padding: 18, marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 24 }}>📄</span>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 800, color: '#1E3A8A', margin: 0 }}>
                      Digital DRM-Watermarked PDF Ready
                    </h4>
                    <span style={{ fontSize: 11.5, color: '#3B82F6' }}>
                      Licensed exclusively to {completedOrder.buyerName} • 30-Day High-Speed Download Access
                    </span>
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 10, border: '1px solid #DBEAFE', fontSize: 12, color: '#1E40AF', marginBottom: 14, lineHeight: 1.45 }}>
                  🛡️ <strong>Anti-Piracy Notice:</strong> Your personal identity stamp (<em>{completedOrder.buyerName} • +{completedOrder.buyerPhone} • {completedOrder.orderNumber}</em>) is permanently embedded diagonally across all pages.
                </div>

                <a
                  href={completedOrder.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    padding: '13px 20px',
                    borderRadius: 12,
                    fontWeight: 800,
                    fontSize: 14,
                    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
                  }}
                >
                  📥 Download Watermarked PDF ({book.pageCount || 180} Pages)
                </a>
              </div>
            )}

            {/* Physical Dispatch Card */}
            {isPhysical && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 16, padding: 18, marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 24 }}>📦</span>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 800, color: '#92400E', margin: 0 }}>
                      Physical Book Dispatch Scheduled
                    </h4>
                    <span style={{ fontSize: 11.5, color: '#B45309' }}>
                      Express Dispatch within 24–48 Hours via Speed Post / DTDC
                    </span>
                  </div>
                </div>
                <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 10, border: '1px solid #FEF3C7', fontSize: 12, color: '#78350F' }}>
                  <strong>Shipping Destination:</strong><br />
                  {form.buyerName}, {form.addressLine1}, {form.addressLine2 ? `${form.addressLine2}, ` : ''}{form.city}, {form.state} - <strong>{form.pincode}</strong><br />
                  <span style={{ fontSize: 11, color: '#92400E', marginTop: 4, display: 'inline-block' }}>
                    📱 Consignment tracking ID will be sent via SMS/WhatsApp upon courier pickup.
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleModalClose}
              style={{
                width: '100%',
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                padding: '12px 20px',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 13.5,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              Done &amp; Return to Bookstore
            </button>
          </div>
        ) : (
          /* ======================================================== */
          /* CHECKOUT FORM STATE                                      */
          /* ======================================================== */
          <div>
            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', color: '#DC2626', fontSize: 12.5, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, alignItems: 'start' }}>
              {/* Left Column: Student Details & Shipping Address */}
              <form onSubmit={handleSubmit}>
                <h4 style={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A', margin: '0 0 12px', borderBottom: '1px solid #E2E8F0', paddingBottom: 6 }}>
                  1. Student Identity &amp; Contact Details
                </h4>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={form.buyerName}
                    onChange={(e) => setForm({ ...form, buyerName: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      WhatsApp Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="10-digit number"
                      value={form.buyerPhone}
                      onChange={(e) => setForm({ ...form, buyerPhone: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. rahul@gmail.com"
                      value={form.buyerEmail}
                      onChange={(e) => setForm({ ...form, buyerEmail: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Physical Shipping Section */}
                {isPhysical ? (
                  <div style={{ marginTop: 18 }}>
                    <h4 style={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A', margin: '0 0 12px', borderBottom: '1px solid #E2E8F0', paddingBottom: 6 }}>
                      2. Physical Book Delivery Address 📦
                    </h4>

                    <div style={{ marginBottom: 10 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                        Door No. / Building / Flat &amp; Street Address *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Flat 302, Sai Residency, Benz Circle"
                        value={form.addressLine1}
                        onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                          Area / Colony (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. MG Road Area"
                          value={form.addressLine2}
                          onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                          Nearest Landmark
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Opp. State Bank"
                          value={form.landmark}
                          onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                          City / Town *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Vijayawada"
                          value={form.city}
                          onChange={(e) => setForm({ ...form, city: e.target.value })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                          State *
                        </label>
                        <select
                          value={form.state}
                          onChange={(e) => setForm({ ...form, state: e.target.value })}
                          style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12.5 }}
                        >
                          <option value="Andhra Pradesh">Andhra Pradesh</option>
                          <option value="Telangana">Telangana</option>
                          <option value="Karnataka">Karnataka</option>
                          <option value="Tamil Nadu">Tamil Nadu</option>
                          <option value="Maharashtra">Maharashtra</option>
                          <option value="Delhi NCR">Delhi NCR</option>
                          <option value="Other State">Other State</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                          Pincode *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="6 digits"
                          value={form.pincode}
                          onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '') })}
                          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', fontSize: 11.5, color: '#475569', marginBottom: 14 }}>
                    🛡️ <strong>Instant Digital Delivery:</strong> Your student credentials will be permanently watermarked onto each page of the PDF to trace unauthorized distribution.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || isOutOfStock}
                  style={{
                    width: '100%',
                    background: isOutOfStock ? '#94A3B8' : primaryColor,
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '13px 20px',
                    borderRadius: 12,
                    fontWeight: 800,
                    fontSize: 14.5,
                    cursor: submitting || isOutOfStock ? 'not-allowed' : 'pointer',
                    boxShadow: isOutOfStock ? 'none' : '0 4px 14px rgba(2, 132, 199, 0.4)',
                    marginTop: 8,
                  }}
                >
                  {submitting
                    ? (gatewayStatus || 'Processing Payment...')
                    : isOutOfStock
                    ? 'Out of Stock'
                    : `Proceed to Pay ₹${totalPayableRupees}`}
                </button>
              </form>

              {/* Right Column: Book Summary & Guarantee Card */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: 18 }}>
                <h4 style={{ fontSize: 12.5, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
                  Order Summary
                </h4>

                <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                  <img
                    src={book.coverImageUrl || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=400&q=80'}
                    alt={book.title}
                    style={{ width: 68, height: 96, objectFit: 'cover', borderRadius: 8, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
                  />
                  <div>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: isPhysical ? '#FEF3C7' : '#EFF6FF',
                        color: isPhysical ? '#92400E' : '#1E40AF',
                        border: isPhysical ? '1px solid #FDE68A' : '1px solid #BFDBFE',
                        display: 'inline-block',
                        marginBottom: 4,
                      }}
                    >
                      {isHybrid ? '⚡ PRINT + PDF BUNDLE' : isPhysical ? '📦 PHYSICAL PRINTED BOOK' : '📄 DIGITAL PDF'}
                    </span>
                    <h5 style={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A', margin: '0 0 3px', lineHeight: 1.3 }}>
                      {book.title}
                    </h5>
                    <span style={{ fontSize: 11.5, color: '#64748B' }}>
                      {book.examTarget} • {book.subject}
                    </span>
                  </div>
                </div>

                {/* Pricing Summary */}
                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 12, marginTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#64748B', marginBottom: 6 }}>
                    <span>Standard MRP</span>
                    <span style={{ textDecoration: 'line-through' }}>₹{book.mrpRupees || (book.priceRupees * 2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#059669', marginBottom: 6, fontWeight: 700 }}>
                    <span>Academic Subsidy Discount</span>
                    <span>-₹{(book.mrpRupees || (book.priceRupees * 2)) - book.priceRupees}</span>
                  </div>

                  {isPhysical ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748B', marginBottom: 6 }}>
                        <span>Parcel Weight ({slabs}x 500g Slabs)</span>
                        <span style={{ fontWeight: 700, color: '#334155' }}>{weightKg} kg</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748B', marginBottom: 10 }}>
                        <span>Surface Courier Delivery</span>
                        {form.pincode.length === 6 ? (
                          <span style={{ color: '#0F172A', fontWeight: 800 }}>+₹{shippingFee} <span style={{ fontSize: 10.5, color: '#0284C7', fontWeight: 600 }}>({zoneName})</span></span>
                        ) : (
                          <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: 11 }}>Enter 6-digit Pincode</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#64748B', marginBottom: 10 }}>
                      <span>Digital Delivery &amp; DRM Processing</span>
                      <span style={{ color: '#059669', fontWeight: 700 }}>FREE</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 900, color: '#0F172A', borderTop: '1px dashed #CBD5E1', paddingTop: 8 }}>
                    <span>Total Amount</span>
                    <span style={{ color: primaryColor }}>₹{totalPayableRupees}</span>
                  </div>
                </div>

                {/* Stock Info (for Physical Edition) */}
                {isPhysical && (
                  <div style={{ marginTop: 14, padding: 10, borderRadius: 8, background: isOutOfStock ? '#FEF2F2' : '#F0FDF4', border: isOutOfStock ? '1px solid #FECACA' : '1px solid #BBF7D0', fontSize: 11.5 }}>
                    {isOutOfStock ? (
                      <span style={{ color: '#DC2626', fontWeight: 700 }}>❌ Currently Out of Stock for Home Delivery</span>
                    ) : (
                      <span style={{ color: '#166534', fontWeight: 700 }}>
                        ✓ In Stock ({book.stockQuantity || 100} copies ready for instant dispatch)
                      </span>
                    )}
                  </div>
                )}

                {/* Zero Loss Educational Non-Returnable Policy */}
                {isPhysical && (
                  <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: '#FFFBEB', border: '1px solid #FDE68A', fontSize: 11, color: '#92400E', lineHeight: 1.45 }}>
                    <strong>🛡️ Zero-Loss Educational Policy:</strong> This publication is pre-inspected educational study material. As per academic publisher terms, it is strictly <strong>non-returnable</strong> once dispatched. Free replacement is guaranteed for any transit courier damage reported within 48h.
                  </div>
                )}

                {/* Trust Badges */}
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: '#64748B' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>🔒</span>
                    <span>100% Encrypted &amp; Verified Institutional Checkout</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>🏛️</span>
                    <span>Authorized Syllabus Publication (NEET / JEE / EAPCET)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
