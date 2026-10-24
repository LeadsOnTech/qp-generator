import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const ROYAL_BLUE = '#1e3a8a';
const GOLD = '#c9a227';

export default function TrialAccounts() {
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [newInstituteName, setNewInstituteName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [justGenerated, setJustGenerated] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });

  function load() {
    setLoading(true);
    api.listTrialAccounts()
      .then(setTrials)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await api.generateTrialLogin(newInstituteName.trim() || undefined, newPhone.trim() || undefined);
      setJustGenerated(res);
      setNewInstituteName('');
      setNewPhone('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function deleteAccount(id) {
    if (!window.confirm('Are you sure you want to delete this trial account? This cannot be undone.')) return;
    try {
      await api.deleteInstitute(id);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  function startEdit(t) {
    setEditingId(t.id);
    setEditForm({ name: t.name || '', phone: t.phone || '' });
  }

  async function saveEdit(id) {
    try {
      await api.updateInstitute(id, { name: editForm.name, phone: editForm.phone });
      setEditingId(null);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  function statusBadge(status) {
    if (status === 'Not yet used') return <span className="badge badge-neutral">Not yet used</span>;
    if (status === 'Active / in use') return <span className="badge badge-success">Active / in use</span>;
    return <span className="badge badge-danger">Credits exhausted</span>;
  }

  return (
    <div>
      <div className="page-header">
        <p className="eyebrow" style={{ color: ROYAL_BLUE }}>Sales &amp; Outreach</p>
        <h1 className="page-title">Trial / Demo Logins</h1>
        <p className="page-sub">
          Generate a one-time dummy login (200 free credits) to send a prospective college via
          WhatsApp. Track who's actually tried it, and who's ready for a follow-up call.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card card-pad" style={{ maxWidth: 520, marginBottom: 28, borderTop: `3px solid ${ROYAL_BLUE}` }}>
        <h3 style={{ marginBottom: 16 }}>Generate a new trial login</h3>
        <div className="field">
          <label>Institute name (optional — for your own reference)</label>
          <input type="text" placeholder="e.g. KVR Junior College" value={newInstituteName} onChange={(e) => setNewInstituteName(e.target.value)} />
        </div>
        <div className="field">
          <label>Phone number you're sending this to (optional, can add later)</label>
          <input type="text" placeholder="e.g. +91-9848628863" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={generate} disabled={generating} style={{ background: ROYAL_BLUE, color: '#fff' }}>
          {generating ? 'Generating…' : 'Generate Trial Login (200 credits)'}
        </button>
      </div>

      {justGenerated && (
        <div className="card card-pad" style={{ maxWidth: 520, marginBottom: 28, border: `2px solid ${GOLD}`, background: '#fffbf0' }}>
          <h3 style={{ marginBottom: 6, color: '#8a6414' }}>Copy this now</h3>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14 }}>
            The password can also be viewed in the table below.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)', width: 70 }}>Email:</span>
              <code className="mono" style={{ fontSize: 14, flex: 1 }}>{justGenerated.email}</code>
              <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => copyToClipboard(justGenerated.email)}>Copy</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)', width: 70 }}>Password:</span>
              <code className="mono" style={{ fontSize: 14, flex: 1 }}>{justGenerated.password}</code>
              <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => copyToClipboard(justGenerated.password)}>Copy</button>
            </div>
          </div>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 12.5 }}
            onClick={() => copyToClipboard(
              `Hi! Try QuestionForge free — generate your own question papers instantly.\n\nWebsite: ${window.location.origin}\nLogin: ${justGenerated.email}\nPassword: ${justGenerated.password}\n\nYou get 200 free credits to test it out (1 credit = 1 question).`
            )}
          >
            Copy a ready-made WhatsApp message
          </button>
        </div>
      )}

      <h3 style={{ margin: '0 0 14px', fontSize: 17 }}>All trial accounts ({trials.length})</h3>

      {loading ? (
        <div className="skeleton" style={{ height: 200 }} />
      ) : trials.length === 0 ? (
        <div className="card empty-state">
          <h3>No trial logins generated yet</h3>
          <p>Use the form above to create your first one.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Login Email</th>
                <th>Password</th>
                <th>Phone sent to</th>
                <th>Credits left</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trials.map((t) => (
                <tr key={t.id}>
                  {editingId === t.id ? (
                    <>
                      <td><input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={{ padding: 4, width: '100%' }} /></td>
                      <td className="mono" style={{ fontSize: 12.5 }}>{t.email || '—'}</td>
                      <td className="mono" style={{ fontSize: 12.5 }}>{t.password || '—'}</td>
                      <td><input type="text" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} style={{ padding: 4, width: '100%' }} /></td>
                      <td>{t.creditBalance}</td>
                      <td>{statusBadge(t.status)}</td>
                      <td className="mono" style={{ fontSize: 12 }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: 12, marginRight: 6 }} onClick={() => saveEdit(t.id)}>Save</button>
                        <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => setEditingId(null)}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ fontWeight: 600 }}>{t.name}</td>
                      <td className="mono" style={{ fontSize: 12.5 }}>{t.email || '—'}</td>
                      <td className="mono" style={{ fontSize: 12.5 }}>{t.password || '—'}</td>
                      <td>{t.phone || <span style={{ color: 'var(--ink-soft)' }}>Not recorded</span>}</td>
                      <td>{t.creditBalance}</td>
                      <td>{statusBadge(t.status)}</td>
                      <td className="mono" style={{ fontSize: 12 }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, color: ROYAL_BLUE, marginRight: 6 }} onClick={() => startEdit(t)}>Edit</button>
                        <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, color: 'var(--danger)' }} onClick={() => deleteAccount(t.id)}>Delete</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
