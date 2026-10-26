import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import '../landing.css';

const LogoSvg = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor"/>
    <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const GraphicRegister = () => (
  <svg width="260" height="200" viewBox="0 0 260 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0px 20px 30px rgba(7,21,74,0.06))' }}>
    <path d="M110 160 h40 v20 h-40 z" fill="#E2E8F0"/>
    <path d="M90 180 h80 v10 c0 5 -5 5 -10 5 h-60 c-5 0 -10 0 -10 -5 z" fill="#CBD5E1"/>
    <rect x="20" y="20" width="220" height="140" rx="12" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2"/>
    <path d="M20 32 c0 -6.6 5.4 -12 12 -12 h196 c6.6 0 12 5.4 12 12 v20 h-220 z" fill="#3157E8"/>
    <circle cx="36" cy="32" r="4" fill="#FDE047"/>
    <circle cx="52" cy="32" r="4" fill="#4ADE80"/>
    <rect x="40" y="70" width="80" height="12" rx="6" fill="#F1F5F9"/>
    <rect x="40" y="90" width="140" height="40" rx="8" fill="#F8FAFC"/>
    <circle cx="60" cy="110" r="12" fill="#E2E8F0"/>
    <rect x="80" y="100" width="80" height="6" rx="3" fill="#E2E8F0"/>
    <rect x="80" y="112" width="60" height="6" rx="3" fill="#E2E8F0"/>
    <g transform="translate(160, 110)">
      <circle cx="40" cy="40" r="32" fill="#FFFFFF" filter="drop-shadow(0px 10px 15px rgba(0,0,0,0.15))"/>
      <circle cx="40" cy="30" r="10" fill="#3157E8"/>
      <path d="M24 54 c0 -8.8 7.2 -16 16 -16 c8.8 0 16 7.2 16 16" fill="#3157E8" stroke="#3157E8" strokeWidth="2" strokeLinecap="round"/>
    </g>
  </svg>
);

const GraphicChoose = () => (
  <svg width="240" height="200" viewBox="0 0 240 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0px 20px 30px rgba(7,21,74,0.06))' }}>
    <rect x="35" y="35" width="200" height="140" rx="12" fill="#EEF2FF"/>
    <rect x="20" y="20" width="200" height="140" rx="12" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2"/>
    <path d="M20 32 c0 -6.6 5.4 -12 12 -12 h176 c6.6 0 12 5.4 12 12 v20 h-200 z" fill="#3157E8"/>
    <circle cx="36" cy="32" r="3" fill="#FFFFFF" opacity="0.8"/>
    <circle cx="48" cy="32" r="3" fill="#FFFFFF" opacity="0.8"/>
    <circle cx="60" cy="32" r="3" fill="#FFFFFF" opacity="0.8"/>
    
    <rect x="36" y="64" width="168" height="24" rx="4" fill="#F8FAFC"/>
    <rect x="44" y="68" width="16" height="16" rx="4" fill="#EEF2FF" stroke="#3157E8" strokeWidth="1.5"/>
    <path d="M48 76 l2 2 l6 -6" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="68" y="72" width="100" height="8" rx="4" fill="#E2E8F0"/>
    
    <rect x="36" y="96" width="168" height="24" rx="4" fill="#F8FAFC"/>
    <rect x="44" y="100" width="16" height="16" rx="4" fill="#EEF2FF" stroke="#3157E8" strokeWidth="1.5"/>
    <path d="M48 108 l2 2 l6 -6" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="68" y="104" width="80" height="8" rx="4" fill="#E2E8F0"/>
    
    <rect x="36" y="128" width="168" height="24" rx="4" fill="#F8FAFC"/>
    <rect x="44" y="132" width="16" height="16" rx="4" fill="#EEF2FF" stroke="#3157E8" strokeWidth="1.5"/>
    <path d="M48 140 l2 2 l6 -6" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="68" y="136" width="120" height="8" rx="4" fill="#E2E8F0"/>
  </svg>
);

