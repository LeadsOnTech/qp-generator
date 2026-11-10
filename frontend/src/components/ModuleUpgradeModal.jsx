import { useNavigate } from 'react-router-dom';

const MODULE_INFO = {
  OMR: {
    title: 'OMR & Answer Key Generator',
    price: '₹999',
    period: '/ month',
    badge: 'Evaluation Module',
    icon: '📝',
    desc: 'Generate printable optical-mark evaluation sheets and paper-saving answer key chits for your examination.',
    features: [
      'Printable 1-page A4 OMR sheets matching paper format',
      'Anti-piracy watermark integration with college branding',
      'Universal & Single-Set multi-version answer key chits',
      'Barcode / QR scanner compatible grid format',
    ],
  },
  CBT: {
    title: 'Online Examination (CBT)',
    price: '₹1,999',
    period: '/ month',
    badge: 'Digital Exam Platform',
    icon: '💻',
    desc: 'Deploy instant computer-based tests with PIN codes, timed sessions, and automated instant scoring.',
    features: [
      'Instant CBT test deployment from any generated paper',
      'Secure PIN code and student roster access control',
      'Real-time automated scoring and live leaderboard',
      'Detailed question-wise student performance review',
    ],
  },
  COLLEGE_WEBSITE: {
    title: 'Dynamic College Website & Portal',
    price: '₹1,499',
    period: '/ month',
    badge: 'Branding & Admissions',
    icon: '🌐',
    desc: 'Dedicated white-label institutional website with course catalog, faculty recruitment, and student enquiry capture.',
    features: [
      'Modern, mobile-responsive college website with your branding',
      'Course catalog, faculty directory & facility showcases',
      'Faculty recruitment portal with direct resume capture',
      'Automated parent enquiry notifications and lead CRM',
    ],
  },
  WHATSAPP: {
    title: 'WhatsApp Automation & Scorecards',
    price: '₹499',
    period: '/ month',
    badge: 'Parent Communication',
    icon: '💬',
    desc: 'Official WhatsApp parent communication with automated scorecards, web report links, and exam announcements.',
    features: [
      'Official WhatsApp scorecard delivery directly to parents',
      'Encrypted one-click student performance web report links',
      'Exam attendance and result dispatch notifications',
      'Transparent delivery ledger and message tracking',
    ],
  },
};

export default function ModuleUpgradeModal({ isOpen, onClose, moduleKey = 'OMR', reason = 'NOT_SUBSCRIBED' }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const info = MODULE_INFO[moduleKey] || MODULE_INFO.OMR;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          maxWidth: 520,
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            padding: '24px',
            color: '#ffffff',
            position: 'relative',
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '50%',
              width: 32,
              height: 32,
              fontSize: 16,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255, 255, 255, 0.2)', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, marginBottom: 10 }}>
            <span>{info.icon}</span> {info.badge}
          </div>

          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: '#ffffff' }}>
            {info.title}
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: '#bfdbfe', lineHeight: 1.4 }}>
            {info.desc}
          </p>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px' }}>
          {reason === 'EXPIRED' && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>⚠️</span>
              <div>
                <strong>Subscription Expired:</strong> Your institution's access for this module has expired. Please renew to resume access.
              </div>
            </div>
          )}

          {reason === 'SUSPENDED' && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>⚠️</span>
              <div>
                <strong>Subscription Suspended:</strong> This module is temporarily suspended. Please contact platform support.
              </div>
            </div>
          )}

          {/* Pricing Highlight Card */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                Module Subscription
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#0284c7', display: 'flex', alignItems: 'baseline', gap: 4 }}>
                {info.price}
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{info.period}</span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#0284c7', fontWeight: 700 }}>
                OR ALL 4 MODULES IN BUNDLE
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                ₹4,499 / mo <span style={{ color: '#16a34a', fontSize: 11 }}>(Save ₹497)</span>
              </div>
            </div>
          </div>

          {/* Feature Highlights */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 8, textTransform: 'uppercase' }}>
              Included Capabilities:
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {info.features.map((feat, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#475569' }}>
                  <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Notice Box */}
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#0369a1', marginBottom: 20 }}>
            💡 <strong>Core Question Paper Credits</strong> remain unaffected and pay-as-you-go. Optional modules can be activated individually or as a complete bundle at any time.
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/subscriptions');
              }}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              View All Plans & Activate
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 16px',
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
