import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const NAVY = '#0284c7';

const MODULES = [
  {
    key: 'OMR',
    name: 'OMR & Answer Key Generator',
    monthlyPrice: 999,
    annualPrice: 9990, // 10x monthly (2 Months Free)
    icon: '📝',
    badge: 'Evaluation Module',
    desc: 'Generate printable optical-scanner-compatible A4 OMR evaluation sheets and paper-saving answer key chits for your examination.',
    features: [
      'Printable 1-page A4 OMR sheets matching paper format',
      'Anti-piracy watermark integration with college branding',
      'Universal & Single-Set multi-version answer key chits',
      'Fast offline student marksheet import',
    ],
  },
  {
    key: 'CBT',
    name: 'Online Examination (CBT)',
    monthlyPrice: 1999,
    annualPrice: 19990, // 10x monthly (2 Months Free)
    icon: '💻',
    badge: 'Digital Exam Platform',
    desc: 'Deploy instant computer-based tests with PIN codes, timed student sessions, and automated instant scoring.',
    features: [
      'Instant CBT test deployment from any generated paper',
      'Secure PIN code and student roster access control',
      'Real-time automated scoring and live leaderboard',
      'Question-wise student performance and accuracy analytics',
      'Advanced browser anti-cheat & proctoring (Coming Soon)',
    ],
  },
  {
    key: 'COLLEGE_WEBSITE',
    name: 'Dynamic College Website & Portal',
    monthlyPrice: 1499,
    annualPrice: 14990, // 10x monthly (2 Months Free)
    icon: '🌐',
    badge: 'Branding & Admissions',
    desc: 'Dedicated white-label institutional website with course catalog, faculty recruitment, student admission enquiries, and exam noticeboards.',
    features: [
      'Modern, mobile-responsive college website with your branding',
      'Course catalog, faculty directory & facility showcases',
      'Faculty recruitment portal with direct resume capture',
      'Automated parent enquiry notifications and lead capture',
    ],
  },
  {
    key: 'WHATSAPP',
    name: 'WhatsApp Automation & Scorecards',
    monthlyPrice: 499,
    annualPrice: 4990, // 10x monthly (2 Months Free)
    icon: '💬',
    badge: 'Parent Communication',
    desc: 'Official WhatsApp parent communication with automated scorecards, encrypted web report links, and exam announcements.',
    features: [
      'Official WhatsApp scorecard delivery directly to parents',
      'Encrypted one-click student performance web report links',
      'Exam results dispatch ledger and delivery tracking',
      'Automated attendance notifications (Coming Soon)',
    ],
  },
];

const COMPLETE_BUNDLE_DEF = {
  key: 'COMPLETE_BUNDLE',
  name: 'Complete Add-on Bundle',
  monthlyPrice: 4499,
  annualPrice: 44990, // 10x monthly (2 Months Free)
  icon: '🎁',
  desc: 'Includes all four optional modules: OMR Sheets, Online CBT, Dynamic College Website, and WhatsApp Automation. Save ₹497 every month, or get 2 Months Free with annual billing (₹44,990/year).',
};

function formatStatus(statusKey) {
  switch (statusKey) {
    case 'ACTIVE':
      return {
        label: 'Active',
        color: '#15803d',
        bg: '#dcfce7',
        border: '#86efac',
        icon: '✓',
      };
    case 'ACTIVE_BUNDLE':
      return {
        label: 'Active (Bundle)',
        color: '#7e22ce',
        bg: '#f3e8ff',
        border: '#d8b4fe',
        icon: '🎁',
      };
    case 'PENDING':
      return {
        label: 'Pending Approval',
        color: '#b45309',
        bg: '#fef3c7',
        border: '#fde68a',
        icon: '⏳',
      };
    case 'CANCEL_REQUESTED':
      return {
        label: 'Cancellation Requested',
        color: '#9333ea',
        bg: '#f3e8ff',
        border: '#e9d5ff',
        icon: '📝',
      };
    case 'SUSPENDED':
      return {
        label: 'Suspended',
        color: '#b91c1c',
        bg: '#fee2e2',
        border: '#fca5a5',
        icon: '⛔',
      };
    case 'EXPIRED':
      return {
        label: 'Expired',
        color: '#475569',
        bg: '#f1f5f9',
        border: '#cbd5e1',
        icon: '⚠️',
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        color: '#64748b',
        bg: '#f8fafc',
        border: '#e2e8f0',
        icon: '✕',
      };
    case 'NOT_SUBSCRIBED':
    default:
      return {
        label: 'Not Subscribed',
        color: '#64748b',
        bg: '#f8fafc',
        border: '#e2e8f0',
        icon: '⚪',
      };
  }
}

