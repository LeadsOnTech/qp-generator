import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HomeIcon = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const PapersIcon = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);

const GenerateHeroIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
);

const QuestionsIcon = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/>
    <line x1="8" y1="9" x2="16" y2="9"/>
    <line x1="8" y1="13" x2="16" y2="13"/>
    <line x1="8" y1="17" x2="12" y2="17"/>
  </svg>
);

const MoreIcon = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1.5"/>
    <circle cx="19" cy="12" r="1.5"/>
    <circle cx="5" cy="12" r="1.5"/>
  </svg>
);

const adminNavItems = [
  { to: '/dashboard', label: 'Exam Hub', icon: '◆', end: true },
  { to: '/overview', label: 'Overview (All Exams)', icon: '☰' },
  { to: '/upload', label: 'Upload Questions', icon: '⇧' },
  { to: '/questions', label: 'Question Bank', icon: '▤' },
  { to: '/bank-analytics', label: 'Bank Analytics', icon: '📊' },
  { to: '/syllabus', label: 'Syllabus Master', icon: '✓' },
];

const adminQualityItems = [
  { to: '/tagging', label: 'AI Tagging', icon: '✦' },
  { to: '/duplicates', label: 'Duplicates', icon: '⧉' },
  { to: '/checks', label: 'Quality Checks', icon: '⛨' },
];

const paperEngineItems = [
  { to: '/generate', label: 'Generate Paper', icon: '✎' },
  { to: '/papers', label: 'Papers', icon: '▣' },
  { to: '/students', label: 'Students Roster', icon: '👨‍🎓' },
  { to: '/student-analytics', label: 'Student Analytics', icon: '📈' },
];

const adminOnlyExtras = [
  { to: '/images', label: 'Image Library', icon: '🖼' },
  { to: '/institutes', label: 'Institutes & Reminders', icon: '🏛' },
  { to: '/admin/marketing', label: 'Marketing Leads', icon: '📢' },
  { to: '/admin/subscriptions', label: 'College Subscriptions', icon: '🏷️' },
  { to: '/admin/websites', label: 'College Websites & Features', icon: '🌐' },
  { to: '/admin/marketplace', label: 'Master Bookstore & Syndication', icon: '📚' },
  { to: '/trial-accounts', label: 'Trial / Demo Logins', icon: '📲' },
  { to: '/admin/registrations', label: 'Registration Requests', icon: '👤' },
  { to: '/recharge-approvals', label: 'Recharge Approvals', icon: '💳' },
  { to: '/security', label: 'Security', icon: '🔒' },
];

const instituteNavItems = [
  { to: '/institute-dashboard', label: 'Dashboard', icon: '◆', end: true },
  { to: '/generate', label: 'Generate Paper', icon: '✎' },
  { to: '/papers', label: 'Papers', icon: '▣' },
  { to: '/students', label: 'Students Roster', icon: '👨‍🎓' },
  { to: '/student-analytics', label: 'Student Analytics', icon: '📈' },
  { to: '/bookstore', label: 'Study Materials & Store', icon: '📚' },
  { to: '/website-builder', label: 'College Website', icon: '🌐' },
  { to: '/promote', label: 'Promote & Marketing', icon: '📢' },
  { to: '/questions', label: 'Question Bank', icon: '▤' },
  { to: '/my-institute', label: 'My Institute Profile', icon: '🏛' },
  { to: '/subscriptions', label: 'Plans & Modules', icon: '🏷️' },
  { to: '/recharge', label: 'Recharge Credits', icon: '💳' },
  { to: '/security', label: 'Security', icon: '🔒' },
];