const GraphicDownload = () => (
  <svg width="240" height="220" viewBox="0 0 240 220" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0px 20px 30px rgba(7,21,74,0.06))' }}>
    <g transform="rotate(6 120 110)">
      <rect x="40" y="20" width="140" height="180" rx="8" fill="#EEF2FF"/>
    </g>
    <rect x="30" y="10" width="140" height="180" rx="8" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2"/>
    
    {/* Q1 */}
    <rect x="40" y="26" width="100" height="6" rx="3" fill="#64748B"/>
    <rect x="40" y="36" width="40" height="4" rx="2" fill="#94A3B8"/>
    <circle cx="45" cy="48" r="4" fill="none" stroke="#CBD5E1" strokeWidth="1.5"/>
    <rect x="52" y="46" width="20" height="4" rx="2" fill="#E2E8F0"/>
    <circle cx="95" cy="48" r="4" fill="#22C55E"/>
    <circle cx="95" cy="48" r="1.5" fill="#FFFFFF"/>
    <rect x="102" y="46" width="25" height="4" rx="2" fill="#94A3B8"/>
    <circle cx="45" cy="60" r="4" fill="none" stroke="#CBD5E1" strokeWidth="1.5"/>
    <rect x="52" y="58" width="25" height="4" rx="2" fill="#E2E8F0"/>
    <circle cx="95" cy="60" r="4" fill="none" stroke="#CBD5E1" strokeWidth="1.5"/>
    <rect x="102" y="58" width="15" height="4" rx="2" fill="#E2E8F0"/>

    {/* Q2 */}
    <rect x="40" y="76" width="115" height="6" rx="3" fill="#64748B"/>
    <rect x="40" y="86" width="70" height="4" rx="2" fill="#94A3B8"/>
    <circle cx="45" cy="98" r="4" fill="none" stroke="#CBD5E1" strokeWidth="1.5"/>
    <rect x="52" y="96" width="30" height="4" rx="2" fill="#E2E8F0"/>
    <circle cx="95" cy="98" r="4" fill="none" stroke="#CBD5E1" strokeWidth="1.5"/>
    <rect x="102" y="96" width="20" height="4" rx="2" fill="#E2E8F0"/>
    <circle cx="45" cy="110" r="4" fill="#3157E8"/>
    <circle cx="45" cy="110" r="1.5" fill="#FFFFFF"/>
    <rect x="52" y="108" width="25" height="4" rx="2" fill="#94A3B8"/>
    <circle cx="95" cy="110" r="4" fill="none" stroke="#CBD5E1" strokeWidth="1.5"/>
    <rect x="102" y="108" width="35" height="4" rx="2" fill="#E2E8F0"/>

    <g transform="translate(10, 110)">
      <rect x="0" y="0" width="48" height="32" rx="8" fill="#EF4444" filter="drop-shadow(0px 8px 12px rgba(239,68,68,0.3))"/>
      <text x="24" y="21" fill="white" fontSize="14" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">PDF</text>
    </g>
    
    <g transform="translate(130, 130)">
      <circle cx="32" cy="32" r="28" fill="#22C55E" filter="drop-shadow(0px 10px 20px rgba(34,197,94,0.3))"/>
      <circle cx="32" cy="32" r="27" fill="none" stroke="#FFFFFF" strokeWidth="2"/>
      <path d="M32 20 v16 M24 28 l8 8 l8 -8 M20 40 h24" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </g>
  </svg>
);

const features = [
  {
    title: 'No separate DTP operator needed',
    body: 'Papers are formatted, laid out, and print-ready the moment you click Generate — no typing service, no per-page charges, no waiting.',
  },
  {
    title: 'No faculty need to set questions manually',
    body: 'Pull straight from a verified, chapter-wise question bank. Your teachers focus on teaching, not typing tests every week.',
  },
  {
    title: 'No manual error checking',
    body: 'Every question passes through subject-specialist quality checks before it ever reaches a paper — wrong answers and typos are caught automatically.',
  },
  {
    title: 'Never run out of questions',
    body: 'A constantly growing bank across every chapter and difficulty level — ensuring you always have fresh, relevant questions.',
  },
  {
    title: 'Your own branding, every time',
    body: 'Your logo, your institute name, your letterhead — automatically on every single paper, with zero extra effort.',
  },
  {
    title: 'Minutes, not days',
    body: 'Pick the exam, chapters, and difficulty mix. Preview it. Download it. What used to take a full day now takes minutes.',
  },
];

const steps = [
  { n: '1', visual: <GraphicRegister />, title: 'Register your institute', body: 'Create your free account and add your branding — logo, name, contact details.' },
  { n: '2', visual: <GraphicChoose />, title: 'Choose what you need', body: 'Pick the exam, subjects, chapters, and difficulty mix for your paper.' },
  { n: '3', visual: <GraphicDownload />, title: 'Download & Print', body: 'Preview the paper, confirm, and get a polished, ready-to-print PDF instantly.' },
];

