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
  const initialPlan = searchParams.get('plan') || '';

  const [upi, setUpi] = useState(null);
  const [requests, setRequests] = useState([]);
  const [institute, setInstitute] = useState(null);
  
  // Amount selection state
  const [amount, setAmount] = useState(initialAmount);
  const [isCustom, setIsCustom] = useState(!BUNDLES.some(b => String(b.amount) === String(initialAmount)));
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [paymentTab, setPaymentTab] = useState('gateway'); // 'gateway' | 'upi'
  
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  function load() {
    Promise.all([
      api.upiInfo(),
      api.myRecharges(),
      api.myInstitute().catch(() => null)
    ])
      .then(([u, r, inst]) => {
        setUpi(u);
        setRequests(r);
        if (inst) setInstitute(inst);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // Load Razorpay script dynamically
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

  // Update selection if query param changes
  useEffect(() => {
    const qAmount = searchParams.get('amount');
    if (qAmount) {
      setAmount(qAmount);
      setIsCustom(!BUNDLES.some(b => String(b.amount) === String(qAmount)));
    }
  }, [searchParams]);

  const numAmount = parseInt(amount) || 0;
  const creditDetails = calculateCredits(numAmount);

  function handleSelectBundle(bundle) {
    setAmount(String(bundle.amount));
    setIsCustom(false);
  }

  function handleCustomAmountChange(val) {
    const clean = val.replace(/[^0-9]/g, '');
    setAmount(clean);
    setIsCustom(true);
  }

  function copyUpiId() {
    if (upi?.upiId) {
      navigator.clipboard.writeText(upi.upiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2500);
    }
  }

  async function submitManual() {
    const amt = Number(amount);
    if (!Number.isInteger(amt) || amt <= 0) return setError('Enter a valid amount in rupees.');
    if (!reference.trim()) return setError('Enter the UPI reference / UTR number from your payment app.');
    setBusy(true); setError(null); setMessage(null);
    try {
      const res = await api.submitRecharge({
        amountRupees: amt,
        upiReference: reference.trim(),
        note: note.trim() || undefined
      });
      setMessage(`Recharge request for ₹${amt.toLocaleString('en-IN')} submitted! You will receive ${res.request?.creditsAsked || creditDetails.total} credits once admin confirms the transfer.`);
      setReference(''); setNote('');
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRazorpay() {
    const amt = Number(amount);
    if (!Number.isInteger(amt) || amt <= 0) return setError('Enter a valid amount in rupees.');
    setBusy(true); setError(null); setMessage(null);
    try {
      const order = await api.createRazorpayOrder(amt);
      
      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: 'QuestionStudio',
        description: `Buy ${order.creditsBought || creditDetails.total} Credits (₹${amt.toLocaleString('en-IN')})`,
        order_id: order.orderId,
        handler: async function (response) {
          try {
            setBusy(true);
            const res = await api.verifyRazorpayOrder(response);
            setMessage(`Payment confirmed! Successfully credited ${res.creditsAdded} credits to your institute.`);
            load();
            if (loadCurrentUser) loadCurrentUser();
          } catch (err) {
            setError(err.message || 'Payment verification failed.');
          } finally {
            setBusy(false);
          }
        },
        prefill: {
          name: institute?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: NAVY
        }
      };
      
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setError(response.error?.description || 'Payment was unsuccessful.');
      });
      rzp.open();
    } catch (e) {
      if (e.message && e.message.includes('not configured')) {
        setError('Razorpay online gateway is currently being configured on this server. Please use the direct UPI option below for immediate top-up.');
        setPaymentTab('upi');
      } else {
        setError(e.message);
      }
    } finally {
      setBusy(false);
    }
  }

  function statusBadge(status) {
    if (status === 'PENDING') return <span className="badge badge-neutral" style={{ background: '#FEF3C7', color: '#92400E' }}>Pending review</span>;
    if (status === 'APPROVED') return <span className="badge badge-success" style={{ background: '#DCFCE7', color: '#166534' }}>Approved & Credited</span>;
    return <span className="badge badge-danger" style={{ background: '#FEE2E2', color: '#991B1B' }}>Rejected</span>;
  }

  if (loading) return <div className="skeleton" style={{ height: 360, borderRadius: 16 }} />;

  const imgBase = api.imageBase();
  const currentBalance = institute?.creditBalance ?? user?.creditBalance ?? 0;

  // Dynamic UPI URI prefilling the amount & payee
  const dynamicUpiUri = upi?.upiId
    ? `upi://pay?pa=${encodeURIComponent(upi.upiId)}&pn=${encodeURIComponent(upi.payeeName || 'QuestionStudio')}&am=${numAmount > 0 ? numAmount : 5000}&cu=INR&tn=${encodeURIComponent('QuestionStudio Credits Recharge')}`
    : null;

  return (
    <div style={{ maxWidth: 1040, margin: '0 auto', padding: '0 8px' }}>
      
      {/* HEADER & CURRENT BALANCE BAR */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24,
        paddingBottom: 18,
        borderBottom: '1px solid var(--line)'
      }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--premium-blue)', margin: 0, fontWeight: 800, fontSize: 12 }}>
            CREDITS &amp; RECHARGE
          </p>
          <h1 className="page-title" style={{ margin: '4px 0 2px', fontSize: 28, fontWeight: 800, color: NAVY }}>
            Recharge Credits
          </h1>
          <p className="page-sub" style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-soft)' }}>
            1 Credit = 1 Exam Question. Zero subscriptions, lifetime credit validity.
          </p>
        </div>

        {/* Live Institute Balance Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: 'linear-gradient(135deg, #07154A 0%, #0F1E68 100%)',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: 14,
          boxShadow: '0 4px 14px rgba(7, 21, 74, 0.15)'
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#93C5FD', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Current Balance
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#F6C84C', lineHeight: 1.1 }}>
              {currentBalance.toLocaleString('en-IN')} <span style={{ fontSize: 14, fontWeight: 600, color: '#ffffff' }}>Credits</span>
            </div>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(246, 200, 76, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ⚡
          </div>
        </div>
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

      {/* STEP 1: SELECT BUNDLE OR AMOUNT */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY, margin: 0 }}>
            1. Select Recharge Bundle
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
                  boxShadow: isSelected ? '0 4px 16px rgba(49, 87, 232, 0.12)' : 'none'
                }}
              >
                {b.badge && (
                  <div style={{
                    position: 'absolute',
                    top: -10,
                    right: 14,
                    background: b.id === 'growth' ? '#10B981' : '#F59E0B',
                    color: '#ffffff',
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 999,
                    textTransform: 'uppercase'
                  }}>
                    {b.badge}
                  </div>
                )}
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)' }}>{b.name}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: '4px 0 2px' }}>
                  ₹{b.amount.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: 13, color: '#16A34A', fontWeight: 700 }}>
                  {b.credits.toLocaleString('en-IN')} Credits
                  {b.bonus > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: '#059669', marginLeft: 4 }}> (+{b.bonus.toLocaleString()} Free)</span>}
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
              transition: 'all 0.15s ease'
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
                  onClick={(e) => { e.stopPropagation(); setIsCustom(true); }}
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    width: '100%',
                    padding: '4px 8px',
                    borderRadius: 8,
                    border: '1px solid var(--line)'
                  }}
                />
              </div>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 8 }}>
              {numAmount >= 20000 ? '🎁 25% Bonus Applied' : numAmount >= 10000 ? '🎁 15% Bonus Applied' : 'Standard 1:1 Rate'}
            </div>
          </div>
        </div>
      </div>

      {/* STEP 2: SUMMARY & ORDER BREAKDOWN BANNER */}
      <div style={{
        background: '#FFFFFF',
        border: '1.5px solid #E2E8F0',
        borderRadius: 16,
        padding: '18px 24px',
        marginBottom: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontWeight: 600, textTransform: 'uppercase' }}>Amount to Pay</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: NAVY }}>
              ₹{numAmount > 0 ? numAmount.toLocaleString('en-IN') : '0'}
            </div>
          </div>
          <div style={{ fontSize: 20, color: '#94A3B8' }}>→</div>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontWeight: 600, textTransform: 'uppercase' }}>Credits Credited</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 8 }}>
              {creditDetails.total.toLocaleString('en-IN')} Cr
              {creditDetails.bonus > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, background: '#DCFCE7', color: '#15803D', padding: '3px 8px', borderRadius: 999 }}>
                  +{creditDetails.bonus.toLocaleString('en-IN')} FREE
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontWeight: 600 }}>Effective Cost</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>
            ₹{creditDetails.rate} / question
          </div>
        </div>
      </div>

      {/* STEP 3: PAYMENT METHOD */}
      <div style={{ marginBottom: 36 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 14 }}>
          2. Choose Payment Method
        </h2>

        {/* Tab switchers */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <button
            type="button"
            onClick={() => setPaymentTab('gateway')}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: 12,
              border: paymentTab === 'gateway' ? '2px solid #3157E8' : '1px solid var(--line)',
              background: paymentTab === 'gateway' ? '#EFF6FF' : '#FFFFFF',
              color: paymentTab === 'gateway' ? '#1D4ED8' : 'var(--ink)',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.15s ease'
            }}
          >
            <span>⚡</span> Instant Online Recharge (Cards, UPI, NetBanking)
          </button>
          <button
            type="button"
            onClick={() => setPaymentTab('upi')}
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: 12,
              border: paymentTab === 'upi' ? '2px solid #3157E8' : '1px solid var(--line)',
              background: paymentTab === 'upi' ? '#EFF6FF' : '#FFFFFF',
              color: paymentTab === 'upi' ? '#1D4ED8' : 'var(--ink)',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.15s ease'
            }}
          >
            <span>📱</span> Direct UPI &amp; Bank Transfer (Zero Transaction Fee)
          </button>
        </div>

        {/* METHOD A: RAZORPAY GATEWAY */}
        {paymentTab === 'gateway' && (
          <div className="card card-pad" style={{ borderRadius: 16, border: '1.5px solid #DBEAFE', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: 18, color: NAVY }}>
                  Instant Gateway Checkout
                </h3>
                <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-soft)' }}>
                  Automated instant top-up via Razorpay. Supports Google Pay, PhonePe, Paytm, All Major Debit/Credit Cards &amp; NetBanking.
                </p>
              </div>
              <div style={{
                background: upi?.razorpayConfigured ? '#DCFCE7' : '#FEF3C7',
                color: upi?.razorpayConfigured ? '#15803D' : '#B45309',
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700
              }}>
                {upi?.razorpayConfigured ? '● Gateway Active' : '● Setup In Progress'}
              </div>
            </div>

            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 20
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Total Payable:</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: NAVY }}>₹{numAmount.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Credits to be added immediately:</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#16A34A' }}>{creditDetails.total.toLocaleString('en-IN')} Credits</span>
              </div>
            </div>

            <button
              className="btn btn-primary"
              disabled={busy || numAmount < 100}
              onClick={handleRazorpay}
              style={{
                width: '100%',
                padding: '16px',
                fontSize: 16,
                fontWeight: 700,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #07154A 0%, #0F1E68 100%)',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 4px 14px rgba(7, 21, 74, 0.25)',
                cursor: busy ? 'wait' : 'pointer'
              }}
            >
              {busy ? 'Processing Gateway…' : `Pay ₹${numAmount.toLocaleString('en-IN')} with Razorpay →`}
            </button>
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-soft)', marginTop: 10, marginBottom: 0 }}>
              🔒 256-bit encrypted bank grade secure payment. Credits reflect instantly upon completion.
            </p>
          </div>
        )}

        {/* METHOD B: DIRECT UPI / QR TRANSFER */}
        {paymentTab === 'upi' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* Step 1: Scan & Pay */}
            <div className="card card-pad" style={{ borderRadius: 16, background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#EFF6FF', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>1</div>
                <h3 style={{ margin: 0, fontSize: 16, color: NAVY }}>Scan QR or Pay to UPI ID</h3>
              </div>

              {upi?.configured ? (
                <>
                  <div style={{ textAlign: 'center', margin: '14px 0' }}>
                    {upi.qrUrl ? (
                      <img
                        src={`${imgBase}${upi.qrUrl}`}
                        alt="UPI QR Code"
                        style={{ maxWidth: 220, width: '100%', border: '1px solid var(--line)', borderRadius: 12, padding: 8, background: '#fff' }}
                      />
                    ) : dynamicUpiUri ? (
                      <div style={{ display: 'inline-block', padding: 8, background: '#fff', border: '1px solid var(--line)', borderRadius: 12 }}>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(dynamicUpiUri)}`}
                          alt="Dynamic UPI QR Code"
                          style={{ display: 'block', maxWidth: 200, width: '100%' }}
                        />
                      </div>
                    ) : null}
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 6 }}>
                      Scan with Google Pay, PhonePe, Paytm, or BHIM
                    </div>
                  </div>

                  {upi.upiId && (
                    <div style={{
                      background: '#F8FAFC',
                      border: '1.5px solid #E2E8F0',
                      borderRadius: 12,
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10
                    }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600 }}>UPI ID</div>
                        <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: NAVY }}>{upi.upiId}</div>
                        {upi.payeeName && <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Payee: {upi.payeeName}</div>}
                      </div>
                      <button
                        type="button"
                        onClick={copyUpiId}
                        style={{
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          borderRadius: 8,
                          border: '1px solid var(--line)',
                          background: copiedUpi ? '#DCFCE7' : '#FFFFFF',
                          color: copiedUpi ? '#15803D' : NAVY,
                          cursor: 'pointer'
                        }}
                      >
                        {copiedUpi ? '✓ Copied' : 'Copy ID'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ color: 'var(--ink-soft)', fontSize: 13 }}>
                  Payment QR is being updated by administrator.
                </p>
              )}
            </div>

            {/* Step 2: Submit UTR Reference */}
            <div className="card card-pad" style={{ borderRadius: 16, background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#EFF6FF', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>2</div>
                <h3 style={{ margin: 0, fontSize: 16, color: NAVY }}>Submit Payment Reference</h3>
              </div>

              <div className="field">
                <label style={{ fontWeight: 600, fontSize: 13 }}>Amount Paid (₹)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 10000"
                  style={{ borderRadius: 10, padding: '10px 14px' }}
                />
              </div>

              <div className="field">
                <label style={{ fontWeight: 600, fontSize: 13 }}>UPI Reference / UTR Number (12 Digits)</label>
                <input
                  type="text"
                  placeholder="e.g. 423910384912"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  style={{ borderRadius: 10, padding: '10px 14px' }}
                />
                <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4, display: 'block' }}>
                  Found in your payment app under "Transaction Details" or "UPI Ref ID".
                </span>
              </div>

              <div className="field">
                <label style={{ fontWeight: 600, fontSize: 13 }}>Optional Note</label>
                <input
                  type="text"
                  placeholder="e.g. Paid from HDFC Bank"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{ borderRadius: 10, padding: '10px 14px' }}
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={submitManual}
                disabled={busy || !upi?.configured || !reference.trim() || numAmount <= 0}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: 15,
                  fontWeight: 700,
                  borderRadius: 10,
                  background: NAVY,
                  color: '#ffffff',
                  marginTop: 6
                }}
              >
                {busy ? 'Submitting…' : `Submit Recharge Request (₹${numAmount.toLocaleString('en-IN')})`}
              </button>
              <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 8, marginBottom: 0, textAlign: 'center' }}>
                Credits will be added immediately upon administrative verification (usually 10-20 min).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* STEP 4: RECHARGE HISTORY */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: NAVY }}>
            Your Recharge Requests &amp; History
          </h3>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            Showing last {requests.length} requests
          </span>
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
                    <td style={{ fontWeight: 700 }}>
                      ₹{r.amountRupees.toLocaleString('en-IN')}
                    </td>
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
  );
}