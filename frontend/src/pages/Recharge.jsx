import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const NAVY = '#07154A';

const BUNDLES = [
  { id: 'starter', name: 'Starter Pack', amount: 5000, credits: 5000, bonus: 0, rate: '₹1.00', badge: null },
  { id: 'growth', name: 'Growth Academy', amount: 10000, credits: 11500, bonus: 1500, rate: '₹0.87', badge: '15% BONUS (POPULAR)' },
  { id: 'institution', name: 'Institution Master', amount: 20000, credits: 25000, bonus: 5000, rate: '₹0.80', badge: '25% BONUS (BEST VALUE)' },
];

const WHATSAPP_PACKS = [
  {
    id: 'wa_starter',
    name: 'Starter Pack',
    amount: 1999,
    messages: '2,500 Messages',
    rate: '₹0.80 / msg',
    badge: null,
    desc: 'Instant delivery of CBT exam credentials, student passcodes & OTPs.',
  },
  {
    id: 'wa_growth',
    name: 'Growth Pack',
    amount: 3750,
    messages: '5,000 Messages',
    rate: '₹0.75 / msg',
    badge: 'MOST POPULAR',
    desc: 'Automated student scorecards, chapter diagnostic cards & parent alerts.',
  },
  {
    id: 'wa_institution',
    name: 'Institution Pack',
    amount: 6999,
    messages: '10,000 Messages',
    rate: '₹0.70 / msg',
    badge: 'BEST VALUE',
    desc: 'Full semester coverage. Automated parent report cards & bookstore notices.',
  },
  {
    id: 'wa_mega',
    name: 'Mega Campus Pack',
    amount: 14999,
    messages: '25,000 Messages',
    rate: '₹0.60 / msg',
    badge: 'MAX SAVINGS',
    desc: 'High-volume statewide mock tests, multi-branch campuses & announcements.',
  },
];

function calculateCredits(amount) {
  const amt = Number(amount) || 0;
  if (!Number.isInteger(amt) || amt <= 0) return { base: 0, bonus: 0, total: 0, rate: '1.00' };
  let bonus = 0;
  if (amt >= 20000) {
    bonus = Math.floor(amt * 0.25);
  } else if (amt >= 10000) {
    bonus = Math.floor(amt * 0.15);
  }
  const total = amt + bonus;
  const rate = total > 0 ? (amt / total).toFixed(2) : '1.00';
  return { base: amt, bonus, total, rate };
}

