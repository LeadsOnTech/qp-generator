import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
];

const adminOnlyExtras = [
  { to: '/images', label: 'Image Library', icon: '🖼' },
  { to: '/institutes', label: 'Institutes', icon: '🏛' },
  { to: '/trial-accounts', label: 'Trial / Demo Logins', icon: '📲' },
  { to: '/admin/registrations', label: 'Registration Requests', icon: '👤' },
  { to: '/recharge-approvals', label: 'Recharge Approvals', icon: '💳' },
  { to: '/security', label: 'Security', icon: '🔒' },
];

const instituteNavItems = [
  { to: '/institute-dashboard', label: 'Dashboard', icon: '◆', end: true },
  { to: '/generate', label: 'Generate Paper', icon: '✎' },
  { to: '/papers', label: 'Papers', icon: '▣' },
  { to: '/questions', label: 'Question Bank', icon: '▤' },
  { to: '/my-institute', label: 'My Institute Profile', icon: '🏛' },
  { to: '/recharge', label: 'Recharge Credits', icon: '💳' },
  { to: '/security', label: 'Security', icon: '🔒' },
];

function NavSection({ label, items }) {
  return (
    <nav className="nav-group">
      {label && <p className="nav-label">{label}</p>}
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
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
  const isAdmin = user?.role === 'ADMIN';

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">QuestionStudio</span>
        </div>
        <div className="brand-sub">Your Questions. Your Standards.</div>

        {isAdmin ? (
          <>
            <NavSection label="Question Bank" items={adminNavItems} />
            <NavSection label="Quality &amp; Tagging" items={adminQualityItems} />
            <NavSection label="Paper Engine" items={paperEngineItems} />
            <NavSection label="Branding &amp; Media" items={adminOnlyExtras} />
          </>
        ) : (
          <NavSection label="Your Account" items={instituteNavItems} />
        )}

        <div className="sidebar-footer">
          {user && (
            <>
              <div style={{ marginBottom: 8, color: '#c7d1de' }}>
                {isAdmin ? 'Admin' : user.instituteName}<br />
                <span style={{ fontSize: 11 }}>{user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', color: '#c7d1de', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer', width: '100%' }}
              >
                Log out
              </button>
            </>
          )}
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
