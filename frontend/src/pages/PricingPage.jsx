import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';
import '../landing.css';

const LogoSvg = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#F6C84C"/>
    <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const faqs = [
  { 
    q: "What is a QuestionStudio credit?", 
    a: "One credit generates one complete verified question. If you choose to include full step-by-step worked solutions for your paper, solutions use 1 credit per question that has a worked solution." 
  },
  { 
    q: "How much does one credit cost?", 
    a: "The standard rate is ₹1 per credit. When you choose our Growth (₹10,000) or Institution (₹20,000) packs, you receive up to 25% extra bonus credits, lowering your effective cost to as low as ₹0.80 per question." 
  },
  { 
    q: "Do purchased credits ever expire?", 
    a: "Never! Your credits remain in your institute account indefinitely with lifetime validity. There are no monthly resets, no annual expirations, and no pressure during summer holidays or off-seasons." 
  },
  { 
    q: "Does creating or downloading the final PDF consume credits?", 
    a: "No! PDF generation, letterhead branding, question reordering, and unlimited PDF downloads are 100% free. You only spend credits once when assembling questions into your test paper." 
  },
  { 
    q: "What is the minimum recharge amount?", 
    a: "The minimum recharge is ₹5,000, giving you 5,000 credits. There is no maximum limit, and larger bundles include bonus credits." 
  },
  { 
    q: "Can I use credits across NEET, JEE, AP EAPCET, TG EAPCET, and KCET?", 
    a: "Yes! Your single credit balance works across all supported competitive exams including NEET (UG), JEE Main, AP EAPCET, TG EAPCET, and KCET." 
  },
  { 
    q: "How does this compare to hiring a DTP typing agency?", 
    a: "A DTP operator charges ₹500 to ₹1,200 per paper and takes 2 to 3 days with frequent typos. With QuestionStudio, a 75-question JEE paper costs just ₹75, is formatted in LaTeX with sharp diagrams in under 2 minutes, and carries your institute's custom letterhead automatically." 
  },
  { 
    q: "What payment methods are supported?", 
    a: "We support instant online recharge via Razorpay (UPI, Google Pay, PhonePe, Paytm, NetBanking, Credit & Debit Cards) as well as direct UPI/Bank transfer with invoice generation." 
  },
  { 
    q: "How do I claim my 200 Free Welcome Credits?", 
    a: "Simply click 'Get Started Free' and submit your institute visiting card or teacher ID. Once our verification team approves your institute (within 2-4 hours), 200 free credits are credited automatically to your account." 
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

  useEffect(() => {
    document.title = "QuestionStudio Pricing — Simple Pay-As-You-Go Credits | NEET, JEE, AP EAPCET, TG EAPCET, KCET";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", "Pay only for what you generate at ₹1/question. Zero subscriptions, lifetime credit validity, and 200 free welcome credits for Indian coaching institutes and colleges.");
    }
  }, []);

  useEffect(() => {
    if (user && user.role === 'INSTITUTE') {
      api.myInstitute().then(setInstitute).catch(console.error);
    }
  }, [user]);

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
    <div className="landing-page pricing-page" style={{ background: '#f8fafc', color: 'var(--ink)' }}>
      {/* HEADER */}
      <MarketingHeader activePage="pricing" />

      {/* HERO SECTION */}
      <section className="pricing-hero" style={{ 
        textAlign: 'center', 
        background: 'radial-gradient(circle at 50% 10%, rgba(49, 87, 232, 0.25) 0%, transparent 60%), radial-gradient(circle at 85% 80%, rgba(246, 200, 76, 0.12) 0%, transparent 50%), linear-gradient(145deg, #07154A 0%, #0F1E68 60%, #08113B 100%)', 
        color: '#ffffff',
        padding: 'clamp(48px, 8vw, 84px) clamp(16px, 5vw, 64px) clamp(56px, 9vw, 96px)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle Grid Pattern */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.05) 1.5px, transparent 1.5px)',
          backgroundSize: '40px 40px',
          opacity: 0.7,
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 900, margin: '0 auto' }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 8, 
            fontSize: 12.5, 
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
            <span>⚡</span> TRANSPARENT PAY-AS-YOU-GO • ZERO MONTHLY COMMITMENT
          </div>

          <h1 style={{ 
            fontSize: 'clamp(32px, 6vw, 54px)', 
            fontWeight: 800, 
            marginBottom: 20, 
            fontFamily: 'var(--font-display)', 
            letterSpacing: '-0.025em', 
            lineHeight: 1.16, 
            color: '#ffffff' 
          }}>
            Generate Exam Papers for ₹1/Question. <br />
            <span style={{ 
              background: 'linear-gradient(135deg, #FFE082 0%, #F6C84C 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 4px 24px rgba(246, 200, 76, 0.25)'
            }}>
              Never Pay an Expensive Monthly Retainer.
            </span>
          </h1>

          <p style={{ 
            fontSize: 'clamp(15px, 2.8vw, 19px)', 
            color: 'rgba(255, 255, 255, 0.85)', 
            maxWidth: 720, 
            margin: '0 auto 36px', 
            lineHeight: 1.6 
          }}>
            No lock-in contracts. No credit expiry. Assemble error-free NEET, JEE, AP EAPCET, TG EAPCET, and KCET papers with your custom logo and branding in 2 minutes.
          </p>
          
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <CtaLink 
              className="btn btn-primary" 
              style={{ 
                padding: '15px 34px', 
                fontSize: 16, 
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
            marginTop: 36, 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 16, 
            background: 'rgba(255, 255, 255, 0.06)', 
            border: '1px solid rgba(255, 255, 255, 0.12)', 
            padding: '10px 20px', 
            borderRadius: 999, 
            backdropFilter: 'blur(8px)',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #07154A', backgroundImage: 'url(/images/avatars/educator-indian-1.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #07154A', backgroundImage: 'url(/images/avatars/educator-indian-2.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', marginLeft: -8 }} />
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #07154A', backgroundImage: 'url(/images/avatars/educator-indian-3.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', marginLeft: -8 }} />
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #07154A', backgroundImage: 'url(/images/avatars/educator-indian-4.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', marginLeft: -8 }} />
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#4ADE80', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✓</span> Every verified institute starts with 200 FREE CREDITS!
            </div>
          </div>
        </div>
      </section>

      {/* USER BALANCE CALLOUT (IF LOGGED IN) */}
      {user && institute && (
        <div style={{ maxWidth: 1120, margin: '-32px auto 32px', padding: '0 20px', position: 'relative', zIndex: 10 }}>
          <div style={{ 
            background: '#ffffff', 
            border: '1.5px solid #3157E8', 
            borderRadius: 18, 
            padding: '20px 28px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            boxShadow: '0 12px 32px rgba(49, 87, 232, 0.12)',
            flexWrap: 'wrap',
            gap: 16
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Active Account Balance</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--navy-950)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'baseline', gap: 8 }}>
                {institute.creditBalance.toLocaleString()} <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--premium-blue)', fontFamily: 'var(--font-body)' }}>Available Credits</span>
              </div>
            </div>
            <Link to="/recharge" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: 14.5, fontWeight: 700 }}>
              + Top Up Credits Now
            </Link>
          </div>
        </div>
      )}

      {/* SECTION: 3 TEMPTING CREDIT BUNDLES */}
      <section style={{ maxWidth: 1200, margin: '48px auto', padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--premium-blue)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            TRANSPARENT VOLUME PACKAGES
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.02em', marginBottom: 12 }}>
            Choose Your Credit Package
          </h2>
          <p style={{ fontSize: 16.5, color: 'var(--ink-soft)', maxWidth: 640, margin: '0 auto', lineHeight: 1.5 }}>
            Pick a bundle to unlock volume bonus credits. Credits never expire and can be used anytime across all academic sessions.
          </p>
        </div>

        {/* 3 TIERS GRID */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: 28, 
          alignItems: 'stretch',
          marginBottom: 48
        }}>
          
          {/* TIER 1: STARTER */}
          <div style={{ 
            background: '#ffffff', 
            borderRadius: 22, 
            padding: '36px 28px', 
            border: '1.5px solid var(--line)', 
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            position: 'relative'
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Starter Pack
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 40, fontWeight: 800, color: 'var(--navy-950)' }}>₹5,000</span>
                <span style={{ fontSize: 14, color: 'var(--ink-soft)', fontWeight: 600 }}>one-time</span>
              </div>
              <div style={{ 
                padding: '10px 14px', 
                background: '#F1F5F9', 
                borderRadius: 10, 
                fontSize: 14, 
                fontWeight: 700, 
                color: 'var(--navy-900)', 
                marginBottom: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span>⚡</span> 5,000 Credits (₹1.00 / Question)
              </div>
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 24 }}>
                Ideal for individual subject faculty, tutors, and small coaching centres conducting weekly practice tests and DPPs.
              </p>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 20, marginBottom: 28 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy-900)', letterSpacing: '0.05em', marginBottom: 14 }}>
                  What's included:
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, color: 'var(--ink)' }}>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> 5,000 Verified Questions or Solutions
                  </li>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> Full NEET, JEE, AP EAPCET, TG EAPCET &amp; KCET Syllabuses
                  </li>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> Unlimited PDF Exports with Custom Logo
                  </li>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> Lifetime Validity — Zero Credit Expiry
                  </li>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> Standard WhatsApp Support
                  </li>
                </ul>
              </div>
            </div>

            <CtaLink 
              amount="5000"
              plan="starter"
              className="btn btn-ghost" 
              style={{ 
                width: '100%', 
                padding: '13px', 
                fontSize: 14.5, 
                fontWeight: 700, 
                justifyContent: 'center', 
                borderRadius: 10,
                border: '1.5px solid var(--line)',
                background: '#F8FAFC',
                textDecoration: 'none'
              }}
            >
              {user ? 'Recharge ₹5,000' : 'Select Starter Pack'}
            </CtaLink>
            {!user && (
              <div style={{ marginTop: 8, textAlign: 'center' }}>
                <Link to="/login?redirect=/recharge?amount=5000&plan=starter" style={{ fontSize: 12, color: 'var(--ink-soft)', textDecoration: 'underline' }}>
                  Existing institute? Sign in to buy →
                </Link>
              </div>
            )}
          </div>

          {/* TIER 2: GROWTH / ACADEMY (MOST POPULAR - HIGHLIGHTED!) */}
          <div style={{ 
            background: 'linear-gradient(180deg, #FFFFFF 0%, #FBFDFF 100%)', 
            borderRadius: 24, 
            padding: '36px 28px', 
            border: '2.5px solid #F59E0B', 
            boxShadow: '0 16px 40px rgba(245, 158, 11, 0.16)',
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            position: 'relative',
            transform: 'scale(1.03)',
            zIndex: 3
          }}>
            {/* Best Value Ribbon */}
            <div style={{ 
              position: 'absolute', 
              top: -15, 
              left: '50%', 
              transform: 'translateX(-50%)', 
              background: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)', 
              color: '#07154A', 
              padding: '6px 18px', 
              borderRadius: 999, 
              fontSize: 11.5, 
              fontWeight: 800, 
              letterSpacing: '0.06em', 
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
              whiteSpace: 'nowrap'
            }}>
              ⭐ MOST POPULAR • 15% EXTRA BONUS
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, marginTop: 4 }}>
                Growth Academy
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 42, fontWeight: 800, color: 'var(--navy-950)' }}>₹10,000</span>
                <span style={{ fontSize: 14, color: 'var(--ink-soft)', fontWeight: 600 }}>one-time</span>
              </div>
              
              <div style={{ 
                padding: '12px 14px', 
                background: 'rgba(245, 158, 11, 0.12)', 
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 12, 
                fontSize: 14.5, 
                fontWeight: 800, 
                color: '#B45309', 
                marginBottom: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span>🔥</span> 11,500 Credits (₹0.87 / Question)
              </div>
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 24 }}>
                The preferred pack for coaching academies conducting regular weekly tests, grand tests, and mock papers for 100+ students.
              </p>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 20, marginBottom: 28 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy-900)', letterSpacing: '0.05em', marginBottom: 14 }}>
                  Everything in Starter, plus:
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, color: 'var(--ink)' }}>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#F59E0B', fontWeight: 800 }}>★</span> <strong style={{ color: '#B45309' }}>+1,500 Free Bonus Credits</strong> (₹1,500 Value)
                  </li>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> Total 11,500 Exam Questions &amp; Solutions
                  </li>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> High-Speed Bulk Generation &amp; Assembly
                  </li>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> Full Worked Solutions Section on Demand
                  </li>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> Priority WhatsApp Onboarding &amp; Support
                  </li>
                </ul>
              </div>
            </div>

            <CtaLink 
              amount="10000"
              plan="growth"
              className="btn btn-primary" 
              style={{ 
                width: '100%', 
                padding: '14px', 
                fontSize: 15, 
                fontWeight: 800, 
                justifyContent: 'center', 
                borderRadius: 12,
                background: 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)',
                color: '#07154A',
                boxShadow: '0 4px 16px rgba(245, 158, 11, 0.4)',
                border: 'none',
                textDecoration: 'none'
              }}
            >
              {user ? 'Recharge ₹10,000 (Get 11,500 Cr)' : 'Choose Growth Pack (Save 15%) →'}
            </CtaLink>
            {!user && (
              <div style={{ marginTop: 8, textAlign: 'center' }}>
                <Link to="/login?redirect=/recharge?amount=10000&plan=growth" style={{ fontSize: 12, color: 'var(--ink-soft)', textDecoration: 'underline' }}>
                  Existing institute? Sign in to buy →
                </Link>
              </div>
            )}
          </div>

          {/* TIER 3: INSTITUTION MASTER (MAX SAVINGS) */}
          <div style={{ 
            background: '#ffffff', 
            borderRadius: 22, 
            padding: '36px 28px', 
            border: '1.5px solid var(--line)', 
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            position: 'relative'
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--premium-blue)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Institution Master
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 40, fontWeight: 800, color: 'var(--navy-950)' }}>₹20,000</span>
                <span style={{ fontSize: 14, color: 'var(--ink-soft)', fontWeight: 600 }}>one-time</span>
              </div>
              <div style={{ 
                padding: '10px 14px', 
                background: '#EEF0FF', 
                borderRadius: 10, 
                fontSize: 14, 
                fontWeight: 700, 
                color: 'var(--premium-blue)', 
                marginBottom: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span>🚀</span> 25,000 Credits (₹0.80 / Question)
              </div>
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 24 }}>
                For junior colleges, multi-branch institutes, and premier residential academies running annual test series.
              </p>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 20, marginBottom: 28 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--navy-900)', letterSpacing: '0.05em', marginBottom: 14 }}>
                  Maximum institutional perks:
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, color: 'var(--ink)' }}>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: 'var(--premium-blue)', fontWeight: 800 }}>★</span> <strong style={{ color: 'var(--premium-blue)' }}>+5,000 Free Bonus Credits</strong> (₹5,000 Value)
                  </li>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> 25,000 Questions (Enough for 250+ full tests)
                  </li>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> Custom High-Resolution Letterhead Setup
                  </li>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> Multi-Faculty Login Credentials
                  </li>
                  <li style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ color: '#16A34A', fontWeight: 800 }}>✓</span> Dedicated Institute Manager on WhatsApp
                  </li>
                </ul>
              </div>
            </div>

            <CtaLink 
              amount="20000"
              plan="institution"
              className="btn btn-ghost" 
              style={{ 
                width: '100%', 
                padding: '13px', 
                fontSize: 14.5, 
                fontWeight: 700, 
                justifyContent: 'center', 
                borderRadius: 10,
                border: '1.5px solid var(--premium-blue)',
                color: 'var(--premium-blue)',
                background: '#F8FAFC',
                textDecoration: 'none'
              }}
            >
              {user ? 'Recharge ₹20,000 (Get 25,000 Cr)' : 'Get Institution Pack →'}
            </CtaLink>
            {!user && (
              <div style={{ marginTop: 8, textAlign: 'center' }}>
                <Link to="/login?redirect=/recharge?amount=20000&plan=institution" style={{ fontSize: 12, color: 'var(--ink-soft)', textDecoration: 'underline' }}>
                  Existing institute? Sign in to buy →
                </Link>
              </div>
            )}
          </div>

        </div>

        {/* CUSTOM AMOUNT RECHARGE BOX */}
        <div style={{ 
          background: '#ffffff', 
          borderRadius: 20, 
          padding: 'clamp(24px, 4vw, 40px)', 
          border: '1.5px solid var(--line)', 
          boxShadow: '0 6px 24px rgba(0, 0, 0, 0.05)',
          maxWidth: 900,
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy-950)', margin: '0 0 6px' }}>Need a Custom Recharge Amount?</h3>
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', margin: 0 }}>Enter any custom amount (min ₹5,000). Bonus credits apply automatically.</p>
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
                    padding: '6px 12px',
                    fontSize: 13,
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24, alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--navy-900)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Recharge Amount (₹)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 22, fontWeight: 700, color: 'var(--ink-soft)' }}>₹</span>
                <input 
                  type="number" 
                  step="500"
                  min="5000"
                  value={customAmount} 
                  onChange={e => setCustomAmount(e.target.value)} 
                  style={{ 
                    width: '100%', 
                    padding: '14px 16px 14px 40px', 
                    fontSize: 22, 
                    fontWeight: 800, 
                    borderRadius: 12, 
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
              padding: '18px 24px', 
              borderRadius: 14, 
              border: '1px dashed #3157E8', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between' 
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--premium-blue)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Credits Received
                </div>
                <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--navy-950)', fontFamily: 'var(--font-mono)' }}>
                  {totalCustomCredits.toLocaleString()}
                </div>
              </div>
              {bonusCredits > 0 && (
                <div style={{ background: '#DCFCE7', color: '#16A34A', padding: '6px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 800, textAlign: 'right' }}>
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
                      padding: '16px', 
                      fontSize: 15.5, 
                      fontWeight: 700, 
                      justifyContent: 'center', 
                      display: 'flex',
                      borderRadius: 12,
                      textDecoration: 'none'
                    }}
                  >
                    {user ? `Proceed to Pay ₹${numAmount.toLocaleString()} →` : 'Create Account to Recharge →'}
                  </CtaLink>
                  {!user && (
                    <div style={{ marginTop: 8, textAlign: 'center' }}>
                      <Link to={`/login?redirect=/recharge?amount=${customAmount}&plan=custom`} style={{ fontSize: 12, color: 'var(--ink-soft)', textDecoration: 'underline' }}>
                        Existing institute? Sign in to buy →
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                <button disabled style={{ width: '100%', padding: '16px', fontSize: 14.5, borderRadius: 12, border: 'none', background: '#E2E8F0', color: '#94A3B8', fontWeight: 600 }}>
                  Minimum recharge is ₹5,000
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE EXAM COST ESTIMATOR ("SEE WHAT YOUR CREDITS CAN DO") */}
      <section className="pricing-section-pad" style={{ backgroundColor: '#ffffff', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--premium-blue)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              REAL-WORLD USAGE CALCULATOR
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.02em', marginBottom: 12 }}>
              See What Your Credits Can Do
            </h2>
            <p style={{ fontSize: 16, color: 'var(--ink-soft)', maxWidth: 640, margin: '0 auto', lineHeight: 1.5 }}>
              Choose an exam format below to see the exact cost per paper. Compare it with the high price and turnaround time of typing agencies!
            </p>

            {/* Exam Preset Selector Tabs */}
            <div style={{ display: 'inline-flex', background: '#F1F5F9', padding: 6, borderRadius: 12, marginTop: 24, gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => selectExamPreset('JEE')}
                style={{
                  background: examType === 'JEE' ? '#3157E8' : 'transparent',
                  color: examType === 'JEE' ? '#ffffff' : 'var(--ink)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 18px',
                  fontSize: 14,
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
                  padding: '9px 18px',
                  fontSize: 14,
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
                  padding: '9px 18px',
                  fontSize: 14,
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
                  padding: '9px 18px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                ⚙️ Custom Slider
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32, alignItems: 'center' }}>
            {/* Interactive Calculator Controls */}
            <div style={{ background: '#F8FAFC', padding: 'clamp(24px, 4vw, 36px)', borderRadius: 22, border: '1.5px solid var(--line)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy-950)', marginBottom: 20 }}>
                {examType === 'CUSTOM' ? 'Customize Your Paper Specs' : `${examType} Exam Specifications`}
              </h3>

              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14.5, fontWeight: 700, marginBottom: 10 }}>
                  <span>Questions in this Paper</span>
                  <span style={{ color: 'var(--premium-blue)', fontFamily: 'var(--font-mono)', fontSize: 16 }}>{calcQ} Questions</span>
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

              <div style={{ marginBottom: 28, background: '#ffffff', padding: '14px 16px', borderRadius: 12, border: '1px solid var(--line)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: 0 }}>
                  <input 
                    type="checkbox" 
                    checked={includeSol} 
                    onChange={e => setIncludeSol(e.target.checked)} 
                    style={{ width: 18, height: 18, accentColor: 'var(--premium-blue)' }} 
                  />
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy-900)' }}>Include Full Worked Solutions (+{calcQ} Credits)</span>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Answer key is always free. Worked solutions are optional.</div>
                  </div>
                </label>
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 10, color: 'var(--ink-soft)' }}>
                  <span>Question Assembling:</span>
                  <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{calcQ} Credits</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 10, color: 'var(--ink-soft)' }}>
                  <span>Worked Solutions Add-on:</span>
                  <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{includeSol ? `${calcQ} Credits` : '₹0 (Answer Key Included Free)'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 16, color: 'var(--ink-soft)' }}>
                  <span>PDF &amp; Logo Branding:</span>
                  <span style={{ fontWeight: 800, color: '#16A34A' }}>FREE</span>
                </div>

                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  background: 'linear-gradient(135deg, #07154A 0%, #101F66 100%)', 
                  color: '#ffffff', 
                  padding: '16px 20px', 
                  borderRadius: 14 
                }}>
                  <div>
                    <div style={{ fontSize: 11.5, color: '#F6C84C', fontWeight: 700, textTransform: 'uppercase' }}>Total QuestionStudio Cost</div>
                    <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                      ₹{includeSol ? calcQ * 2 : calcQ}
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, textAlign: 'right', color: 'rgba(255, 255, 255, 0.8)' }}>
                    Just <strong>{includeSol ? calcQ * 2 : calcQ} credits</strong><br />Generated in 2 minutes
                  </div>
                </div>
              </div>
            </div>

            {/* Savings & Comparison vs DTP Agency */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ 
                background: '#FEF3C7', 
                border: '1.5px solid #F59E0B', 
                borderRadius: 18, 
                padding: '24px', 
                boxShadow: '0 8px 24px rgba(245, 158, 11, 0.12)' 
              }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  💰 MASSIVE COST COMPARISON
                </div>
                <h4 style={{ fontSize: 20, fontWeight: 800, color: '#78350F', margin: '0 0 12px' }}>
                  You Save Over 85% per Test Paper
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, background: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>DTP Typing Agency:</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#DC2626' }}>₹600 – ₹1,200</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>⏰ Takes 2–3 Days</div>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: 14 }}>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>QuestionStudio:</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#16A34A' }}>₹{includeSol ? calcQ * 2 : calcQ}</div>
                    <div style={{ fontSize: 11.5, color: '#16A34A', fontWeight: 700, marginTop: 2 }}>⚡ Ready in 2 Minutes</div>
                  </div>
                </div>

                <div style={{ fontSize: 13.5, color: '#92400E', lineHeight: 1.5 }}>
                  Generating 20 test papers per month saves your institute over <strong>₹15,000 to ₹22,000 every single month</strong> while completely eliminating typing mistakes.
                </div>
              </div>

              <div style={{ 
                background: '#F8FAFC', 
                border: '1px solid var(--line)', 
                borderRadius: 18, 
                padding: '22px 24px' 
              }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy-950)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🛡️</span> Zero Watermark, 100% White-Label
                </div>
                <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>
                  Your generated papers feature only your institute's name, address, phone number, and logo. There is no QuestionStudio branding on student printouts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY THIS PRICING MODEL WORKS (6 VALUE HIGHLIGHTS) */}
      <section className="pricing-section-pad" style={{ backgroundColor: '#F8FAFC' }}>
        <div style={{ textAlign: 'center', marginBottom: 44, maxWidth: 700, margin: '0 auto 44px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--premium-blue)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            DESIGNED FOR INDIAN ACADEMIES
          </div>
          <h2 style={{ fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.02em', marginBottom: 12 }}>
            Built Around the Way You Actually Work
          </h2>
          <p style={{ fontSize: 16, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
            Traditional software forces you into costly yearly contracts. QuestionStudio gives you complete freedom.
          </p>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, maxWidth: 1100, margin: '0 auto' }}>
          {[
            { 
              icon: '💳', 
              title: 'NO MONTHLY SUBSCRIPTIONS', 
              body: 'Pay only when you actually generate papers. Zero recurring fees weighing you down during vacation months and off-seasons.' 
            },
            { 
              icon: '⏳', 
              title: 'LIFETIME CREDIT VALIDITY', 
              body: 'Credits never expire. Recharge today and use your credits whenever you need them across future academic terms.' 
            },
            { 
              icon: '📊', 
              title: 'NO HIDDEN LIMITS', 
              body: '1 Question = 1 Credit. Transparent balance deduction with real-time audit logs in your dashboard.' 
            },
            { 
              icon: '🏷️', 
              title: 'SIMPLE 1:1 BASE RATE', 
              body: '₹1 = 1 Credit base pricing, with up to 25% extra bonus credits included free on high-volume recharges.' 
            },
            { 
              icon: '📄', 
              title: 'FREE PDF GENERATION', 
              body: 'Generate, reorder questions, and download ready-to-print vector PDFs with your logo completely free.' 
            },
            { 
              icon: '🎁', 
              title: '200 FREE WELCOME CREDITS', 
              body: 'Every newly approved institute gets 200 free credits immediately to test and verify the paper quality risk-free.' 
            }
          ].map((c, i) => (
            <div key={i} style={{ 
              background: '#ffffff', 
              padding: '28px 24px', 
              borderRadius: 18, 
              border: '1px solid var(--line)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}>
              <div style={{ fontSize: 28, marginBottom: 14 }}>{c.icon}</div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--navy-950)', marginBottom: 8, letterSpacing: '0.04em' }}>{c.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.55, margin: 0 }}>{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COMPARISON TABLE: QUESTIONSTUDIO VS DTP VS LEGACY SOFTWARE */}
      <section className="pricing-section-pad" style={{ backgroundColor: '#ffffff', borderTop: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <h2 style={{ fontSize: 'clamp(26px, 5vw, 34px)', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.02em', marginBottom: 12 }}>
              Why Institutes Switch to QuestionStudio
            </h2>
            <p style={{ fontSize: 16, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              Compare QuestionStudio with traditional options coaching institutes use in India.
            </p>
          </div>

          <div className="table-wrap" style={{ borderRadius: 18, border: '1.5px solid var(--line)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 640 }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  <th style={{ padding: '16px 20px', fontSize: 13, fontWeight: 800, color: 'var(--navy-900)' }}>Feature</th>
                  <th style={{ padding: '16px 20px', fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)' }}>Manual DTP / Typing Agency</th>
                  <th style={{ padding: '16px 20px', fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)' }}>Traditional Question Bank Software</th>
                  <th style={{ padding: '16px 20px', fontSize: 14, fontWeight: 800, color: '#3157E8', background: '#EEF0FF' }}>QuestionStudio</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 700 }}>Average Cost per Exam Paper</td>
                  <td style={{ padding: '16px 20px', color: '#DC2626' }}>₹600 – ₹1,200</td>
                  <td style={{ padding: '16px 20px', color: '#DC2626' }}>₹25,000 – ₹50,000 / year upfront</td>
                  <td style={{ padding: '16px 20px', fontWeight: 800, color: '#16A34A', background: '#F9FAFF' }}>₹30 – ₹100 pay-as-you-go</td>
                </tr>
                <tr style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 700 }}>Paper Turnaround Time</td>
                  <td style={{ padding: '16px 20px', color: 'var(--ink-soft)' }}>2 to 4 business days</td>
                  <td style={{ padding: '16px 20px', color: 'var(--ink-soft)' }}>1 to 2 hours manual picking</td>
                  <td style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--premium-blue)', background: '#F9FAFF' }}>Under 2 Minutes</td>
                </tr>
                <tr style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 700 }}>Contract Lock-in</td>
                  <td style={{ padding: '16px 20px', color: 'var(--ink-soft)' }}>Per-paper negotiation</td>
                  <td style={{ padding: '16px 20px', color: '#DC2626' }}>1-Year rigid subscription</td>
                  <td style={{ padding: '16px 20px', fontWeight: 800, color: '#16A34A', background: '#F9FAFF' }}>Zero lock-in, lifetime validity</td>
                </tr>
                <tr style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 700 }}>Formula &amp; LaTeX Equations</td>
                  <td style={{ padding: '16px 20px', color: '#DC2626' }}>Frequent font errors &amp; typos</td>
                  <td style={{ padding: '16px 20px', color: 'var(--ink-soft)' }}>Blurry bitmaps / low res</td>
                  <td style={{ padding: '16px 20px', fontWeight: 800, color: '#16A34A', background: '#F9FAFF' }}>Vector-sharp LaTeX diagrams</td>
                </tr>
                <tr style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 700 }}>White-Label Letterhead</td>
                  <td style={{ padding: '16px 20px', color: 'var(--ink-soft)' }}>Manual MS Word copy-paste</td>
                  <td style={{ padding: '16px 20px', color: 'var(--ink-soft)' }}>Inflexible templates</td>
                  <td style={{ padding: '16px 20px', fontWeight: 800, color: 'var(--premium-blue)', background: '#F9FAFF' }}>Instant automatic header logo</td>
                </tr>
                <tr style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 700 }}>Free Trial</td>
                  <td style={{ padding: '16px 20px', color: '#DC2626' }}>None</td>
                  <td style={{ padding: '16px 20px', color: 'var(--ink-soft)' }}>Watermarked sample only</td>
                  <td style={{ padding: '16px 20px', fontWeight: 800, color: '#16A34A', background: '#F9FAFF' }}>200 Free Credits to test live</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* PAYMENT MODES */}
      <section className="pricing-section-pad" style={{ backgroundColor: '#F8FAFC' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800, color: 'var(--navy-950)', marginBottom: 8 }}>
              Secure Payment Options
            </h2>
            <p style={{ fontSize: 15, color: 'var(--ink-soft)', margin: 0 }}>
              Instant automated checkout or direct UPI/Bank invoice.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            <div style={{ background: '#ffffff', padding: '28px', borderRadius: 18, border: '1px solid var(--line)' }}>
              <div style={{ width: 44, height: 44, background: '#EEF0FF', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--premium-blue)" strokeWidth="2.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy-950)', marginBottom: 8 }}>Pay Online via Razorpay</h3>
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 20, lineHeight: 1.5 }}>
                Instant credit allocation using Razorpay. Supports UPI (Google Pay, PhonePe, Paytm), NetBanking, Credit and Debit Cards.
              </p>
              {user ? (
                <Link to="/recharge" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14 }}>Recharge via Gateway →</Link>
              ) : (
                <Link to="/signup" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--premium-blue)', textDecoration: 'none' }}>Sign up to recharge →</Link>
              )}
            </div>
            
            <div style={{ background: '#ffffff', padding: '28px', borderRadius: 18, border: '1px solid var(--line)' }}>
              <div style={{ width: 44, height: 44, background: '#FEF3C7', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M7 7h.01"/><path d="M17 7h.01"/><path d="M7 17h.01"/><path d="M17 17h.01"/></svg>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy-950)', marginBottom: 8 }}>Pay via UPI QR / Bank Transfer</h3>
              <p style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 20, lineHeight: 1.5 }}>
                Direct UPI QR scan or NEFT/IMPS bank transfer with GST invoice. Credits are credited upon payment UTR verification.
              </p>
              {user ? (
                <Link to="/recharge" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, border: '1.5px solid var(--line)' }}>View Bank &amp; UPI Details →</Link>
              ) : (
                <Link to="/signup" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--premium-blue)', textDecoration: 'none' }}>Sign up to view details →</Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MODERN INTERACTIVE FAQ ACCORDION */}
      <section className="pricing-section-pad" style={{ backgroundColor: '#ffffff', borderTop: '1px solid var(--line)' }}>
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--premium-blue)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              HAVE QUESTIONS?
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 800, color: 'var(--navy-950)', letterSpacing: '-0.02em', marginBottom: 10 }}>
              Frequently Asked Questions
            </h2>
            <p style={{ fontSize: 15.5, color: 'var(--ink-soft)' }}>
              Everything you need to know about QuestionStudio credits and billing.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                      padding: '18px 22px',
                      background: 'none',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      cursor: 'pointer',
                      gap: 16
                    }}
                  >
                    <span style={{ fontSize: 16, fontWeight: 700, color: isOpen ? 'var(--premium-blue)' : 'var(--navy-950)' }}>
                      {f.q}
                    </span>
                    <span style={{ 
                      fontSize: 20, 
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
                    <div style={{ padding: '0 22px 20px', fontSize: 14.5, color: 'var(--ink-soft)', lineHeight: 1.6, borderTop: '1px solid rgba(49, 87, 232, 0.1)' }}>
                      <p style={{ margin: '14px 0 0' }}>{f.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FINAL HIGH-CONVERTING CTA BANNER */}
      <section style={{ 
        background: 'radial-gradient(circle at 15% 20%, rgba(49, 87, 232, 0.35) 0%, transparent 50%), radial-gradient(circle at 85% 85%, rgba(246, 200, 76, 0.2) 0%, transparent 50%), linear-gradient(135deg, #07154A 0%, #101F66 100%)', 
        textAlign: 'center', 
        color: '#ffffff',
        padding: 'clamp(56px, 8vw, 84px) clamp(20px, 4vw, 40px)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 680, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: 800, marginBottom: 18, fontFamily: 'var(--font-display)', color: '#ffffff', letterSpacing: '-0.02em' }}>
            Ready to Start Generating Smarter?
          </h2>
          <p style={{ fontSize: 'clamp(15px, 2.8vw, 19px)', color: 'rgba(255, 255, 255, 0.85)', margin: '0 auto 36px', lineHeight: 1.6 }}>
            Set up your institute account today and receive <strong style={{ color: '#F6C84C' }}>200 free welcome credits</strong> immediately upon verification.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <CtaLink 
              className="btn btn-primary" 
              style={{ 
                padding: '16px 36px', 
                fontSize: 16, 
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
