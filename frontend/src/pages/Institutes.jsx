import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

const emptyForm = { name: '', phone: '', address: '', tagline: '', logoFilename: '' };

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
        await api.createInstitute(form);
        setMessage(`Added ${form.name} — it will now appear as an option on Generate Paper.`);
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
    <div>
      <div className="page-header">
        <p className="eyebrow">White-Label Branding</p>
        <h1 className="page-title">Institutes</h1>
        <p className="page-sub">
          Save each college's logo, phone, and address once — every paper generated for that
          institute automatically carries the correct letterhead, no retyping needed.
        </p>
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

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn btn-primary" onClick={save}>{editingId ? 'Save changes' : 'Add institute'}</button>
          {editingId && (
            <button className="btn btn-ghost" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button>
          )}
        </div>
      </div>

      <h3 style={{ margin: '0 0 14px', fontSize: 17 }}>Saved institutes ({institutes.length})</h3>

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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <span className="badge badge-gold">{inst.creditBalance ?? 0} credits</span>
                {inst.isTrial && <span className="badge badge-neutral">Trial</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => startEdit(inst)}>Edit</button>
                <button className="btn-danger-ghost" onClick={() => remove(inst.id, inst.name)}>Delete</button>
                <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={() => openRecharge(inst)}>+ Credits</button>
              </div>
            </div>
          ))}
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
    </div>
  );
}