export default function Recharge() {
  const { user, loadCurrentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const initialAmount = searchParams.get('amount') || '10000';
  const initialType = searchParams.get('type') === 'whatsapp' ? 'whatsapp' : 'credits';

  const [activeCategory, setActiveCategory] = useState(initialType);
  const [upi, setUpi] = useState(null);
  const [requests, setRequests] = useState([]);
  const [institute, setInstitute] = useState(null);
  const [whatsAppData, setWhatsAppData] = useState(null);

  // Paper Credits selection state
  const [amount, setAmount] = useState(initialAmount);
  const [isCustom, setIsCustom] = useState(!BUNDLES.some((b) => String(b.amount) === String(initialAmount)));
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [paymentTab, setPaymentTab] = useState('gateway'); // 'gateway' | 'upi'

  // WhatsApp Pack selection state
  const [waAmount, setWaAmount] = useState('999');
  const [waIsCustom, setWaIsCustom] = useState(false);
  const [waReference, setWaReference] = useState('');
  const [waNote, setWaNote] = useState('');
  const [waBusy, setWaBusy] = useState(false);

  const [copiedUpi, setCopiedUpi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  function load() {
    Promise.all([
      api.upiInfo(),
      api.myRecharges(),
      api.myInstitute().catch(() => null),
      api.getWhatsAppLedger().catch(() => null),
    ])
      .then(([u, r, inst, wa]) => {
        setUpi(u);
        setRequests(r);
        if (inst) setInstitute(inst);
        if (wa) setWhatsAppData(wa);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    const qAmount = searchParams.get('amount');
    if (qAmount) {
      setAmount(qAmount);
      setIsCustom(!BUNDLES.some((b) => String(b.amount) === String(qAmount)));
    }
    const qType = searchParams.get('type');
    if (qType === 'whatsapp') {
      setActiveCategory('whatsapp');
    }
  }, [searchParams]);

  const numAmount = parseInt(amount) || 0;
  const creditDetails = calculateCredits(numAmount);

  const numWaAmount = parseInt(waAmount) || 0;
  const currentCredits = user?.creditBalance ?? institute?.creditBalance ?? 0;
  const currentWaBalance = whatsAppData?.walletBalance ?? institute?.whatsAppWalletBalance ?? 0.0;

  function handleSelectBundle(bundle) {
    setAmount(String(bundle.amount));
    setIsCustom(false);
  }

  function handleCustomAmountChange(val) {
    const clean = val.replace(/[^0-9]/g, '');
    setAmount(clean);
    setIsCustom(true);
  }

  function handleSelectWaPack(pack) {
    setWaAmount(String(pack.amount));
    setWaIsCustom(false);
  }

  function handleCustomWaAmountChange(val) {
    const clean = val.replace(/[^0-9]/g, '');
    setWaAmount(clean);
    setWaIsCustom(true);
  }

  async function submitCreditsRecharge(e) {
    e.preventDefault();
    if (numAmount <= 0) return setError('Please enter a valid amount.');
    if (!reference.trim()) return setError('Please enter the 12-digit UPI reference number.');

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.submitRecharge({
        amountRupees: numAmount,
        upiReference: reference.trim(),
        note: note.trim() || undefined,
      });
      setMessage(
        `Recharge request for ₹${numAmount.toLocaleString('en-IN')} submitted! You will receive ${
          res.request?.creditsAsked || creditDetails.total
        } credits once admin confirms the transfer.`
      );
      setReference('');
      setNote('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitWhatsAppRecharge(e) {
    e.preventDefault();
    if (numWaAmount <= 0) return setError('Please enter a valid WhatsApp recharge amount.');
    if (!waReference.trim()) return setError('Please enter the 12-digit UPI reference / UTR number from your payment receipt.');

    setWaBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api.submitRecharge({
        amountRupees: numWaAmount,
        upiReference: waReference.trim(),
        note: `WhatsApp Messaging Wallet Recharge (₹${numWaAmount}) ${waNote.trim() ? `• ${waNote.trim()}` : ''}`,
      });
      setMessage(
        `WhatsApp Wallet top-up request for ₹${numWaAmount.toLocaleString('en-IN')} submitted! Your WhatsApp messaging balance will be credited upon UTR confirmation.`
      );
      setWaReference('');
      setWaNote('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setWaBusy(false);
    }
  }

  async function handleInstantWaCredit() {
    if (numWaAmount <= 0) return setError('Enter a valid amount in rupees.');
    setWaBusy(true);
    setError(null);
    try {
      const res = await api.rechargeWhatsAppWallet(numWaAmount);
      setMessage(`Added ₹${numWaAmount.toLocaleString('en-IN')} directly to your WhatsApp messaging wallet! New balance: ₹${res.newBalance.toFixed(2)}`);
      load();
      if (loadCurrentUser) loadCurrentUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setWaBusy(false);
    }
  }

  function handlePayRazorpay() {
    if (numAmount < 1) return setError('Amount must be at least ₹1.');
    setBusy(true);
    setError(null);

    api.createRazorpayOrder(numAmount)
      .then((orderData) => {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'QuestionStudio',
          description: `${creditDetails.total.toLocaleString()} QuestionStudio Credits`,
          order_id: orderData.orderId,
          handler: async function (response) {
            try {
              const verifyRes = await api.verifyRazorpayOrder({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              setMessage(`Payment successful! Added ${verifyRes.creditsAdded.toLocaleString()} credits to your account.`);
              load();
              loadCurrentUser();
            } catch (vErr) {
              setError(vErr.message || 'Payment verification failed. Please contact support.');
            }
          },
          prefill: {
            name: institute?.name || '',
            email: user?.email || '',
            contact: institute?.phone || '',
          },
          theme: { color: NAVY },
          modal: {
            ondismiss: function () {
              setBusy(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          setError(`Payment failed: ${resp.error.description || resp.error.reason}`);
          setBusy(false);
        });
        rzp.open();
      })
      .catch((e) => {
        setError(e.message);
        setBusy(false);
      });
  }

  function copyUpiId() {
    if (!upi?.upiId) return;
    navigator.clipboard.writeText(upi.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  }

  const upiDeepLink = upi?.upiId
    ? `upi://pay?pa=${encodeURIComponent(upi.upiId)}&pn=${encodeURIComponent(upi.payeeName || 'QuestionStudio')}&am=${
        activeCategory === 'credits' ? (numAmount > 0 ? numAmount : 5000) : (numWaAmount > 0 ? numWaAmount : 999)
      }&cu=INR&tn=${encodeURIComponent(activeCategory === 'credits' ? 'QuestionStudio Credits Recharge' : 'WhatsApp Wallet Top-up')}`
    : null;

  function statusBadge(status) {
    if (status === 'APPROVED') return <span className="badge badge-success">Approved</span>;
    if (status === 'REJECTED') return <span className="badge badge-danger">Rejected</span>;
    return <span className="badge badge-warning">Pending verification</span>;
  }

  if (loading) return <div className="skeleton" style={{ height: 320 }} />;

  return (
    <div style={{ width: '100%', padding: '0 4px' }}>
      {/* EXECUTIVE HERO BANNER */}
      <div className="studio-hero" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="studio-badge">
              <span>💳</span>
              <span>Billing &bull; Academic Balances</span>
            </div>
            <h1 className="studio-title">Recharge &amp; Account Balances</h1>
            <p className="studio-sub">
              Manage Question Paper Generation credits and official WhatsApp parent scorecard delivery in one unified dashboard.
            </p>
          </div>

          {/* Live Institute Dual Balances */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {/* Paper Credits Card */}
            <div
              onClick={() => setActiveCategory('credits')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(8px)',
                color: '#ffffff',
                padding: '10px 18px',
                borderRadius: 14,
                cursor: 'pointer',
                border: activeCategory === 'credits' ? '2px solid #60A5FA' : '1px solid rgba(255, 255, 255, 0.15)',
                transition: 'all 0.15s ease',
              }}
              title="Click to manage Paper Credits"
            >
              <div>
                <div style={{ fontSize: 10, color: '#93C5FD', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Paper Engine
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#FCD34D', lineHeight: 1.1 }}>
                  {currentCredits.toLocaleString('en-IN')}{' '}
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>Cr</span>
                </div>
              </div>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(246, 200, 76, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                }}
              >
                ⚡
              </div>
            </div>

            {/* WhatsApp Wallet Card */}
            <div
              onClick={() => setActiveCategory('whatsapp')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(8px)',
                color: '#ffffff',
                padding: '10px 18px',
                borderRadius: 14,
                cursor: 'pointer',
                border: activeCategory === 'whatsapp' ? '2px solid #4ADE80' : '1px solid rgba(255, 255, 255, 0.15)',
                transition: 'all 0.15s ease',
              }}
              title="Click to top-up WhatsApp Wallet"
            >
              <div>
                <div style={{ fontSize: 10, color: '#86EFAC', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  WhatsApp Wallet
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#4ADE80', lineHeight: 1.1 }}>
                  ₹{(whatsAppData?.walletBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                }}
              >
                💬
              </div>
            </div>
          </div>
        </div>

        <div className="studio-chips">
          <div className="studio-chip">
            <span>Active View:</span> <strong>{activeCategory === 'credits' ? 'Paper Engine Credits' : 'WhatsApp Delivery Wallet'}</strong>
          </div>
          <div className="studio-chip">
            <span>Payment Methods:</span> <strong>Razorpay Instant Checkout &bull; UPI Direct</strong>
          </div>
          <div className="studio-chip">
            <span>Bonus Structure:</span> <strong>Up to 25% Free Credits on High Tiers</strong>
          </div>
        </div>
      </div>

      {/* CATEGORY SWITCHER PILLS */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 24,
          background: '#f1f5f9',
          padding: 6,
          borderRadius: 14,
          width: 'fit-content',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveCategory('credits')}
          style={{
            padding: '9px 20px',
            borderRadius: 10,
            border: 'none',
            background: activeCategory === 'credits' ? '#07154A' : 'transparent',
            color: activeCategory === 'credits' ? '#ffffff' : '#475569',
            fontWeight: 800,
            fontSize: 13.5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease',
          }}
        >
          <span>⚡</span> Paper Generation Credits ({currentCredits.toLocaleString('en-IN')})
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('whatsapp')}
          style={{
            padding: '9px 20px',
            borderRadius: 10,
            border: 'none',
            background: activeCategory === 'whatsapp' ? '#059669' : 'transparent',
            color: activeCategory === 'whatsapp' ? '#ffffff' : '#475569',
            fontWeight: 800,
            fontSize: 13.5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease',
          }}
        >
          <span>💬</span> WhatsApp Messaging Wallet (₹{currentWaBalance.toFixed(2)})
        </button>

        <Link
          to="/subscriptions"
          style={{
            padding: '9px 18px',
            borderRadius: 10,
            border: 'none',
            background: 'transparent',
            color: '#6366f1',
            fontWeight: 800,
            fontSize: 13.5,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            textDecoration: 'none',
            transition: 'all 0.15s ease',
          }}
        >
          <span>🏷️</span> Optional Modules & Plans →
        </Link>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 20, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="alert alert-success" style={{ marginBottom: 20, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>🎉</span>
          <span>{message}</span>
        </div>
      )}

      {/* =========================================================================
          TAB 1: PAPER GENERATION CREDITS RECHARGE
          ========================================================================= */}
      {activeCategory === 'credits' && (
        <div>
          {/* STEP 1: SELECT BUNDLE OR AMOUNT */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: 0 }}>
                1. Select Paper Generation Bundle
              </h2>
              <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                Bundles include up to 25% extra bonus credits
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              {BUNDLES.map((b) => {
                const isSelected = !isCustom && String(numAmount) === String(b.amount);
                return (
                  <div
                    key={b.id}
                    onClick={() => handleSelectBundle(b)}
                    style={{
                      border: isSelected ? '2px solid #3157E8' : '1.5px solid var(--line)',
                      background: isSelected ? 'linear-gradient(180deg, #F0F4FF 0%, #FFFFFF 100%)' : '#FFFFFF',
                      borderRadius: 14,
                      padding: '16px 18px',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 4px 16px rgba(49, 87, 232, 0.12)' : 'none',
                    }}
                  >
                    {b.badge && (
                      <div
                        style={{
                          position: 'absolute',
                          top: -10,
                          right: 14,
                          background: b.id === 'growth' ? '#10B981' : '#F59E0B',
                          color: '#ffffff',
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 999,
                          textTransform: 'uppercase',
                        }}
                      >
                        {b.badge}
                      </div>
                    )}
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)' }}>{b.name}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: '4px 0 2px' }}>
                      ₹{b.amount.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: 13, color: '#16A34A', fontWeight: 700 }}>
                      {b.credits.toLocaleString('en-IN')} Credits
                      {b.bonus > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#059669', marginLeft: 4 }}>
                          (+{b.bonus.toLocaleString()} Free)
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>
                      Effective: {b.rate} / question
                    </div>
                  </div>
                );
              })}

              {/* Custom Amount Selector Card */}
              <div
                onClick={() => setIsCustom(true)}
                style={{
                  border: isCustom ? '2px solid #3157E8' : '1.5px solid var(--line)',
                  background: isCustom ? 'linear-gradient(180deg, #F0F4FF 0%, #FFFFFF 100%)' : '#FFFFFF',
                  borderRadius: 14,
                  padding: '16px 18px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)' }}>Custom Amount</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: NAVY }}>₹</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 15000"
                      value={isCustom ? amount : ''}
                      onChange={(e) => handleCustomAmountChange(e.target.value)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCustom(true);
                      }}
                      style={{
                        width: '100%',
                        fontSize: 18,
                        fontWeight: 700,
                        color: NAVY,
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        padding: 0,
                      }}
                    />
                  </div>
                  {numAmount > 0 && isCustom && (
                    <div style={{ fontSize: 13, color: '#16A34A', fontWeight: 700, marginTop: 4 }}>
                      {creditDetails.total.toLocaleString('en-IN')} Credits
                      {creditDetails.bonus > 0 && (
                        <span style={{ fontSize: 11, color: '#059669' }}> (+{creditDetails.bonus.toLocaleString()} Free)</span>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 8 }}>
                  Min ₹5,000 for bonus tiers
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: SUMMARY BANNER */}
          <div
            style={{
              background: '#F8FAFC',
              border: '1.5px solid var(--line)',
              borderRadius: 14,
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 28,
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', textTransform: 'uppercase', fontWeight: 700 }}>
                Selected Order Summary
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: NAVY, marginTop: 2 }}>
                ₹{numAmount.toLocaleString('en-IN')}{' '}
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-soft)' }}>
                  ➔ {creditDetails.total.toLocaleString('en-IN')} Paper Generation Credits
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="badge badge-gold" style={{ fontSize: 12, padding: '4px 10px' }}>
                Effective Rate: ₹{creditDetails.rate} / question
              </span>
            </div>
          </div>

          {/* STEP 3: PAYMENT METHOD */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: '0 0 12px' }}>
              2. Choose Payment Method
            </h2>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              {upi?.hasRazorpay && (
                <button
                  type="button"
                  onClick={() => setPaymentTab('gateway')}
                  className={`btn ${paymentTab === 'gateway' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ borderRadius: 10, padding: '10px 18px', fontSize: 13.5 }}
                >
                  ⚡ Instant Online Gateway (Cards, UPI, NetBanking)
                </button>
              )}
              <button
                type="button"
                onClick={() => setPaymentTab('upi')}
                className={`btn ${paymentTab === 'upi' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: 10, padding: '10px 18px', fontSize: 13.5 }}
              >
                📱 Direct Bank UPI QR Code (0% Fee)
              </button>
            </div>

            {/* Sub-tab A: Gateway */}
            {paymentTab === 'gateway' && upi?.hasRazorpay && (
              <div className="card card-pad" style={{ borderRadius: 14, padding: 24 }}>
                <h3 style={{ margin: '0 0 6px', fontSize: 17, color: NAVY }}>Instant Gateway Checkout</h3>
                <p style={{ margin: '0 0 18px', fontSize: 13.5, color: 'var(--ink-soft)' }}>
                  Automated verification. Credits are added to your balance immediately upon successful payment.
                </p>
                <button
                  type="button"
                  disabled={busy || numAmount < 1}
                  onClick={handlePayRazorpay}
                  className="btn btn-primary"
                  style={{ padding: '12px 28px', fontSize: 15, fontWeight: 700 }}
                >
                  {busy ? 'Processing Checkout…' : `Pay ₹${numAmount.toLocaleString('en-IN')} via Razorpay →`}
                </button>
              </div>
            )}

            {/* Sub-tab B: Direct UPI QR */}
            {paymentTab === 'upi' && (
              <div className="card card-pad" style={{ borderRadius: 14, padding: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, alignItems: 'start' }}>
                  {/* QR Box */}
                  <div style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        padding: 12,
                        background: '#ffffff',
                        border: '2px solid var(--line)',
                        borderRadius: 14,
                        display: 'inline-block',
                      }}
                    >
                      {upi?.qrUrl ? (
                        <img
                          src={upi.qrUrl.startsWith('http') ? upi.qrUrl : `${api.imageBase()}${upi.qrUrl}`}
                          alt="Official Super Admin UPI QR"
                          style={{ width: 170, height: 170, objectFit: 'contain', display: 'block' }}
                        />
                      ) : upi?.upiId ? (
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                            `upi://pay?pa=${encodeURIComponent(upi.upiId.trim())}&pn=${encodeURIComponent(
                              upi.payeeName || 'QuestionStudio'
                            )}&am=${numAmount}&cu=INR`
                          )}`}
                          alt="UPI QR Code"
                          style={{ width: 170, height: 170, objectFit: 'contain', display: 'block' }}
                        />
                      ) : (
                        <div style={{ width: 170, height: 170, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', border: '1.5px dashed #CBD5E1', borderRadius: 10, padding: 12 }}>
                          <span style={{ fontSize: 24, marginBottom: 4 }}>⚠️</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textAlign: 'center' }}>Official UPI QR Not Uploaded Yet</span>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 6 }}>
                      Scan via GPay / PhonePe / Paytm
                    </div>
                  </div>

                  {/* UPI Info & UTR form */}
                  <div>
                    <div style={{ marginBottom: 14 }}>
                      <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>Super Admin UPI ID:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <code style={{ fontSize: 15, fontWeight: 800, color: NAVY, background: '#F1F5F9', padding: '4px 10px', borderRadius: 6 }}>
                          {upi?.upiId || 'Not Configured (Contact Super Admin)'}
                        </code>
                        <button type="button" onClick={copyUpiId} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }}>
                          {copiedUpi ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    {upiDeepLink && (
                      <a href={upiDeepLink} className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 12.5, marginBottom: 16 }}>
                        📲 Open in UPI App (Mobile)
                      </a>
                    )}

                    {/* UTR Form */}
                    <form onSubmit={submitCreditsRecharge} style={{ marginTop: 12 }}>
                      <div className="field">
                        <label style={{ fontWeight: 700 }}>12-Digit UPI Reference Number (UTR) *</label>
                        <input
                          type="text"
                          required
                          maxLength={12}
                          placeholder="e.g. 423589123456"
                          value={reference}
                          onChange={(e) => setReference(e.target.value.replace(/[^0-9]/g, ''))}
                          style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15 }}
                        />
                        <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4, display: 'block' }}>
                          Copy the 12-digit transaction ID from your PhonePe/GPay receipt and paste it here.
                        </span>
                      </div>

                      <div className="field" style={{ marginTop: 10 }}>
                        <label>Optional Note</label>
                        <input
                          type="text"
                          placeholder="e.g. Paid from HDFC account ending in 4102"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={busy}
                        className="btn btn-primary"
                        style={{ marginTop: 12, padding: '10px 22px', fontSize: 14, fontWeight: 700 }}
                      >
                        {busy ? 'Submitting…' : `Submit Recharge Request (₹${numAmount.toLocaleString('en-IN')})`}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 4: RECHARGE HISTORY */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: NAVY }}>
                Your Paper Credits Recharge History
              </h3>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Showing last {requests.length} requests</span>
            </div>

            {requests.length === 0 ? (
              <div className="card empty-state" style={{ padding: '36px 20px', textAlign: 'center', borderRadius: 14 }}>
                <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14 }}>No recharge requests submitted yet.</p>
              </div>
            ) : (
              <div className="table-wrap" style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)' }}>
                <table>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      <th>Date</th>
                      <th>Amount Paid</th>
                      <th>Credits Granted</th>
                      <th>UPI Ref / UTR</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <tr key={r.id}>
                        <td className="mono" style={{ fontSize: 12.5 }}>
                          {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={{ fontWeight: 700 }}>₹{r.amountRupees.toLocaleString('en-IN')}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#16A34A' }}>
                            {r.creditsAsked.toLocaleString('en-IN')} Cr
                          </span>
                          {r.creditsAsked > r.amountRupees && (
                            <span style={{ fontSize: 11, color: '#059669', marginLeft: 4, fontWeight: 600 }}>
                              (+{(r.creditsAsked - r.amountRupees).toLocaleString('en-IN')} bonus)
                            </span>
                          )}
                        </td>
                        <td className="mono" style={{ fontSize: 12 }}>
                          {r.upiReference}
                          {r.note && <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{r.note}</div>}
                        </td>
                        <td>
                          {statusBadge(r.status)}
                          {r.status === 'REJECTED' && r.reviewNote && (
                            <div style={{ fontSize: 11, color: '#991B1B', marginTop: 2 }}>{r.reviewNote}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: WHATSAPP MESSAGING WALLET RECHARGE & DETAILS
          ========================================================================= */}
      {activeCategory === 'whatsapp' && (
        <div>
          {/* Informational Guidance Ribbon */}
          <div
            style={{
              padding: '16px 20px',
              background: '#ecfdf5',
              border: '1.5px solid #a7f3d0',
              borderRadius: 14,
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div style={{ fontSize: 32 }}>💬</div>
            <div>
              <h4 style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 800, color: '#065f46' }}>
                Meta Official WhatsApp Business Delivery
              </h4>
              <p style={{ margin: 0, fontSize: 13, color: '#047857', lineHeight: 1.45 }}>
                Used for automated dispatches: student exam scorecards, chapter diagnostic cards, CBT candidate hall tickets,
                and OTPs. Delivered directly from your institute's verified WhatsApp sender at ~₹0.30/msg.
              </p>
            </div>
          </div>

          {/* 1. SELECT WHATSAPP PACK */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#065f46', margin: 0 }}>
                1. Select WhatsApp Messaging Bundle
              </h2>
              <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>No message expiry • Lifetime wallet balance</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              {WHATSAPP_PACKS.map((p) => {
                const isSelected = !waIsCustom && String(numWaAmount) === String(p.amount);
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectWaPack(p)}
                    style={{
                      border: isSelected ? '2px solid #059669' : '1.5px solid var(--line)',
                      background: isSelected ? 'linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 100%)' : '#FFFFFF',
                      borderRadius: 14,
                      padding: '16px 18px',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 4px 16px rgba(5, 150, 105, 0.12)' : 'none',
                    }}
                  >
                    {p.badge && (
                      <div
                        style={{
                          position: 'absolute',
                          top: -10,
                          right: 14,
                          background: p.badge === 'MOST POPULAR' ? '#059669' : '#0284c7',
                          color: '#ffffff',
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 999,
                          textTransform: 'uppercase',
                        }}
                      >
                        {p.badge}
                      </div>
                    )}
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)' }}>{p.name}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#065f46', margin: '4px 0 2px' }}>
                      ₹{p.amount.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: 13, color: '#059669', fontWeight: 800 }}>{p.messages}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>Rate: {p.rate}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, lineHeight: 1.35 }}>{p.desc}</div>
                  </div>
                );
              })}

              {/* Custom WhatsApp Amount */}
              <div
                onClick={() => setWaIsCustom(true)}
                style={{
                  border: waIsCustom ? '2px solid #059669' : '1.5px solid var(--line)',
                  background: waIsCustom ? 'linear-gradient(180deg, #F0FDF4 0%, #FFFFFF 100%)' : '#FFFFFF',
                  borderRadius: 14,
                  padding: '16px 18px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)' }}>Custom Top-Up</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#065f46' }}>₹</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 500"
                      value={waIsCustom ? waAmount : ''}
                      onChange={(e) => handleCustomWaAmountChange(e.target.value)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setWaIsCustom(true);
                      }}
                      style={{
                        width: '100%',
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#065f46',
                        border: 'none',
                        outline: 'none',
                        background: 'transparent',
                        padding: 0,
                      }}
                    />
                  </div>
                  {numWaAmount > 0 && waIsCustom && (
                    <div style={{ fontSize: 13, color: '#059669', fontWeight: 700, marginTop: 4 }}>
                      ~{Math.floor(numWaAmount / 0.3)} Messages
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 8 }}>
                  Enter any rupee amount
                </div>
              </div>
            </div>
          </div>

          {/* 2. WHATSAPP PAYMENT VIA UPI QR */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#065f46', margin: '0 0 12px' }}>
              2. Scan &amp; Pay via Official UPI QR (₹{numWaAmount})
            </h2>

            <div className="card card-pad" style={{ borderRadius: 14, padding: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, alignItems: 'start' }}>
                {/* QR Box */}
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      padding: 12,
                      background: '#ffffff',
                      border: '2px solid #a7f3d0',
                      borderRadius: 14,
                      display: 'inline-block',
                    }}
                  >
                    {upi?.qrUrl ? (
                      <img
                        src={upi.qrUrl.startsWith('http') ? upi.qrUrl : `${api.imageBase()}${upi.qrUrl}`}
                        alt="Official Super Admin UPI QR"
                        style={{ width: 170, height: 170, objectFit: 'contain', display: 'block' }}
                      />
                    ) : upi?.upiId ? (
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                          `upi://pay?pa=${encodeURIComponent(upi.upiId.trim())}&pn=${encodeURIComponent(
                            upi.payeeName || 'QuestionStudio'
                          )}&am=${numWaAmount}&cu=INR&tn=WhatsApp Wallet Recharge`
                        )}`}
                        alt="WhatsApp UPI QR Code"
                        style={{ width: 170, height: 170, objectFit: 'contain', display: 'block' }}
                      />
                    ) : (
                      <div style={{ width: 170, height: 170, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', border: '1.5px dashed #CBD5E1', borderRadius: 10, padding: 12 }}>
                        <span style={{ fontSize: 24, marginBottom: 4 }}>⚠️</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textAlign: 'center' }}>Official UPI QR Not Uploaded Yet</span>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#047857', marginTop: 6, fontWeight: 600 }}>
                    Scan with PhonePe / GPay / Paytm
                  </div>
                </div>

                {/* Form */}
                <div>
                  <div style={{ marginBottom: 14 }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>Super Admin UPI ID:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <code style={{ fontSize: 15, fontWeight: 800, color: '#065f46', background: '#ecfdf5', padding: '4px 10px', borderRadius: 6 }}>
                        {upi?.upiId || 'Not Configured (Contact Super Admin)'}
                      </code>
                      <button type="button" onClick={copyUpiId} className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }}>
                        {copiedUpi ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {upiDeepLink && (
                    <a href={upiDeepLink} className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 12.5, marginBottom: 16, color: '#059669', borderColor: '#a7f3d0' }}>
                      📲 Open in UPI App (Mobile)
                    </a>
                  )}

                  <form onSubmit={submitWhatsAppRecharge} style={{ marginTop: 12 }}>
                    <div className="field">
                      <label style={{ fontWeight: 700 }}>12-Digit UPI Reference Number (UTR) *</label>
                      <input
                        type="text"
                        required
                        maxLength={12}
                        placeholder="e.g. 423589123456"
                        value={waReference}
                        onChange={(e) => setWaReference(e.target.value.replace(/[^0-9]/g, ''))}
                        style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15 }}
                      />
                      <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4, display: 'block' }}>
                        Paste the 12-digit transaction ID from your PhonePe/GPay receipt for quick approval.
                      </span>
                    </div>

                    <div className="field" style={{ marginTop: 10 }}>
                      <label>Optional Note</label>
                      <input
                        type="text"
                        placeholder="e.g. WhatsApp pack recharge for Sunday NEET test"
                        value={waNote}
                        onChange={(e) => setWaNote(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
                      <button
                        type="submit"
                        disabled={waBusy}
                        className="btn btn-primary"
                        style={{ background: '#059669', borderColor: '#059669', padding: '10px 22px', fontSize: 14, fontWeight: 700 }}
                      >
                        {waBusy ? 'Submitting…' : `Submit WhatsApp Recharge Request (₹${numWaAmount.toLocaleString('en-IN')})`}
                      </button>

                      {/* Instant Testing / Direct Top-up button */}
                      <button
                        type="button"
                        onClick={handleInstantWaCredit}
                        disabled={waBusy}
                        className="btn btn-ghost"
                        style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, color: '#059669', borderColor: '#a7f3d0' }}
                        title="Direct instant credit for testing"
                      >
                        ⚡ Instant Credit
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* 3. WHATSAPP LEDGER & RECENT DISPATCHES */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#065f46' }}>
                Recent WhatsApp Activity &amp; Messages ({whatsAppData?.recentLogs?.length || 0})
              </h3>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Transparent message-level accounting</span>
            </div>

            {(!whatsAppData?.recentLogs || whatsAppData.recentLogs.length === 0) ? (
              <div className="card empty-state" style={{ padding: '36px 20px', textAlign: 'center', borderRadius: 14 }}>
                <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14 }}>
                  No WhatsApp messages sent yet. Scorecards and exam hall tickets will show here in real time.
                </p>
              </div>
            ) : (
              <div className="table-wrap" style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)' }}>
                <table>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      <th>Date</th>
                      <th>Student / Recipient</th>
                      <th>Exam / Notice</th>
                      <th>Delivery Status</th>
                      <th>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whatsAppData.recentLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="mono" style={{ fontSize: 12.5 }}>
                          {new Date(log.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}{' '}
                          {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: NAVY }}>{log.result?.studentName || 'Student / Parent'}</div>
                          <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--ink-soft)' }}>
                            {log.recipientPhoneMasked}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
                            {log.result?.examName || 'Exam Scorecard / Notice'}
                          </span>
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: log.status === 'DELIVERED' ? '#dcfce7' : log.status === 'FAILED' ? '#fee2e2' : '#e0f2fe',
                              color: log.status === 'DELIVERED' ? '#15803d' : log.status === 'FAILED' ? '#b91c1c' : '#0369a1',
                              fontWeight: 700,
                              fontSize: 11,
                            }}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: '#64748b', fontSize: 12 }}>
                          {log.status === 'FAILED' ? '₹0.00 (Refunded)' : '₹0.30'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
