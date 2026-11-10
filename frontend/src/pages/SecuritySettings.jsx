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
    <div style={{ width: '100%', maxWidth: 840 }}>
      {/* Executive Hero Banner */}
      <div className="studio-hero">
        <div className="studio-badge">
          <span>🔒</span>
          <span>Access Security &bull; Multi-Factor Protection</span>
        </div>
        <h1 className="studio-title">Two-Factor Authentication</h1>
        <p className="studio-sub">
          Guard your institutional credentials, student rosters, and question papers using time-based one-time passwords (TOTP) compatible with Google Authenticator, Microsoft Authenticator, or 1Password.
        </p>
        <div className="studio-chips">
          <div className="studio-chip">
            <span>2FA Status:</span>{' '}
            <strong style={{ color: user?.twoFactorEnabled ? '#4ADE80' : '#FBBF24' }}>
              {user?.twoFactorEnabled ? '● Protected' : '○ Not Enabled'}
            </strong>
          </div>
          <div className="studio-chip">
            <span>Standard:</span> <strong>RFC 6238 TOTP</strong>
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

      <div className="executive-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: user?.twoFactorEnabled || step !== 'idle' ? 24 : 0, paddingBottom: 16, borderBottom: '1px solid #F1F5F9' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.04em' }}>
              Security Posture
            </div>
            <div style={{ marginTop: 4 }}>
              {user?.twoFactorEnabled ? (
                <span className="badge badge-success" style={{ fontSize: 13, padding: '4px 14px' }}>
                  ✓ Two-Factor Authentication Active
                </span>
              ) : (
                <span className="badge badge-warn" style={{ fontSize: 13, padding: '4px 14px' }}>
                  ⚠️ Standard Password Only (2FA Disabled)
                </span>
              )}
            </div>
          </div>

          {step === 'idle' && (
            user?.twoFactorEnabled ? (
              <button
                type="button"
                className="btn-danger-ghost"
                onClick={() => setStep('disable')}
                style={{ padding: '8px 16px', fontSize: 13 }}
              >
                Disable 2FA
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={startSetup}
                disabled={busy}
                style={{ padding: '9px 18px', fontSize: 13.5 }}
              >
                {busy ? 'Preparing…' : 'Activate 2FA'}
              </button>
            )
          )}
        </div>

        {step === 'setup' && (
          <form onSubmit={confirmEnable} style={{ marginTop: 16 }}>
            <p style={{ fontSize: 14, color: '#1E293B', marginBottom: 16, lineHeight: 1.5 }}>
              Scan this QR code in Google Authenticator or your password vault, then provide the 6-digit verification code:
            </p>
            <div style={{ textAlign: 'center', marginBottom: 16, padding: '16px', background: '#F8FAFC', borderRadius: 16, display: 'inline-block', border: '1px solid #E2E8F0' }}>
              <img src={qrCodeDataUrl} alt="2FA QR code" style={{ width: 190, height: 190, display: 'block', margin: '0 auto' }} />
            </div>
            <p style={{ fontSize: 12, color: '#64748B', marginBottom: 18, wordBreak: 'break-all' }}>
              Can&apos;t scan? Enter manually: <code style={{ color: '#2563EB', fontWeight: 700 }}>{secret}</code>
            </p>
            <div className="field" style={{ maxWidth: 320 }}>
              <label>6-Digit Code from Authenticator</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="000000"
                style={{ fontSize: 22, letterSpacing: 6, textAlign: 'center', fontWeight: 800 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-primary" type="submit" disabled={busy || code.length !== 6}>
                {busy ? 'Confirming…' : 'Confirm & Enable 2FA'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { setStep('idle'); setCode(''); }}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {step === 'disable' && (
          <form onSubmit={confirmDisable} style={{ marginTop: 16 }}>
            <p style={{ fontSize: 14, color: '#1E293B', marginBottom: 16 }}>
              Enter your current 6-digit authenticator code to confirm turning off two-factor authentication:
            </p>
            <div className="field" style={{ maxWidth: 320 }}>
              <label>Authenticator Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="000000"
                style={{ fontSize: 22, letterSpacing: 6, textAlign: 'center', fontWeight: 800 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn-danger-ghost" type="submit" disabled={busy || code.length !== 6} style={{ padding: '10px 20px', fontSize: 14 }}>
                {busy ? 'Confirming…' : 'Confirm & Disable 2FA'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { setStep('idle'); setCode(''); }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
