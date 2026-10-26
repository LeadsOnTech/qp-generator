import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import '../landing.css';

const LogoSvg = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor"/>
    <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const faqs = [
  { q: "What is a QuestionStudio credit?", a: "One credit is used to generate one question or one solution." },
  { q: "How much does one credit cost?", a: "One credit costs ₹1." },
  { q: "What is the minimum recharge?", a: "The minimum recharge is ₹5,000, which gives you 5,000 credits." },
  { q: "Is there a maximum recharge?", a: "There is no maximum recharge limit." },
  { q: "Do credits expire?", a: "No. Your purchased credits do not expire." },
  { q: "Does generating a PDF consume credits?", a: "No. PDF generation and download do not consume credits." },
  { q: "Are solutions included with question generation?", a: "Solutions use credits separately. One generated solution uses one credit." },
  { q: "Can I use credits for NEET, JEE Main and EAMCET/EAPCET?", a: "QuestionStudio currently supports NEET, JEE Main and EAMCET/EAPCET." },
  { q: "Can I get a refund?", a: "Credit purchases are non-refundable." },
  { q: "How can I recharge?", a: "You can recharge through Razorpay or the available manual payment option." }
];

export default function PricingPage() {
  const { user } = useAuth();
  const [institute, setInstitute] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  
  const [customAmount, setCustomAmount] = useState('5000');
  
  const [calcQ, setCalcQ] = useState(100);
  const [calcS, setCalcS] = useState(100);

  useEffect(() => {
    document.title = "QuestionStudio Pricing — Simple Pay-As-You-Go Credits";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", "Simple QuestionStudio pricing for coaching institutes, junior colleges and teachers. Generate questions and solutions with 1 credit per question or solution. Start with 200 free credits.");
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (user && user.role === 'INSTITUTE') {
      api.myInstitute().then(setInstitute).catch(console.error);
    }
  }, [user]);

  const numAmount = parseInt(customAmount) || 0;
  const isAmountValid = numAmount >= 5000;
  const numQ = parseInt(calcQ) || 0;
  const numS = parseInt(calcS) || 0;

  const CtaButton = ({ className, style }) => {
    if (user) {
      return (
        <Link to="/recharge" className={className} style={style}>
          Recharge Credits
        </Link>
      );
    }
    return (
      <Link to="/signup" className={className} style={style}>
        Get Started Free
      </Link>
    );
  };

  return (
    <div className="landing-page pricing-page">
      {/* HEADER */}
      <header className={`landing-header ${scrolled ? 'scrolled' : ''}`}>
        <Link to="/" className="brand-logo">
          <LogoSvg />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
            <span>QuestionStudio</span>
            <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' }}>Your Questions. Your Standards.</span>
          </div>
        </Link>
        <nav className="nav-links">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/features" className="nav-link">Features</Link>
          <Link to="/pricing" className="nav-link" style={{ color: 'var(--premium-yellow)' }}>Pricing</Link>
        </nav>
        <div className="header-actions">
          {user ? (
            <Link to={user.role === 'ADMIN' ? '/dashboard' : '/institute-dashboard'} className="btn-primary-yellow">Go to Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn-signin">Sign In</Link>
              <Link to="/signup" className="btn-primary-yellow">Get Started Free</Link>
            </>
          )}
        </div>
      </header>

      {/* PREMIUM HERO */}
      <section className="pricing-hero" style={{ padding: '120px 64px 80px', textAlign: 'center', background: 'linear-gradient(135deg, #0B1554 0%, #101F66 100%)', color: '#fff' }}>
        <div style={{ display: 'inline-block', fontSize: 13, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--premium-yellow)', marginBottom: 24, textTransform: 'uppercase' }}>
          SIMPLE • FLEXIBLE • PAY AS YOU GO
        </div>
        <h1 style={{ fontSize: 56, fontWeight: 800, marginBottom: 24, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', lineHeight: 1.1, color: '#ffffff' }}>
          Pay Only for What You Generate.
        </h1>
        <p style={{ fontSize: 20, color: 'rgba(255,255,255,0.8)', maxWidth: 700, margin: '0 auto 40px', lineHeight: 1.6 }}>
          Generate exam-ready question papers for NEET, JEE Main and EAMCET/EAPCET using a simple credit system designed for coaching institutes, junior colleges and teachers.
        </p>
        
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          <CtaButton className="btn-primary-yellow" style={{ padding: '16px 32px', fontSize: 16 }} />
        </div>
        <div style={{ marginTop: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', padding: '12px 24px', borderRadius: '100px', color: '#4ADE80', fontWeight: 800, fontSize: 16, boxShadow: '0 0 32px rgba(34, 197, 94, 0.2)' }}>
          <div style={{ background: '#22C55E', color: '#fff', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          Every new account gets 200 FREE CREDITS!
        </div>
      </section>

      {/* USER BALANCE / MAIN PRICING CARD */}
      <section style={{ padding: '64px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {!user && (
          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 900, marginBottom: 40, boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--premium-text-secondary)' }}>Sign in to view your current credit balance.</div>
            <Link to="/login" className="btn-outline-white" style={{ padding: '12px 24px', color: 'var(--premium-indigo)', border: '1px solid var(--line)' }}>Sign In</Link>
          </div>
        )}
        {user && institute && (
          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 900, marginBottom: 40, boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--premium-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Credit Balance</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--premium-blue)', fontFamily: 'var(--font-mono)' }}>
                {institute.creditBalance.toLocaleString()} <span style={{ fontSize: 18, color: 'var(--premium-text)' }}>Credits</span>
              </div>
            </div>
            <Link to="/recharge" className="btn-primary-yellow" style={{ padding: '12px 24px' }}>Recharge Now</Link>
          </div>
        )}

        {/* TRANSPARENT FORMULA */}
        <div style={{ width: '100%', maxWidth: 900, marginBottom: 64, display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--premium-indigo)' }}>₹1</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--premium-text-secondary)' }}>EQUALS</div>
          </div>
          <div style={{ fontSize: 40, color: '#CBD5E1' }}>=</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--premium-blue)' }}>1 CREDIT</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--premium-text-secondary)' }}>FOR 1 QUESTION / SOLUTION</div>
          </div>
        </div>

        {/* RECHARGE CARD */}
        <div style={{ background: '#fff', borderRadius: 24, padding: 48, width: '100%', maxWidth: 900, boxShadow: '0 24px 48px rgba(11,21,84,0.06)', border: '1px solid var(--line)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
          
          <div>
            <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, color: 'var(--premium-indigo)' }}>QuestionStudio Credits</h2>
            <p style={{ fontSize: 16, color: 'var(--premium-text-secondary)', marginBottom: 32 }}>Simple pay-as-you-go pricing.</p>
            
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 600 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                1 Question = 1 Credit
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 600 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                1 Solution = 1 Credit
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 600 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                PDF Generation & Download = FREE
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 600 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                Credits Never Expire
              </li>
            </ul>
            <div style={{ fontSize: 13, color: '#94A3B8' }}>* Credit purchases are non-refundable. Minimum recharge is ₹5,000. No maximum limit.</div>
          </div>
          
          <div style={{ background: '#f8fafc', padding: 32, borderRadius: 16, border: '1px solid #E2E8F0' }}>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--premium-indigo)' }}>How many credits do you need?</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18, fontWeight: 600, color: 'var(--premium-text-secondary)' }}>₹</span>
                <input 
                  type="number" 
                  value={customAmount} 
                  onChange={e => setCustomAmount(e.target.value)} 
                  style={{ width: '100%', padding: '16px 16px 16px 40px', fontSize: 20, fontWeight: 700, borderRadius: 8, border: '2px solid #CBD5E1', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            
            <div style={{ marginBottom: 32, padding: 24, background: '#EEF0FF', borderRadius: 8, border: '1px dashed #3157E8', textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#3157E8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>You will receive</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--premium-indigo)' }}>
                {numAmount.toLocaleString()} <span style={{ fontSize: 16 }}>Credits</span>
              </div>
            </div>
            
            {isAmountValid ? (
              user ? <Link to="/recharge" className="btn-primary-yellow" style={{ width: '100%', padding: '16px', fontSize: 16, justifyContent: 'center', display: 'flex' }}>Continue to Recharge</Link> : <Link to="/signup" className="btn-primary-yellow" style={{ width: '100%', padding: '16px', fontSize: 16, justifyContent: 'center', display: 'flex' }}>Create Account to Recharge</Link>
              ) : (
              <button disabled style={{ width: '100%', padding: '16px', fontSize: 16, borderRadius: 8, border: 'none', background: '#E2E8F0', color: '#94A3B8', fontWeight: 600 }}>
                Minimum recharge is ₹5,000
              </button>
            )}
          </div>
        </div>
      </section>

      {/* CALCULATOR & EXAMPLES */}
      <section style={{ padding: '80px 64px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: 'var(--premium-indigo)', marginBottom: 16, textAlign: 'center' }}>See What Your Credits Can Do</h2>
        <p style={{ fontSize: 18, color: 'var(--premium-text-secondary)', marginBottom: 64, textAlign: 'center', maxWidth: 600 }}>Easily estimate how many credits your typical question paper will consume.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, width: '100%', maxWidth: 1000 }}>
          {/* Calc */}
          <div style={{ background: '#f8fafc', padding: 40, borderRadius: 24, border: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Estimate Your Paper</h3>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                <span>Number of Questions</span>
                <span style={{ color: 'var(--premium-blue)' }}>{numQ}</span>
              </label>
              <input type="range" min="10" max="300" step="10" value={calcQ} onChange={e => setCalcQ(e.target.value)} style={{ width: '100%' }} />
            </div>
            
            <div style={{ marginBottom: 40 }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                <span>Number of Solutions (Optional)</span>
                <span style={{ color: 'var(--premium-blue)' }}>{numS}</span>
              </label>
              <input type="range" min="0" max={calcQ} step="10" value={calcS} onChange={e => setCalcS(e.target.value)} style={{ width: '100%' }} />
            </div>
            
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 15 }}>
                <span style={{ color: 'var(--premium-text-secondary)' }}>Question Credits:</span>
                <span style={{ fontWeight: 600 }}>{numQ}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 15 }}>
                <span style={{ color: 'var(--premium-text-secondary)' }}>Solution Credits:</span>
                <span style={{ fontWeight: 600 }}>{numS}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, fontSize: 15 }}>
                <span style={{ color: 'var(--premium-text-secondary)' }}>PDF Generation:</span>
                <span style={{ fontWeight: 700, color: '#22C55E' }}>FREE</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#EEF0FF', padding: 20, borderRadius: 12 }}>
                <span style={{ fontWeight: 700, color: 'var(--premium-indigo)' }}>Total Cost</span>
                <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--premium-blue)' }}>{numQ + numS} <span style={{ fontSize: 14 }}>Credits</span></span>
              </div>
            </div>
          </div>
          
          {/* Examples */}
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Real-World Examples</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: 20, border: '1px solid var(--line)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--premium-indigo)' }}>Small Weekly Test</div>
                  <div style={{ fontSize: 14, color: 'var(--premium-text-secondary)' }}>50 Questions (No solutions)</div>
                </div>
                <div style={{ fontWeight: 800, color: 'var(--premium-blue)', fontSize: 18 }}>50 Credits</div>
              </div>
              
              <div style={{ padding: 20, border: '1px solid var(--line)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--premium-indigo)' }}>Standard Exam Paper</div>
                  <div style={{ fontSize: 14, color: 'var(--premium-text-secondary)' }}>100 Questions (No solutions)</div>
                </div>
                <div style={{ fontWeight: 800, color: 'var(--premium-blue)', fontSize: 18 }}>100 Credits</div>
              </div>

              <div style={{ padding: 20, border: '1px solid var(--line)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--premium-indigo)' }}>Comprehensive Mock Test</div>
                  <div style={{ fontSize: 14, color: 'var(--premium-text-secondary)' }}>100 Questions + 100 Solutions</div>
                </div>
                <div style={{ fontWeight: 800, color: 'var(--premium-blue)', fontSize: 18 }}>200 Credits</div>
              </div>

              <div style={{ padding: 20, border: '1px solid var(--line)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--premium-indigo)' }}>Bulk Term Exam Generation</div>
                  <div style={{ fontSize: 14, color: 'var(--premium-text-secondary)' }}>500 Questions + 500 Solutions</div>
                </div>
                <div style={{ fontWeight: 800, color: 'var(--premium-blue)', fontSize: 18 }}>1,000 Credits</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY THIS MODEL */}
      <section style={{ padding: '80px 64px', backgroundColor: '#f8fafc' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: 'var(--premium-indigo)', marginBottom: 16 }}>Built Around the Way You Actually Work</h2>
          <p style={{ fontSize: 18, color: 'var(--premium-text-secondary)' }}>Fair, transparent pricing built for coaching institutes.</p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, maxWidth: 1100, margin: '0 auto' }}>
          {[
            { title: 'NO MONTHLY SUBSCRIPTION', body: 'Only pay when you generate. No recurring fees weighing you down during off-seasons.' },
            { title: 'NO CREDIT EXPIRY', body: 'Use your credits whenever you need them. No monthly resets or annual expiry dates.' },
            { title: 'NO HIDDEN LIMITS', body: 'Your credits are clearly counted. You always know exactly what you are spending.' },
            { title: 'SIMPLE 1:1 PRICING', body: '₹1 = 1 Credit. Generating 100 questions costs exactly 100 credits. Simple.' },
            { title: 'FREE PDF GENERATION', body: 'Generate and download the final PDF files without consuming any additional credits.' },
            { title: '200 FREE CREDITS', body: 'Start generating right away. Every new eligible account starts with 200 credits free.' }
          ].map((c, i) => (
            <div key={i} style={{ background: '#fff', padding: 32, borderRadius: 16, border: '1px solid var(--line)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--premium-blue)', marginBottom: 12, letterSpacing: '0.05em' }}>{c.title}</h3>
              <p style={{ fontSize: 15, color: 'var(--premium-text-secondary)', lineHeight: 1.6 }}>{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AUDIENCE & EXAMS */}
      <section style={{ padding: '80px 64px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32, maxWidth: 1100, width: '100%', marginBottom: 64 }}>
          <div style={{ textAlign: 'center', padding: 32, background: '#EEF0FF', borderRadius: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--premium-indigo)', marginBottom: 12 }}>Coaching Institutes</h3>
            <p style={{ fontSize: 14, color: 'var(--premium-text-secondary)', lineHeight: 1.6 }}>Generate large volumes of exam papers for NEET, JEE Main and EAMCET/EAPCET seamlessly.</p>
          </div>
          <div style={{ textAlign: 'center', padding: 32, background: '#EEF0FF', borderRadius: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--premium-indigo)', marginBottom: 12 }}>Junior Colleges</h3>
            <p style={{ fontSize: 14, color: 'var(--premium-text-secondary)', lineHeight: 1.6 }}>Create customized exam papers and solutions perfectly integrated with your institution's workflow.</p>
          </div>
          <div style={{ textAlign: 'center', padding: 32, background: '#EEF0FF', borderRadius: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--premium-indigo)', marginBottom: 12 }}>Individual Teachers</h3>
            <p style={{ fontSize: 14, color: 'var(--premium-text-secondary)', lineHeight: 1.6 }}>Generate exactly what you need without committing to any rigid monthly subscription.</p>
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--premium-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 24 }}>Supported Examinations</h3>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
            <div style={{ padding: '12px 32px', background: '#f8fafc', border: '1px solid var(--line)', borderRadius: 32, fontWeight: 700, color: 'var(--premium-indigo)' }}>NEET</div>
            <div style={{ padding: '12px 32px', background: '#f8fafc', border: '1px solid var(--line)', borderRadius: 32, fontWeight: 700, color: 'var(--premium-indigo)' }}>JEE Main</div>
            <div style={{ padding: '12px 32px', background: '#f8fafc', border: '1px solid var(--line)', borderRadius: 32, fontWeight: 700, color: 'var(--premium-indigo)' }}>EAMCET / EAPCET</div>
          </div>
        </div>
      </section>

      {/* RECHARGE METHODS */}
      <section style={{ padding: '80px 64px', backgroundColor: '#f8fafc' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: 'var(--premium-indigo)', marginBottom: 16, textAlign: 'center' }}>Secure Payment Options</h2>
          <p style={{ fontSize: 18, color: 'var(--premium-text-secondary)', marginBottom: 48, textAlign: 'center' }}>Choose the method that works best for your institute.</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <div style={{ background: '#fff', padding: 40, borderRadius: 16, border: '1px solid var(--line)' }}>
              <div style={{ width: 48, height: 48, background: '#EEF0FF', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--premium-blue)" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--premium-indigo)', marginBottom: 12 }}>Pay with Razorpay</h3>
              <p style={{ fontSize: 15, color: 'var(--premium-text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>Instant credit allocation using our secure Razorpay gateway. Supports UPI, NetBanking, Credit and Debit Cards.</p>
              {user ? (
                <Link to="/recharge" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Recharge via Razorpay</Link>
              ) : (
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--premium-blue)' }}>Sign in to use this method →</div>
              )}
            </div>
            
            <div style={{ background: '#fff', padding: 40, borderRadius: 16, border: '1px solid var(--line)' }}>
              <div style={{ width: 48, height: 48, background: '#EEF0FF', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--premium-blue)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M7 7h.01"/><path d="M17 7h.01"/><path d="M7 17h.01"/><path d="M17 17h.01"/></svg>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--premium-indigo)', marginBottom: 12 }}>Pay Manually</h3>
              <p style={{ fontSize: 15, color: 'var(--premium-text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>Scan the QuestionStudio QR code, complete the payment, and submit your transaction number for verification.</p>
              {user ? (
                <Link to="/recharge" className="btn-outline-white" style={{ width: '100%', justifyContent: 'center', border: '1px solid var(--line)', color: 'var(--premium-indigo)' }}>View Manual Payment Details</Link>
              ) : (
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--premium-blue)' }}>Sign in to use this method →</div>
              )}
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 12 }}>* Credits will be added after payment verification.</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '80px 64px', backgroundColor: '#fff' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: 'var(--premium-indigo)', marginBottom: 48, textAlign: 'center' }}>Frequently Asked Questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }} itemScope itemType="https://schema.org/FAQPage">
            {faqs.map((f, i) => (
              <div key={i} style={{ paddingBottom: 24, borderBottom: '1px solid var(--line)' }} itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--premium-indigo)', marginBottom: 12 }} itemProp="name">{f.q}</h3>
                <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                  <p style={{ fontSize: 15, color: 'var(--premium-text-secondary)', lineHeight: 1.6 }} itemProp="text">{f.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding: '100px 64px', background: 'linear-gradient(135deg, #0B1554 0%, #101F66 100%)', textAlign: 'center', color: '#fff' }}>
        <h2 style={{ fontSize: 40, fontWeight: 800, marginBottom: 24, fontFamily: 'var(--font-display)' }}>Start Generating Smarter.</h2>
        <p style={{ fontSize: 20, color: 'rgba(255,255,255,0.8)', maxWidth: 600, margin: '0 auto 40px' }}>
          Create your account and get <span style={{ color: '#FDE047', fontWeight: 800 }}>200 free credits</span> to experience QuestionStudio today.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <CtaButton className="btn-primary-yellow" style={{ padding: '16px 32px', fontSize: 16 }} />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="brand-logo" style={{ marginBottom: 16, color: '#fff' }}>
              <LogoSvg />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                <span>QuestionStudio</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--premium-yellow)', letterSpacing: '0.04em', marginTop: 4 }}>Your Questions. Your Standards.</span>
              </div>
            </Link>
            <p>The smarter way to generate exam-ready question papers. Designed exclusively for competitive coaching institutes.</p>
          </div>
          <div>
            <h4 className="footer-heading">Product</h4>
            <ul className="footer-links">
              <li><Link to="/features">Features</Link></li>
              <li><Link to="/pricing">Pricing</Link></li>
              <li><Link to="/login">Question Bank</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="footer-heading">Resources</h4>
            <ul className="footer-links">
              <li><a href="#">Blog</a></li>
              <li><a href="#">Help Center</a></li>
              <li><a href="#">Guides</a></li>
              <li><a href="#">Updates</a></li>
            </ul>
          </div>
          <div>
            <h4 className="footer-heading">Company</h4>
            <ul className="footer-links">
              <li><a href="#">About Us</a></li>
              <li><a href="#">Contact Us</a></li>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Use</a></li>
            </ul>
          </div>
          <div className="footer-newsletter">
            <h4 className="footer-heading">Stay Updated</h4>
            <p style={{ fontSize: 13, marginBottom: 16, color: 'rgba(255,255,255,0.7)' }}>Get tips, updates, and new features delivered to your inbox.</p>
            <form onSubmit={e => e.preventDefault()}>
              <input type="email" placeholder="Enter your email" />
              <button type="submit" className="btn-primary-yellow" style={{ width: '100%', padding: '10px' }}>Subscribe</button>
            </form>
          </div>
        </div>
        <div className="footer-bottom">
          <div>© {new Date().getFullYear()} QuestionStudio — Your Questions. Your Standards. All rights reserved.</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <a href="#" style={{ color: 'rgba(255,255,255,0.5)' }}>Twitter</a>
            <a href="#" style={{ color: 'rgba(255,255,255,0.5)' }}>LinkedIn</a>
            <a href="#" style={{ color: 'rgba(255,255,255,0.5)' }}>YouTube</a>
          </div>
        </div>
      </footer>
    </div>
  );
}






