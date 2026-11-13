import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const emptyForm = { name: '', phone: '', address: '', tagline: '', logoFilename: '', email: '', password: '', initialCredits: '' };

export default function Institutes() {
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileRef = useRef(null);
  const [rechargeTarget, setRechargeTarget] = useState(null); // institute being recharged, or null
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeReason, setRechargeReason] = useState('');
  const [rechargeBusy, setRechargeBusy] = useState(false);

  // WhatsApp Recharge State
  const [waRechargeTarget, setWaRechargeTarget] = useState(null);
  const [waRechargeAmount, setWaRechargeAmount] = useState('500');
  const [waRechargeBusy, setWaRechargeBusy] = useState(false);

  function openWaRecharge(inst) {
    setWaRechargeTarget(inst);
    setWaRechargeAmount('500');
    setError(null);
  }

  async function submitWaRecharge() {
    const amount = parseFloat(waRechargeAmount);
    if (!amount || amount <= 0) {
      return setError('Enter a valid positive amount in Rupees.');
    }
    setWaRechargeBusy(true);
    setError(null);
    try {
      const res = await api.rechargeWhatsAppWallet(amount, waRechargeTarget.id);
      setMessage(`Added ₹${amount} to WhatsApp wallet for ${waRechargeTarget.name}. New balance: ₹${res.newBalance.toFixed(2)}`);
      setWaRechargeTarget(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setWaRechargeBusy(false);
    }
  }

  // Login Management State
  const [loginTarget, setLoginTarget] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(null);

  // Recharge Reminders State (Phase 11)
  const [reminderTarget, setReminderTarget] = useState(null);
  const [reminderLevel, setReminderLevel] = useState(1);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [batchReminderBusy, setBatchReminderBusy] = useState(false);

  function openReminderModal(inst) {
    setReminderTarget(inst);
    // Auto-select smart level
    const nextLevel = Math.min((inst.lastRechargeReminderLevel || 0) + 1, 3);
    setReminderLevel(nextLevel || 1);
    setError(null);
  }

  async function submitReminder() {
    if (!reminderTarget) return;
    setReminderBusy(true);
    setError(null);
    try {
      const res = await api.sendRechargeReminder(reminderTarget.id, reminderLevel);
      setMessage(`✅ ${res.message || `Recharge Reminder Level ${reminderLevel} dispatched to ${reminderTarget.name}.`}`);
      setReminderTarget(null);
      load();
    } catch (err) {
      setError(err.message || 'Failed to dispatch recharge reminder');
    } finally {
      setReminderBusy(false);
    }
  }

  async function submitBatchReminders() {
    if (!window.confirm('Send automated WhatsApp recharge reminders to all colleges with low balance (<= 50 credits)?')) {
      return;
    }
    setBatchReminderBusy(true);
    setError(null);
    try {
      const res = await api.sendBatchRechargeReminders(50);
      setMessage(`✅ Batch reminders sent: ${res.dispatchedCount} colleges notified via WhatsApp.`);
      load();
    } catch (err) {
      setError(err.message || 'Failed to send batch recharge reminders');
    } finally {
      setBatchReminderBusy(false);
    }
  }

  async function openLoginModal(inst) {
    setLoginTarget(inst);
    setLoginEmail('');
    setLoginPassword('');
    setLoginSuccess(null);
    setError(null);
    try {
      setLoginLoading(true);
      const info = await api.getInstituteLoginInfo(inst.id);
      if (info.email) setLoginEmail(info.email);
      if (info.savedPassword) setLoginPassword(info.savedPassword);
    } catch (e) {
      console.warn('Could not fetch existing login info:', e);
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSaveLogin() {
    if (!loginTarget) return;
    setLoginLoading(true);
    setError(null);
    try {
      const res = await api.createInstituteLogin(loginTarget.id, {
        email: loginEmail.trim(),
        password: loginPassword.trim(),
      });
      setLoginSuccess(res);
      setMessage(`Login configured for ${loginTarget.name}: ${res.email}`);
    } catch (err) {
      setError(err.message || 'Failed to configure login credentials');
    } finally {
      setLoginLoading(false);
    }
  }

  function load() {
    setLoading(true);
    api.listInstitutes()
      .then(setInstitutes)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleLogoUpload(file) {
    if (!file) return;
    setUploadingLogo(true);
    setError(null);
    try {
      const res = await api.uploadImages([file]);
      setForm((f) => ({ ...f, logoFilename: res.uploaded[0].savedFilename }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function save() {
    if (!form.name.trim()) return setError('Institute name is required.');
    setError(null);
    try {
      if (editingId) {
        await api.updateInstitute(editingId, form);
        setMessage(`Updated ${form.name}.`);
      } else {
        const res = await api.createInstitute(form);
        if (res.loginEmail && res.loginPassword) {
          setMessage(`✅ Added ${form.name}! Login Email: ${res.loginEmail} | Password: ${res.loginPassword}`);
        } else {
          setMessage(`Added ${form.name} — it will now appear as an option on Generate Paper.`);
        }
      }
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(inst) {
    setEditingId(inst.id);
    setForm({ name: inst.name, phone: inst.phone || '', address: inst.address || '', tagline: inst.tagline || '', logoFilename: inst.logoFilename || '' });
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function remove(id, name) {
    if (!window.confirm(`Delete "${name}"? This only removes the saved branding profile — any papers already generated keep their PDF as-is.`)) return;
    try {
      await api.deleteInstitute(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  function openRecharge(inst) {
    setRechargeTarget(inst);
    setRechargeAmount('');
    setRechargeReason('');
    setError(null);
  }

  async function submitRecharge() {
    const amount = Number(rechargeAmount);
    if (!Number.isInteger(amount) || amount === 0) {
      return setError('Enter a non-zero whole number of credits (negative to correct/remove credits).');
    }
    if (!rechargeReason.trim()) {
      return setError('A short reason is required, e.g. "Recharge — ₹3,000 via UPI".');
    }
    setRechargeBusy(true);
    setError(null);
    try {
      await api.addCredits(rechargeTarget.id, amount, rechargeReason.trim());
      setMessage(`${amount > 0 ? 'Added' : 'Removed'} ${Math.abs(amount)} credits for ${rechargeTarget.name}.`);
      setRechargeTarget(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setRechargeBusy(false);
    }
  }

  const previewLogoUrl = form.logoFilename ? `${api.imageBase()}/uploads/images/${form.logoFilename}` : null;

  return (
    <div style={{ width: '100%' }}>
      {/* Executive Hero Banner */}
      <div className="studio-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="studio-badge">
              <span>🏛️</span>
              <span>White-Label Branding &bull; Institutional Directory</span>
            </div>
            <h1 className="studio-title">Institutes &amp; College Profiles</h1>
            <p className="studio-sub">
              Manage client colleges, letterhead emblems, and addresses. Automatically embed watermarks on generated question papers and administer college credits.
            </p>
          </div>
          <Link
            to="/admin/subscriptions"
            className="btn btn-secondary"
            style={{
              padding: '10px 18px',
              fontSize: 13.5,
              fontWeight: 700,
            }}
          >
            <span>🏷️</span> Subscriptions &amp; Modules &rarr;
          </Link>
        </div>

        <div className="studio-chips">
          <div className="studio-chip">
            <span>Registered Colleges:</span> <strong>{institutes.length}</strong>
          </div>
          <div className="studio-chip">
            <span>Watermarks:</span> <strong>Auto-Attached on PDF</strong>
          </div>
          <div className="studio-chip">
            <span>Credit Administration:</span> <strong>Live In-Memory Adjustments</strong>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="card card-pad" style={{ maxWidth: 620, marginBottom: 28 }}>
        <h3 style={{ marginBottom: 16 }}>{editingId ? 'Edit institute' : 'Add a new institute'}</h3>

        <div className="field">
          <label>Institute name</label>
          <input type="text" placeholder="e.g. KVR Junior College" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="field">
          <label>Phone (optional)</label>
          <input type="text" placeholder="e.g. +91-9848628863" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </div>
        <div className="field">
          <label>Address (optional)</label>
          <input type="text" placeholder="e.g. Vijayawada - 10" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
        </div>
        <div className="field">
          <label>Tagline (optional)</label>
          <input type="text" placeholder="e.g. Excellence in NEET & JEE Coaching" value={form.tagline} onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))} />
        </div>

        <div className="field">
          <label>Logo (optional)</label>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {previewLogoUrl && (
              <img src={previewLogoUrl} alt="" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 6, background: 'var(--paper-dim)' }} />
            )}
            <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()} disabled={uploadingLogo}>
              {uploadingLogo ? 'Uploading…' : previewLogoUrl ? 'Change logo' : 'Upload logo'}
            </button>
            <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg" style={{ display: 'none' }} onChange={(e) => handleLogoUpload(e.target.files?.[0])} />
          </div>
        </div>

        {!editingId && (
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border-dim)' }}>
            <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink)', marginBottom: 8 }}>
              🔐 Institute Login Account (Optional)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>Login Email</label>
                <input
                  type="email"
                  placeholder="e.g. college@example.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>Password</label>
                <input
                  type="text"
                  placeholder="e.g. College@123"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>
            </div>
            <div className="field" style={{ marginTop: 10 }}>
              <label>Initial Credits</label>
              <input
                type="number"
                placeholder="e.g. 3000"
                value={form.initialCredits}
                onChange={(e) => setForm((f) => ({ ...f, initialCredits: e.target.value }))}
              />
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>
              Enter email & password to automatically create their login right now. You can also configure or reset it later anytime using the <b>🔑 Login</b> button below.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn btn-primary" onClick={save}>{editingId ? 'Save changes' : 'Add institute'}</button>
          {editingId && (
            <button className="btn btn-ghost" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 14px', flexWrap: 'wrap', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 17 }}>Saved institutes ({institutes.length})</h3>
        {institutes.filter((i) => (i.creditBalance ?? 0) <= 50).length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: '#b45309', fontWeight: 600 }}>
              ⚠️ {institutes.filter((i) => (i.creditBalance ?? 0) <= 50).length} colleges low on credits (≤ 50)
            </span>
            <button
              className="btn"
              style={{ background: '#d97706', color: '#fff', fontSize: 12.5, padding: '5px 12px' }}
              onClick={submitBatchReminders}
              disabled={batchReminderBusy}
            >
              {batchReminderBusy ? 'Sending…' : '⚡ Batch WhatsApp Reminders'}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 160 }} />
      ) : institutes.length === 0 ? (
        <div className="card empty-state">
          <h3>No institutes saved yet</h3>
          <p>Add one above — it'll then show up as a branding option on Generate Paper.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {institutes.map((inst) => (
            <div key={inst.id} className="card card-pad">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                {inst.logoUrl && (
                  <img src={`${api.imageBase()}${inst.logoUrl}`} alt="" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6, background: 'var(--paper-dim)' }} />
                )}
                <div style={{ fontWeight: 700 }}>{inst.name}</div>
              </div>
              {inst.phone && <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{inst.phone}</div>}
              {inst.address && <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{inst.address}</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                <span className="badge badge-gold">{inst.creditBalance ?? 0} Credits</span>
                {(inst.creditBalance ?? 0) <= 50 && (
                  <span className="badge" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontSize: 11, fontWeight: 700 }}>
                    ⚠️ Low Balance
                  </span>
                )}
                {inst.rechargeReminderCount > 0 && (
                  <span className="badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: 11 }}>
                    📲 Reminded {inst.rechargeReminderCount}x (Lvl {inst.lastRechargeReminderLevel || 1})
                  </span>
                )}
                <span className="badge" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontSize: 11.5, fontWeight: 700 }}>
                  💬 ₹{(inst.whatsAppWalletBalance ?? 0).toFixed(2)} WA
                </span>
                {inst.isTrial && <span className="badge badge-neutral">Trial</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => startEdit(inst)}>Edit</button>
                <button className="btn-danger-ghost" onClick={() => remove(inst.id, inst.name)}>Delete</button>
                <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => openRecharge(inst)}>+ Credits</button>
                <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12.5, color: '#d97706', fontWeight: 700 }} onClick={() => openReminderModal(inst)}>📲 Remind</button>
                <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12.5, color: '#047857', fontWeight: 700 }} onClick={() => openWaRecharge(inst)}>💬 + WA ₹</button>
                <Link to="/admin/subscriptions" className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12.5, color: '#7c3aed', fontWeight: 700 }}>🏷️ Subscriptions</Link>
                <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12.5, color: '#2563eb', fontWeight: 600 }} onClick={() => openLoginModal(inst)}>🔑 Login</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Login Management Modal */}
      {loginTarget && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(16,29,51,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setLoginTarget(null)}
        >
          <div className="card card-pad" style={{ width: 440, maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 4 }}>🔑 Configure Institute Login</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 16 }}>
              {loginTarget.name} ({loginTarget.creditBalance ?? 0} credits)
            </p>

            {loginSuccess ? (
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <div style={{ color: '#065f46', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
                  ✅ Login Ready!
                </div>
                <div style={{ fontSize: 13, color: '#1e293b', marginBottom: 4 }}>
                  <b>Email:</b> <span style={{ fontFamily: 'monospace', background: '#fff', padding: '2px 6px', borderRadius: 4 }}>{loginSuccess.email}</span>
                </div>
                <div style={{ fontSize: 13, color: '#1e293b', marginBottom: 12 }}>
                  <b>Password:</b> <span style={{ fontFamily: 'monospace', background: '#fff', padding: '2px 6px', borderRadius: 4 }}>{loginSuccess.password}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => {
                    const text = `College Login Credentials:\nInstitute: ${loginTarget.name}\nEmail: ${loginSuccess.email}\nPassword: ${loginSuccess.password}\nLogin URL: ${window.location.origin}/#/login`;
                    navigator.clipboard.writeText(text);
                    alert('Credentials copied to clipboard!');
                  }}
                >
                  📋 Copy Login Credentials
                </button>
              </div>
            ) : (
              <div>
                <div className="field">
                  <label>Login Email</label>
                  <input
                    type="email"
                    placeholder="e.g. andhra@inspire.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>
                    Leave blank to auto-generate from institute name.
                  </div>
                </div>

                <div className="field">
                  <label>Password</label>
                  <input
                    type="text"
                    placeholder="e.g. Inspire@123"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>
                    Leave blank to auto-generate a secure password.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveLogin}
                    disabled={loginLoading}
                  >
                    {loginLoading ? 'Saving…' : 'Set Credentials'}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setLoginTarget(null)}>Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {waRechargeTarget && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(16,29,51,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setWaRechargeTarget(null)}
        >
          <div className="card card-pad" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 4 }}>💬 Top-up WhatsApp Messaging Balance</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 16 }}>
              {waRechargeTarget.name} — Current balance: <b>₹{(waRechargeTarget.whatsAppWalletBalance ?? 0).toFixed(2)}</b>
            </p>
            <div className="field">
              <label>Recharge Amount (₹ Rupees)</label>
              <input
                type="number"
                min="10"
                step="50"
                placeholder="e.g. 500"
                value={waRechargeAmount}
                onChange={(e) => setWaRechargeAmount(e.target.value)}
              />
              <span style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4, display: 'block' }}>
                At ~₹0.30/message, ₹500 provides approximately 1,600 automated WhatsApp messages (result cards, OTPs, hall tickets).
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                className="btn btn-primary"
                style={{ background: '#059669', borderColor: '#059669' }}
                onClick={submitWaRecharge}
                disabled={waRechargeBusy}
              >
                {waRechargeBusy ? 'Adding…' : 'Add ₹ to WhatsApp Wallet'}
              </button>
              <button className="btn btn-ghost" onClick={() => setWaRechargeTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {rechargeTarget && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(16,29,51,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setRechargeTarget(null)}
        >
          <div className="card card-pad" style={{ width: 400 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 4 }}>Adjust credits</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 16 }}>
              {rechargeTarget.name} — currently {rechargeTarget.creditBalance ?? 0} credits
            </p>
            <div className="field">
              <label>Amount (positive to add, negative to remove/correct)</label>
              <input type="text" inputMode="numeric" placeholder="e.g. 3000 or -50" value={rechargeAmount} onChange={(e) => setRechargeAmount(e.target.value.replace(/[^0-9-]/g, ''))} />
            </div>
            <div className="field">
              <label>Reason (shown in the credit history)</label>
              <input type="text" placeholder="e.g. Recharge — ₹3,000 via UPI" value={rechargeReason} onChange={(e) => setRechargeReason(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={submitRecharge} disabled={rechargeBusy}>{rechargeBusy ? 'Saving…' : 'Confirm'}</button>
              <button className="btn btn-ghost" onClick={() => setRechargeTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Recharge Reminder Dispatch Modal */}
      {reminderTarget && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(16,29,51,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setReminderTarget(null)}
        >
          <div className="card card-pad" style={{ width: 480, maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h3 style={{ margin: 0 }}>📲 Send Recharge Reminder</h3>
              <button type="button" className="btn btn-ghost" style={{ padding: '2px 8px' }} onClick={() => setReminderTarget(null)}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14 }}>
              Dispatch an official WhatsApp low-balance reminder to college management.
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
                🏛️ {reminderTarget.name}
              </div>
              <div style={{ fontSize: 12.5, color: '#475569', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span><b>Balance:</b> <span style={{ color: reminderTarget.creditBalance <= 10 ? '#dc2626' : '#d97706', fontWeight: 700 }}>{reminderTarget.creditBalance ?? 0} Credits</span></span>
                <span><b>Phone:</b> {reminderTarget.phone || reminderTarget.trialPhoneNumber || <span style={{ color: '#dc2626' }}>No phone registered</span>}</span>
                <span><b>Sent so far:</b> {reminderTarget.rechargeReminderCount || 0} times</span>
              </div>
            </div>

            <div className="field">
              <label style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, display: 'block' }}>Choose Reminder Level (1, 2, or 3):</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { lvl: 1, label: 'Level 1', title: 'Gentle Notice', desc: 'Credits running low', color: '#d97706', bg: '#fef3c7' },
                  { lvl: 2, label: 'Level 2', title: 'Action Required', desc: 'Exhaustion approaching', color: '#ea580c', bg: '#ffedd5' },
                  { lvl: 3, label: 'Level 3', title: 'Urgent Alert', desc: 'Critical / Suspended', color: '#dc2626', bg: '#fee2e2' },
                ].map((tier) => (
                  <button
                    key={tier.lvl}
                    type="button"
                    onClick={() => setReminderLevel(tier.lvl)}
                    style={{
                      border: reminderLevel === tier.lvl ? `2px solid ${tier.color}` : '1px solid #cbd5e1',
                      background: reminderLevel === tier.lvl ? tier.bg : '#ffffff',
                      borderRadius: 8,
                      padding: '10px 8px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: 13, color: tier.color }}>{tier.label}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>{tier.title}</div>
                    <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{tier.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: '#f1f5f9', borderRadius: 8, padding: 12, marginTop: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 4 }}>
                WhatsApp Notification Preview:
              </div>
              <div style={{ fontSize: 12, color: '#1e293b', whiteSpace: 'pre-wrap', fontFamily: 'sans-serif' }}>
                {reminderLevel === 1 && `⚠️ Recharge Reminder 1 of 3: Low Credit Balance\n\nDear Management of ${reminderTarget.name},\nYour QuestionStudio credit balance is running low at ${reminderTarget.creditBalance ?? 0} credits. To ensure smooth and uninterrupted question paper generation, CBT exams, and student result publishing, we recommend topping up your account today.\n\n⚡ Instant Recharge Link: https://questionstudio.in/#/recharge`}
                {reminderLevel === 2 && `🔔 Recharge Reminder 2 of 3: Action Required\n\nDear Management of ${reminderTarget.name},\nThis is a follow-up reminder. Your balance is now ${reminderTarget.creditBalance ?? 0} credits. Question paper generation will pause once credits reach zero. Recharge now using instant UPI or Razorpay with instant credit activation.\n\n⚡ Instant Recharge Link: https://questionstudio.in/#/recharge`}
                {reminderLevel === 3 && `🚨 URGENT: QuestionStudio Credit Balance Critical / Exhausted\n\nDear Management of ${reminderTarget.name},\nYour question generation credits have reached ${reminderTarget.creditBalance ?? 0} credits. Paper generation and test publishing services are currently on hold. Please recharge immediately to resume normal academic operations.\n\n⚡ Instant Recharge Link: https://questionstudio.in/#/recharge`}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-primary"
                style={{
                  background: reminderLevel === 3 ? '#dc2626' : reminderLevel === 2 ? '#ea580c' : '#d97706',
                  borderColor: 'transparent',
                }}
                onClick={submitReminder}
                disabled={reminderBusy || (!reminderTarget.phone && !reminderTarget.trialPhoneNumber)}
              >
                {reminderBusy ? 'Dispatching WhatsApp…' : `📲 Send Level ${reminderLevel} WhatsApp Reminder`}
              </button>
              <button className="btn btn-ghost" onClick={() => setReminderTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
