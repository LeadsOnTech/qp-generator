import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LogoSvg = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor"/>
    <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function MarketingHeader({ activePage }) {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <header className={`landing-header ${scrolled ? 'scrolled' : ''}`}>
      <Link to="/" className="brand-logo" onClick={() => setMobileOpen(false)}>
        <LogoSvg />
        <div className="brand-text-wrap">
          <span className="brand-name-text">QuestionStudio</span>
          <span className="brand-tagline-header">Your Questions. Your Standards.</span>
        </div>
      </Link>

      {/* Desktop Navigation */}
      <nav className="nav-links">
        <Link to="/" className={`nav-link ${activePage === 'home' ? 'active' : ''}`}>Home</Link>
        <Link to="/features" className={`nav-link ${activePage === 'features' ? 'active' : ''}`} style={activePage === 'features' ? { color: 'var(--premium-yellow)' } : {}}>Features</Link>
        <Link to="/pricing" className={`nav-link ${activePage === 'pricing' ? 'active' : ''}`} style={activePage === 'pricing' ? { color: 'var(--premium-yellow)' } : {}}>Pricing</Link>
      </nav>

      {/* Desktop Actions */}
      <div className="header-actions">
        {user ? (
          <Link to={user.role === 'ADMIN' ? '/dashboard' : '/institute-dashboard'} className="btn-primary-yellow">
            Go to Dashboard
          </Link>
        ) : (
          <>
            <Link to="/login" className="btn-signin">Sign In</Link>
            <Link to="/signup" className="btn-primary-yellow">Get Started Free</Link>
          </>
        )}
      </div>

      {/* Mobile Header Controls */}
      <div className="mobile-header-controls">
        {!user ? (
          <Link to="/login" className="mobile-header-signin">Sign In</Link>
        ) : (
          <Link to={user.role === 'ADMIN' ? '/dashboard' : '/institute-dashboard'} className="mobile-header-signin">Dashboard</Link>
        )}
        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <>
          <div className="mobile-nav-backdrop" onClick={() => setMobileOpen(false)} />
          <div className="mobile-nav-drawer">
            <Link to="/" className={`mobile-nav-item ${activePage === 'home' ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
              Home
            </Link>
            <Link to="/features" className={`mobile-nav-item ${activePage === 'features' ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
              Features
            </Link>
            <Link to="/pricing" className={`mobile-nav-item ${activePage === 'pricing' ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
              Pricing
            </Link>
            <div className="mobile-nav-divider" />
            {user ? (
              <Link to={user.role === 'ADMIN' ? '/dashboard' : '/institute-dashboard'} className="btn-primary-yellow mobile-nav-btn" onClick={() => setMobileOpen(false)}>
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/signup" className="btn-primary-yellow mobile-nav-btn" onClick={() => setMobileOpen(false)}>
                  Get Started Free
                </Link>
                <Link to="/login" className="btn-outline-white mobile-nav-btn" onClick={() => setMobileOpen(false)}>
                  Sign In to Account
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </header>
  );
}
