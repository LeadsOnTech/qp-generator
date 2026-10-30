import { Link } from 'react-router-dom';

const LogoSvg = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#F6C84C"/>
    <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function MarketingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="landing-footer" style={{ background: '#07154A', color: 'rgba(255,255,255,0.85)', padding: '64px clamp(16px, 5vw, 64px) 32px' }}>
      <div className="footer-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 40, marginBottom: 48 }}>
        
        {/* Brand Column */}
        <div style={{ maxWidth: 320 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#ffffff', marginBottom: 12 }}>
            <LogoSvg />
            <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>QuestionStudio</span>
          </Link>
          <div style={{ fontSize: 11.5, color: '#F6C84C', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Your Questions. Your Standards.
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.7)', margin: '0 0 14px' }}>
            AI-powered question paper generation and DTP-grade LaTeX formatting exclusively for Indian coaching institutes, colleges, and educators.
          </p>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
            QuestionStudio is a proprietary product developed and operated by <strong>Leadson</strong> (Sole Proprietorship).
          </div>
        </div>

        {/* Product Links */}
        <div>
          <h4 style={{ color: '#ffffff', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Product</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5 }}>
            <li><Link to="/features" style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}>Features &amp; Highlights</Link></li>
            <li><Link to="/pricing" style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}>Pricing &amp; Credit Bundles</Link></li>
            <li><Link to="/signup" style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}>Claim 200 Free Credits</Link></li>
            <li><Link to="/login" style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}>Institute Sign In</Link></li>
          </ul>
        </div>

        {/* Supported Exams */}
        <div>
          <h4 style={{ color: '#ffffff', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Exams Covered</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5, color: 'rgba(255,255,255,0.75)' }}>
            <li>NEET (UG) Medical</li>
            <li>JEE Main (Physics, Chem, Math)</li>
            <li>JEE Advanced Standards</li>
            <li>AP EAPCET &amp; TG EAPCET / KCET</li>
            <li>Custom DPP &amp; Topic Tests</li>
          </ul>
        </div>

        {/* Legal & Company */}
        <div>
          <h4 style={{ color: '#ffffff', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Legal &amp; Policy</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13.5 }}>
            <li><Link to="/terms" style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}>Terms &amp; Conditions</Link></li>
            <li><Link to="/privacy" style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}>Privacy Policy (DPDPA)</Link></li>
            <li><Link to="/refund-policy" style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}>Refund &amp; Cancellation Policy</Link></li>
            <li><Link to="/contact" style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}>Contact &amp; Grievance Support</Link></li>
          </ul>
        </div>

      </div>

      {/* Bottom Bar */}
      <div style={{ maxWidth: 1200, margin: '0 auto', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, fontSize: 12.5, color: 'rgba(255,255,255,0.55)' }}>
        <div>
          © {currentYear} QuestionStudio. All rights reserved. A product of <strong>Leadson</strong>.
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link to="/privacy" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>Privacy</Link>
          <Link to="/terms" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>Terms</Link>
          <Link to="/refund-policy" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>Refunds</Link>
          <Link to="/contact" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>Contact</Link>
        </div>
      </div>
    </footer>
  );
}