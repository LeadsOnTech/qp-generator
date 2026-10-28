import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!token) {
      return setError('This reset link is missing its token. Please request a new one.');
    }
    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }
    if (password.length < 8) {
      return setError('Password must be at least 8 characters.');
    }

    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)', padding: '24px 16px', boxSizing: 'border-box' }}>
      <div className="card card-pad" style={{ width: '100%', maxWidth: 420, boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--navy-950)' }}>
            Question<span style={{ color: 'var(--gold-500)' }}>Studio</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', letterSpacing: '0.04em', marginTop: 2, textTransform: 'uppercase', fontWeight: 600 }}>
            Your Questions. Your Standards.
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>Set a new password</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {success ? (
          <>
            <div className="alert alert-success">Your password has been reset successfully.</div>
            <button className="btn btn-primary" onClick={() => navigate('/login')} style={{ width: '100%', justifyContent: 'center' }}>
              Go to Sign In
            </button>
          </>
        ) : !token ? (
          <div className="alert alert-danger">
            This link is missing its reset token. Please request a new one from the{' '}
            <Link to="/forgot-password" style={{ color: 'var(--danger)', fontWeight: 600 }}>Forgot Password</Link> page.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>New password (min. 8 characters)</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="field">
              <label>Confirm new password</label>
              <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
