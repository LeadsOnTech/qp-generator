import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';
import '../landing.css';

const faqs = [
  { 
    q: "What is a QuestionStudio credit?", 
    a: "One credit generates one complete verified question. If you choose to include full step-by-step worked solutions for your paper, solutions use 1 credit per question that has a worked solution." 
  },
  { 
    q: "Do purchased question-generation credits ever expire?", 
    a: "Never! Your credits remain in your college account indefinitely with lifetime validity. There are no monthly resets, no annual expirations, and zero penalty during summer holidays or academic off-seasons." 
  },
  { 
    q: "Can I use the core Question Paper Generator without subscribing to any monthly module?", 
    a: "Yes, absolutely! The core Question Paper Generator is 100% pay-as-you-go. You do not need to subscribe to any monthly module to create, format, and download LaTeX-quality question papers." 
  },
  { 
    q: "How do the Optional Monthly Modules work?", 
    a: "Optional modules (OMR Sheet Generator, Online CBT, College Website, WhatsApp Automation) are monthly add-ons. You can subscribe to any individual module or get all four together in the Complete Add-on Bundle for ₹4,499/month once online activation launches." 
  },
  { 
    q: "Are question-generation credits included in the Complete Add-on Bundle?", 
    a: "No. The Complete Add-on Bundle (₹4,499/month) covers the four software modules. Question paper generation continues to draw from your lifetime pay-as-you-go credit packages." 
  },
  { 
    q: "How are WhatsApp messaging charges currently billed?", 
    a: "Currently, WhatsApp scorecards are billed at an active standard flat rate of ₹0.75 per successfully delivered message directly from your WhatsApp wallet balance. An unbundled direct-billing model (₹499/month subscription + Meta pass-through + ₹0.20 fee) is planned for future Meta Cloud API accounts." 
  },
  { 
    q: "Does the OMR module support automated camera or scanner grading?", 
    a: "Currently, QuestionStudio generates print-ready optical-compatible A4 OMR sheets (with 1, 2, 3, or 4 sheets per page) and master answer keys. Results can be imported via CSV/Excel or entered manually. Automated camera/scanner evaluation is currently in development as a Coming Soon feature." 
  },
  { 
    q: "How does QuestionStudio compare to hiring a DTP typing agency?", 
    a: "A DTP operator charges ₹500 to ₹1,200 per paper and takes 2 to 3 days with frequent formula errors. With QuestionStudio, a 75-question JEE paper costs just ₹75, is formatted in LaTeX with sharp diagrams in under 2 minutes, and carries your college letterhead automatically." 
  },
  { 
    q: "What payment methods are supported?", 
    a: "We support instant online recharge via Razorpay (UPI, Google Pay, PhonePe, Paytm, NetBanking, Credit & Debit Cards) as well as direct UPI/Bank transfer with automated GST invoice generation." 
  },
  { 
    q: "How do I claim our college's 200 Free Welcome Credits?", 
    a: "Simply sign up and submit your institute visiting card or teacher ID. Once our verification team verifies your institute (within 2-4 hours), 200 free credits are credited automatically to your account." 
  }
];

