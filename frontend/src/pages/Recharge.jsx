import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const NAVY = '#1e3a8a';

export default function Recharge() {
  const [upi, setUpi] = useState(null);
  const [requests, setRequests] = useState([]);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  
  const [rzpAmount, setRzpAmount] = useState('');
  
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  function load() {
    Promise.all([api.upiInfo(), api.myRecharges()])
      .then(([u, r]) => { setUpi(u); setRequests(r); })
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
      document.body.removeChild(script);
    };
  }, []);

  async function submit() {
    const amt = Number(amount);
    if (!Number.isInteger(amt) || amt <= 0) return setError('Enter a valid amount in rupees.');
    if (!reference.trim()) return setError('Enter the UPI reference number from your payment app.');
    setBusy(true); setError(null); setMessage(null);
    try {
      await api.submitRecharge({ amountRupees: amt, upiReference: reference.trim(), note: note.trim() || undefined });
      setMessage('Request submitted. Your credits will be added once the admin verifies your payment.');
      setAmount(''); setReference(''); setNote('');
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRazorpay() {
    const amt = Number(rzpAmount);
    if (!Number.isInteger(amt) || amt <= 0) return setError('Enter a valid amount in rupees.');
    setBusy(true); setError(null); setMessage(null);
    try {
      const order = await api.createRazorpayOrder(amt);
      
      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: 'Credits Recharge',
        description: `Buy ${amt} Credits`,
        order_id: order.orderId,
        handler: async function (response) {
          try {
            setBusy(true);
            const res = await api.verifyRazorpayOrder(response);
            setMessage(`Successfully recharged ${res.creditsAdded} credits!`);
            setRzpAmount('');
            load();
          } catch (err) {
            setError(err.message || 'Payment verification failed.');
          } finally {
            setBusy(false);
          }
        },
        theme: {
          color: NAVY
        }
      };
      
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setError(response.error.description);
      });
      rzp.open();
    } catch (e) {
      if (e.message.includes('not configured')) {
        setError('Razorpay is not yet configured by the administrator. Please use the manual UPI option.');
      } else {
        setError(e.message);
      }
    } finally {
      setBusy(false);
    }
  }

  function statusBadge(status) {
    if (status === 'PENDING') return <span className="badge badge-neutral">Pending review</span>;
    if (status === 'APPROVED') return <span className="badge badge-success">Approved</span>;
    return <span className="badge badge-danger">Rejected</span>;
  }

  if (loading) return <div className="skeleton" style={{ height: 300 }} />;

  const imgBase = api.imageBase();

  return (
    <div>
      <div className="page-header">
        <p className="eyebrow" style={{ color: NAVY }}>Credits</p>
        <h1 className="page-title">Recharge Credits</h1>
        <p className="page-sub">1 credit = ₹1. Choose instant automated recharge or manual UPI.</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {/* Instant Recharge */}
        <div className="card card-pad" style={{ border: '2px solid var(--accent)' }}>
          <h3 style={{ marginBottom: 4, color: 'var(--accent)' }}>⚡ Instant Recharge (Recommended)</h3>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12 }}>Pay securely via Razorpay (Cards, UPI, Netbanking). Credits are added to your account instantly.</p>
          <div className="field">
            <label>Amount (₹)</label>
            <input type="text" inputMode="numeric" placeholder="e.g. 5000" value={rzpAmount}
              onChange={(e) => setRzpAmount(e.target.value.replace(/[^0-9]/g, ''))} />
          </div>
          <button className="btn btn-primary" disabled={busy} onClick={handleRazorpay} style={{ width: '100%', marginTop: 8 }}>
            {busy ? 'Processing...' : 'Pay with Razorpay'}
          </button>
        </div>

        {/* Step 1: Pay */}
        <div className="card card-pad">
          <h3 style={{ marginBottom: 12 }}>Manual: Pay by UPI</h3>
          {upi?.configured ? (
            <>
              {upi.qrUrl && (
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <img src={`${imgBase}${upi.qrUrl}`} alt="UPI QR code" style={{ maxWidth: 220, width: '100%', border: '1px solid var(--line)', borderRadius: 8, padding: 8, background: '#fff' }} />
                </div>
              )}
              {upi.upiId && (
                <div style={{ textAlign: 'center', fontSize: 14 }}>
                  <div style={{ color: 'var(--ink-soft)', fontSize: 12.5 }}>UPI ID</div>
                  <div className="mono" style={{ fontWeight: 600, fontSize: 15 }}>{upi.upiId}</div>
                  {upi.payeeName && <div style={{ color: 'var(--ink-soft)', fontSize: 12.5, marginTop: 2 }}>{upi.payeeName}</div>}
                </div>
              )}
              <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 14, marginBottom: 0 }}>
                Scan, pay, then submit the reference number below.
              </p>
            </>
          ) : (
            <p style={{ color: 'var(--ink-soft)', fontSize: 13 }}>
              The payment QR hasn't been set up yet.
            </p>
          )}
        </div>

        {/* Step 2: Submit */}
        <div className="card card-pad">
          <h3 style={{ marginBottom: 12 }}>Manual: Submit reference</h3>
          <div className="field">
            <label>Amount paid (₹)</label>
            <input type="text" inputMode="numeric" placeholder="e.g. 5000" value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} />
          </div>
          <div className="field">
            <label>UPI Reference / UTR No.</label>
            <input type="text" placeholder="e.g. 314510..." value={reference}
              onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="field">
            <label>Optional note</label>
            <input type="text" placeholder="e.g. From ABC Academy" value={note}
              onChange={(e) => setNote(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={submit} disabled={busy || !upi?.configured}
            style={{ background: NAVY, color: '#fff' }}>
            {busy ? 'Submitting…' : 'Submit recharge request'}
          </button>
          <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 10, marginBottom: 0 }}>
            Credits are added after we verify the payment.
          </p>
        </div>
      </div>

      <h3 style={{ margin: '28px 0 12px', fontSize: 16 }}>Your recharge requests</h3>
      {requests.length === 0 ? (
        <div className="card empty-state"><p>No recharge requests yet.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Amount</th><th>Reference</th><th>Status</th></tr></thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id}>
                  <td className="mono" style={{ fontSize: 12 }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td>₹{r.amountRupees} <span style={{ color: 'var(--ink-soft)', fontSize: 12 }}>({r.creditsAsked} credits)</span></td>
                  <td className="mono" style={{ fontSize: 12 }}>{r.upiReference}</td>
                  <td>{statusBadge(r.status)}{r.status === 'REJECTED' && r.reviewNote ? <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{r.reviewNote}</div> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