function NavSection({ label, items, onNavigate }) {
  return (
    <nav className="nav-group">
      {label && <p className="nav-label">{label}</p>}
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => onNavigate && onNavigate()}
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === 'ADMIN';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(() => sessionStorage.getItem('dismiss_qs_recharge_alert') === 'true');

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    logout();
    navigate('/');
  }

  const userInitial = isAdmin ? 'A' : (user?.instituteName ? user.instituteName[0].toUpperCase() : 'U');

  const instituteBottomTabs = [
    { to: '/institute-dashboard', label: 'Home', icon: <HomeIcon />, end: true },
    { to: '/papers', label: 'Papers', icon: <PapersIcon /> },
    { to: '/generate', label: 'Generate', icon: <GenerateHeroIcon />, isHero: true },
    { to: '/questions', label: 'Bank', icon: <QuestionsIcon /> },
    { type: 'button', label: 'More', icon: <MoreIcon />, onClick: () => setMobileOpen(true) },
  ];

  const adminBottomTabs = [
    { to: '/dashboard', label: 'Hub', icon: <HomeIcon />, end: true },
    { to: '/questions', label: 'Bank', icon: <QuestionsIcon /> },
    { to: '/generate', label: 'Generate', icon: <GenerateHeroIcon />, isHero: true },
    { to: '/papers', label: 'Papers', icon: <PapersIcon /> },
    { type: 'button', label: 'More', icon: <MoreIcon />, onClick: () => setMobileOpen(true) },
  ];

  const bottomTabs = isAdmin ? adminBottomTabs : instituteBottomTabs;

  return (
    <div className="shell">
      {/* Mobile Top App Bar */}
      <header className="mobile-app-bar">
        <div className="mobile-app-bar-left">
          <button
            type="button"
            className="mobile-app-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="7" x2="20" y2="7"/>
              <line x1="4" y1="12" x2="20" y2="12"/>
              <line x1="4" y1="17" x2="20" y2="17"/>
            </svg>
          </button>
          <div className="mobile-app-brand">
            <span className="brand-mark">QuestionStudio</span>
          </div>
        </div>

        <div className="mobile-app-bar-right">
          {!isAdmin && typeof user?.creditBalance === 'number' && (
            <NavLink to="/recharge" className="mobile-credit-pill" title="Recharge Credits">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
              <span>{user.creditBalance.toLocaleString()} Cr</span>
            </NavLink>
          )}
          {isAdmin && (
            <span className="mobile-admin-badge">Admin</span>
          )}
          <button
            type="button"
            className="mobile-user-avatar"
            onClick={() => setMobileOpen(true)}
            aria-label="User profile menu"
          >
            {userInitial}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar Drawer */}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-mobile-profile">
          <div className="drawer-user-info">
            <div className="drawer-user-avatar">{userInitial}</div>
            <div className="drawer-user-meta">
              <div className="drawer-user-title">{isAdmin ? 'Administrator' : (user?.instituteName || 'Institute')}</div>
              <div className="drawer-user-email">{user?.email}</div>
            </div>
          </div>
          <button
            type="button"
            className="mobile-sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        {!isAdmin && typeof user?.creditBalance === 'number' && (
          <div className="sidebar-credit-banner">
            <div className="credit-info">
              <span className="credit-label">Available Balance</span>
              <span className="credit-amount">{user.creditBalance.toLocaleString()} Credits</span>
            </div>
            <NavLink to="/recharge" onClick={() => setMobileOpen(false)} className="credit-recharge-btn">
              + Recharge
            </NavLink>
          </div>
        )}

        <div className="sidebar-desktop-brand">
          <div className="brand">
            <span className="brand-mark">QuestionStudio</span>
          </div>
          <div className="brand-sub">Your Questions. Your Standards.</div>
        </div>

        {isAdmin ? (
          <>
            <NavSection label="Question Bank" items={adminNavItems} onNavigate={() => setMobileOpen(false)} />
            <NavSection label="Quality &amp; Tagging" items={adminQualityItems} onNavigate={() => setMobileOpen(false)} />
            <NavSection label="Paper Engine" items={paperEngineItems} onNavigate={() => setMobileOpen(false)} />
            <NavSection label="Branding &amp; Media" items={adminOnlyExtras} onNavigate={() => setMobileOpen(false)} />
          </>
        ) : (
          <NavSection label="Your Account" items={instituteNavItems} onNavigate={() => setMobileOpen(false)} />
        )}

        <div className="sidebar-footer">
          {user && (
            <>
              {/* Quick Live Site Launcher for both Admin and Institute */}
              {isAdmin ? (
                <div style={{ marginBottom: 12 }}>
                  <a
                    href="/#/"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open public QuestionStudio landing page in a new tab"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 12px',
                      borderRadius: 10,
                      background: 'rgba(2, 132, 199, 0.08)',
                      border: '1px solid rgba(2, 132, 199, 0.22)',
                      color: '#0284c7',
                      fontSize: 12,
                      fontWeight: 700,
                      textDecoration: 'none',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(2, 132, 199, 0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(2, 132, 199, 0.08)'; }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>🌐</span> Public SaaS Site
                    </span>
                    <span>↗</span>
                  </a>
                </div>
              ) : (
                user?.instituteSlug && (
                  <div style={{ marginBottom: 12 }}>
                    <a
                      href={`/#/colleges/${user.instituteSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open your college's live public website in a new tab"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '7px 12px',
                        borderRadius: 10,
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        color: '#059669',
                        fontSize: 12,
                        fontWeight: 700,
                        textDecoration: 'none',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.16)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)'; }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>🌐</span> View Live Website
                      </span>
                      <span>↗</span>
                    </a>
                  </div>
                )
              )}

              <div className="sidebar-user-summary">
                <div className="user-name">{isAdmin ? 'Admin' : user.instituteName}</div>
                <div className="user-email">{user.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="sidebar-logout-btn"
              >
                Log out
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main Page Content */}
      <main className="main">
        {/* Feature 1: College Admin Panel Recharge Reminder Banners */}
        {!isAdmin && user && typeof user.creditBalance === 'number' && user.creditBalance <= 50 && (!alertDismissed || user.creditBalance <= 10) && (
          <div
            style={{
              margin: '0 0 16px',
              padding: '12px 16px',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
              background: user.creditBalance <= 10
                ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
                : user.creditBalance <= 25
                ? 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)'
                : 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
              border: user.creditBalance <= 10
                ? '1px solid #f87171'
                : user.creditBalance <= 25
                ? '1px solid #fb923c'
                : '1px solid #facc15',
              color: user.creditBalance <= 10 ? '#991b1b' : user.creditBalance <= 25 ? '#9a3412' : '#854d0e',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>
                {user.creditBalance <= 10 ? '🚨' : user.creditBalance <= 25 ? '🔔' : '⚠️'}
              </span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>
                    {user.creditBalance <= 10
                      ? 'Recharge Alert 3 of 3: Critical / Balance Exhausted!'
                      : user.creditBalance <= 25
                      ? 'Recharge Reminder 2 of 3: Action Required'
                      : 'Recharge Reminder 1 of 3: Low Balance Notice'}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 10,
                      background: user.creditBalance <= 10 ? '#b91c1c' : user.creditBalance <= 25 ? '#c2410c' : '#ca8a04',
                      color: '#ffffff',
                    }}
                  >
                    {user.creditBalance} Credits Left
                  </span>
                </div>
                <div style={{ fontSize: 12.5, opacity: 0.92, marginTop: 2 }}>
                  {user.creditBalance <= 10
                    ? 'Your question generation balance is critically low. Paper generation & online exam activations are suspended until topped up.'
                    : user.creditBalance <= 25
                    ? 'Only a few credits remain for test generation. Recharge now to ensure uninterrupted staff access.'
                    : 'Your balance is running low. Top up today with instant UPI or Razorpay with zero disruption to upcoming exams.'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <NavLink
                to="/recharge"
                style={{
                  padding: '7px 16px',
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: 12.5,
                  textDecoration: 'none',
                  background: user.creditBalance <= 10 ? '#dc2626' : user.creditBalance <= 25 ? '#ea580c' : '#d97706',
                  color: '#ffffff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  whiteSpace: 'nowrap',
                }}
              >
                ⚡ Recharge Now
              </NavLink>
              {user.creditBalance > 10 && (
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem('dismiss_qs_recharge_alert', 'true');
                    setAlertDismissed(true);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 16,
                    padding: '4px 8px',
                    color: 'inherit',
                    opacity: 0.7,
                  }}
                  title="Dismiss for this session"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}
        <Outlet />
      </main>

      {/* Native Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-bar" aria-label="Mobile Navigation">
        {bottomTabs.map((tab) => {
          if (tab.type === 'button') {
            return (
              <button
                key={tab.label}
                type="button"
                onClick={tab.onClick}
                className="mobile-tab-item"
              >
                <span className="mobile-tab-icon">{tab.icon}</span>
                <span className="mobile-tab-label">{tab.label}</span>
              </button>
            );
          }
          if (tab.isHero) {
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) => `mobile-tab-item hero-tab${isActive ? ' active' : ''}`}
              >
                <div className="mobile-hero-fab">
                  {tab.icon}
                </div>
                <span className="mobile-tab-label hero-label">{tab.label}</span>
              </NavLink>
            );
          }
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) => `mobile-tab-item${isActive ? ' active' : ''}`}
            >
              <span className="mobile-tab-icon">{tab.icon}</span>
              <span className="mobile-tab-label">{tab.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
