import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const NAVY = '#07154A';

export default function RechargeApprovals() {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'colleges' | 'paper_usage' | 'history' | 'settings'
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [adminOverview, setAdminOverview] = useState(null);
  const [upi, setUpi] = useState(null);
  const [revenue, setRevenue] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // Quick Credit Adjustment Modal State
  const [adjustModal, setAdjustModal] = useState(null); // { type: 'credits' | 'whatsapp', institute }
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustBusy, setAdjustBusy] = useState(false);

  // Settings Form State
  const [upiId, setUpiId] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [rzpKeyId, setRzpKeyId] = useState('');
  const [rzpKeySecret, setRzpKeySecret] = useState('');
  const [savingUpi, setSavingUpi] = useState(false);
  const qrRef = useRef(null);

  function load() {
    Promise.all([
      api.pendingRecharges(),
      api.allRecharges(),
      api.upiInfo(),
      api.getRevenue(),
      api.getRechargeAdminOverview().catch(() => null),
    ])
      .then(([p, h, u, rev, overview]) => {
        setPending(p || []);
        setHistory(h || []);
        setUpi(u);
        setRevenue(rev);
        if (overview) setAdminOverview(overview);

        setUpiId(u?.upiId || '');
        setPayeeName(u?.payeeName || '');
        if (u?.razorpayKeyId) setRzpKeyId(u.razorpayKeyId);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function approve(id) {
    setBusyId(id);
    setError(null);
    setMessage(null);
    try {
      const res = await api.approveRecharge(id);
      if (res.isWhatsApp) {
        setMessage(`Approved WhatsApp Wallet top-up — ₹${res.creditsAdded} added (New WhatsApp balance: ₹${res.newBalance.toFixed(2)}).`);
      } else {
        setMessage(`Approved Paper Credits — ${res.creditsAdded} credits added (New balance: ${res.newBalance} Cr).`);
      }
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id) {
    const reason = window.prompt('Reason for rejecting (optional, shown to the institute):') || '';
    setBusyId(id);
    setError(null);
    setMessage(null);
    try {
      await api.rejectRecharge(id, reason);
      setMessage('Request rejected. No credits were added.');
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleQuickAdjustSubmit() {
    if (!adjustModal) return;
    const { type, institute } = adjustModal;
    const amt = parseFloat(adjustAmount);
    if (!amt || isNaN(amt)) return alert('Enter a valid amount.');

    setAdjustBusy(true);
    setError(null);
    try {
      if (type === 'credits') {
        const intAmt = Math.round(amt);
        if (!adjustReason.trim()) return alert('Please enter a short reason (e.g. Complimentary Pack or Bank Transfer).');
        await api.addCredits(institute.id, intAmt, adjustReason.trim());
        setMessage(`Successfully ${intAmt > 0 ? 'added' : 'deducted'} ${Math.abs(intAmt)} paper credits for ${institute.name}.`);
      } else {
        await api.rechargeWhatsAppWallet(amt, institute.id);
        setMessage(`Successfully added ₹${amt.toFixed(2)} to WhatsApp wallet for ${institute.name}.`);
      }
      setAdjustModal(null);
      setAdjustAmount('');
      setAdjustReason('');
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setAdjustBusy(false);
    }
  }

  async function saveUpi() {
    setSavingUpi(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        upiId: upiId.trim(),
        payeeName: payeeName.trim(),
      };
      if (rzpKeyId && !rzpKeyId.includes('...')) payload.razorpayKeyId = rzpKeyId.trim();
      if (rzpKeySecret) payload.razorpayKeySecret = rzpKeySecret.trim();

      await api.setUpiInfo(payload);
      if (qrRef.current?.files?.[0]) await api.uploadUpiQr(qrRef.current.files[0]);
      setMessage('Super Admin payment details and gateway settings saved successfully.');
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingUpi(false);
    }
  }

  if (loading) return <div className="skeleton" style={{ height: 320 }} />;
  const imgBase = api.imageBase();

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 8px' }}>
      {/* HEADER COMMAND BAR */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div>
          <p className="eyebrow" style={{ color: 'var(--premium-blue)', margin: 0, fontWeight: 800, fontSize: 12 }}>
            SUPER ADMIN FINANCIAL COMMAND
          </p>
          <h1 className="page-title" style={{ margin: '4px 0 2px', fontSize: 28, fontWeight: 800, color: NAVY }}>
            Recharge Approvals &amp; Credit Audits
          </h1>
          <p className="page-sub" style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-soft)' }}>
            Verify college UPI payments, inspect live institutional balances, monitor question paper deductions, and track WhatsApp messaging wallets.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link
            to="/admin/subscriptions"
            style={{
              padding: '9px 18px',
              fontSize: 13.5,
              fontWeight: 800,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#0284c7',
              color: '#ffffff',
              borderRadius: 10,
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)',
            }}
          >
            🏷️ College Subscriptions
          </Link>
          <button
            type="button"
            onClick={load}
            className="btn btn-ghost"
            style={{ padding: '8px 14px', fontSize: 13, fontWeight: 700 }}
          >
            🔄 Refresh Data
          </button>
        </div>
      </div>

      {/* Prominent Direct Banner to Subscriptions */}
      <div
        style={{
          background: 'linear-gradient(135deg, #07154A 0%, #0369a1 100%)',
          color: '#ffffff',
          padding: '16px 22px',
          borderRadius: 14,
          marginBottom: 22,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
          boxShadow: '0 4px 16px rgba(7, 21, 74, 0.15)',
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🏷️</span> College Module Subscriptions &amp; Feature Licensing
          </div>
          <div style={{ fontSize: 13, color: '#e0f2fe', marginTop: 4 }}>
            Activate, renew, or suspend optional modules: OMR (₹999), CBT (₹1,999), Website (₹1,499), WhatsApp (₹499), and Complete Bundle (₹4,499).
          </div>
        </div>
        <Link
          to="/admin/subscriptions"
          style={{
            background: '#ffffff',
            color: '#07154A',
            padding: '9px 20px',
            borderRadius: 10,
            fontWeight: 800,
            fontSize: 13.5,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          }}
        >
          🏷️ Open College Subscriptions &rarr;
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
          TOP EXECUTIVE KPI RIBBON: 4 HIGH-VISIBILITY TILES
          ========================================================================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 24 }}>
        {/* Total Platform Revenue */}
        <div className="card card-pad" style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Platform Revenue
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: NAVY, marginTop: 4 }}>
            ₹{(revenue?.total || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 11.5, color: '#10B981', fontWeight: 600, marginTop: 2 }}>
            ₹{(revenue?.manualTotal || 0).toLocaleString('en-IN')} UPI • ₹{(revenue?.razorpayTotal || 0).toLocaleString('en-IN')} Gateway
          </div>
        </div>

        {/* Paper Credits Active */}
        <div className="card card-pad" style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Paper Credits Across Colleges
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#3157E8', marginTop: 4 }}>
            {(adminOverview?.totalPaperCredits || 0).toLocaleString('en-IN')}{' '}
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-soft)' }}>Credits</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>
            Held across {adminOverview?.institutes?.length || 0} onboarded colleges
          </div>
        </div>

        {/* WhatsApp Wallet Active */}
        <div className="card card-pad" style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            WhatsApp Wallet Balances
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#059669', marginTop: 4 }}>
            ₹{(adminOverview?.totalWhatsAppBalance || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 11.5, color: '#059669', fontWeight: 600, marginTop: 2 }}>
            ~{Math.floor((adminOverview?.totalWhatsAppBalance || 0) / 0.3).toLocaleString('en-IN')} messages available
          </div>
        </div>

        {/* Pending Requests Tile */}
        <div
          onClick={() => setActiveTab('pending')}
          className="card card-pad"
          style={{
            background: pending.length > 0 ? '#FEF3C7' : '#FFFFFF',
            border: pending.length > 0 ? '2px solid #F59E0B' : '1.5px solid #E2E8F0',
            borderRadius: 14,
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: 11, color: pending.length > 0 ? '#92400E' : 'var(--ink-soft)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Pending Verification
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: pending.length > 0 ? '#B45309' : NAVY, marginTop: 4 }}>
            {pending.length} <span style={{ fontSize: 14, fontWeight: 600 }}>Requests</span>
          </div>
          <div style={{ fontSize: 11.5, color: pending.length > 0 ? '#B45309' : 'var(--ink-soft)', fontWeight: 600, marginTop: 2 }}>
            {pending.length > 0 ? 'Action required: Click to verify' : 'All transactions reviewed'}
          </div>
        </div>
      </div>

      {/* =========================================================================
          AUDIT NAVIGATION TABS SWITCHER
          ========================================================================= */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 24,
          background: '#f1f5f9',
          padding: 6,
          borderRadius: 14,
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '8px 16px',
            borderRadius: 10,
            border: 'none',
            background: activeTab === 'pending' ? NAVY : 'transparent',
            color: activeTab === 'pending' ? '#ffffff' : '#475569',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>⏳</span> Pending Approvals ({pending.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('colleges')}
          style={{
            padding: '8px 16px',
            borderRadius: 10,
            border: 'none',
            background: activeTab === 'colleges' ? NAVY : 'transparent',
            color: activeTab === 'colleges' ? '#ffffff' : '#475569',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>🏛️</span> College Balances &amp; Wallets ({adminOverview?.institutes?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('paper_usage')}
          style={{
            padding: '8px 16px',
            borderRadius: 10,
            border: 'none',
            background: activeTab === 'paper_usage' ? NAVY : 'transparent',
            color: activeTab === 'paper_usage' ? '#ffffff' : '#475569',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>📑</span> Question Paper Deductions ({adminOverview?.recentPaperUsage?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          style={{
            padding: '8px 16px',
            borderRadius: 10,
            border: 'none',
            background: activeTab === 'history' ? NAVY : 'transparent',
            color: activeTab === 'history' ? '#ffffff' : '#475569',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>📋</span> All Recharge History ({history.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          style={{
            padding: '8px 16px',
            borderRadius: 10,
            border: 'none',
            background: activeTab === 'settings' ? NAVY : 'transparent',
            color: activeTab === 'settings' ? '#ffffff' : '#475569',
            fontWeight: 800,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>⚙️</span> Payment Gateway Settings
        </button>

        <Link
          to="/admin/subscriptions"
          style={{
            marginLeft: 'auto',
            padding: '8px 16px',
            borderRadius: 10,
            border: '1.5px solid #0284c7',
            background: '#f0f9ff',
            color: '#0369a1',
            fontWeight: 800,
            fontSize: 13,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>🏷️</span> College Subscriptions &amp; Modules &rarr;
        </Link>
      </div>

      {/* =========================================================================
          TAB 1: PENDING REQUESTS
          ========================================================================= */}
      {activeTab === 'pending' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: NAVY }}>
              Pending College Recharge Requests ({pending.length})
            </h3>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Verify the UTR number in your bank statement/PhonePe before clicking Approve
            </span>
          </div>

          {pending.length === 0 ? (
            <div className="card empty-state" style={{ padding: '40px 20px', textAlign: 'center', borderRadius: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <h4 style={{ margin: '0 0 4px', color: NAVY }}>All Recharge Requests Processed</h4>
              <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 13 }}>
                When a college scans your QR code and submits their 12-digit UTR, it will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="table-wrap" style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)' }}>
              <table>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    <th>College / Institute</th>
                    <th>Service &amp; Amount</th>
                    <th>12-Digit UTR Reference</th>
                    <th>Current Balances</th>
                    <th>Requested At</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((r) => {
                    const isWhatsApp = Boolean(r.note && r.note.toLowerCase().includes('whatsapp'));
                    return (
                      <tr key={r.id}>
                        <td>
                          <div style={{ fontWeight: 800, color: NAVY, fontSize: 14 }}>{r.institute}</div>
                          {r.note && (
                            <div style={{ fontSize: 11.5, color: isWhatsApp ? '#059669' : '#3157E8', fontWeight: 600, marginTop: 2 }}>
                              {r.note}
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: isWhatsApp ? '#DCFCE7' : '#EFF6FF',
                              color: isWhatsApp ? '#15803D' : '#1E40AF',
                              fontWeight: 800,
                              fontSize: 11,
                              marginBottom: 4,
                            }}
                          >
                            {isWhatsApp ? '💬 WhatsApp Wallet' : '⚡ Paper Generation Credits'}
                          </span>
                          <div style={{ fontSize: 15, fontWeight: 800, color: NAVY }}>
                            ₹{r.amountRupees.toLocaleString('en-IN')}{' '}
                            <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>
                              ({isWhatsApp ? `+₹${r.amountRupees}` : `${r.creditsAsked.toLocaleString('en-IN')} cr`})
                            </span>
                          </div>
                        </td>
                        <td>
                          <code
                            style={{
                              fontSize: 13,
                              fontWeight: 800,
                              color: '#07154A',
                              background: '#F1F5F9',
                              padding: '4px 8px',
                              borderRadius: 6,
                              cursor: 'pointer',
                            }}
                            title="Click to copy UTR"
                            onClick={() => {
                              navigator.clipboard.writeText(r.upiReference);
                              alert('Copied UTR: ' + r.upiReference);
                            }}
                          >
                            {r.upiReference} 📋
                          </code>
                        </td>
                        <td>
                          <div style={{ fontSize: 11.5, color: '#334155' }}>
                            Paper: <b>{r.currentBalance} Cr</b>
                          </div>
                          <div style={{ fontSize: 11.5, color: '#059669' }}>
                            WA: <b>₹{(r.whatsAppBalance ?? 0).toFixed(2)}</b>
                          </div>
                        </td>
                        <td className="mono" style={{ fontSize: 11.5 }}>
                          {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}{' '}
                          {new Date(r.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, marginRight: 6, background: '#059669', borderColor: '#059669' }}
                            disabled={busyId === r.id}
                            onClick={() => approve(r.id)}
                          >
                            {busyId === r.id ? '…' : isWhatsApp ? '✅ Approve WhatsApp ₹' : '✅ Approve Credits'}
                          </button>
                          <button
                            type="button"
                            className="btn-danger-ghost"
                            style={{ padding: '6px 12px', fontSize: 12 }}
                            disabled={busyId === r.id}
                            onClick={() => reject(r.id)}
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: COLLEGE BALANCES & WALLETS (ALL ONBOARDED INSTITUTES)
          ========================================================================= */}
      {activeTab === 'colleges' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: NAVY }}>
              College Accounts, Remaining Credits &amp; Live Balances ({adminOverview?.institutes?.length || 0})
            </h3>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
              Real-time balance breakdown per college with 1-click manual top-ups
            </span>
          </div>

          <div className="table-wrap" style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)' }}>
            <table>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  <th>College Name</th>
                  <th>Contact</th>
                  <th>Paper Credits Remaining</th>
                  <th>WhatsApp Wallet Remaining</th>
                  <th>Papers Created</th>
                  <th style={{ textAlign: 'right' }}>Admin Quick Top-Up</th>
                </tr>
              </thead>
              <tbody>
                {adminOverview?.institutes?.map((inst) => (
                  <tr key={inst.id}>
                    <td>
                      <div style={{ fontWeight: 800, color: NAVY, fontSize: 14 }}>{inst.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
                        {inst.isTrial ? (
                          <span className="badge badge-neutral" style={{ padding: '2px 6px', fontSize: 10 }}>Trial Account</span>
                        ) : (
                          <span className="badge badge-success" style={{ padding: '2px 6px', fontSize: 10 }}>Active Partner</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                        {inst.phone || '—'}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-gold" style={{ fontSize: 13, fontWeight: 800, padding: '4px 10px' }}>
                        {(inst.creditBalance || 0).toLocaleString('en-IN')} Credits
                      </span>
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: '#ECFDF5',
                          color: '#047857',
                          border: '1px solid #A7F3D0',
                          fontSize: 13,
                          fontWeight: 800,
                          padding: '4px 10px',
                        }}
                      >
                        ₹{(inst.whatsAppWalletBalance || 0).toFixed(2)}
                      </span>
                      <div style={{ fontSize: 10.5, color: '#059669', marginTop: 2 }}>
                        ~{Math.floor((inst.whatsAppWalletBalance || 0) / 0.3)} messages left
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>
                        {inst._count?.papers || 0} Papers
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setAdjustModal({ type: 'credits', institute: inst });
                          setAdjustAmount('5000');
                          setAdjustReason('Direct Admin Top-up');
                        }}
                        className="btn btn-ghost"
                        style={{ padding: '5px 10px', fontSize: 12, marginRight: 6, color: '#2563eb' }}
                      >
                        + Paper Credits
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAdjustModal({ type: 'whatsapp', institute: inst });
                          setAdjustAmount('500');
                          setAdjustReason('');
                        }}
                        className="btn btn-ghost"
                        style={{ padding: '5px 10px', fontSize: 12, color: '#059669', fontWeight: 700 }}
                      >
                        💬 + WA ₹
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: QUESTION PAPER GENERATION DEDUCTIONS (WHO PAID / WHO SPENT CREDITS)
          ========================================================================= */}
      {activeTab === 'paper_usage' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: NAVY }}>
                Question Paper Credit Deductions Audit ({adminOverview?.recentPaperUsage?.length || 0})
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--ink-soft)' }}>
                Shows which college generated which question paper, how many credits were deducted, and balance remaining.
              </p>
            </div>
          </div>

          {(!adminOverview?.recentPaperUsage || adminOverview.recentPaperUsage.length === 0) ? (
            <div className="card empty-state" style={{ padding: '36px 20px', textAlign: 'center', borderRadius: 14 }}>
              <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14 }}>No question paper generations logged yet.</p>
            </div>
          ) : (
            <div className="table-wrap" style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)' }}>
              <table>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    <th>Date &amp; Time</th>
                    <th>College Name</th>
                    <th>Generated Paper / Reason</th>
                    <th>Credits Deducted</th>
                    <th>Balance After</th>
                  </tr>
                </thead>
                <tbody>
                  {adminOverview.recentPaperUsage.map((tx) => (
                    <tr key={tx.id}>
                      <td className="mono" style={{ fontSize: 12 }}>
                        {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}{' '}
                        {new Date(tx.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <strong style={{ color: NAVY }}>{tx.institute?.name || 'College'}</strong>
                      </td>
                      <td>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{tx.reason}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, color: '#DC2626', fontSize: 13.5 }}>
                          {tx.amount} Credits
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#047857' }}>
                          {tx.balanceAfter.toLocaleString('en-IN')} Cr
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: FULL RECHARGE HISTORY
          ========================================================================= */}
      {activeTab === 'history' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: NAVY }}>
              Full Recharge &amp; Payment History ({history.length})
            </h3>
            <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Approved and rejected transaction records</span>
          </div>

          {history.length === 0 ? (
            <div className="card empty-state" style={{ padding: '36px 20px', textAlign: 'center', borderRadius: 14 }}>
              <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14 }}>No recharge history records yet.</p>
            </div>
          ) : (
            <div className="table-wrap" style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)' }}>
              <table>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    <th>Date</th>
                    <th>College Name</th>
                    <th>Service Type</th>
                    <th>Amount Paid</th>
                    <th>Credits / Rupee Granted</th>
                    <th>UTR Reference</th>
                    <th>Status</th>
                    <th>Reviewed By</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((r) => {
                    const isWhatsApp = Boolean(r.note && r.note.toLowerCase().includes('whatsapp'));
                    return (
                      <tr key={r.id}>
                        <td className="mono" style={{ fontSize: 12 }}>
                          {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: NAVY }}>{r.institute}</div>
                          {r.note && <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{r.note}</div>}
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: isWhatsApp ? '#DCFCE7' : '#EFF6FF',
                              color: isWhatsApp ? '#15803D' : '#1E40AF',
                              fontSize: 10.5,
                              fontWeight: 700,
                            }}
                          >
                            {isWhatsApp ? '💬 WhatsApp' : '⚡ Paper Credits'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 800 }}>₹{r.amountRupees.toLocaleString('en-IN')}</td>
                        <td>
                          <span style={{ fontWeight: 800, color: '#16A34A' }}>
                            {isWhatsApp ? `₹${r.amountRupees}` : `${r.creditsAsked.toLocaleString('en-IN')} Cr`}
                          </span>
                        </td>
                        <td className="mono" style={{ fontSize: 12 }}>
                          {r.upiReference}
                        </td>
                        <td>
                          {r.status === 'APPROVED' ? (
                            <span className="badge badge-success">Approved</span>
                          ) : r.status === 'REJECTED' ? (
                            <span className="badge badge-danger">Rejected</span>
                          ) : (
                            <span className="badge badge-neutral">Pending</span>
                          )}
                          {r.reviewNote && <div style={{ fontSize: 11, color: '#991B1B', marginTop: 2 }}>{r.reviewNote}</div>}
                        </td>
                        <td className="mono" style={{ fontSize: 11 }}>
                          {r.reviewedByEmail || '—'}
                          {r.reviewedAt && (
                            <div style={{ fontSize: 10, color: 'var(--ink-soft)' }}>
                              {new Date(r.reviewedAt).toLocaleDateString()}
                            </div>
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
      )}

      {/* =========================================================================
          TAB 5: PAYMENT GATEWAY & UPI QR SETTINGS
          ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="card card-pad" style={{ borderRadius: 14, padding: 24, borderLeft: `4px solid ${NAVY}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 17, color: NAVY }}>Super Admin Recharge Gateway Settings</h3>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0 }}>
                Configure the UPI ID and QR code shown to colleges for purchasing Paper Credits and WhatsApp Top-ups.
              </p>
            </div>
            <div
              style={{
                background: upi?.razorpayConfigured ? '#DCFCE7' : '#FEF3C7',
                color: upi?.razorpayConfigured ? '#15803D' : '#92400E',
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {upi?.razorpayConfigured ? '● Razorpay Live' : '● Razorpay Awaiting Keys'}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
              1. Direct UPI &amp; QR Settings (Active)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>UPI ID (VPA)</label>
                <input type="text" placeholder="yourname@bank" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Payee Name</label>
                <input type="text" placeholder="e.g. QuestionStudio SaaS" value={payeeName} onChange={(e) => setPayeeName(e.target.value)} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Custom QR Image</label>
                <input type="file" accept="image/png,image/jpeg,image/webp" ref={qrRef} />
              </div>
            </div>
            {upi?.qrUrl && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 4 }}>Uploaded Custom QR:</div>
                <img src={`${imgBase}${upi.qrUrl}`} alt="Current UPI QR" style={{ maxWidth: 120, border: '1px solid var(--line)', borderRadius: 6, padding: 4, background: '#fff' }} />
              </div>
            )}
          </div>

          <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px dashed #E2E8F0' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
              2. Razorpay Automated Gateway (Optional)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Razorpay Key ID</label>
                <input type="text" placeholder="rzp_live_... or rzp_test_..." value={rzpKeyId} onChange={(e) => setRzpKeyId(e.target.value)} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Razorpay Key Secret</label>
                <input type="password" placeholder="Enter new secret to update..." value={rzpKeySecret} onChange={(e) => setRzpKeySecret(e.target.value)} />
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 18, background: NAVY, color: '#fff', padding: '10px 20px', fontWeight: 700 }}
            onClick={saveUpi}
            disabled={savingUpi}
          >
            {savingUpi ? 'Saving Settings…' : 'Save Payment & Gateway Settings'}
          </button>
        </div>
      )}

      {/* =========================================================================
          QUICK ADJUST MODAL (FOR PAPER CREDITS OR WHATSAPP ₹)
          ========================================================================= */}
      {adjustModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(7, 21, 74, 0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setAdjustModal(null)}
        >
          <div className="card card-pad" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 4, color: NAVY }}>
              {adjustModal.type === 'credits' ? '⚡ Adjust Paper Generation Credits' : '💬 Add WhatsApp Messaging ₹'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 16 }}>
              {adjustModal.institute?.name} — Current Paper Balance: <b>{adjustModal.institute?.creditBalance || 0} Cr</b> | WA: <b>₹{(adjustModal.institute?.whatsAppWalletBalance || 0).toFixed(2)}</b>
            </p>

            <div className="field">
              <label>
                {adjustModal.type === 'credits'
                  ? 'Credit Amount (positive to add, negative to deduct)'
                  : 'Rupee Amount to Add to WhatsApp Wallet (₹)'}
              </label>
              <input
                type="number"
                placeholder={adjustModal.type === 'credits' ? 'e.g. 5000' : 'e.g. 500'}
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
              />
            </div>

            {adjustModal.type === 'credits' && (
              <div className="field" style={{ marginTop: 10 }}>
                <label>Reason (Recorded in Audit Ledger)</label>
                <input
                  type="text"
                  placeholder="e.g. Complimentary Onboarding Pack or Bank Transfer"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  background: adjustModal.type === 'whatsapp' ? '#059669' : NAVY,
                  borderColor: adjustModal.type === 'whatsapp' ? '#059669' : NAVY,
                }}
                disabled={adjustBusy}
                onClick={handleQuickAdjustSubmit}
              >
                {adjustBusy ? 'Saving…' : 'Confirm & Apply'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setAdjustModal(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
