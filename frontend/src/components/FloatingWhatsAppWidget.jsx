import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function FloatingWhatsAppWidget() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [bubbleDismissed, setBubbleDismissed] = useState(() => {
    return sessionStorage.getItem('dismiss_qs_wa_bubble') === 'true';
  });

  // Determine current context (whether on a public college portal or general QuestionStudio)
  const pathname = location.pathname;
  const isCollegePortal = pathname.startsWith('/colleges/') || pathname.startsWith('/c/');
  const collegeSlug = isCollegePortal ? pathname.split('/')[2] : null;

  const [collegeData, setCollegeData] = useState(null);

  useEffect(() => {
    if (isCollegePortal && collegeSlug) {
      fetch(`/api/public/colleges/${collegeSlug}`)
        .then((r) => r.json())
        .then((d) => {
          const inst = d.institute || d.website?.institute || d.website;
          if (inst) {
            setCollegeData(inst);
          }
        })
        .catch(() => {});
    } else {
      setCollegeData(null);
    }
  }, [isCollegePortal, collegeSlug]);

  // Target WhatsApp phone & message
  const defaultPlatformPhone = '919848012345';
  let targetPhone = defaultPlatformPhone;
  let targetName = 'QuestionStudio Support';
  let prefillMessage = 'Hello QuestionStudio Team, I would like to inquire about the Question Paper Generator, Online CBT Exams, and College Website packages.';

  if (isCollegePortal && collegeData) {
    targetName = collegeData.name;
    const rawCollegePhone = collegeData.phone || collegeData.trialPhoneNumber;
    if (rawCollegePhone) {
      const clean = rawCollegePhone.replace(/\D/g, '');
      targetPhone = clean.length === 10 ? `91${clean}` : clean;
    }
    prefillMessage = `Hello ${collegeData.name}, I am visiting your official website on QuestionStudio and would like more information regarding course admissions, syllabus, and examinations.`;
  }

  const waUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(prefillMessage)}`;

  function handleDismissBubble(e) {
    e.stopPropagation();
    sessionStorage.setItem('dismiss_qs_wa_bubble', 'true');
    setBubbleDismissed(true);
  }

  return (
    <aside
      aria-label="WhatsApp Contact Support"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Speech Bubble / Tooltip */}
      {!bubbleDismissed && (
        <div
          style={{
            marginBottom: 12,
            background: '#ffffff',
            borderRadius: 14,
            padding: '12px 16px',
            boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.18), 0 2px 6px -1px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e2e8f0',
            maxWidth: 260,
            position: 'relative',
            animation: 'fadeInUp 0.3s ease',
          }}
        >
          <button
            type="button"
            onClick={handleDismissBubble}
            style={{
              position: 'absolute',
              top: 6,
              right: 8,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#94a3b8',
              fontSize: 14,
              padding: 2,
              lineHeight: 1,
            }}
            title="Dismiss bubble"
          >
            ✕
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
              {isCollegePortal && collegeData ? collegeData.name : 'QuestionStudio Desk'}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.4 }}>
            Have questions? Chat directly with us on WhatsApp for instant assistance!
          </div>
        </div>
      )}

      {/* Floating Action WhatsApp Button */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Chat with ${targetName} on WhatsApp`}
        title={`Chat with ${targetName} on WhatsApp`}
        style={{
          width: 58,
          height: 58,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 6px 20px rgba(37, 211, 102, 0.45)',
          cursor: 'pointer',
          textDecoration: 'none',
          transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(37, 211, 102, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 211, 102, 0.45)';
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ fill: '#ffffff', stroke: 'none' }}
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      </a>
    </aside>
  );
}
