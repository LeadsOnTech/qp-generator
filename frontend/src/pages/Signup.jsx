import { useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

const LogoSvg = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#F6C84C"/>
    <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function Signup() {
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan');
  const amount = searchParams.get('amount');

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
      <div 
        style={{ 
          flex: '1.05', 
          background: 'radial-gradient(circle at 15% 20%, rgba(49, 87, 232, 0.3) 0%, transparent 45%), radial-gradient(circle at 85% 85%, rgba(246, 200, 76, 0.15) 0%, transparent 50%), linear-gradient(145deg, #07154A 0%, #0F1E68 55%, #0A1442 100%)', 
          color: '#ffffff', 
          padding: '56px 64px', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between', 
          position: 'relative', 
          overflow: 'hidden' 
        }} 
        className="hide-on-mobile"
      >
        {/* Subtle Background Pattern */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.04) 1.5px, transparent 1.5px)',
          backgroundSize: '36px 36px',
          opacity: 0.8,
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Logo & Tagline */}
          <div style={{ marginBottom: 44 }}>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, color: '#ffffff', textDecoration: 'none', fontSize: 24, fontWeight: 800 }}>
              <LogoSvg /> 
              <span>QuestionStudio</span>
            </Link>
            <div style={{ 
              display: 'inline-block',
              marginLeft: 12,
              padding: '3px 10px',
              borderRadius: 999,
              background: 'rgba(246, 200, 76, 0.12)',
              border: '1px solid rgba(246, 200, 76, 0.35)',
              fontSize: 11.5, 
              color: '#F6C84C', 
              fontWeight: 700, 
              letterSpacing: '0.04em' 
            }}>
              Your Questions. Your Standards.
            </div>
          </div>
          
          {/* High Contrast Catchy Title */}
          <h1 style={{ 
            fontSize: 46, 
            fontWeight: 800, 
            lineHeight: 1.15, 
            marginBottom: 18, 
            fontFamily: 'var(--font-display)',
            color: '#ffffff',
            letterSpacing: '-0.02em'
          }}>
            Create smarter exams <br />
            <span style={{ 
              background: 'linear-gradient(135deg, #FFE082 0%, #F6C84C 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 4px 20px rgba(246, 200, 76, 0.25)'
            }}>
              in minutes.
            </span>
          </h1>

          <p style={{ 
            fontSize: 16, 
            color: 'rgba(255, 255, 255, 0.82)', 
            lineHeight: 1.6, 
            maxWidth: 480, 
            marginBottom: 36 
          }}>
            The complete question bank &amp; automated paper generator built exclusively for competitive coaching institutes in India.
          </p>
          
          {/* Feature Highlights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: 14, 
              padding: '14px 18px', 
              borderRadius: 14, 
              background: 'rgba(255, 255, 255, 0.05)', 
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)'
            }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 15.5, fontWeight: 700, color: '#ffffff' }}>Verified Institute Accounts Only</div>
                <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.7)', marginTop: 2 }}>High-security question bank protected against student leaks &amp; non-teachers.</div>
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: 14, 
              padding: '14px 18px', 
              borderRadius: 14, 
              background: 'rgba(255, 255, 255, 0.05)', 
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)'
            }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(246, 200, 76, 0.2)', border: '1px solid rgba(246, 200, 76, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" color="#F6C84C">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15.5, fontWeight: 700, color: '#ffffff' }}>200 Free Welcome Credits</div>
                <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.7)', marginTop: 2 }}>Generate two complete 100-question papers with solutions immediately upon approval.</div>
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: 14, 
              padding: '14px 18px', 
              borderRadius: 14, 
              background: 'rgba(255, 255, 255, 0.05)', 
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)'
            }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2"/>
                  <line x1="2" y1="10" x2="22" y2="10"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15.5, fontWeight: 700, color: '#ffffff' }}>Pay-As-You-Go — No Subscriptions</div>
                <div style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.7)', marginTop: 2 }}>No monthly retainers. Pay ₹0.50 – ₹1.00 per question only when you generate papers.</div>
              </div>
            </div>
          </div>

          {/* Social Proof with Indian Educators */}
          <div style={{ 
            marginTop: 36, 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 16, 
            padding: '12px 18px', 
            borderRadius: 14, 
            background: 'rgba(7, 21, 74, 0.7)', 
            border: '1px solid rgba(255, 255, 255, 0.12)' 
          }}>
            <div style={{ display: 'flex' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #07154A', backgroundImage: 'url(/images/avatars/educator-indian-1.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #07154A', backgroundImage: 'url(/images/avatars/educator-indian-2.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', marginLeft: -10 }} />
              <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #07154A', backgroundImage: 'url(/images/avatars/educator-indian-3.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', marginLeft: -10 }} />
              <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid #07154A', backgroundImage: 'url(/images/avatars/educator-indian-4.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', marginLeft: -10 }} />
            </div>
            <div>
              <div style={{ color: '#F6C84C', fontSize: 14, letterSpacing: '0.04em' }}>★★★★★</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#ffffff' }}>Trusted by 500+ Indian educators</div>
            </div>
          </div>
        </div>

        {/* Supported Exams Pill at the Bottom */}
        <div style={{ 
          marginTop: 40,
          padding: '14px 20px', 
          background: 'rgba(255, 255, 255, 0.04)', 
          borderRadius: 12, 
          border: '1px solid rgba(255, 255, 255, 0.08)',
          position: 'relative',
          zIndex: 2
        }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#F6C84C', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Supported Competitive Exams</div>
          <div style={{ fontWeight: 600, fontSize: 13.5, color: 'rgba(255, 255, 255, 0.9)' }}>NEET (UG) • JEE Main • AP EAPCET • TG EAPCET • KCET</div>
        </div>
      </div>

      {/* RIGHT SIDE - FORM */}
      <div style={{ 
        flex: '1', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: 'clamp(28px, 5vw, 56px) clamp(20px, 4vw, 48px)', 
        background: '#ffffff' 
      }}>
        
        {step === 1 && (
          <div style={{ width: '100%', maxWidth: 460 }}>
            {/* Mobile Header Branding */}
            <div className="mobile-only-brand" style={{ marginBottom: 20, textAlign: 'center' }}>
              <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--premium-indigo)', fontSize: 22, fontWeight: 800 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#3157E8"/>
                  <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="#07154A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>QuestionStudio</span>
              </Link>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontWeight: 600, letterSpacing: '0.04em', marginTop: 2, textTransform: 'uppercase' }}>
                Your Questions. Your Standards.
              </div>
            </div>

            {/* Form Top Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 999,
              background: 'rgba(49, 87, 232, 0.08)',
              border: '1px solid rgba(49, 87, 232, 0.2)',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--premium-blue)',
              marginBottom: 12
            }}>
              <span>⚡</span> 200 Free Welcome Credits
            </div>

            {amount && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(7, 21, 74, 0.04), rgba(246, 200, 76, 0.12))',
                border: '1.5px solid rgba(246, 200, 76, 0.5)',
                borderRadius: 12,
                padding: '12px 16px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap'
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--navy-950)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    🎯 Selected: {plan === 'institution' ? 'Institution Master Pack' : plan === 'growth' ? 'Growth Academy Pack' : plan === 'starter' ? 'Starter Pack' : 'Custom Pack'} (₹{Number(amount).toLocaleString('en-IN')})
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                    Sign up to claim 200 free trial credits. This recharge plan will be ready in your account.
                  </div>
                </div>
                <Link 
                  to={`/login?redirect=/recharge?amount=${amount}${plan ? `&plan=${plan}` : ''}`}
                  style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--premium-blue)', textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  Already registered? Sign in →
                </Link>
              </div>
            )}

            <h2 style={{ fontSize: 30, fontWeight: 800, color: 'var(--navy-950)', marginBottom: 6, letterSpacing: '-0.02em' }}>Request Access</h2>
            <p style={{ fontSize: 14.5, color: 'var(--ink-soft)', marginBottom: 28, lineHeight: 1.5 }}>
              QuestionStudio is exclusively for registered institutes and teachers. Verify your credentials below to activate your account.
            </p>
            
            {error && <div className="alert alert-danger" style={{ marginBottom: 20 }}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              
              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-900)', marginBottom: 6 }}>User Type</label>
                <select 
                  value={userType} 
                  onChange={e => setUserType(e.target.value)} 
                  style={{ 
                    width: '100%', 
                    padding: '11px 14px', 
                    borderRadius: 10, 
                    border: '1.5px solid var(--line)', 
                    background: '#f8fafc', 
                    fontSize: 14.5,
                    color: 'var(--ink)'
                  }}
                >
                  <option value="INSTITUTE">Coaching Institute / Academy</option>
                  <option value="COLLEGE">Junior College / High School</option>
                  <option value="TEACHER">Independent Educator / Lecturer</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-900)', marginBottom: 6 }}>Full Name</label>
                  <input 
                    type="text" 
                    required 
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)} 
                    placeholder="e.g. Ramesh Kumar"
                    style={{ borderRadius: 10, border: '1.5px solid var(--line)', padding: '11px 14px', fontSize: 14.5 }}
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-900)', marginBottom: 6 }}>WhatsApp Number</label>
                  <input 
                    type="tel" 
                    required 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    placeholder="+91 98765 43210" 
                    style={{ borderRadius: 10, border: '1.5px solid var(--line)', padding: '11px 14px', fontSize: 14.5 }}
                  />
                </div>
              </div>

              {userType !== 'TEACHER' && (
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-900)', marginBottom: 6 }}>Institute / Organization Name</label>
                  <input 
                    type="text" 
                    required 
                    value={instituteName} 
                    onChange={e => setInstituteName(e.target.value)} 
                    placeholder="e.g. Sri Chaitanya / Narayana / KVR Junior College" 
                    style={{ borderRadius: 10, border: '1.5px solid var(--line)', padding: '11px 14px', fontSize: 14.5 }}
                  />
                </div>
              )}

              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-900)', marginBottom: 6 }}>Email Address</label>
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="principal@institute.com" 
                  style={{ borderRadius: 10, border: '1.5px solid var(--line)', padding: '11px 14px', fontSize: 14.5 }}
                />
              </div>

              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-900)', marginBottom: 6 }}>
                  Google Business Profile (GBP) Link {userType === 'TEACHER' ? '(Optional)' : ''}
                </label>
                <input 
                  type="url" 
                  required={userType !== 'TEACHER'} 
                  value={gbpLink} 
                  onChange={e => setGbpLink(e.target.value)} 
                  placeholder="https://maps.app.goo.gl/..." 
                  style={{ borderRadius: 10, border: '1.5px solid var(--line)', padding: '11px 14px', fontSize: 14.5 }}
                />
              </div>

              <div className="field" style={{ margin: 0 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-900)', marginBottom: 6 }}>
                  Upload Business Card / ID <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div 
                  style={{ 
                    border: businessCard ? '2px solid #22C55E' : '2px dashed #CBD5E1', 
                    borderRadius: 12, 
                    padding: '20px 16px', 
                    textAlign: 'center', 
                    cursor: 'pointer', 
                    background: businessCard ? '#F0FDF4' : '#F8FAFC',
                    transition: 'all 0.2s ease'
                  }}
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#16A34A', fontWeight: 700, fontSize: 14 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      <span>{businessCard.name}</span>
                      <span style={{ fontSize: 11, background: '#DCFCE7', padding: '2px 8px', borderRadius: 6 }}>Selected</span>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--ink-soft)', fontSize: 13.5 }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" style={{ display: 'block', margin: '0 auto 8px' }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      <strong>Click to upload</strong> business card, visiting card, or teacher ID
                      <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 4 }}>Supports JPG, PNG, PDF (up to 10MB)</div>
                    </div>
                  )}
                </div>
              </div>

              <button 
                className="btn btn-primary" 
                type="submit" 
                disabled={loading} 
                style={{ 
                  width: '100%', 
                  justifyContent: 'center', 
                  padding: '14px 20px', 
                  fontSize: 15.5, 
                  fontWeight: 700,
                  marginTop: 6,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #3157E8 0%, #1A3ED0 100%)',
                  boxShadow: '0 4px 14px rgba(49, 87, 232, 0.35)',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Submitting Verification...' : 'Submit Verification Request →'}
              </button>

              <div style={{ textAlign: 'center', fontSize: 13.5, color: 'var(--ink-soft)', marginTop: 4 }}>
                Already have an approved account? <Link to="/login" style={{ color: 'var(--premium-blue)', fontWeight: 700, textDecoration: 'none' }}>Sign In here</Link>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11.5, color: '#94A3B8', marginTop: 8, textAlign: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span>Encrypted &amp; confidential. Your ID is used only for account verification.</span>
              </div>
            </form>
          </div>
        )}

        {step === 2 && (
          <div style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}>
            <div style={{ width: 84, height: 84, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#16A34A', boxShadow: '0 10px 25px rgba(34, 197, 94, 0.2)' }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            
            <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--navy-950)', marginBottom: 12 }}>Verification Request Received!</h2>
            <p style={{ fontSize: 15.5, color: 'var(--ink-soft)', marginBottom: 24, lineHeight: 1.6 }}>
              Thank you for registering with QuestionStudio. Our team is reviewing your institute credentials.
            </p>
            
            <div style={{ padding: 20, background: '#F8FAFC', borderRadius: 14, border: '1px solid var(--line)', marginBottom: 28, textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, color: '#16A34A', fontWeight: 700, fontSize: 14 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                <span>What happens next:</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                <li>Verification usually takes <strong>2 to 4 business hours</strong>.</li>
                <li>Your temporary password &amp; <strong>200 Free Welcome Credits</strong> will be sent to your WhatsApp number: <strong style={{ color: 'var(--ink)' }}>{phone}</strong>.</li>
              </ul>
            </div>

            <Link to="/" className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: 15, justifyContent: 'center' }}>
              Return to Home
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
