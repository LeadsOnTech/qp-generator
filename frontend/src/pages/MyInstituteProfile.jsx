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
        setForm({
          name: inst.name || '',
          phone: inst.phone || '',
          address: inst.address || '',
          tagline: inst.tagline || '',
          logoFilename: inst.logoFilename || '',
        });
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

  if (loading) return <div className="skeleton" style={{ height: 400, borderRadius: 20 }} />;

  return (
    <div style={{ width: '100%' }}>
      {/* Executive Hero Banner */}
      <div className="studio-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="studio-badge">
              <span>🏛️</span>
              <span>Collegiate Letterhead &bull; Print Branding</span>
            </div>
            <h1 className="studio-title">My Institute Profile</h1>
            <p className="studio-sub">
              Your institutional emblem, title, address, and tagline appear automatically at the top of every generated question paper and OMR evaluation sheet.
            </p>
          </div>
        </div>

        <div className="studio-chips">
          <div className="studio-chip">
            <span>Institute:</span> <strong>{form.name || 'Your College'}</strong>
          </div>
          <div className="studio-chip">
            <span>Balance:</span> <strong style={{ color: '#60A5FA' }}>{creditBalance?.toLocaleString() || 0} Credits</strong>
          </div>
          <div className="studio-chip">
            <span>Emblem:</span> <strong>{form.logoFilename ? '✓ Configured' : 'No Logo Uploaded'}</strong>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span>⚠️</span><span>{error}</span>
        </div>
      )}
      {message && (
        <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <span>✓</span><span>{message}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {/* Form Settings */}
        <div className="executive-card">
          <h3 className="card-section-title" style={{ marginBottom: 16 }}>
            <span>✏️</span> Institute Particulars
          </h3>

          <div className="field">
            <label>College / Academy Name</label>
            <input
              type="text"
              placeholder="e.g. Sri Chaitanya Junior Kalasala"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="field">
            <label>Tagline / Motto (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Leading Pioneers in Medical & Engineering Entrance Coaching"
              value={form.tagline}
              onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
            />
          </div>

          <div className="field">
            <label>Official Contact Number (Optional)</label>
            <input
              type="text"
              placeholder="e.g. +91 98480 12345"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>

          <div className="field">
            <label>Campus Address / Location (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Benz Circle, Vijayawada, Andhra Pradesh - 520010"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>

          <div className="field">
            <label>Official Emblem / Logo</label>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 8 }}>
              {previewLogoUrl ? (
                <img
                  src={previewLogoUrl}
                  alt="Institute Logo"
                  style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 12, border: '1px solid #E2E8F0', background: '#F8FAFC', padding: 4 }}
                />
              ) : (
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  border: '1.5px dashed #CBD5E1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#F8FAFC',
                  color: '#94A3B8',
                  fontSize: 24
                }}>
                  🏛️
                </div>
              )}
              <div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingLogo}
                  style={{ fontSize: 13, padding: '8px 16px' }}
                >
                  {uploadingLogo ? 'Uploading…' : previewLogoUrl ? 'Change Emblem' : 'Upload Emblem'}
                </button>
                <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 4 }}>
                  PNG or JPG with transparent or white background recommended.
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".png,.jpg,.jpeg"
                style={{ display: 'none' }}
                onChange={(e) => handleLogoUpload(e.target.files?.[0])}
              />
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={save}
            disabled={saving}
            style={{ width: '100%', marginTop: 12, padding: '12px' }}
          >
            {saving ? 'Saving Changes…' : 'Save Institute Profile'}
          </button>
        </div>

        {/* Live Letterhead Preview */}
        <div>
          <div className="executive-card" style={{ background: '#F8FAFC', border: '1.5px dashed #CBD5E1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B' }}>
                Live Paper Header Preview
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#DCFCE7', color: '#166534' }}>
                Watermark Ready
              </span>
            </div>

            {/* Paper Preview Sheet */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: 12,
              padding: '24px 28px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 8px 24px -4px rgba(0,0,0,0.06)',
              textAlign: 'center'
            }}>
              {previewLogoUrl && (
                <img
                  src={previewLogoUrl}
                  alt="Logo preview"
                  style={{ maxHeight: 52, maxWidth: 120, objectFit: 'contain', marginBottom: 8 }}
                />
              )}
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                {form.name || 'YOUR COLLEGE NAME HERE'}
              </h2>
              {form.tagline && (
                <div style={{ fontSize: 12, fontStyle: 'italic', color: '#475569', marginTop: 4 }}>
                  &ldquo;{form.tagline}&rdquo;
                </div>
              )}
              {(form.address || form.phone) && (
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 6, display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {form.address && <span>📍 {form.address}</span>}
                  {form.phone && <span>📞 {form.phone}</span>}
                </div>
              )}

              <div style={{ borderBottom: '2px solid #0F172A', marginTop: 16, marginBottom: 12 }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, fontWeight: 700, color: '#334155' }}>
                <span>EXAM: NEET GRAND TEST &bull; 2026</span>
                <span>MAX MARKS: 720</span>
                <span>TIME: 3h 20m</span>
              </div>
            </div>

            <p style={{ fontSize: 12.5, color: '#64748B', marginTop: 16, lineHeight: 1.5, textAlign: 'center' }}>
              This header is dynamically injected into all generated question papers, answer keys, and student OMR evaluation sheets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