export default function LandingPage() {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!loading && user) {
    return <Navigate to={user.role === 'ADMIN' ? '/dashboard' : '/institute-dashboard'} replace />;
  }

  return (
    <div className="landing-page">
      {/* HEADER */}
      <header className={`landing-header ${scrolled ? 'scrolled' : ''}`}>
        <Link to="/" className="brand-logo">
          <LogoSvg />
          QuestionStudio
        </Link>
        <nav className="nav-links">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/features" className="nav-link">Features</Link>
          <Link to="/pricing" className="nav-link">Pricing</Link>
        </nav>
        <div className="header-actions">
          <Link to="/login" className="btn-signin">Sign In</Link>
          <Link to="/signup" className="btn-primary-yellow">Get Started Free</Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">For NEET "¢ JEE "¢ EAMCET Coaching Institutes</div>
            <h1 className="hero-title">
              Generate exam-ready question papers <span>in minutes</span>, not days
            </h1>
            <p className="hero-subtitle">
              A complete question bank, quality-checked and ready to assemble — with your institute's own branding on every paper.
              <br/><br/>
              No typing service. No manual proofreading. No last-minute scramble.
            </p>
            <div className="hero-actions">
              <Link to="/signup" className="btn-primary-yellow" style={{ padding: '14px 28px' }}>
                Register Your Institute — Free
                <span className="btn-icon-right">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </span>
              </Link>
              <a href="#how-it-works" className="btn-outline-white">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8 }}>
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                See How It Works</a>
            </div>
          </div>
          
          <div className="hero-visual">
            <div className="hero-image-shadow-2"></div>
            <div className="hero-image-shadow-1"></div>
            <div className="hero-image-mock">
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #E5E7EB', paddingBottom: 16, marginBottom: 20 }}>
                <div style={{ width: 140, height: 12, background: 'var(--premium-blue)', borderRadius: 4 }}></div>
                <div style={{ width: 40, height: 12, background: 'var(--premium-lavender)', borderRadius: 4 }}></div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* High Contrast Objective Question Line */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#3157E8', lineHeight: 1 }}>{i}.</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ width: '95%', height: 6, background: '#475569', borderRadius: 3, marginBottom: 6 }}></div>
                        {i !== 3 && <div style={{ width: '70%', height: 6, background: '#64748B', borderRadius: 3 }}></div>}
                      </div>
                    </div>
                    {/* Beautiful Badged Options */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', paddingLeft: 18 }}>
                      {['A', 'B', 'C', 'D'].map(opt => {
                        const isSelected = (i === 1 && opt === 'C') || (i === 2 && opt === 'A') || (i === 3 && opt === 'D');
                        return (
                          <div key={opt} style={{ 
                            display: 'flex', alignItems: 'center', gap: 8, 
                            background: isSelected ? 'rgba(49, 87, 232, 0.08)' : 'transparent', 
                            padding: '4px 6px', borderRadius: 6,
                            border: isSelected ? '1px solid rgba(49, 87, 232, 0.2)' : '1px solid transparent'
                          }}>
                            <div style={{ 
                              width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                              border: isSelected ? 'none' : '1px solid #CBD5E1', 
                              background: isSelected ? '#3157E8' : '#F8FAFC', 
                              display: 'flex', alignItems: 'center', justifyContent: 'center', 
                              fontSize: 9, fontWeight: 700, 
                              color: isSelected ? '#fff' : '#94A3B8' 
                            }}>
                              {opt}
                            </div>
                            <div style={{ 
                              width: opt === 'A' || opt === 'C' ? '60%' : '80%', height: 4, 
                              background: isSelected ? '#3157E8' : '#CBD5E1', borderRadius: 2 
                            }}></div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              
              <div style={{ position: 'absolute', bottom: -24, right: -24, width: 72, height: 72, background: 'var(--premium-green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(34, 197, 94, 0.4)' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </div>

            <div className="floating-badge badge-ai">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--premium-blue)" strokeWidth="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Chapter Wise</span>
            </div>
            <div className="floating-badge badge-qc">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Quality Checked</span>
            </div>
            <div className="floating-badge badge-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--premium-lavender)" strokeWidth="2"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Smart Mix</span>
            </div>
            <div className="floating-badge badge-pr">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--premium-lavender)" strokeWidth="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Print Ready</span>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <div className="trust-strip">
        <div className="trust-item">
          <svg className="trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"/></svg>
          <div>
            <div className="trust-text">500+ Institutes</div>
            <div className="trust-subtext">Trust QuestionStudio</div>
          </div>
        </div>
        <div className="trust-item">
          <svg className="trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
          <div>
            <div className="trust-text">Quality Checked</div>
            <div className="trust-subtext">Questions</div>
          </div>
        </div>
        <div className="trust-item">
          <svg className="trust-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          <div>
            <div className="trust-text">4.8/5 from Educators</div>
            <div className="trust-subtext" style={{ color: 'var(--premium-yellow)' }}>★★★★★</div>
          </div>
        </div>
      </div>

      {/* WHY QUESTIONSTUDIO */}
      <section id="features" className="features-section">
        <div className="section-eyebrow">Why colleges switch to QuestionStudio</div>
        <h2 className="section-title">Everything that used to slow you down — <span>gone</span></h2>
        
        <div className="features-grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-card-number">
                {i + 1}
              </div>
              <h3 className="feature-card-title">{f.title}</h3>
              <p className="feature-card-body">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="how-it-works-section">
        <div className="section-eyebrow">Get started in three steps</div>
        <h2 className="section-title" style={{ marginBottom: 0 }}>How it works</h2>
        
        <div className="steps-container">
          <div className="step-connector-container">
            <div className="step-connector-line"></div>
            <div className="step-connector-arrow">»</div>
            <div className="step-connector-line"></div>
            <div className="step-connector-arrow">»</div>
            <div className="step-connector-line"></div>
          </div>
          {steps.map((s, i) => (
            <div key={i} className="step-card">
              <div className="step-number">{s.n}</div>
              <div className="step-visual-wrapper">{s.visual}</div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-body">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* NEW ATTRACTIVE CTA SECTION */}
      <section className="cta-section">
        <div className="cta-box">
          <div className="cta-box-content">
            <h2 className="cta-title">Ready to stop making papers the hard way?</h2>
            <p className="cta-subtitle">Join 500+ institutes saving hours every week. No credit card required.</p>
            <div className="cta-actions">
              <Link to="/signup" className="btn-primary-yellow cta-btn">
                Register Your Institute
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: 8 }}><polyline points="5 12 19 12 M12 5 l7 7 l-7 7"></polyline></svg>
              </Link>
            </div>
            
            <div className="cta-trust">
              <div className="cta-avatars">
                <div className="cta-avatar" style={{ backgroundImage: 'url(https://randomuser.me/api/portraits/men/43.jpg)', backgroundSize: 'cover' }}></div>
                <div className="cta-avatar" style={{ backgroundImage: 'url(https://randomuser.me/api/portraits/women/44.jpg)', backgroundSize: 'cover' }}></div>
                <div className="cta-avatar" style={{ backgroundImage: 'url(https://randomuser.me/api/portraits/men/22.jpg)', backgroundSize: 'cover' }}></div>
                <div className="cta-avatar" style={{ backgroundImage: 'url(https://randomuser.me/api/portraits/women/34.jpg)', backgroundSize: 'cover' }}></div>
              </div>
              <div className="cta-trust-text">
                <span className="stars">{"\u2605\u2605\u2605\u2605\u2605"}</span>
                <span>Trusted by 500+ educators</span>
              </div>
            </div>
          </div>
          
          <div className="cta-box-visual">
            <div className="floating-orb orb-1"></div>
            <div className="floating-orb orb-2"></div>
            
            <div className="cta-glass-card">
              <div className="glass-header">
                <div className="glass-circle"></div>
                <div className="glass-line short"></div>
              </div>
              <div className="glass-line full"></div>
              <div className="glass-line full"></div>
              <div className="glass-line partial"></div>
              <div className="glass-button"></div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="brand-logo" style={{ marginBottom: 24, color: '#fff' }}>
              <LogoSvg />
              QuestionStudio
            </Link>
            <p>The smarter way to generate exam-ready question papers. Designed exclusively for competitive coaching institutes.</p>
          </div>
          
          <div>
            <h4 className="footer-heading">Product</h4>
            <ul className="footer-links">
              <li><Link to="/features">Features</Link></li>
              <li><a href="#how-it-works">How It Works</a></li>
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
          <div>© {new Date().getFullYear()} QuestionStudio — Andhra Inspire Academy. All rights reserved.</div>
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