function resolveModuleStatus(moduleKey, subscriptions, hasBundle, accessMap) {
  const sub = subscriptions.find((s) => s.moduleKey === moduleKey);

  if (sub) {
    if (sub.status === 'PENDING_VERIFICATION') {
      return { statusKey: 'PENDING', sub, canCancel: true, canRequest: false };
    }
    if (sub.note && sub.note.includes('Cancellation Requested')) {
      return { statusKey: 'CANCEL_REQUESTED', sub, canCancel: false, canRequest: false };
    }
    if (sub.status === 'ACTIVE' && sub.isActive) {
      return { statusKey: 'ACTIVE', sub, canCancel: true, canRequest: false, canRenew: true };
    }
    if (sub.status === 'SUSPENDED') {
      return { statusKey: 'SUSPENDED', sub, canCancel: false, canRequest: false };
    }
    if (sub.status === 'EXPIRED') {
      return { statusKey: 'EXPIRED', sub, canCancel: false, canRequest: true, canRenew: true };
    }
    if (sub.status === 'CANCELLED') {
      return { statusKey: 'CANCELLED', sub, canCancel: false, canRequest: true };
    }
  }

  // Active through complete bundle
  if (hasBundle && accessMap[moduleKey]) {
    const bundleSub = subscriptions.find((s) => s.moduleKey === 'COMPLETE_BUNDLE');
    return { statusKey: 'ACTIVE_BUNDLE', sub: bundleSub, canCancel: false, canRequest: false };
  }

  return { statusKey: 'NOT_SUBSCRIBED', sub: null, canCancel: false, canRequest: true };
}

// Dynamically load Razorpay standard checkout script
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

