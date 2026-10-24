import { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function SecuritySettings() {
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState('idle'); // idle | setup | disable
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null);
  const [secret, setSecret] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  async function startSetup() {
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const res = await api.setupTwoFactor();
      setSecret(res.secret);
      setQrCodeDataUrl(res.qrCodeDataUrl);
      setStep('setup');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.enableTwoFactor(secret, code);
      setMessage('Two-factor authentication is now enabled on your account.');
      setStep('idle');
      setCode('');
      await refreshUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDisable(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.disableTwoFactor(code);
      setMessage('Two-factor authentication has been turned off.');
      setStep('idle');
      setCode('');
      await refreshUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <p className="eyebrow">Account Security</p>
        <h1 className="page-title">Two-Factor Authentication</h1>
        <p className="page-sub">
          Add an extra layer of protection to your account using an authenticator app (Google
          Authenticator, Authy, etc.). Completely optional — turn it on or off anytime.
        </p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="card card-pad" style={{ maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: user?.twoFactorEnabled || step !== 'idle' ? 20 : 0 }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Status</div>
            <div>
              {user?.twoFactorEnabled
                ? <span className="badge badge-success">Enabled</span>
                : <span className="badge badge-neutral">Off</span>}
            </div>
          </div>
          {step === 'idle' && (
            user?.twoFactorEnabled ? (
              <button className="btn-danger-ghost" onClick={() => setStep('disable')}>Turn off</button>
            ) : (
              <button className="btn btn-primary" onClick={startSetup} disabled={busy}>
                {busy ? 'Preparing…' : 'Turn on'}
              </button>
            )
          )}
        </div>

        {step === 'setup' && (
          <form onSubmit={confirmEnable}>
            <p style={{ fontSize: 13.5, marginBottom: 14 }}>
              Scan this QR code with your authenticator app, then enter the 6-digit code it shows.
            </p>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <img src={qrCodeDataUrl} alt="2FA QR code" style={{ width: 180, height: 180 }} />
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--ink-soft)', textAlign: 'center', marginBottom: 16, wordBreak: 'break-all' }}>
              Can't scan it? Enter this key manually: <span className="mono">{secret}</span>
            </p>
            <div className="field">
              <label>6-digit code from your app</label>
              <input
                type="text" inputMode="numeric" maxLength={6} required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="123456"
                style={{ fontSize: 18, letterSpacing: 3, textAlign: 'center' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" type="submit" disabled={busy || code.length !== 6}>
                {busy ? 'Confirming…' : 'Confirm & Enable'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { setStep('idle'); setCode(''); }}>Cancel</button>
            </div>
          </form>
        )}

        {step === 'disable' && (
          <form onSubmit={confirmDisable}>
            <p style={{ fontSize: 13.5, marginBottom: 14 }}>
              Enter your current authenticator code to confirm turning off two-factor authentication.
            </p>
            <div className="field">
              <label>6-digit code</label>
              <input
                type="text" inputMode="numeric" maxLength={6} required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="123456"
                style={{ fontSize: 18, letterSpacing: 3, textAlign: 'center' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-danger-ghost" type="submit" disabled={busy || code.length !== 6} style={{ padding: '10px 18px', fontSize: 14 }}>
                {busy ? 'Confirming…' : 'Confirm & Turn Off'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { setStep('idle'); setCode(''); }}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
