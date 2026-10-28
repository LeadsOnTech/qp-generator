import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const LogoSvg = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor"/>
    <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function Signup() {
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState('INSTITUTE');
  const [instituteName, setInstituteName] = useState('');
  const [gbpLink, setGbpLink] = useState('');
  const [businessCard, setBusinessCard] = useState(null);

  const fileInputRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!businessCard) {
      return setError('Please upload your business card or institute ID.');
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append('fullName', fullName);
      form.append('phone', phone);
      form.append('email', email);
      form.append('userType', userType);
      form.append('instituteName', instituteName);
      if (gbpLink) form.append('gbpLink', gbpLink);
      form.append('businessCard', businessCard);

      await api.requestAccess(form);
      setStep(2); // Success State
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#f8fafc' }}>
      {/* LEFT SIDE - BRANDING */}
      <div style={{ flex: 1, background: 'linear-gradient(135deg, #0B1554 0%, #101F66 100%)', color: '#fff', padding: 64, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }} className="hide-on-mobile">
        
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ marginBottom: 60 }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#fff', textDecoration: 'none', fontSize: 24, fontWeight: 800 }}>
              <LogoSvg /> QuestionStudio
            </Link>
            <div style={{ fontSize: 13, color: 'var(--premium-yellow)', fontWeight: 600, marginTop: 8, letterSpacing: '0.04em' }}>
              Your Questions. Your Standards.
            </div>
          </div>
          
          <h1 style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.1, marginBottom: 24, fontFamily: 'var(--font-display)' }}>
            Create smarter exams in minutes.
          </h1>
          
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 18, fontWeight: 600 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              Verified Institute Accounts Only
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 18, fontWeight: 600 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              200 Free Credits on Verification
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 18, fontWeight: 600 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              Pay As You Go — No Subscriptions
            </li>
          </ul>

          <div style={{ marginTop: 48, padding: '16px 24px', background: 'rgba(255,255,255,0.05)', borderRadius: 12, display: 'inline-block', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--premium-yellow)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Supported Exams</div>
            <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>NEET • JEE Main • EAMCET / EAPCET</div>
          </div>
        </div>

        {/* Abstract Background Design */}
        <div style={{ position: 'absolute', right: -100, bottom: -100, width: 600, height: 600, background: 'radial-gradient(circle, rgba(49,87,232,0.15) 0%, rgba(11,21,84,0) 70%)', borderRadius: '50%', zIndex: 1 }} />
      </div>

      {/* RIGHT SIDE - FORM */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(24px, 5vw, 40px) clamp(16px, 4vw, 24px)', background: '#fff' }}>
        
        {step === 1 && (
          <div style={{ width: '100%', maxWidth: 440 }}>
            <div className="mobile-only-brand" style={{ marginBottom: 24, textAlign: 'center' }}>
              <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--premium-indigo)', fontSize: 22, fontWeight: 800 }}>
                <LogoSvg /> QuestionStudio
              </Link>
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--premium-indigo)', marginBottom: 8 }}>Request Access</h2>
            <p style={{ fontSize: 15, color: 'var(--premium-text-secondary)', marginBottom: 32 }}>QuestionStudio is exclusively for institutes and teachers. Please verify your identity to get 200 free credits.</p>
            
            {error && <div className="alert alert-danger" style={{ marginBottom: 24 }}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              <div className="field">
                <label>User Type</label>
                <select value={userType} onChange={e => setUserType(e.target.value)} style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--line)', background: '#f8fafc', fontSize: 15 }}>
                  <option value="INSTITUTE">Coaching Institute</option>
                  <option value="COLLEGE">Junior College</option>
                  <option value="TEACHER">Individual Teacher</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                <div className="field" style={{ margin: 0 }}>
                  <label>Full Name</label>
                  <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe" />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>WhatsApp Number</label>
                  <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 9876543210" />
                </div>
              </div>

              {userType !== 'TEACHER' && (
                <div className="field" style={{ margin: 0 }}>
                  <label>Institute / Organization Name</label>
                  <input type="text" required value={instituteName} onChange={e => setInstituteName(e.target.value)} placeholder="e.g. KVR Junior College" />
                </div>
              )}

              <div className="field" style={{ margin: 0 }}>
                <label>Email Address</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>

              <div className="field" style={{ margin: 0 }}>
                <label>Google Business Profile (GBP) Link {userType === 'TEACHER' && '(Optional)'}</label>
                <input type="url" required={userType !== 'TEACHER'} value={gbpLink} onChange={e => setGbpLink(e.target.value)} placeholder="https://maps.app.goo.gl/..." />
              </div>

              <div className="field" style={{ margin: 0 }}>
                <label>Upload Business Card / ID <span style={{ color: 'red' }}>*</span></label>
                <div 
                  style={{ border: '2px dashed var(--line)', borderRadius: 8, padding: 24, textAlign: 'center', cursor: 'pointer', background: '#f8fafc' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={e => setBusinessCard(e.target.files[0])} 
                    accept="image/*,.pdf" 
                    style={{ display: 'none' }} 
                  />
                  {businessCard ? (
                    <div style={{ color: 'var(--premium-blue)', fontWeight: 600 }}>{businessCard.name}</div>
                  ) : (
                    <div style={{ color: 'var(--premium-text-secondary)', fontSize: 14 }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginBottom: 8, display: 'block', margin: '0 auto' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                      Click to upload image or PDF
                    </div>
                  )}
                </div>
              </div>

              <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: 16, marginTop: 8 }}>
                {loading ? 'Submitting Request...' : 'Submit Verification Request'}
              </button>

              <div style={{ textAlign: 'center', fontSize: 14, color: 'var(--premium-text-secondary)', marginTop: 8 }}>
                Already have an account? <Link to="/login" style={{ color: 'var(--premium-blue)', fontWeight: 700 }}>Sign in here</Link>
              </div>
            </form>
          </div>
        )}

        {step === 2 && (
          <div style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#EEF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'var(--premium-blue)' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            </div>
            
            <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--premium-indigo)', marginBottom: 12 }}>Request Submitted</h2>
            <p style={{ fontSize: 16, color: 'var(--premium-text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
              Thank you for requesting access to QuestionStudio. Our backend team is verifying your business card and profile.
            </p>
            
            <div style={{ padding: 24, background: '#f8fafc', borderRadius: 12, border: '1px solid var(--line)', marginBottom: 32 }}>
              <p style={{ fontSize: 15, color: 'var(--premium-indigo)', fontWeight: 600, margin: 0 }}>
                Once verified, we will send your login details directly to your WhatsApp number ({phone}).
              </p>
            </div>

            <Link to="/" className="btn-outline" style={{ padding: '16px', fontSize: 16, justifyContent: 'center', display: 'flex' }}>
              Return to Home
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
