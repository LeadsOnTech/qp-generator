import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

export default function MyInstituteProfile() {
  const [form, setForm] = useState({ name: '', phone: '', address: '', tagline: '', logoFilename: '' });
  const [creditBalance, setCreditBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    api.myInstitute()
      .then((inst) => {
        setForm({ name: inst.name, phone: inst.phone || '', address: inst.address || '', tagline: inst.tagline || '', logoFilename: inst.logoFilename || '' });
        setCreditBalance(inst.creditBalance);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

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
    setSaving(true);
    setError(null);
    try {
      await api.updateMyInstitute(form);
      setMessage('Saved — this branding now applies to every paper you generate.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const previewLogoUrl = form.logoFilename ? `${api.imageBase()}/uploads/images/${form.logoFilename}` : null;

  if (loading) return <div className="skeleton" style={{ height: 320 }} />;

  return (
    <div>
      <div className="page-header">
        <p className="eyebrow">Your Branding</p>
        <h1 className="page-title">My Institute Profile</h1>
        <p className="page-sub">
          This logo, name, phone, and address appear on every paper you generate. Update it anytime —
          changes apply to new papers immediately.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      {creditBalance !== null && (
        <div className="stat-card" style={{ maxWidth: 220, marginBottom: 24 }}>
          <div className="stat-value">{creditBalance}</div>
          <div className="stat-label">Credits remaining</div>
        </div>
      )}

      <div className="card card-pad" style={{ maxWidth: 560 }}>
        <div className="field">
          <label>Institute name</label>
          <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
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
        <button className="btn btn-primary" onClick={save} disabled={saving} style={{ marginTop: 8 }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
