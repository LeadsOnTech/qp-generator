import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';

const NAVY = '#1e3a8a';

export default function RechargeApprovals() {
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [upi, setUpi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [upiId, setUpiId] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [savingUpi, setSavingUpi] = useState(false);
  const [revenue, setRevenue] = useState(null);
  const qrRef = useRef(null);

  function load() {
    Promise.all([api.pendingRecharges(), api.allRecharges(), api.upiInfo(), api.getRevenue()])
      .then(([p, h, u, rev]) => {
        setPending(p); setHistory(h); setUpi(u); setRevenue(rev);
        setUpiId(u.upiId || ''); setPayeeName(u.payeeName || '');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function approve(id) {
    setBusyId(id); setError(null); setMessage(null);
    try {
      const res = await api.approveRecharge(id);
      setMessage(`Approved — ${res.creditsAdded} credits added (new balance ${res.newBalance}).`);
      load();
    } catch (e) { setError(e.message); } finally { setBusyId(null); }
  }

  async function reject(id) {
    const reason = window.prompt('Reason for rejecting (optional, shown to the institute):') || '';
    setBusyId(id); setError(null); setMessage(null);
    try {
      await api.rejectRecharge(id, reason);
      setMessage('Request rejected. No credits were added.');
      load();
    } catch (e) { setError(e.message); } finally { setBusyId(null); }
  }

  async function saveUpi() {
    setSavingUpi(true); setError(null); setMessage(null);
    try {
      await api.setUpiInfo({ upiId: upiId.trim(), payeeName: payeeName.trim() });
      if (qrRef.current?.files?.[0]) await api.uploadUpiQr(qrRef.current.files[0]);
      setMessage('Payment details saved.');
      load();
    } catch (e) { setError(e.message); } finally { setSavingUpi(false); }
  }

  if (loading) return <div className="skeleton" style={{ height: 300 }} />;
  const imgBase = api.imageBase();

  return (
    <div>
      <div className="page-header">
        <p className="eyebrow" style={{ color: NAVY }}>Credits</p>
        <h1 className="page-title">Recharge Approvals</h1>
        <p className="page-sub">Verify UPI payments and approve credit top-ups. Credits are only added when you approve.</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      {revenue && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
          <div className="card card-pad" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600, textTransform: 'uppercase' }}>Total Revenue</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: NAVY, marginTop: 4 }}>₹{revenue.total.toLocaleString('en-IN')}</div>
          </div>
          <div className="card card-pad" style={{ background: '#fff', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600, textTransform: 'uppercase' }}>Razorpay (Automated)</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981', marginTop: 4 }}>₹{revenue.razorpayTotal.toLocaleString('en-IN')}</div>
          </div>
          <div className="card card-pad" style={{ background: '#fff', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600, textTransform: 'uppercase' }}>UPI (Manual Approvals)</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6', marginTop: 4 }}>₹{revenue.manualTotal.toLocaleString('en-IN')}</div>
          </div>
        </div>
      )}

      {/* Pending */}
      <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Pending requests ({pending.length})</h3>
      {pending.length === 0 ? (
        <div className="card empty-state"><p>No pending requests right now.</p></div>
      ) : (
        <div className="table-wrap" style={{ marginBottom: 28 }}>
          <table>
            <thead><tr><th>Institute</th><th>Amount</th><th>Reference</th><th>Balance</th><th>Requested</th><th></th></tr></thead>
            <tbody>
              {pending.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.institute}{r.note ? <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 400 }}>{r.note}</div> : null}</td>
                  <td>₹{r.amountRupees} <span style={{ color: 'var(--ink-soft)', fontSize: 12 }}>({r.creditsAsked} cr)</span></td>
                  <td className="mono" style={{ fontSize: 12.5 }}>{r.upiReference}</td>
                  <td>{r.currentBalance}</td>
                  <td className="mono" style={{ fontSize: 11.5 }}>{new Date(r.createdAt).toLocaleString()}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: 12.5, marginRight: 6 }} disabled={busyId === r.id} onClick={() => approve(r.id)}>
                      {busyId === r.id ? '…' : 'Approve'}
                    </button>
                    <button className="btn-danger-ghost" style={{ padding: '5px 12px', fontSize: 12.5 }} disabled={busyId === r.id} onClick={() => reject(r.id)}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* UPI setup */}
      <div className="card card-pad" style={{ marginBottom: 28, borderLeft: `3px solid ${NAVY}` }}>
        <h3 style={{ marginBottom: 4 }}>Your UPI payment details</h3>
        <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 14 }}>Shown to institutes on their recharge page. Upload your QR and/or enter your UPI ID.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          <div className="field" style={{ margin: 0 }}>
            <label>UPI ID</label>
            <input type="text" placeholder="yourname@bank" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Payee name (optional)</label>
            <input type="text" placeholder="e.g. Andhra Inspire Academy" value={payeeName} onChange={(e) => setPayeeName(e.target.value)} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>QR image (PNG/JPG)</label>
            <input type="file" accept="image/png,image/jpeg,image/webp" ref={qrRef} />
          </div>
        </div>
        {upi?.qrUrl && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 4 }}>Current QR:</div>
            <img src={`${imgBase}${upi.qrUrl}`} alt="Current UPI QR" style={{ maxWidth: 120, border: '1px solid var(--line)', borderRadius: 6, padding: 4, background: '#fff' }} />
          </div>
        )}
        <button className="btn btn-primary" style={{ marginTop: 14, background: NAVY, color: '#fff' }} onClick={saveUpi} disabled={savingUpi}>
          {savingUpi ? 'Saving…' : 'Save payment details'}
        </button>
      </div>

      {/* History */}
      <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Recent history</h3>
      {history.length === 0 ? (
        <div className="card empty-state"><p>No recharge history yet.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Institute</th><th>Amount</th><th>Reference</th><th>Status</th><th>Reviewed</th></tr></thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.id}>
                  <td>{r.institute}</td>
                  <td>₹{r.amountRupees}</td>
                  <td className="mono" style={{ fontSize: 12 }}>{r.upiReference}</td>
                  <td>
                    {r.status === 'APPROVED' ? <span className="badge badge-success">Approved</span>
                      : r.status === 'REJECTED' ? <span className="badge badge-danger">Rejected</span>
                      : <span className="badge badge-neutral">Pending</span>}
                  </td>
                  <td className="mono" style={{ fontSize: 11 }}>{r.reviewedByEmail || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
