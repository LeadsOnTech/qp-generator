import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, verifyTwoFactor } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Step 2 — only shown if the account has 2FA enabled
  const [pendingToken, setPendingToken] = useState(null);
  const [code, setCode] = useState('');

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result.requiresTwoFactor) {
        setPendingToken(result.pendingToken);
      } else {
        navigate(result.user.role === 'ADMIN' ? '/dashboard' : '/institute-dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCodeSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await verifyTwoFactor(pendingToken, code.trim());
      navigate(user.role === 'ADMIN' ? '/dashboard' : '/institute-dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)' }}>
      <div className="card card-pad" style={{ width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--navy-950)' }}>
            Question<span style={{ color: 'var(--gold-500)' }}>Studio</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', letterSpacing: '0.04em', marginTop: 2, textTransform: 'uppercase', fontWeight: 600 }}>
            Your Questions. Your Standards.
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>
            {pendingToken ? 'Enter your authenticator code' : 'Sign in to your account'}
          </p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {!pendingToken ? (
          <form onSubmit={handlePasswordSubmit}>
            <div className="field">
              <label>Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@institute.com" />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              <div style={{ textAlign: 'right', marginTop: 6 }}>
                <Link to="/forgot-password" style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Forgot password?</Link>
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit}>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 16 }}>
              Open your authenticator app (Google Authenticator, Authy, etc.) and enter the 6-digit code shown for QuestionStudio.
            </p>
            <div className="field">
              <label>6-digit code</label>
              <input
                type="text" inputMode="numeric" maxLength={6} required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="123456"
                style={{ fontSize: 20, letterSpacing: 4, textAlign: 'center' }}
                autoFocus
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading || code.length !== 6} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
              {loading ? 'Verifying…' : 'Verify & Sign In'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
              onClick={() => { setPendingToken(null); setCode(''); setError(null); }}
            >
              ← Back
            </button>
          </form>
        )}

        {!pendingToken && (
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-soft)', marginTop: 20 }}>
            New institute? <Link to="/signup" style={{ color: 'var(--gold-500)', fontWeight: 600 }}>Register here</Link>
          </p>
        )}
      </div>
    </div>
  );
}
