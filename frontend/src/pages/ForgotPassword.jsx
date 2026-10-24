import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [devResetLink, setDevResetLink] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setDevResetLink(null);
    setLoading(true);
    try {
      const res = await api.forgotPassword(email.trim());
      setMessage(res.message);
      if (res.devResetLink) setDevResetLink(res.devResetLink);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)' }}>
      <div className="card card-pad" style={{ width: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--navy-950)' }}>
            Question<span style={{ color: 'var(--gold-500)' }}>Forge</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>Reset your password</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        {devResetLink && (
          <div className="alert alert-danger" style={{ background: 'var(--warn-bg)', color: 'var(--warn)', border: '1px solid #f0dca8' }}>
            <strong>No email service configured yet (testing mode).</strong><br />
            Use this link directly: <br />
            <a href={devResetLink} style={{ wordBreak: 'break-all', color: 'var(--warn)' }}>{devResetLink}</a>
          </div>
        )}

        {!message && (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@institute.com" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-soft)', marginTop: 20 }}>
          <Link to="/login" style={{ color: 'var(--gold-500)', fontWeight: 600 }}>← Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}