export default function CollegeSubscriptionPlans() {
  const { user, refreshSubscriptions } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Payment History State
  const [paymentHistory, setPaymentHistory] = useState([]);

  // Checkout Modal State
  const [requestModal, setRequestModal] = useState(null); // { moduleKey, name, monthlyPrice, annualPrice, icon, badge }
  const [cycle, setCycle] = useState('MONTHLY');
  const [requestNote, setRequestNote] = useState('');
  const [paymentStep, setPaymentStep] = useState('IDLE'); // 'IDLE' | 'ORDERING' | 'AWAITING_PAYMENT' | 'VERIFYING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
  const [paymentError, setPaymentError] = useState(null);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);
  const [showOfflineOption, setShowOfflineOption] = useState(false);

  // Cancellation Modal State
  const [cancelModal, setCancelModal] = useState(null); // { moduleKey, name }
  const [cancelReason, setCancelReason] = useState('');

  // Invoice Viewer Modal State
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Load subscriptions and payment history
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [statusRes, historyRes] = await Promise.all([
        api.getMySubscriptions(),
        api.getSubscriptionPaymentHistory().catch(() => ({ payments: [] })),
      ]);
      setData(statusRes);
      setPaymentHistory(historyRes.payments || []);
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
      setError(err.message || 'Failed to load subscription information.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadRazorpayScript();
  }, [loadData]);

  const access = data?.access || {};
  const hasBundle = data?.hasBundle || false;
  const subscriptions = data?.subscriptions || [];
  const history = data?.history || [];

  // Bundle status resolution
  const bundleSub = subscriptions.find((s) => s.moduleKey === 'COMPLETE_BUNDLE');
  let bundleStatusKey = 'NOT_SUBSCRIBED';
  if (bundleSub) {
    if (bundleSub.status === 'PENDING_VERIFICATION') bundleStatusKey = 'PENDING';
    else if (bundleSub.note && bundleSub.note.includes('Cancellation Requested')) bundleStatusKey = 'CANCEL_REQUESTED';
    else if (bundleSub.status === 'ACTIVE' && bundleSub.isActive) bundleStatusKey = 'ACTIVE';
    else if (bundleSub.status === 'SUSPENDED') bundleStatusKey = 'SUSPENDED';
    else if (bundleSub.status === 'EXPIRED') bundleStatusKey = 'EXPIRED';
    else if (bundleSub.status === 'CANCELLED') bundleStatusKey = 'CANCELLED';
  }
  const bundleStatus = formatStatus(bundleStatusKey);

  // Price calculations in modal (pure integer paise arithmetic)
  const currentBasePrice = requestModal
    ? (cycle === 'ANNUAL' ? requestModal.annualPrice : requestModal.monthlyPrice)
    : 0;
  const currentBasePaise = currentBasePrice * 100;
  const currentGstPaise = Math.round((currentBasePaise * 1800) / 10000); // 18.00% GST
  const currentTotalPaise = currentBasePaise + currentGstPaise;
  const currentGstRupees = (currentGstPaise / 100).toFixed(2);
  const currentTotalRupees = (currentTotalPaise / 100).toFixed(2);

  // Handle Online Payment via Razorpay Test Gateway
  async function handlePayRazorpay(e) {
    e.preventDefault();
    if (!requestModal) return;

    try {
      setActionBusy(true);
      setPaymentError(null);
      setPaymentStep('ORDERING');

      // 1. Create order on backend
      const orderData = await api.createSubscriptionPaymentOrder({
        moduleKey: requestModal.moduleKey,
        billingCycle: cycle,
        notes: requestNote.trim() || null,
      });

      // 2. Ensure Razorpay checkout script is ready
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        throw new Error('Razorpay payment gateway failed to load. Please check your internet connection.');
      }

      setPaymentStep('AWAITING_PAYMENT');

      // 3. Launch Razorpay Standard Checkout in Test Mode
      const options = {
        key: orderData.keyId,
        amount: orderData.amountPaise,
        currency: orderData.currency || 'INR',
        name: 'QuestionsStudio',
        description: `${requestModal.name} (${orderData.billingCycle})`,
        order_id: orderData.orderId,
        handler: async function (response) {
          setPaymentStep('VERIFYING');
          try {
            const verifyRes = await api.verifySubscriptionPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentMethod: response.razorpay_payment_method || 'upi',
            });

            setPaymentStep('SUCCESS');
            setPaymentSuccessData(verifyRes);
            setSuccess(`Payment verified! ${requestModal.name} is now ACTIVE.`);
            await refreshSubscriptions();
            await loadData();
          } catch (vErr) {
            console.error('Verification error:', vErr);
            setPaymentStep('FAILED');
            setPaymentError(
              vErr.message ||
                'Payment verification failed. If money was debited, our automated webhook will activate your module shortly.'
            );
          } finally {
            setActionBusy(false);
          }
        },
        modal: {
          ondismiss: function () {
            setPaymentStep('CANCELLED');
            setActionBusy(false);
          },
        },
        prefill: {
          name: user?.name || user?.instituteName || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: { color: NAVY },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        console.error('Payment failed at gateway:', resp);
        setPaymentStep('FAILED');
        setPaymentError(`Payment failed: ${resp.error?.description || resp.error?.reason || 'Payment declined by bank.'}`);
        setActionBusy(false);
      });
      rzp.open();
    } catch (err) {
      console.error('Payment order failed:', err);
      setPaymentStep('FAILED');
      setPaymentError(err.message || 'Failed to initiate payment.');
      setActionBusy(false);
    }
  }

  // Handle Offline / Manual PO Request (Fallback for institutional bank transfer)
  async function handleSubmitOfflineRequest(e) {
    e.preventDefault();
    if (!requestModal) return;

    try {
      setActionBusy(true);
      setError(null);
      const res = await api.requestSubscription({
        moduleKey: requestModal.moduleKey,
        billingCycle: cycle,
        paymentMethod: 'MANUAL_UPI',
        note: requestNote.trim() || 'Offline Institutional Transfer Request',
      });

      setSuccess(
        res.message ||
          `Offline subscription request for ${requestModal.name} submitted! It is pending Super Admin verification.`
      );
      closeCheckoutModal();
      await refreshSubscriptions();
      await loadData();
    } catch (err) {
      console.error('Offline request failed:', err);
      setError(err.message || 'Offline request failed.');
    } finally {
      setActionBusy(false);
    }
  }

  function closeCheckoutModal() {
    setRequestModal(null);
    setRequestNote('');
    setCycle('MONTHLY');
    setPaymentStep('IDLE');
    setPaymentError(null);
    setPaymentSuccessData(null);
    setShowOfflineOption(false);
  }

  // Handle Submit Cancellation Request
  async function handleSubmitCancellation(e) {
    e.preventDefault();
    if (!cancelModal) return;

    try {
      setActionBusy(true);
      setError(null);
      const res = await api.requestSubscriptionCancellation({
        moduleKey: cancelModal.moduleKey,
        reason: cancelReason.trim() || null,
      });

      setSuccess(
        res.message ||
          `Cancellation request for ${cancelModal.name} submitted. Super Admin will review your request.`
      );
      setCancelModal(null);
      setCancelReason('');
      await refreshSubscriptions();
      await loadData();
    } catch (err) {
      console.error('Cancellation failed:', err);
      setError(err.message || 'Cancellation request failed.');
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div style={{ width: '100%', padding: '0 4px' }}>
      {/* Executive Hero Banner */}
      <div className="studio-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="studio-badge">
              <span>🏷️</span>
              <span>Institutional Licensing &bull; Add-on Modules</span>
            </div>
            <h1 className="studio-title">Plans &amp; Modular Subscriptions</h1>
            <p className="studio-sub">
              Expand your institutional capabilities with dedicated digital modules. Activate individual add-ons or unlock the Complete Bundle with instant online verification. Paper Generation credits operate independently.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="btn btn-secondary"
            style={{ padding: '10px 18px', fontSize: 13, fontWeight: 700 }}
          >
            {loading ? 'Refreshing...' : '🔄 Refresh Status'}
          </button>
        </div>

        <div className="studio-chips">
          <div className="studio-chip">
            <span>Billing Cycles:</span> <strong>Monthly &amp; Annual (2 Months Free)</strong>
          </div>
          <div className="studio-chip">
            <span>Payment Gateway:</span> <strong>Automated Instant Activation</strong>
          </div>
          <div className="studio-chip">
            <span>Paper Generation:</span> <strong>Independent Credit Balance</strong>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 20, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>⚠️</span>
          <span style={{ fontSize: 13.5 }}>{error}</span>
          <button type="button" onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ marginBottom: 20, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>🎉</span>
          <span style={{ fontSize: 13.5 }}>{success}</span>
          <button type="button" onClick={() => setSuccess(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
      )}

      {/* =========================================================================
          SECTION 1: MANDATORY CORE PRODUCT (CREDITS)
          ========================================================================= */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          borderRadius: 16,
          padding: '24px 28px',
          color: '#ffffff',
          marginBottom: 32,
          boxShadow: '0 4px 12px rgba(7, 21, 74, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 20,
        }}
      >
        <div style={{ maxWidth: 620 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255, 255, 255, 0.18)', padding: '4px 12px', borderRadius: 20, fontSize: 11.5, fontWeight: 700, marginBottom: 10 }}>
            <span>⭐</span> MANDATORY CORE PRODUCT
          </div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: '#ffffff' }}>
            Question Paper Generation Credits
          </h2>
          <p style={{ margin: '0 0 14px', fontSize: 13.5, color: '#cbd5e1', lineHeight: 1.5 }}>
            Assemble and finalize question papers at 1 Credit per question. Credits have <strong>lifetime validity and never expire</strong>.
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '6px 12px', borderRadius: 8, fontSize: 12.5 }}>
              Starter: <strong>₹5,000</strong> (5k Cr)
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '6px 12px', borderRadius: 8, fontSize: 12.5 }}>
              Growth: <strong>₹10,000</strong> (11.5k Cr)
            </div>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '6px 12px', borderRadius: 8, fontSize: 12.5 }}>
              Institution: <strong>₹20,000</strong> (25k Cr)
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right', minWidth: 200 }}>
          <div style={{ fontSize: 11.5, color: '#93c5fd', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
            Available Paper Credits
          </div>
          <div style={{ fontSize: 34, fontWeight: 900, color: '#38bdf8', marginTop: 2 }}>
            {(user?.creditBalance ?? 0).toLocaleString()} <span style={{ fontSize: 15, color: '#ffffff', fontWeight: 600 }}>Credits</span>
          </div>
          <Link
            to="/recharge"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 12,
              padding: '8px 16px',
              background: '#38bdf8',
              color: '#07154A',
              borderRadius: 8,
              fontWeight: 800,
              fontSize: 13,
              textDecoration: 'none',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }}
          >
            Recharge Credits &rarr;
          </Link>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: COMPLETE ADD-ON BUNDLE
          ========================================================================= */}
      <div
        style={{
          background: '#fdf4ff',
          border: '2px solid #f0abfc',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 20,
        }}
      >
        <div style={{ maxWidth: 680 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ background: '#fae8ff', color: '#86198f', padding: '4px 12px', borderRadius: 20, fontSize: 11.5, fontWeight: 800 }}>
              ⭐ BEST VALUE BUNDLE
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: 11.5,
                fontWeight: 800,
                background: bundleStatus.bg,
                color: bundleStatus.color,
                border: `1px solid ${bundleStatus.border}`,
              }}
            >
              <span>{bundleStatus.icon}</span> {bundleStatus.label}
            </span>
          </div>

          <h2 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 900, color: '#86198f' }}>
            {COMPLETE_BUNDLE_DEF.icon} {COMPLETE_BUNDLE_DEF.name}
          </h2>
          <p style={{ margin: '0 0 12px', fontSize: 13.5, color: '#475569', lineHeight: 1.5 }}>
            {COMPLETE_BUNDLE_DEF.desc}
          </p>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: NAVY }}>
              ₹{COMPLETE_BUNDLE_DEF.monthlyPrice.toLocaleString('en-IN')}
            </span>
            <span style={{ fontSize: 13, color: '#64748b' }}>/month</span>
            <span style={{ fontSize: 13, color: '#cbd5e1' }}>•</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#059669' }}>
              ₹{COMPLETE_BUNDLE_DEF.annualPrice.toLocaleString('en-IN')}/year (2 Months Free)
            </span>
          </div>

          {bundleSub && bundleSub.renewalDate && bundleStatusKey === 'ACTIVE' && (
            <div style={{ marginTop: 10, fontSize: 12, color: '#16a34a', fontWeight: 700 }}>
              📅 Renewal Date: {new Date(bundleSub.renewalDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              {bundleSub.priceRupeesSnapshot ? ` • ₹${bundleSub.priceRupeesSnapshot.toLocaleString('en-IN')} (${bundleSub.billingCycle || 'MONTHLY'})` : ''}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {bundleStatusKey === 'NOT_SUBSCRIBED' || bundleStatusKey === 'CANCELLED' || bundleStatusKey === 'EXPIRED' ? (
            <button
              type="button"
              onClick={() => {
                setRequestModal({
                  moduleKey: COMPLETE_BUNDLE_DEF.key,
                  name: COMPLETE_BUNDLE_DEF.name,
                  monthlyPrice: COMPLETE_BUNDLE_DEF.monthlyPrice,
                  annualPrice: COMPLETE_BUNDLE_DEF.annualPrice,
                  icon: COMPLETE_BUNDLE_DEF.icon,
                  badge: 'Complete Bundle',
                });
                setCycle('MONTHLY');
              }}
              style={{
                padding: '11px 24px',
                background: '#86198f',
                color: '#ffffff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(134, 25, 143, 0.3)',
              }}
            >
              🎁 Subscribe to Complete Bundle &rarr;
            </button>
          ) : bundleStatusKey === 'PENDING' ? (
            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'inline-block', padding: '8px 14px', background: '#fef3c7', color: '#b45309', borderRadius: 8, fontWeight: 700, fontSize: 12.5 }}>
                ⏳ Awaiting Admin Approval
              </span>
              <button
                type="button"
                onClick={() => setCancelModal({ moduleKey: 'COMPLETE_BUNDLE', name: 'Complete Add-on Bundle' })}
                style={{ display: 'block', marginTop: 6, background: 'none', border: 'none', color: '#dc2626', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Withdraw Request
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ display: 'inline-block', padding: '8px 16px', background: '#dcfce7', color: '#15803d', borderRadius: 8, fontWeight: 800, fontSize: 13.5 }}>
                  ✓ Complete Bundle Active
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRequestModal({
                      moduleKey: COMPLETE_BUNDLE_DEF.key,
                      name: COMPLETE_BUNDLE_DEF.name,
                      monthlyPrice: COMPLETE_BUNDLE_DEF.monthlyPrice,
                      annualPrice: COMPLETE_BUNDLE_DEF.annualPrice,
                      icon: COMPLETE_BUNDLE_DEF.icon,
                      badge: 'Complete Bundle',
                    });
                    setCycle('ANNUAL');
                  }}
                  className="btn btn-ghost"
                  style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, color: '#86198f' }}
                >
                  🔄 Renew License
                </button>
              </div>
              <button
                type="button"
                onClick={() => setCancelModal({ moduleKey: 'COMPLETE_BUNDLE', name: 'Complete Add-on Bundle' })}
                style={{ background: 'none', border: 'none', color: '#b91c1c', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Request Cancellation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: FOUR INDIVIDUAL OPTIONAL MODULES
          ========================================================================= */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: NAVY }}>
            Individual Add-on Modules
          </h2>
          <p style={{ margin: 0, fontSize: 13.5, color: '#64748b' }}>
            Choose specific capabilities according to your institutional needs.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {MODULES.map((mod) => {
            const { statusKey, sub, canCancel, canRequest, canRenew } = resolveModuleStatus(
              mod.key,
              subscriptions,
              hasBundle,
              access
            );
            const status = formatStatus(statusKey);
            const renewal = sub?.renewalDate ? new Date(sub.renewalDate) : null;
            const daysLeft = renewal ? Math.ceil((renewal.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

            return (
              <div
                key={mod.key}
                style={{
                  background: '#ffffff',
                  border: statusKey === 'ACTIVE' || statusKey === 'ACTIVE_BUNDLE' ? '2px solid #86efac' : '1px solid #e2e8f0',
                  borderRadius: 16,
                  padding: '22px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <div>
                  {/* Top Bar: Badge & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {mod.badge}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '3px 9px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 800,
                        background: status.bg,
                        color: status.color,
                        border: `1px solid ${status.border}`,
                      }}
                    >
                      <span>{status.icon}</span> {status.label}
                    </span>
                  </div>

                  {/* Title & Icon */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 24 }}>{mod.icon}</span>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: NAVY }}>
                      {mod.name}
                    </h3>
                  </div>

                  {/* Pricing Display */}
                  <div style={{ margin: '10px 0 14px', padding: '10px 12px', background: '#f8fafc', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 22, fontWeight: 900, color: NAVY }}>
                        ₹{mod.monthlyPrice.toLocaleString('en-IN')}
                      </span>
                      <span style={{ fontSize: 12, color: '#64748b' }}>/month</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: '#059669', fontWeight: 700, marginTop: 3 }}>
                      ₹{mod.annualPrice.toLocaleString('en-IN')}/year (2 Months Free)
                    </div>
                  </div>

                  {/* Description */}
                  <p style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.45, margin: '0 0 16px' }}>
                    {mod.desc}
                  </p>

                  {/* Features List */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>
                      Key Capabilities
                    </div>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                      {mod.features.map((feat, idx) => (
                        <li key={idx} style={{ fontSize: 12, color: '#334155', display: 'flex', gap: 6, marginBottom: 5 }}>
                          <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card Actions & Timeline */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                  {/* Renewal or Timeline Info */}
                  {renewal && (
                    <div style={{ marginBottom: 10, fontSize: 11.5, color: '#475569' }}>
                      <div style={{ fontWeight: 600 }}>
                        📅 Renewal: {renewal.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      {daysLeft !== null && (
                        <div style={{ color: daysLeft <= 3 ? '#dc2626' : '#16a34a', fontWeight: 700, marginTop: 2 }}>
                          {daysLeft > 0 ? `${daysLeft} days remaining` : 'Renews today'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Primary Action Button */}
                  {canRequest ? (
                    <button
                      type="button"
                      onClick={() => {
                        setRequestModal({
                          moduleKey: mod.key,
                          name: mod.name,
                          monthlyPrice: mod.monthlyPrice,
                          annualPrice: mod.annualPrice,
                          icon: mod.icon,
                          badge: mod.badge,
                        });
                        setCycle('MONTHLY');
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        background: NAVY,
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 800,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <span>⚡</span> Subscribe Online &rarr;
                    </button>
                  ) : statusKey === 'PENDING' ? (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ background: '#fef3c7', color: '#b45309', padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                        ⏳ Pending Admin Approval
                      </div>
                      {canCancel && (
                        <button
                          type="button"
                          onClick={() => setCancelModal({ moduleKey: mod.key, name: mod.name })}
                          style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 11.5, cursor: 'pointer', marginTop: 5, textDecoration: 'underline' }}
                        >
                          Withdraw Request
                        </button>
                      )}
                    </div>
                  ) : statusKey === 'ACTIVE_BUNDLE' ? (
                    <div style={{ textAlign: 'center', background: '#f3e8ff', color: '#7e22ce', padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                      🎁 Active via Complete Bundle
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <div style={{ flex: 1, textAlign: 'center', background: '#dcfce7', color: '#15803d', padding: '7px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800 }}>
                          ✓ Module Active
                        </div>
                        {canRenew && (
                          <button
                            type="button"
                            onClick={() => {
                              setRequestModal({
                                moduleKey: mod.key,
                                name: mod.name,
                                monthlyPrice: mod.monthlyPrice,
                                annualPrice: mod.annualPrice,
                                icon: mod.icon,
                                badge: mod.badge,
                              });
                              setCycle(sub?.billingCycle || 'ANNUAL');
                            }}
                            className="btn btn-ghost"
                            style={{ padding: '6px 10px', fontSize: 11.5, fontWeight: 700, color: NAVY }}
                          >
                            🔄 Renew
                          </button>
                        )}
                      </div>
                      {canCancel && (
                        <div style={{ textAlign: 'center', marginTop: 6 }}>
                          <button
                            type="button"
                            onClick={() => setCancelModal({ moduleKey: mod.key, name: mod.name })}
                            style={{ background: 'none', border: 'none', color: '#b91c1c', fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            Request Cancellation
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          SECTION 4: ONLINE PAYMENT TRANSACTIONS & INVOICES (PHASE 3D)
          ========================================================================= */}
      <div style={{ marginBottom: 40, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: NAVY }}>
              💳 Payment Transactions &amp; GST Invoices
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
              Official record of all online subscription payments processed through the Razorpay gateway.
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="btn btn-ghost"
            style={{ fontSize: 12.5, fontWeight: 700 }}
          >
            🔄 Sync Payments
          </button>
        </div>

        {paymentHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8', fontSize: 13.5 }}>
            No online subscription payments recorded yet. Subscribing to an add-on module will generate an official GST invoice here.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Date</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Module / Bundle</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Billing Cycle</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Amount Paid (INR)</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Gateway Reference</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'right' }}>Tax Invoice</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((p) => {
                  let statusBadge = { bg: '#f1f5f9', color: '#475569', label: p.status };
                  if (p.status === 'SUCCESS') statusBadge = { bg: '#dcfce7', color: '#15803d', label: 'PAID' };
                  else if (p.status === 'PENDING') statusBadge = { bg: '#fef3c7', color: '#b45309', label: 'PENDING' };
                  else if (p.status === 'FAILED') statusBadge = { bg: '#fee2e2', color: '#b91c1c', label: 'FAILED' };
                  else if (p.status === 'REFUNDED') statusBadge = { bg: '#f3e8ff', color: '#7e22ce', label: 'REFUNDED' };

                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', color: '#334155', whiteSpace: 'nowrap' }}>
                        {new Date(p.paidAt || p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: NAVY }}>
                        {p.moduleKey === 'COMPLETE_BUNDLE'
                          ? 'Complete Add-on Bundle'
                          : MODULES.find((m) => m.key === p.moduleKey)?.name || p.moduleKey}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569' }}>
                        {p.billingCycle}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: NAVY }}>
                        ₹{(p.totalAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, background: statusBadge.bg, color: statusBadge.color }}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 11.5, fontFamily: 'monospace' }}>
                        {p.gatewayPaymentId || p.gatewayOrderId || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        {p.invoice ? (
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(p.invoice)}
                            className="btn btn-ghost"
                            style={{ padding: '4px 10px', fontSize: 12, fontWeight: 700, color: '#0284c7' }}
                          >
                            📄 {p.invoice.invoiceNumber}
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 5: SUBSCRIPTION AUDIT TRAIL LOGS
          ========================================================================= */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: NAVY }}>
          📜 Subscription Lifecycle History
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
          Immutable ledger of activations, renewals, suspensions, and plan modifications.
        </p>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 16px', color: '#94a3b8', fontSize: 13 }}>
            No standing subscription history recorded yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Timestamp</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Action</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Module</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Rate Snapshot</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>Audit Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => {
                  let actionSt = { bg: '#f1f5f9', color: '#475569' };
                  if (h.action === 'ACTIVATED') actionSt = { bg: '#dcfce7', color: '#15803d' };
                  else if (h.action === 'RENEWED') actionSt = { bg: '#dbeafe', color: '#1d4ed8' };
                  else if (h.action === 'CANCELLED') actionSt = { bg: '#fee2e2', color: '#b91c1c' };
                  else if (h.action === 'DEACTIVATED') actionSt = { bg: '#f1f5f9', color: '#64748b' };

                  return (
                    <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', color: '#334155', whiteSpace: 'nowrap' }}>
                        {new Date(h.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800, background: actionSt.bg, color: actionSt.color }}>
                          {h.action}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: NAVY }}>
                        {h.moduleKey === 'COMPLETE_BUNDLE'
                          ? 'Complete Add-on Bundle'
                          : MODULES.find((m) => m.key === h.moduleKey)?.name || h.moduleKey}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569' }}>
                        ₹{h.priceRupeesSnapshot?.toLocaleString('en-IN') || 0} ({h.billingCycle || 'MONTHLY'})
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569', fontSize: 12 }}>
                        {h.note || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL 1: INTERACTIVE CHECKOUT & RAZORPAY TEST GATEWAY MODAL (PHASE 3D)
          ========================================================================= */}
      {requestModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(7, 21, 74, 0.65)',
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
              background: '#ffffff',
              borderRadius: 20,
              maxWidth: 540,
              width: '100%',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <span style={{ fontSize: 11.5, fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Institutional Gateway Checkout
                </span>
                <h3 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 900, color: NAVY, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{requestModal.icon || '✨'}</span> {requestModal.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeCheckoutModal}
                disabled={actionBusy && paymentStep === 'VERIFYING'}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            {/* Test Gateway Banner */}
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: '10px 14px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🧪</span>
              <div style={{ fontSize: 12, color: '#065f46', lineHeight: 1.4 }}>
                <strong>Razorpay Test Mode Active:</strong> Use any dummy card, UPI ID (e.g. <code>success@razorpay</code>), or NetBanking to simulate payment. No real money will be charged.
              </div>
            </div>

            {/* In-Modal Errors */}
            {paymentError && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 14px', marginBottom: 16, color: '#991b1b', fontSize: 12.5 }}>
                <strong>Payment Alert:</strong> {paymentError}
              </div>
            )}

            {paymentStep === 'CANCELLED' && (
              <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#92400e', fontSize: 12.5 }}>
                Payment was cancelled in the gateway modal. Your account was not debited. You can retry below.
              </div>
            )}

            {paymentStep === 'SUCCESS' && paymentSuccessData ? (
              /* Success Screen */
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 10 }}>🎉</div>
                <h4 style={{ fontSize: 20, fontWeight: 800, color: '#15803d', margin: '0 0 6px' }}>
                  Payment Verified &amp; Module Active!
                </h4>
                <p style={{ fontSize: 13.5, color: '#475569', margin: '0 0 20px', lineHeight: 1.45 }}>
                  Your subscription for <strong>{requestModal.name}</strong> has been successfully activated for your college.
                </p>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px', marginBottom: 20, textAlign: 'left', fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: '#64748b' }}>Billing Frequency:</span>
                    <strong style={{ color: NAVY }}>{cycle}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: '#64748b' }}>Total Paid:</span>
                    <strong style={{ color: '#15803d' }}>₹{currentTotalRupees}</strong>
                  </div>
                  {paymentSuccessData.invoice && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px dashed #cbd5e1' }}>
                      <span style={{ color: '#64748b' }}>Tax Invoice Number:</span>
                      <strong style={{ color: '#0284c7' }}>{paymentSuccessData.invoice.invoiceNumber}</strong>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  {paymentSuccessData.invoice && (
                    <button
                      type="button"
                      onClick={() => {
                        const inv = paymentSuccessData.invoice;
                        closeCheckoutModal();
                        setSelectedInvoice(inv);
                      }}
                      style={{
                        padding: '10px 18px',
                        background: '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      📄 View Tax Invoice
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeCheckoutModal}
                    style={{
                      padding: '10px 22px',
                      background: NAVY,
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Done &rarr;
                  </button>
                </div>
              </div>
            ) : (
              /* Regular Checkout Form */
              <div>
                {/* 1. Cycle Selector */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
                    1. Select Billing Period
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => setCycle('MONTHLY')}
                      disabled={actionBusy}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 12,
                        border: cycle === 'MONTHLY' ? '2.5px solid #0284c7' : '1.5px solid #cbd5e1',
                        background: cycle === 'MONTHLY' ? '#f0f9ff' : '#ffffff',
                        color: cycle === 'MONTHLY' ? '#0369a1' : '#475569',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: actionBusy ? 'not-allowed' : 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#64748b' }}>Monthly Plan</div>
                      <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>
                        ₹{requestModal.monthlyPrice.toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>per month</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCycle('ANNUAL')}
                      disabled={actionBusy}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 12,
                        border: cycle === 'ANNUAL' ? '2.5px solid #0284c7' : '1.5px solid #cbd5e1',
                        background: cycle === 'ANNUAL' ? '#f0f9ff' : '#ffffff',
                        color: cycle === 'ANNUAL' ? '#0369a1' : '#475569',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: actionBusy ? 'not-allowed' : 'pointer',
                        textAlign: 'center',
                        position: 'relative',
                      }}
                    >
                      <span style={{ position: 'absolute', top: -9, right: 10, background: '#059669', color: '#ffffff', fontSize: 9.5, fontWeight: 900, padding: '2px 8px', borderRadius: 10 }}>
                        2 MONTHS FREE
                      </span>
                      <div style={{ fontSize: 12, textTransform: 'uppercase', color: '#64748b' }}>Annual Plan</div>
                      <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>
                        ₹{requestModal.annualPrice.toLocaleString('en-IN')}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>per year (10x rate)</div>
                    </button>
                  </div>
                </div>

                {/* 2. Exact Financial Breakdown Box */}
                <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '16px 18px', marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 10 }}>
                    2. Order &amp; Tax Calculation Breakdown
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475569', marginBottom: 6 }}>
                    <span>Base Subscription ({cycle === 'ANNUAL' ? '365 Days' : '30 Days'})</span>
                    <span style={{ fontWeight: 600 }}>₹{currentBasePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#475569', marginBottom: 10 }}>
                    <span>Applicable GST (18.00% / 1800 bps)</span>
                    <span style={{ fontWeight: 600 }}>₹{currentGstRupees}</span>
                  </div>
                  <div style={{ borderTop: '1.5px solid #cbd5e1', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: NAVY }}>Total Payable Amount</span>
                    <span style={{ fontSize: 24, fontWeight: 900, color: '#0284c7' }}>₹{currentTotalRupees}</span>
                  </div>
                </div>

                {/* 3. Action Buttons */}
                <div style={{ marginBottom: 16 }}>
                  <button
                    type="button"
                    onClick={handlePayRazorpay}
                    disabled={actionBusy}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      background: actionBusy ? '#94a3b8' : 'linear-gradient(135deg, #07154A 0%, #1e40af 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 12,
                      fontWeight: 800,
                      fontSize: 15,
                      cursor: actionBusy ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      boxShadow: '0 4px 14px rgba(7, 21, 74, 0.25)',
                    }}
                  >
                    {paymentStep === 'ORDERING' ? (
                      <><span>⏳</span> Generating Razorpay Order...</>
                    ) : paymentStep === 'AWAITING_PAYMENT' ? (
                      <><span>💳</span> Complete Payment in Gateway...</>
                    ) : paymentStep === 'VERIFYING' ? (
                      <><span>🔄</span> Verifying Bank Signature...</>
                    ) : (
                      <><span>⚡</span> Pay ₹{currentTotalRupees} via Razorpay &rarr;</>
                    )}
                  </button>
                </div>

                {/* 4. Collapsible Enterprise Offline PO Option */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShowOfflineOption(!showOfflineOption)}
                    style={{ background: 'none', border: 'none', fontSize: 12, color: '#64748b', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {showOfflineOption ? '▲ Hide offline purchase order option' : 'Institutional Purchase Order / Bank Wire Transfer instead?'}
                  </button>

                  {showOfflineOption && (
                    <form onSubmit={handleSubmitOfflineRequest} style={{ marginTop: 12, background: '#f8fafc', padding: 14, borderRadius: 10, textAlign: 'left' }}>
                      <div style={{ fontSize: 12, color: '#475569', marginBottom: 8, lineHeight: 1.4 }}>
                        Submit this request if your institution requires offline approval via formal purchase order or direct bank wire (NEFT/RTGS). Status will remain <strong>Pending Approval</strong> until verified.
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Optional remarks (e.g. PO reference, departmental authorization)"
                        value={requestNote}
                        onChange={(e) => setRequestNote(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12.5, boxSizing: 'border-box', marginBottom: 8 }}
                      />
                      <button
                        type="submit"
                        disabled={actionBusy}
                        style={{ padding: '8px 14px', background: '#334155', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Submit Offline Request
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: REQUEST CANCELLATION MODAL
          ========================================================================= */}
      {cancelModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(7, 21, 74, 0.65)',
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
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 480,
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 19, fontWeight: 800, color: '#b91c1c' }}>
              Request Subscription Cancellation
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13.5, color: '#64748b', lineHeight: 1.45 }}>
              Are you sure you want to request cancellation for <strong>{cancelModal.name}</strong>? Your request will be reviewed by the platform administrator.
            </p>

            <form onSubmit={handleSubmitCancellation}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Reason for Cancellation
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Examinations concluded for current academic term"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1.5px solid #cbd5e1',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setCancelModal(null)}
                  disabled={actionBusy}
                  className="btn btn-ghost"
                  style={{ padding: '8px 16px', fontSize: 13 }}
                >
                  Keep Subscription
                </button>
                <button
                  type="submit"
                  disabled={actionBusy}
                  style={{
                    padding: '9px 20px',
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: actionBusy ? 'not-allowed' : 'pointer',
                  }}
                >
                  {actionBusy ? 'Submitting...' : 'Confirm Cancellation Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: B2B TAX INVOICE VIEWER MODAL (PHASE 3D)
          ========================================================================= */}
      {selectedInvoice && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(7, 21, 74, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 18,
              maxWidth: 620,
              width: '100%',
              padding: '32px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Invoice Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: 16, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: NAVY }}>QuestionsStudio</div>
                <div style={{ fontSize: 11.5, color: '#64748b' }}>Academic Assessment &amp; SaaS Solutions</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ display: 'inline-block', background: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: 12, padding: '3px 10px', borderRadius: 6, marginBottom: 4 }}>
                  TAX INVOICE — PAID
                </span>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{selectedInvoice.invoiceNumber}</div>
                <div style={{ fontSize: 11.5, color: '#64748b' }}>
                  Date: {new Date(selectedInvoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Billed To */}
            <div style={{ marginBottom: 20, fontSize: 12.5, color: '#475569' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>
                Billed To (Institutional Client)
              </div>
              <strong style={{ fontSize: 14, color: NAVY }}>{user?.instituteName || user?.name || 'Authorized College Partner'}</strong>
              {user?.phone && <div>Contact: {user.phone}</div>}
              {selectedInvoice.collegeGstin && <div>GSTIN: {selectedInvoice.collegeGstin}</div>}
            </div>

            {/* Invoice Line Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 20 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '8px 10px' }}>Item Description</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Base Amount</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>GST Rate</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Tax Amount</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total (INR)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px', fontWeight: 600, color: NAVY }}>
                    Modular SaaS Subscription License
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 400 }}>SAC Service Code: {selectedInvoice.sacCode || '998314'}</div>
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>
                    ₹{(selectedInvoice.baseAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>
                    {(selectedInvoice.taxRateBps / 100).toFixed(2)}%
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right' }}>
                    ₹{(selectedInvoice.taxAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: NAVY }}>
                    ₹{(selectedInvoice.totalAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Tax Split Summary */}
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 12.5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>CGST (Intra-state Central Tax):</span>
                <span>₹{(selectedInvoice.cgstAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#64748b' }}>SGST (Intra-state State Tax):</span>
                <span>₹{(selectedInvoice.sgstAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 14, color: NAVY }}>
                <span>Gross Payable Total:</span>
                <span style={{ color: '#0284c7' }}>₹{(selectedInvoice.totalAmountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-ghost"
                style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span>🖨️</span> Print Tax Invoice
              </button>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                style={{
                  padding: '8px 20px',
                  background: NAVY,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