export default function PricingPage() {
  const { user } = useAuth();
  const [institute, setInstitute] = useState(null);
  
  // Custom recharge state
  const [customAmount, setCustomAmount] = useState('5000');
  
  // Interactive Exam Cost Estimator
  const [examType, setExamType] = useState('JEE'); // 'JEE' | 'NEET' | 'DPP' | 'CUSTOM'
  const [calcQ, setCalcQ] = useState(75);
  const [includeSol, setIncludeSol] = useState(false);
  
  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(0);

  // Toast Notification State for Subscribe Buttons
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    document.title = "QuestionStudio Pricing — Pay-As-You-Go Credits & Campus Add-on Modules";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content", 
        "Transparent college pricing: ₹1/question pay-as-you-go with lifetime credit validity, plus optional monthly modules for OMR, CBT, Website, and WhatsApp."
      );
    }
  }, []);

  useEffect(() => {
    if (user && user.role === 'INSTITUTE') {
      api.myInstitute().then(setInstitute).catch(console.error);
    }
  }, [user]);

  // Auto-dismiss toast notification after 5 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Handle Preset Exam Clicks
  function selectExamPreset(type) {
    setExamType(type);
    if (type === 'JEE') {
      setCalcQ(75);
      setIncludeSol(false);
    } else if (type === 'NEET') {
      setCalcQ(180);
      setIncludeSol(false);
    } else if (type === 'DPP') {
      setCalcQ(30);
      setIncludeSol(false);
    }
  }

  // Handle Subscribe Button Clicks (Display required message)
  function handleSubscribeClick(moduleTitle) {
    setToastMessage({
      title: 'Subscription activation coming soon',
      detail: `Online activation for ${moduleTitle} is launching shortly. Please contact support or sales for early access.`
    });
  }

  const numAmount = parseInt(customAmount) || 0;
  const isAmountValid = numAmount >= 5000;

  // Calculate Bonus for Custom Amount
  let bonusCredits = 0;
  if (numAmount >= 20000) {
    bonusCredits = Math.floor(numAmount * 0.25); // 25% bonus
  } else if (numAmount >= 10000) {
    bonusCredits = Math.floor(numAmount * 0.15); // 15% bonus
  }
  const totalCustomCredits = numAmount + bonusCredits;

  const CtaLink = ({ className, style, children, amount, plan }) => {
    const target = user 
      ? (amount ? `/recharge?amount=${amount}${plan ? `&plan=${plan}` : ''}` : '/recharge') 
      : (amount ? `/signup?amount=${amount}${plan ? `&plan=${plan}` : ''}` : '/signup');
    return (
      <Link to={target} className={className} style={style}>
        {children || (user ? 'Recharge Credits' : 'Claim 200 Free Credits →')}
      </Link>
    );
  };

  return (
    <div className="landing-page pricing-page" style={{ background: '#f8fafc', color: 'var(--ink)', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* HEADER */}
      <MarketingHeader activePage="pricing" />

      {/* FLOATING TOAST NOTIFICATION FOR SUBSCRIBE BUTTONS (RESPONSIVELY POSITIONED) */}
      {toastMessage && (
        <div 
          role="alert"
          style={{
            position: 'fixed',
            bottom: 'clamp(14px, 3vw, 24px)',
            right: 'clamp(12px, 3vw, 24px)',
            zIndex: 9999,
            background: '#07154A',
            color: '#ffffff',
            padding: '14px 18px',
            borderRadius: 14,
            boxShadow: '0 20px 45px rgba(7, 21, 74, 0.35)',
            border: '1.5px solid #F6C84C',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            maxWidth: 'min(440px, calc(100vw - 24px))',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ fontSize: 20, lineHeight: 1, marginTop: 2, color: '#F6C84C' }}>ℹ️</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#F6C84C', marginBottom: 3, wordBreak: 'break-word' }}>
              {toastMessage.title}
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(255, 255, 255, 0.88)', lineHeight: 1.45, wordBreak: 'break-word' }}>
              {toastMessage.detail}
            </div>
          </div>
          <button 
            type="button"
            onClick={() => setToastMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 18,
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
              flexShrink: 0
            }}
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* HERO SECTION */}
      <section className="pricing-hero" style={{ 
        textAlign: 'center', 
        background: 'radial-gradient(circle at 50% 10%, rgba(14, 165, 233, 0.35) 0%, transparent 60%), radial-gradient(circle at 85% 80%, rgba(246, 200, 76, 0.15) 0%, transparent 50%), linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #075985 100%)', 
        color: '#ffffff',
        padding: 'clamp(40px, 6vw, 76px) clamp(16px, 4vw, 48px) clamp(44px, 7vw, 84px)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle Background Pattern */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.05) 1.5px, transparent 1.5px)',
          backgroundSize: '40px 40px',
          opacity: 0.7,
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 940, margin: '0 auto' }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 8, 
            fontSize: 12, 
            fontWeight: 800, 
            letterSpacing: '0.08em', 
            color: '#F6C84C', 
            background: 'rgba(246, 200, 76, 0.12)', 
            border: '1px solid rgba(246, 200, 76, 0.35)', 
            padding: '6px 16px', 
            borderRadius: 999, 
            marginBottom: 20, 
            textTransform: 'uppercase' 
          }}>
            <span>⚡</span> TRANSPARENT PRICING FOR INDIAN COLLEGES &amp; ACADEMIES
          </div>

          <h1 style={{ 
            fontSize: 'clamp(28px, 5.2vw, 48px)', 
            fontWeight: 800, 
            marginBottom: 20, 
            fontFamily: 'var(--font-display)', 
            letterSpacing: '-0.025em', 
            lineHeight: 1.18, 
            color: '#ffffff' 
          }}>
            Pay-As-You-Go Question Papers. <br />
            <span style={{ 
              background: 'linear-gradient(135deg, #FFE082 0%, #F6C84C 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 4px 24px rgba(246, 200, 76, 0.25)'
            }}>
              Modular Add-ons When Your Campus Needs Them.
            </span>
          </h1>

          <p style={{ 
            fontSize: 'clamp(14.5px, 2.4vw, 17.5px)', 
            color: 'rgba(255, 255, 255, 0.88)', 
            maxWidth: 760, 
            margin: '0 auto 30px', 
            lineHeight: 1.6 
          }}>
            Generate LaTeX-typeset NEET, JEE, and EAPCET question papers at <strong>₹1 per question</strong> with <strong>credits that never expire</strong>. Power up your institution with optional monthly modules for OMR, Online CBT, College Website, and WhatsApp automation.
          </p>
          
          {/* Quick Section Anchors */}
          <div style={{ 
            display: 'flex', 
            gap: 10, 
            justifyContent: 'center', 
            alignItems: 'center', 
            flexWrap: 'wrap',
            marginBottom: 26
          }}>
            <a href="#core-product" style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              padding: '7px 15px',
              borderRadius: 20,
              fontSize: 12.5,
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'all 0.15s ease'
            }}>
              1. Core Question Papers ↓
            </a>
            <a href="#optional-modules" style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              padding: '7px 15px',
              borderRadius: 20,
              fontSize: 12.5,
              fontWeight: 700,
              textDecoration: 'none'
            }}>
              2. Optional Modules ↓
            </a>
            <a href="#complete-bundle" style={{
              background: 'rgba(246, 200, 76, 0.18)',
              border: '1px solid #F6C84C',
              color: '#F6C84C',
              padding: '7px 15px',
              borderRadius: 20,
              fontSize: 12.5,
              fontWeight: 800,
              textDecoration: 'none'
            }}>
              3. Complete Bundle ↓
            </a>
            <a href="#whatsapp-pricing" style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              padding: '7px 15px',
              borderRadius: 20,
              fontSize: 12.5,
              fontWeight: 700,
              textDecoration: 'none'
            }}>
              4. WhatsApp Pricing ↓
            </a>
          </div>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <CtaLink 
              className="btn btn-primary" 
              style={{ 
                padding: '13px 30px', 
                fontSize: 15, 
                fontWeight: 800, 
                borderRadius: 12,
                background: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)',
                color: '#07154A',
                boxShadow: '0 6px 20px rgba(245, 158, 11, 0.4)',
                border: 'none',
                textDecoration: 'none'
              }}
            >
              {user ? 'Recharge Credits' : 'Claim 200 Free Credits →'}
            </CtaLink>
          </div>

          {/* Social Proof + Free Credits Badge */}
          <div style={{ 
            marginTop: 28, 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 10, 
            background: 'rgba(255, 255, 255, 0.08)', 
            border: '1px solid rgba(255, 255, 255, 0.16)', 
            padding: '8px 18px', 
            borderRadius: 999, 
            backdropFilter: 'blur(8px)',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <span style={{ color: '#4ADE80', fontWeight: 800, fontSize: 13.5 }}>✓</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
              Every verified college receives <strong>200 Free Welcome Credits</strong> to test question quality.
            </span>
          </div>
        </div>
      </section>

      {/* USER BALANCE CALLOUT (IF LOGGED IN) */}
      {user && institute && (
        <div style={{ maxWidth: 1160, margin: '-28px auto 28px', padding: '0 20px', position: 'relative', zIndex: 10 }}>
          <div style={{ 
            background: '#ffffff', 
            border: '1.5px solid #3157E8', 
            borderRadius: 18, 
            padding: '18px 24px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            boxShadow: '0 12px 32px rgba(49, 87, 232, 0.12)',
            flexWrap: 'wrap',
            gap: 16
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Your Active Institute Account
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--navy-950)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'baseline', gap: 8 }}>
                {institute.creditBalance?.toLocaleString() || 0} <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--premium-blue)', fontFamily: 'var(--font-body)' }}>Available Credits</span>
              </div>
            </div>
            <Link to="/recharge" className="btn btn-primary" style={{ padding: '11px 22px', fontSize: 13.5, fontWeight: 700 }}>
              + Top Up Credits Now
            </Link>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 1: MANDATORY CORE PRODUCT – QUESTION PAPER GENERATION
          ========================================================================= */}
      <section 
        id="core-product" 
        style={{ 
          maxWidth: 1200, 
          margin: '44px auto', 
          padding: '0 20px',
          scrollMarginTop: 90 
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 34 }}>
          <div style={{ 
            display: 'inline-block',
            fontSize: 12, 
            fontWeight: 800, 
            color: 'var(--premium-blue)', 
            background: '#EEF0FF',
            padding: '4px 14px',
            borderRadius: 999,
            textTransform: 'uppercase', 
            letterSpacing: '0.08em', 
            marginBottom: 10 
          }}>
            1. MANDATORY CORE PRODUCT
          </div>
          <h2 style={{ fontSize: 'clamp(25px, 4.2vw, 36px)', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.02em', marginBottom: 10 }}>
            Question Paper Generation
          </h2>
          <p style={{ fontSize: 15.5, color: 'var(--ink-soft)', maxWidth: 700, margin: '0 auto', lineHeight: 1.55 }}>
            Our core product operates on a simple one-time credit recharge system. Pay only when you generate test papers.
          </p>

          {/* Credits Never Expire Guarantee Ribbon */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: '#ECFDF5',
            border: '1.5px solid #10B981',
            borderRadius: 12,
            padding: '10px 18px',
            marginTop: 16,
            color: '#065F46',
            fontSize: 13.5,
            fontWeight: 800,
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <span>🛡️</span>
            <span>CREDITS NEVER EXPIRE • LIFETIME VALIDITY • ZERO MONTHLY COMMITMENTS</span>
          </div>
        </div>

        {/* 3 TIERS GRID (RESPONSIVE MINMAX CLAMPED) */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', 
          gap: 24, 
          alignItems: 'stretch',
          marginBottom: 40
        }}>
          
          {/* TIER 1: STARTER */}
          <div style={{ 
            background: '#ffffff', 
            borderRadius: 20, 
            padding: 'clamp(24px, 4vw, 32px) clamp(20px, 3vw, 26px)', 
            border: '1.5px solid var(--line)', 
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            position: 'relative'
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Starter Package
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 'clamp(32px, 5vw, 38px)', fontWeight: 800, color: 'var(--navy-950)' }}>₹5,000</span>
                <span style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600 }}>one-time</span>
              </div>
              <div style={{ 
                padding: '9px 12px', 
                background: '#F1F5F9', 
                borderRadius: 10, 
                fontSize: 13.5, 
                fontWeight: 700, 
                color: 'var(--navy-900)', 
                marginBottom: 18,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span>⚡</span> 5,000 Credits (₹1.00 / Question)
              </div>
              <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 20 }}>
                Ideal for individual subject faculty, tutors, and coaching branches starting out with weekly chapter tests and DPPs.
              </p>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy-900)', letterSpacing: '0.05em', marginBottom: 12 }}>
                  What is included:
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 11, fontSize: 13.5, color: 'var(--ink)' }}>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> <strong>5,000</strong> Verified Questions or Solutions
                  </li>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> <strong>Credits never expire</strong> (Lifetime validity)
                  </li>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> Full NEET, JEE, EAPCET &amp; KCET Syllabuses
                  </li>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> Unlimited PDF Exports with Custom College Logo
                  </li>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> Standard Email &amp; WhatsApp Support
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <CtaLink 
                amount="5000"
                plan="starter"
                className="btn btn-ghost" 
                style={{ 
                  width: '100%', 
                  padding: '13px', 
                  fontSize: 14, 
                  fontWeight: 700, 
                  justifyContent: 'center', 
                  borderRadius: 10,
                  border: '1.5px solid var(--line)',
                  background: '#F8FAFC',
                  textDecoration: 'none'
                }}
              >
                {user ? 'Recharge ₹5,000' : 'Select Starter (₹5,000)'}
              </CtaLink>
              {!user && (
                <div style={{ marginTop: 8, textAlign: 'center' }}>
                  <Link to="/login?redirect=/recharge?amount=5000&plan=starter" style={{ fontSize: 12, color: 'var(--ink-soft)', textDecoration: 'underline' }}>
                    Existing college? Sign in to recharge →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* TIER 2: GROWTH (MOST POPULAR - HIGHLIGHTED) */}
          <div style={{ 
            background: 'linear-gradient(180deg, #FFFFFF 0%, #FBFDFF 100%)', 
            borderRadius: 22, 
            padding: 'clamp(26px, 4vw, 34px) clamp(20px, 3vw, 26px)', 
            border: '2.5px solid #F59E0B', 
            boxShadow: '0 16px 36px rgba(245, 158, 11, 0.15)',
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 3
          }}>
            {/* Value Ribbon */}
            <div style={{ 
              position: 'absolute', 
              top: -13, 
              left: '50%', 
              transform: 'translateX(-50%)', 
              background: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)', 
              color: '#07154A', 
              padding: '5px 16px', 
              borderRadius: 999, 
              fontSize: 11, 
              fontWeight: 800, 
              letterSpacing: '0.06em', 
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
              whiteSpace: 'nowrap'
            }}>
              ⭐ MOST POPULAR • 15% BONUS CREDITS
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, marginTop: 4 }}>
                Growth Package
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 'clamp(34px, 5.5vw, 40px)', fontWeight: 800, color: 'var(--navy-950)' }}>₹10,000</span>
                <span style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600 }}>one-time</span>
              </div>
              
              <div style={{ 
                padding: '10px 12px', 
                background: 'rgba(245, 158, 11, 0.12)', 
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 10, 
                fontSize: 13.5, 
                fontWeight: 800, 
                color: '#B45309', 
                marginBottom: 18,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span>🔥</span> 11,500 Credits (₹0.87 / Question)
              </div>
              <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 20 }}>
                The preferred pack for coaching institutes and intermediate colleges running regular weekly grand tests and DPPs.
              </p>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy-900)', letterSpacing: '0.05em', marginBottom: 12 }}>
                  Everything in Starter, plus:
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 11, fontSize: 13.5, color: 'var(--ink)' }}>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#F59E0B', fontWeight: 800 }}>★</span> <strong style={{ color: '#B45309' }}>+1,500 Free Bonus Credits</strong> (₹1,500 Value)
                  </li>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> <strong>11,500 total questions</strong> with zero expiration
                  </li>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> <strong>Credits never expire</strong> (Lifetime validity)
                  </li>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> High-Speed Bulk Generation &amp; Assembly
                  </li>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> Priority WhatsApp Onboarding &amp; Support
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <CtaLink 
                amount="10000"
                plan="growth"
                className="btn btn-primary" 
                style={{ 
                  width: '100%', 
                  padding: '13px', 
                  fontSize: 14.5, 
                  fontWeight: 800, 
                  justifyContent: 'center', 
                  borderRadius: 11,
                  background: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)',
                  color: '#07154A',
                  boxShadow: '0 4px 16px rgba(245, 158, 11, 0.4)',
                  border: 'none',
                  textDecoration: 'none'
                }}
              >
                {user ? 'Recharge ₹10,000 (11,500 Cr)' : 'Select Growth (₹10,000) →'}
              </CtaLink>
              {!user && (
                <div style={{ marginTop: 8, textAlign: 'center' }}>
                  <Link to="/login?redirect=/recharge?amount=10000&plan=growth" style={{ fontSize: 12, color: 'var(--ink-soft)', textDecoration: 'underline' }}>
                    Existing college? Sign in to recharge →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* TIER 3: INSTITUTION */}
          <div style={{ 
            background: '#ffffff', 
            borderRadius: 20, 
            padding: 'clamp(24px, 4vw, 32px) clamp(20px, 3vw, 26px)', 
            border: '1.5px solid var(--line)', 
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            position: 'relative'
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--premium-blue)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Institution Package
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 'clamp(32px, 5vw, 38px)', fontWeight: 800, color: 'var(--navy-950)' }}>₹20,000</span>
                <span style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600 }}>one-time</span>
              </div>
              <div style={{ 
                padding: '9px 12px', 
                background: '#EEF0FF', 
                borderRadius: 10, 
                fontSize: 13.5, 
                fontWeight: 700, 
                color: 'var(--premium-blue)', 
                marginBottom: 18,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span>🚀</span> 25,000 Credits (₹0.80 / Question)
              </div>
              <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 20 }}>
                Designed for junior colleges, multi-branch institutions, and examination centres running year-round competitive test series.
              </p>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy-900)', letterSpacing: '0.05em', marginBottom: 12 }}>
                  Maximum institutional value:
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 11, fontSize: 13.5, color: 'var(--ink)' }}>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: 'var(--premium-blue)', fontWeight: 800 }}>★</span> <strong style={{ color: 'var(--premium-blue)' }}>+5,000 Free Bonus Credits</strong> (₹5,000 Value)
                  </li>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> <strong>25,000 total questions</strong> (Over 250 full-length tests)
                  </li>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> <strong>Credits never expire</strong> (Lifetime validity)
                  </li>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> Custom High-Resolution Letterhead Setup
                  </li>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> Dedicated Institutional Account Manager
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <CtaLink 
                amount="20000"
                plan="institution"
                className="btn btn-ghost" 
                style={{ 
                  width: '100%', 
                  padding: '13px', 
                  fontSize: 14, 
                  fontWeight: 700, 
                  justifyContent: 'center', 
                  borderRadius: 10,
                  border: '1.5px solid var(--premium-blue)',
                  color: 'var(--premium-blue)',
                  background: '#F8FAFC',
                  textDecoration: 'none'
                }}
              >
                {user ? 'Recharge ₹20,000 (25,000 Cr)' : 'Select Institution (₹20,000) →'}
              </CtaLink>
              {!user && (
                <div style={{ marginTop: 8, textAlign: 'center' }}>
                  <Link to="/login?redirect=/recharge?amount=20000&plan=institution" style={{ fontSize: 12, color: 'var(--ink-soft)', textDecoration: 'underline' }}>
                    Existing college? Sign in to recharge →
                  </Link>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* CUSTOM AMOUNT RECHARGE BOX */}
        <div style={{ 
          background: '#ffffff', 
          borderRadius: 20, 
          padding: 'clamp(20px, 3.5vw, 32px)', 
          border: '1.5px solid var(--line)', 
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
          maxWidth: 960,
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>
            <div>
              <h3 style={{ fontSize: 17.5, fontWeight: 800, color: 'var(--navy-950)', margin: '0 0 4px' }}>
                Need a Custom Recharge Amount?
              </h3>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0 }}>
                Enter any amount (minimum ₹5,000). Volume bonus credits apply automatically.
              </p>
            </div>
            
            {/* Quick Amount Pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['5000', '10000', '15000', '25000', '50000'].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setCustomAmount(amt)}
                  style={{
                    background: customAmount === amt ? 'var(--navy-950)' : '#F1F5F9',
                    color: customAmount === amt ? '#F6C84C' : 'var(--ink)',
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 11px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  ₹{Number(amt).toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 18, alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--navy-900)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Recharge Amount (₹)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 19, fontWeight: 700, color: 'var(--ink-soft)' }}>₹</span>
                <input 
                  type="number" 
                  step="500"
                  min="5000"
                  value={customAmount} 
                  onChange={e => setCustomAmount(e.target.value)} 
                  style={{ 
                    width: '100%', 
                    padding: '11px 16px 11px 36px', 
                    fontSize: 19, 
                    fontWeight: 800, 
                    borderRadius: 10, 
                    border: '2px solid #CBD5E1', 
                    boxSizing: 'border-box',
                    color: 'var(--navy-950)',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              </div>
            </div>

            <div style={{ 
              background: '#EEF0FF', 
              padding: '14px 18px', 
              borderRadius: 12, 
              border: '1px dashed #3157E8', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between' 
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--premium-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Credits Received
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--navy-950)', fontFamily: 'var(--font-mono)' }}>
                  {totalCustomCredits.toLocaleString()}
                </div>
              </div>
              {bonusCredits > 0 && (
                <div style={{ background: '#DCFCE7', color: '#16A34A', padding: '5px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 800, textAlign: 'right' }}>
                  +{bonusCredits.toLocaleString()} BONUS FREE!
                </div>
              )}
            </div>

            <div>
              {isAmountValid ? (
                <>
                  <CtaLink 
                    amount={customAmount}
                    plan="custom"
                    className="btn btn-primary" 
                    style={{ 
                      width: '100%', 
                      padding: '13px', 
                      fontSize: 14.5, 
                      fontWeight: 700, 
                      justifyContent: 'center', 
                      display: 'flex',
                      borderRadius: 11,
                      textDecoration: 'none'
                    }}
                  >
                    {user ? `Proceed to Pay ₹${numAmount.toLocaleString()} →` : 'Create Account to Recharge →'}
                  </CtaLink>
                  {!user && (
                    <div style={{ marginTop: 6, textAlign: 'center' }}>
                      <Link to={`/login?redirect=/recharge?amount=${customAmount}&plan=custom`} style={{ fontSize: 12, color: 'var(--ink-soft)', textDecoration: 'underline' }}>
                        Existing college? Sign in to buy →
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                <button disabled style={{ width: '100%', padding: '13px', fontSize: 13.5, borderRadius: 11, border: 'none', background: '#E2E8F0', color: '#94A3B8', fontWeight: 600 }}>
                  Minimum recharge is ₹5,000
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: OPTIONAL MONTHLY MODULES
          ========================================================================= */}
      <section 
        id="optional-modules" 
        className="pricing-section-pad" 
        style={{ 
          backgroundColor: '#ffffff', 
          borderTop: '1px solid var(--line)', 
          borderBottom: '1px solid var(--line)',
          scrollMarginTop: 90 
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ 
              display: 'inline-block',
              fontSize: 12, 
              fontWeight: 800, 
              color: '#3B82F6', 
              background: '#EFF6FF',
              padding: '4px 14px',
              borderRadius: 999,
              textTransform: 'uppercase', 
              letterSpacing: '0.08em', 
              marginBottom: 10 
            }}>
              2. OPTIONAL MONTHLY MODULES
            </div>
            <h2 style={{ fontSize: 'clamp(25px, 4.2vw, 36px)', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.02em', marginBottom: 10 }}>
              Campus Management Add-ons
            </h2>
            <p style={{ fontSize: 15.5, color: 'var(--ink-soft)', maxWidth: 720, margin: '0 auto', lineHeight: 1.55 }}>
              Choose only the software modules your college needs. Monthly flexibility with zero annual lock-in contracts.
            </p>
          </div>

          {/* 4 MODULES GRID (RESPONSIVE MINMAX CLAMPED) */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', 
            gap: 22, 
            alignItems: 'stretch' 
          }}>
            
            {/* MODULE 1: OMR & ANSWER KEY */}
            <div style={{
              background: '#F8FAFC',
              borderRadius: 18,
              padding: 'clamp(22px, 3.5vw, 28px) clamp(18px, 3vw, 22px)',
              border: '1.5px solid var(--line)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: '#EEF0FF', color: 'var(--premium-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    🎯
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', background: '#E2E8F0', padding: '3px 9px', borderRadius: 999 }}>
                    Module 01
                  </span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy-950)', marginBottom: 8, lineHeight: 1.25 }}>
                  OMR &amp; Answer Key Generator
                </h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14 }}>
                  <span style={{ fontSize: 30, fontWeight: 800, color: 'var(--navy-950)' }}>₹999</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600 }}>/ month</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 18 }}>
                  Generate print-ready optical-compatible bubble sheets and master answer keys matched directly to your test papers.
                </p>

                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, marginBottom: 20 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy-900)', letterSpacing: '0.04em', marginBottom: 10 }}>
                    Main Features:
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 9, fontSize: 12.5, color: 'var(--ink)' }}>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: '#16A34A', fontWeight: 800, marginTop: 1 }}>✓</span>
                      <span>Printable A4 OMR sheets (1, 2, 3, or 4 sheets/page for paper savings)</span>
                    </li>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: '#16A34A', fontWeight: 800, marginTop: 1 }}>✓</span>
                      <span>Roll number, barcode, and test set alignment</span>
                    </li>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: '#16A34A', fontWeight: 800, marginTop: 1 }}>✓</span>
                      <span>1-click master answer key slips for faculty</span>
                    </li>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: '#16A34A', fontWeight: 800, marginTop: 1 }}>✓</span>
                      <span>Offline marksheet CSV &amp; Excel import for score calculation</span>
                    </li>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: '#64748B' }}>
                      <span style={{ color: '#F59E0B', fontWeight: 800, marginTop: 1 }}>⏳</span>
                      <span>Automated camera / scanner auto-reading <em style={{ color: '#D97706', fontWeight: 700 }}>(Coming Soon)</em></span>
                    </li>
                  </ul>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSubscribeClick('OMR & Answer Key Generator')}
                className="btn btn-ghost"
                style={{
                  width: '100%',
                  padding: '11px',
                  fontSize: 13.5,
                  fontWeight: 700,
                  justifyContent: 'center',
                  borderRadius: 10,
                  border: '1.5px solid var(--line)',
                  background: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                Subscribe — ₹999/mo
              </button>
            </div>

            {/* MODULE 2: ONLINE CBT */}
            <div style={{
              background: '#F8FAFC',
              borderRadius: 18,
              padding: 'clamp(22px, 3.5vw, 28px) clamp(18px, 3vw, 22px)',
              border: '1.5px solid var(--line)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    💻
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', background: '#E2E8F0', padding: '3px 9px', borderRadius: 999 }}>
                    Module 02
                  </span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy-950)', marginBottom: 8, lineHeight: 1.25 }}>
                  Online Examination (CBT)
                </h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14 }}>
                  <span style={{ fontSize: 30, fontWeight: 800, color: 'var(--navy-950)' }}>₹1,999</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600 }}>/ month</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 18 }}>
                  Deliver realistic NTA-style computer-based examinations on campus computer labs, laptops, or mobile devices.
                </p>

                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, marginBottom: 20 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy-900)', letterSpacing: '0.04em', marginBottom: 10 }}>
                    Main Features:
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 9, fontSize: 12.5, color: 'var(--ink)' }}>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: '#16A34A', fontWeight: 800, marginTop: 1 }}>✓</span>
                      <span>Real NTA JEE &amp; NEET interface simulation with question palette</span>
                    </li>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: '#16A34A', fontWeight: 800, marginTop: 1 }}>✓</span>
                      <span>Auto-submission upon timer countdown expiry</span>
                    </li>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: '#16A34A', fontWeight: 800, marginTop: 1 }}>✓</span>
                      <span>Instant score calculation with negative marking</span>
                    </li>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: '#16A34A', fontWeight: 800, marginTop: 1 }}>✓</span>
                      <span>Real-time rank analytics, subject accuracy &amp; time breakdown</span>
                    </li>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: '#64748B' }}>
                      <span style={{ color: '#F59E0B', fontWeight: 800, marginTop: 1 }}>⏳</span>
                      <span>Lockdown browser &amp; webcam anti-cheating <em style={{ color: '#D97706', fontWeight: 700 }}>(Coming Soon)</em></span>
                    </li>
                  </ul>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSubscribeClick('Online Examination (CBT)')}
                className="btn btn-ghost"
                style={{
                  width: '100%',
                  padding: '11px',
                  fontSize: 13.5,
                  fontWeight: 700,
                  justifyContent: 'center',
                  borderRadius: 10,
                  border: '1.5px solid var(--line)',
                  background: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                Subscribe — ₹1,999/mo
              </button>
            </div>

            {/* MODULE 3: DYNAMIC COLLEGE WEBSITE */}
            <div style={{
              background: '#F8FAFC',
              borderRadius: 18,
              padding: 'clamp(22px, 3.5vw, 28px) clamp(18px, 3vw, 22px)',
              border: '1.5px solid var(--line)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    🌐
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', background: '#E2E8F0', padding: '3px 9px', borderRadius: 999 }}>
                    Module 03
                  </span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy-950)', marginBottom: 8, lineHeight: 1.25 }}>
                  Dynamic College Website
                </h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14 }}>
                  <span style={{ fontSize: 30, fontWeight: 800, color: 'var(--navy-950)' }}>₹1,499</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600 }}>/ month</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 18 }}>
                  A modern, responsive public web portal showcasing your courses, faculty, and student achievements without hiring web developers.
                </p>

                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, marginBottom: 20 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy-900)', letterSpacing: '0.04em', marginBottom: 10 }}>
                    Main Features:
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 9, fontSize: 12.5, color: 'var(--ink)' }}>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: '#16A34A', fontWeight: 800, marginTop: 1 }}>✓</span>
                      <span>College homepage with Courses, Faculty, Facilities &amp; Gallery</span>
                    </li>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: '#16A34A', fontWeight: 800, marginTop: 1 }}>✓</span>
                      <span>Online student admission inquiry form &amp; lead capture CRM</span>
                    </li>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: '#16A34A', fontWeight: 800, marginTop: 1 }}>✓</span>
                      <span>Examination notices, digital circulars &amp; toppers wall</span>
                    </li>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: '#16A34A', fontWeight: 800, marginTop: 1 }}>✓</span>
                      <span>Fully mobile-optimized with your custom branding &amp; logo</span>
                    </li>
                  </ul>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSubscribeClick('Dynamic College Website')}
                className="btn btn-ghost"
                style={{
                  width: '100%',
                  padding: '11px',
                  fontSize: 13.5,
                  fontWeight: 700,
                  justifyContent: 'center',
                  borderRadius: 10,
                  border: '1.5px solid var(--line)',
                  background: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                Subscribe — ₹1,499/mo
              </button>
            </div>

            {/* MODULE 4: WHATSAPP AUTOMATION */}
            <div style={{
              background: '#F8FAFC',
              borderRadius: 18,
              padding: 'clamp(22px, 3.5vw, 28px) clamp(18px, 3vw, 22px)',
              border: '1.5px solid var(--line)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 11, background: '#DCFCE7', color: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    💬
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', background: '#E2E8F0', padding: '3px 9px', borderRadius: 999 }}>
                    Module 04
                  </span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy-950)', marginBottom: 8, lineHeight: 1.25 }}>
                  WhatsApp Automation
                </h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14 }}>
                  <span style={{ fontSize: 30, fontWeight: 800, color: 'var(--navy-950)' }}>₹499</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-soft)', fontWeight: 600 }}>/ month</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 18 }}>
                  Deliver test scorecards and diagnostic performance reports directly to student and parent WhatsApp numbers.
                </p>

                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, marginBottom: 20 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy-900)', letterSpacing: '0.04em', marginBottom: 10 }}>
                    Main Features:
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 9, fontSize: 12.5, color: 'var(--ink)' }}>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: '#16A34A', fontWeight: 800, marginTop: 1 }}>✓</span>
                      <span>1-click exam scorecard &amp; result link delivery to parents</span>
                    </li>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: '#16A34A', fontWeight: 800, marginTop: 1 }}>✓</span>
                      <span>Automated diagnostic weak-chapter alerts for counseling</span>
                    </li>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: '#16A34A', fontWeight: 800, marginTop: 1 }}>✓</span>
                      <span>Meta Cloud API compliance with verified sender ID</span>
                    </li>
                    <li style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: '#64748B' }}>
                      <span style={{ color: '#F59E0B', fontWeight: 800, marginTop: 1 }}>⏳</span>
                      <span>Automated CBT credentials &amp; hall ticket dispatch <em style={{ color: '#D97706', fontWeight: 700 }}>(Coming Soon)</em></span>
                    </li>
                  </ul>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSubscribeClick('WhatsApp Automation')}
                className="btn btn-ghost"
                style={{
                  width: '100%',
                  padding: '11px',
                  fontSize: 13.5,
                  fontWeight: 700,
                  justifyContent: 'center',
                  borderRadius: 10,
                  border: '1.5px solid var(--line)',
                  background: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                Subscribe — ₹499/mo
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: COMPLETE ADD-ON BUNDLE
          ========================================================================= */}
      <section 
        id="complete-bundle" 
        style={{ 
          maxWidth: 1060, 
          margin: '56px auto', 
          padding: '0 20px',
          scrollMarginTop: 90 
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 34 }}>
          <div style={{ 
            display: 'inline-block',
            fontSize: 12, 
            fontWeight: 800, 
            color: '#7C3AED', 
            background: '#F5F3FF',
            padding: '4px 14px',
            borderRadius: 999,
            textTransform: 'uppercase', 
            letterSpacing: '0.08em', 
            marginBottom: 10 
          }}>
            3. COMPLETE ADD-ON BUNDLE
          </div>
          <h2 style={{ fontSize: 'clamp(25px, 4.2vw, 36px)', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.02em', marginBottom: 10 }}>
            All 4 Optional Modules in One Bundle
          </h2>
          <p style={{ fontSize: 15.5, color: 'var(--ink-soft)', maxWidth: 680, margin: '0 auto', lineHeight: 1.55 }}>
            Equip your entire college with all four optional software modules at an exclusive bundled discount.
          </p>
        </div>

        {/* FEATURED BUNDLE CARD */}
        <div style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #075985 100%)',
          borderRadius: 24,
          padding: 'clamp(24px, 4.5vw, 40px)',
          color: '#ffffff',
          boxShadow: '0 20px 48px rgba(7, 21, 74, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Top highlight ribbon */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)',
            color: '#07154A',
            padding: '6px 16px',
            borderRadius: 999,
            fontSize: 11.5,
            fontWeight: 800,
            letterSpacing: '0.06em',
            marginBottom: 18,
            flexWrap: 'wrap'
          }}>
            <span>✨</span> COMPLETE INSTITUTIONAL SUITE • SAVE ₹497 / MONTH
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 32, alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: 'clamp(22px, 3.8vw, 32px)', fontWeight: 800, color: '#ffffff', marginBottom: 10, lineHeight: 1.2 }}>
                Complete Add-on Bundle
              </h3>
              
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 'clamp(36px, 5.5vw, 46px)', fontWeight: 800, color: '#F6C84C', fontFamily: 'var(--font-mono)' }}>
                  ₹4,499
                </span>
                <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>/ month</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textDecoration: 'line-through' }}>₹4,996</span>
              </div>

              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, marginBottom: 20 }}>
                Includes all four optional software modules in a unified campus workspace. Centralize test administration, web portal presence, online CBT testing, and parent notifications.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                  <span style={{ color: '#4ADE80', fontWeight: 800 }}>✓</span>
                  <span><strong>OMR &amp; Answer Key Generator</strong> (Regular ₹999/mo)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                  <span style={{ color: '#4ADE80', fontWeight: 800 }}>✓</span>
                  <span><strong>Online Examination (CBT) Platform</strong> (Regular ₹1,999/mo)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                  <span style={{ color: '#4ADE80', fontWeight: 800 }}>✓</span>
                  <span><strong>Dynamic College Website</strong> (Regular ₹1,499/mo)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                  <span style={{ color: '#4ADE80', fontWeight: 800 }}>✓</span>
                  <span><strong>WhatsApp Automation Software</strong> (Regular ₹499/mo)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                  <span style={{ color: '#4ADE80', fontWeight: 800 }}>✓</span>
                  <span>Unified student roster sync across all modules</span>
                </div>
              </div>
            </div>

            {/* Right side: Disclosures & CTA */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1.5px solid rgba(255, 255, 255, 0.16)',
              borderRadius: 18,
              padding: '22px',
              backdropFilter: 'blur(8px)'
            }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: '#F6C84C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                ⚠️ Important Inclusions &amp; Exclusions
              </div>

              <div style={{ 
                background: 'rgba(0, 0, 0, 0.25)', 
                borderLeft: '3px solid #F59E0B', 
                padding: '11px 13px', 
                borderRadius: '0 8px 8px 0',
                fontSize: 12.5,
                lineHeight: 1.5,
                color: 'rgba(255,255,255,0.92)',
                marginBottom: 12
              }}>
                <strong>Question-generation credits are NOT included.</strong><br />
                Question papers are generated using the one-time pay-as-you-go credit packages (Starter, Growth, or Institution).
              </div>

              <div style={{ 
                background: 'rgba(0, 0, 0, 0.25)', 
                borderLeft: '3px solid #F59E0B', 
                padding: '11px 13px', 
                borderRadius: '0 8px 8px 0',
                fontSize: 12.5,
                lineHeight: 1.5,
                color: 'rgba(255,255,255,0.92)',
                marginBottom: 18
              }}>
                <strong>WhatsApp message charges and provider charges are NOT included.</strong><br />
                Outbound WhatsApp message delivery fees are billed separately based on actual recipient delivery as described below.
              </div>

              <button
                type="button"
                onClick={() => handleSubscribeClick('Complete Add-on Bundle')}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '13px',
                  fontSize: 14.5,
                  fontWeight: 800,
                  justifyContent: 'center',
                  borderRadius: 11,
                  background: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)',
                  color: '#07154A',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(245, 158, 11, 0.35)'
                }}
              >
                Subscribe to Complete Bundle — ₹4,499/mo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: WHATSAPP PRICING EXPLANATION
          ========================================================================= */}
      <section 
        id="whatsapp-pricing" 
        className="pricing-section-pad" 
        style={{ 
          backgroundColor: '#ffffff', 
          borderTop: '1px solid var(--line)', 
          borderBottom: '1px solid var(--line)',
          scrollMarginTop: 90 
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ 
              display: 'inline-block',
              fontSize: 12, 
              fontWeight: 800, 
              color: '#059669', 
              background: '#ECFDF5',
              padding: '4px 14px',
              borderRadius: 999,
              textTransform: 'uppercase', 
              letterSpacing: '0.08em', 
              marginBottom: 10 
            }}>
              4. WHATSAPP PRICING EXPLANATION
            </div>
            <h2 style={{ fontSize: 'clamp(25px, 4.2vw, 36px)', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.02em', marginBottom: 10 }}>
              Transparent WhatsApp Messaging Rates
            </h2>
            <p style={{ fontSize: 15.5, color: 'var(--ink-soft)', maxWidth: 700, margin: '0 auto', lineHeight: 1.55 }}>
              Zero hidden markups. Clear information on active rates and planned Meta Cloud API unbundled models.
            </p>
          </div>

          {/* ACTIVE ROLLOUT PRICING NOTICE BANNER */}
          <div style={{
            background: '#F0FDF4',
            border: '1.5px solid #22C55E',
            borderRadius: 16,
            padding: '16px 22px',
            marginBottom: 28,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: 24, lineHeight: 1 }}>🟢</span>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#166534', marginBottom: 4 }}>
                Current Active Rate: Flat ₹0.75 per Delivered Message
              </div>
              <div style={{ fontSize: 13, color: '#15803D', lineHeight: 1.55 }}>
                In the current active version, student scorecard deliveries are billed at a standard flat rate of <strong>₹0.75 per successfully delivered message</strong> directly from your institute WhatsApp wallet (inclusive of Meta utility fees and telecom delivery). There are zero monthly software fees charged during this initial rollout.
              </div>
            </div>
          </div>

                    {/* OFFICIAL BULK WHATSAPP PACKAGES */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', 
            gap: 20, 
            marginBottom: 32 
          }}>
            
            {/* TIER 1: STARTER PACK */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: 18,
              padding: '26px 22px',
              border: '1.5px solid var(--line)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Starter Tier
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy-950)', marginBottom: 6 }}>
                Starter Pack
              </h3>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--navy-950)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                ₹1,999
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#059669', marginBottom: 16 }}>
                2,500 Messages • ₹0.80 / msg
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55, margin: '0 0 18px 0', flex: 1 }}>
                Ideal for single batches or class tests. Instant delivery of CBT exam credentials, student passcodes &amp; parent OTPs.
              </p>
              <Link
                to={user ? "/recharge" : "/signup"}
                className="btn btn-secondary"
                style={{ width: '100%', textAlign: 'center', justifyContent: 'center', padding: '10px 14px', fontSize: 13.5, fontWeight: 700, borderRadius: 10 }}
              >
                {user ? 'Recharge ₹1,999' : 'Get Started →'}
              </Link>
            </div>

            {/* TIER 2: GROWTH PACK */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: 18,
              padding: '26px 22px',
              border: '2px solid #25D366',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              boxShadow: '0 8px 24px rgba(37, 211, 102, 0.12)',
            }}>
              <div style={{
                position: 'absolute',
                top: -12,
                right: 20,
                background: '#25D366',
                color: '#FFFFFF',
                fontSize: 11,
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: 20,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                ★ Most Popular
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Growth Tier
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy-950)', marginBottom: 6 }}>
                Growth Pack
              </h3>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--navy-950)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                ₹3,750
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#059669', marginBottom: 16 }}>
                5,000 Messages • ₹0.75 / msg
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55, margin: '0 0 18px 0', flex: 1 }}>
                Automated student exam scorecards, chapter diagnostic cards &amp; real-time parent performance notifications.
              </p>
              <Link
                to={user ? "/recharge" : "/signup"}
                className="btn btn-primary"
                style={{ width: '100%', textAlign: 'center', justifyContent: 'center', padding: '10px 14px', fontSize: 13.5, fontWeight: 700, borderRadius: 10, background: '#059669', borderColor: '#059669' }}
              >
                {user ? 'Recharge ₹3,750' : 'Select Growth →'}
              </Link>
            </div>

            {/* TIER 3: INSTITUTION PACK (10k) */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: 18,
              padding: '26px 22px',
              border: '2px solid #0284C7',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              boxShadow: '0 8px 24px rgba(2, 132, 199, 0.12)',
            }}>
              <div style={{
                position: 'absolute',
                top: -12,
                right: 20,
                background: '#0284C7',
                color: '#FFFFFF',
                fontSize: 11,
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: 20,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}>
                💎 Best Value (10k)
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Institution Master
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy-950)', marginBottom: 6 }}>
                Institution Pack
              </h3>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--navy-950)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                ₹6,999
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0284C7', marginBottom: 16 }}>
                10,000 Messages • ₹0.70 / msg
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55, margin: '0 0 18px 0', flex: 1 }}>
                Full semester coverage for junior colleges and schools. Automated parent report cards, bookstore updates &amp; announcements.
              </p>
              <Link
                to={user ? "/recharge" : "/signup"}
                className="btn btn-primary"
                style={{ width: '100%', textAlign: 'center', justifyContent: 'center', padding: '10px 14px', fontSize: 13.5, fontWeight: 700, borderRadius: 10, background: '#0284C7', borderColor: '#0284C7' }}
              >
                {user ? 'Recharge ₹6,999' : 'Select 10k Pack →'}
              </Link>
            </div>

            {/* TIER 4: MEGA CAMPUS PACK */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: 18,
              padding: '26px 22px',
              border: '1.5px solid var(--line)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Mega Campus
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy-950)', marginBottom: 6 }}>
                Mega Campus Pack
              </h3>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--navy-950)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                ₹14,999
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#7C3AED', marginBottom: 16 }}>
                25,000 Messages • ₹0.60 / msg
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55, margin: '0 0 18px 0', flex: 1 }}>
                High-volume statewide mock tests, multi-branch institutions &amp; automated announcements across thousands of students.
              </p>
              <Link
                to={user ? "/recharge" : "/signup"}
                className="btn btn-secondary"
                style={{ width: '100%', textAlign: 'center', justifyContent: 'center', padding: '10px 14px', fontSize: 13.5, fontWeight: 700, borderRadius: 10 }}
              >
                {user ? 'Recharge ₹14,999' : 'Get Mega Pack →'}
              </Link>
            </div>

          </div>

          {/* REALISTIC EXAMPLE CALLOUT */}
          <div style={{
            background: '#F1F5F9',
            borderRadius: 16,
            padding: '20px 24px',
            border: '1px solid #CBD5E1',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap'
          }}>
            <div style={{ fontSize: 26 }}>💡</div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy-950)', marginBottom: 4 }}>
                Real-World Billing Example
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55 }}>
                When your college conducts a test and broadcasts 400 student scorecards to parents, your account is deducted <strong>₹300</strong> (400 × ₹0.75 active flat rate) from your WhatsApp recharge balance. Detailed delivery logs and live balances are audited in your <strong>Recharge &amp; Approvals</strong> dashboard.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: INTERACTIVE EXAM COST ESTIMATOR & DTP SAVINGS
          ========================================================================= */}
      <section className="pricing-section-pad" style={{ backgroundColor: '#F8FAFC' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--premium-blue)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              REAL-WORLD USAGE CALCULATOR
            </div>
            <h2 style={{ fontSize: 'clamp(25px, 4.5vw, 36px)', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.02em', marginBottom: 12 }}>
              See What Your Credits Can Do
            </h2>
            <p style={{ fontSize: 15.5, color: 'var(--ink-soft)', maxWidth: 640, margin: '0 auto', lineHeight: 1.5 }}>
              Choose an exam format below to see the exact cost per paper. Compare it with the high price and turnaround time of typing agencies!
            </p>

            {/* Exam Preset Selector Tabs */}
            <div style={{ display: 'inline-flex', background: '#F1F5F9', padding: 5, borderRadius: 12, marginTop: 20, gap: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => selectExamPreset('JEE')}
                style={{
                  background: examType === 'JEE' ? '#3157E8' : 'transparent',
                  color: examType === 'JEE' ? '#ffffff' : 'var(--ink)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                📐 JEE Main (75 Qs)
              </button>
              <button
                type="button"
                onClick={() => selectExamPreset('NEET')}
                style={{
                  background: examType === 'NEET' ? '#3157E8' : 'transparent',
                  color: examType === 'NEET' ? '#ffffff' : 'var(--ink)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                🧪 NEET (180 Qs)
              </button>
              <button
                type="button"
                onClick={() => selectExamPreset('DPP')}
                style={{
                  background: examType === 'DPP' ? '#3157E8' : 'transparent',
                  color: examType === 'DPP' ? '#ffffff' : 'var(--ink)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                ⚡ Daily DPP (30 Qs)
              </button>
              <button
                type="button"
                onClick={() => setExamType('CUSTOM')}
                style={{
                  background: examType === 'CUSTOM' ? '#3157E8' : 'transparent',
                  color: examType === 'CUSTOM' ? '#ffffff' : 'var(--ink)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                ⚙️ Custom Slider
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 310px), 1fr))', gap: 28, alignItems: 'center' }}>
            {/* Interactive Calculator Controls */}
            <div style={{ background: '#ffffff', padding: 'clamp(20px, 3.5vw, 32px)', borderRadius: 20, border: '1.5px solid var(--line)' }}>
              <h3 style={{ fontSize: 17.5, fontWeight: 800, color: 'var(--navy-950)', marginBottom: 18 }}>
                {examType === 'CUSTOM' ? 'Customize Your Paper Specs' : `${examType} Exam Specifications`}
              </h3>

              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                  <span>Questions in this Paper</span>
                  <span style={{ color: 'var(--premium-blue)', fontFamily: 'var(--font-mono)', fontSize: 15.5 }}>{calcQ} Questions</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="200" 
                  step="5" 
                  value={calcQ} 
                  onChange={e => { setCalcQ(Number(e.target.value)); setExamType('CUSTOM'); }} 
                  style={{ width: '100%', accentColor: 'var(--premium-blue)' }} 
                />
              </div>

              <div style={{ marginBottom: 22, background: '#F8FAFC', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--line)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: 0 }}>
                  <input 
                    type="checkbox" 
                    checked={includeSol} 
                    onChange={e => setIncludeSol(e.target.checked)} 
                    style={{ width: 18, height: 18, accentColor: 'var(--premium-blue)' }} 
                  />
                  <div>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--navy-900)' }}>Include Full Worked Solutions (+{calcQ} Credits)</span>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Master answer key is always free. Worked solutions are optional.</div>
                  </div>
                </label>
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 8, color: 'var(--ink-soft)' }}>
                  <span>Question Assembling:</span>
                  <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{calcQ} Credits</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 8, color: 'var(--ink-soft)' }}>
                  <span>Worked Solutions Add-on:</span>
                  <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{includeSol ? `${calcQ} Credits` : '₹0 (Answer Key Included Free)'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 14, color: 'var(--ink-soft)' }}>
                  <span>PDF &amp; Logo Branding:</span>
                  <span style={{ fontWeight: 800, color: '#16A34A' }}>FREE</span>
                </div>

                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', 
                  color: '#ffffff', 
                  padding: '14px 18px', 
                  borderRadius: 14 
                }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#F6C84C', fontWeight: 700, textTransform: 'uppercase' }}>Total QuestionStudio Cost</div>
                    <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                      ₹{includeSol ? calcQ * 2 : calcQ}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, textAlign: 'right', color: 'rgba(255, 255, 255, 0.85)' }}>
                    Just <strong>{includeSol ? calcQ * 2 : calcQ} credits</strong><br />Generated in 2 minutes
                  </div>
                </div>
              </div>
            </div>

            {/* Savings & Comparison vs DTP Agency (Stacked & Clamped on Small Screens) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ 
                background: '#FEF3C7', 
                border: '1.5px solid #F59E0B', 
                borderRadius: 18, 
                padding: 'clamp(18px, 3.5vw, 24px)', 
                boxShadow: '0 8px 24px rgba(245, 158, 11, 0.12)' 
              }}>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  💰 MASSIVE COST COMPARISON
                </div>
                <h4 style={{ fontSize: 'clamp(18px, 3vw, 20px)', fontWeight: 800, color: '#78350F', margin: '0 0 12px' }}>
                  You Save Over 85% per Test Paper
                </h4>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', 
                  gap: 12, 
                  background: '#ffffff', 
                  padding: '14px', 
                  borderRadius: 12, 
                  marginBottom: 12 
                }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>DTP Typing Agency:</div>
                    <div style={{ fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: 800, color: '#DC2626', wordBreak: 'break-word' }}>₹600 – ₹1,200</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 2 }}>⏰ Takes 2–3 Days</div>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>QuestionStudio:</div>
                    <div style={{ fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: 800, color: '#16A34A', wordBreak: 'break-word' }}>₹{includeSol ? calcQ * 2 : calcQ}</div>
                    <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 700, marginTop: 2 }}>⚡ Ready in 2 Minutes</div>
                  </div>
                </div>

                <div style={{ fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>
                  Generating 20 test papers per month saves your college over <strong>₹15,000 to ₹22,000 every single month</strong> while completely eliminating typing mistakes.
                </div>
              </div>

              <div style={{ 
                background: '#ffffff', 
                border: '1px solid var(--line)', 
                borderRadius: 18, 
                padding: 'clamp(18px, 3.5vw, 22px)' 
              }}>
                <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--navy-950)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🛡️</span> Zero Watermark, 100% White-Label
                </div>
                <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>
                  Your generated papers feature only your college's name, address, phone number, and logo. There is no QuestionStudio branding on student printouts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: FREQUENTLY ASKED QUESTIONS ACCORDION
          ========================================================================= */}
      <section className="pricing-section-pad" style={{ backgroundColor: '#ffffff', borderTop: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--premium-blue)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              HAVE QUESTIONS?
            </div>
            <h2 style={{ fontSize: 'clamp(25px, 4.5vw, 36px)', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.02em', marginBottom: 10 }}>
              Frequently Asked Questions
            </h2>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)' }}>
              Everything college management needs to know about credits, modules, and billing.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {faqs.map((f, i) => {
              const isOpen = openFaq === i;
              return (
                <div 
                  key={i} 
                  style={{ 
                    border: '1.5px solid',
                    borderColor: isOpen ? 'var(--premium-blue)' : 'var(--line)', 
                    borderRadius: 14, 
                    overflow: 'hidden',
                    background: isOpen ? '#FBFDFF' : '#ffffff',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : i)}
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      background: 'none',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      cursor: 'pointer',
                      gap: 14
                    }}
                  >
                    <span style={{ fontSize: 15, fontWeight: 700, color: isOpen ? 'var(--premium-blue)' : 'var(--navy-950)', wordBreak: 'break-word' }}>
                      {f.q}
                    </span>
                    <span style={{ 
                      fontSize: 18, 
                      fontWeight: 700, 
                      color: isOpen ? 'var(--premium-blue)' : '#94A3B8',
                      transform: isOpen ? 'rotate(45deg)' : 'none',
                      transition: 'transform 0.2s ease',
                      flexShrink: 0
                    }}>
                      +
                    </span>
                  </button>

                  {isOpen && (
                    <div style={{ padding: '0 20px 18px', fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6, borderTop: '1px solid rgba(49, 87, 232, 0.1)' }}>
                      <p style={{ margin: '10px 0 0' }}>{f.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          FINAL HIGH-CONVERTING CTA BANNER
          ========================================================================= */}
      <section style={{ 
        background: 'radial-gradient(circle at 15% 20%, rgba(14, 165, 233, 0.4) 0%, transparent 50%), radial-gradient(circle at 85% 85%, rgba(246, 200, 76, 0.2) 0%, transparent 50%), linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', 
        textAlign: 'center', 
        color: '#ffffff',
        padding: 'clamp(52px, 7vw, 80px) clamp(16px, 4vw, 36px)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(26px, 5.5vw, 40px)', fontWeight: 800, marginBottom: 14, fontFamily: 'var(--font-display)', color: '#ffffff', letterSpacing: '-0.02em' }}>
            Ready to Upgrade Your College Testing?
          </h2>
          <p style={{ fontSize: 'clamp(14.5px, 2.4vw, 17.5px)', color: 'rgba(255, 255, 255, 0.88)', margin: '0 auto 30px', lineHeight: 1.6 }}>
            Set up your institutional account today and receive <strong style={{ color: '#F6C84C' }}>200 free welcome credits</strong> immediately upon verification.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <CtaLink 
              className="btn btn-primary" 
              style={{ 
                padding: '14px 32px', 
                fontSize: 15.5, 
                fontWeight: 800, 
                borderRadius: 12,
                background: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)',
                color: '#07154A',
                boxShadow: '0 6px 20px rgba(245, 158, 11, 0.45)',
                border: 'none',
                textDecoration: 'none'
              }}
            >
              {user ? 'Go to My Dashboard' : 'Get Started Free — 200 Credits Included →'}
            </CtaLink>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <MarketingFooter />
    </div>
  );
}
