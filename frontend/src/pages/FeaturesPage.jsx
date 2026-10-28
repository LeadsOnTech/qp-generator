import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';
import '../landing.css';

const LogoSvg = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor"/>
    <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const featureDetails = [
  {
    title: 'Zero DTP Overhead',
    subtitle: 'Save millions in operator salaries',
    body: 'Stop paying per-page typesetting fees. The moment you click generate, your paper is typeset into a beautiful, dual-column objective layout ready for the print shop.',
    badge: '1'
  },
  {
    title: 'Flawless Quality Checks',
    subtitle: 'No more wrong answer keys',
    body: 'Every single question in the bank has passed through a strict 3-step QC process by subject matter experts. Eradicate typos and flawed diagrams from your weekly tests forever.',
    badge: '2'
  },
  {
    title: 'Automated Branding',
    subtitle: 'Your identity on every page',
    body: 'Upload your logo and institute name once. Every question paper, worksheet, and exam generated will automatically feature your custom letterhead and watermarks.',
    badge: '3'
  },
  {
    title: 'Smart Difficulty Mix',
    subtitle: 'Perfectly balanced papers',
    body: 'Want a hard paper for the top batch and a moderate paper for the rest? Just move a slider. Our engine automatically picks the exact distribution of easy, medium, and hard questions.',
    badge: '4'
  },
  {
    title: 'Chapter Wise Control',
    subtitle: 'Targeted assessments',
    body: 'Select multiple chapters across physics, chemistry, botany and zoology to instantly build grand tests or unit tests. The system ensures comprehensive coverage.',
    badge: '5'
  },
  {
    title: 'Instant Answer Keys',
    subtitle: 'Ready-to-publish solutions',
    body: 'Every question paper generated comes with a beautifully formatted answer key and detailed step-by-step solutions document for teachers and students.',
    badge: '6'
  }
];

export default function FeaturesPage() {
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
      <MarketingHeader activePage="features" />

      {/* HERO SECTION FOR FEATURES */}
      <section className="hero-section" style={{ padding: 'clamp(48px, 6vw, 80px) clamp(16px, 4vw, 64px) 40px', textAlign: 'center', minHeight: 'auto', display: 'block' }}>
        <div className="hero-badge" style={{ marginBottom: 24 }}>Platform Features</div>
        <h1 className="hero-title" style={{ maxWidth: 800, margin: '0 auto 24px' }}>
          Everything you need to automate your <span>examinations</span>
        </h1>
        <p className="hero-subtitle" style={{ margin: '0 auto 40px', maxWidth: 600 }}>
          QuestionStudio replaces your entire DTP department, proofreading team, and question-setting overhead with a single click.
        </p>
      </section>

      {/* DETAILED FEATURES LIST */}
      <section className="features-section" style={{ backgroundColor: '#f8fafc', padding: 'clamp(48px, 6vw, 100px) clamp(16px, 4vw, 64px)' }}>
        <div className="features-grid">
          {featureDetails.map((f, i) => (
            <div key={i} className="feature-card" style={{ padding: '48px 32px 32px' }}>
              <div className="feature-card-number">{f.badge}</div>
              <div style={{ color: 'var(--premium-blue)', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{f.subtitle}</div>
              <h3 className="feature-card-title" style={{ fontSize: 24, marginBottom: 16 }}>{f.title}</h3>
              <p className="feature-card-body" style={{ fontSize: 15, color: 'var(--premium-text-secondary)' }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <MarketingFooter />
    </div>
  );
}





