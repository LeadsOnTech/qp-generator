import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';

export default function ContactUs() {
  useEffect(() => {
    document.title = "Contact Us & Grievance Redressal — QuestionStudio by Leadson";
    window.scrollTo(0, 0);
  }, []);

  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    institute: '',
    message: ''
  });

  function handleSubmit(e) {
    e.preventDefault();
    // Simulate inquiry submission
    setFormSubmitted(true);
  }

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <MarketingHeader activePage="contact" />

      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(145deg, #07154A 0%, #0F1E68 60%, #08113B 100%)',
        color: '#ffffff',
        padding: 'clamp(48px, 6vw, 72px) clamp(16px, 5vw, 64px) clamp(36px, 5vw, 56px)',
        textAlign: 'center',
        position: 'relative'
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{
            display: 'inline-block',
            padding: '4px 14px',
            borderRadius: 999,
            background: 'rgba(246, 200, 76, 0.15)',
            border: '1px solid rgba(246, 200, 76, 0.4)',
            color: '#F6C84C',
            fontSize: 12,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 14
          }}>
            WE ARE HERE TO HELP
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            Contact &amp; Grievance Redressal
          </h1>
          <p style={{ fontSize: 15, color: '#93C5FD', margin: 0, lineHeight: 1.6 }}>
            Dedicated onboarding assistance, billing help, and official administrative contacts for coaching institutes.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px clamp(16px, 4vw, 32px) 80px', flex: 1, width: '100%', boxSizing: 'border-box' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
          
          {/* Left Column: Official Details */}
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#07154A', marginBottom: 16 }}>
              Get in Touch
            </h2>
            <p style={{ fontSize: 14.5, color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 28 }}>
              Whether you are an academy director seeking a custom multi-campus setup, an educator needing help with LaTeX papers, or verifying a UPI recharge, our team is at your service.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              <div style={{ background: '#ffffff', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 22px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#EFF6FF', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  ✉️
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>Email Support</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#07154A', marginTop: 2 }}>
                    <a href="mailto:support@questionstudio.in" style={{ color: '#07154A', textDecoration: 'none' }}>support@questionstudio.in</a>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>
                    Turnaround: 2–4 hours during business days
                  </div>
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 22px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  💬
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>WhatsApp Onboarding Desk</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#07154A', marginTop: 2 }}>
                    Direct WhatsApp Support for Verified Institutes
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>
                    Mon–Sat: 9:00 AM – 8:00 PM IST
                  </div>
                </div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 22px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  🏛️
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>Operating Entity &amp; Jurisdiction</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#07154A', marginTop: 2 }}>
                    Leadson (Sole Proprietorship)
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
                    Product: QuestionStudio
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 4 }}>
                    Jurisdiction: Andhra Pradesh / Hyderabad (Telangana), India
                  </div>
                </div>
              </div>

              <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 14, padding: '18px 22px' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#07154A', marginBottom: 4 }}>
                  Statutory Grievance Redressal
                </div>
                <p style={{ fontSize: 12.5, color: '#64748B', lineHeight: 1.5, margin: '0 0 10px' }}>
                  In accordance with the Information Technology (Intermediary Guidelines) Rules, 2021 and Digital Personal Data Protection Act, 2023:
                </p>
                <div style={{ fontSize: 12.5, color: '#334155' }}>
                  <strong>Grievance Officer:</strong> Legal &amp; Compliance Lead<br />
                  <strong>Direct Email:</strong> <a href="mailto:support@questionstudio.in" style={{ color: '#2563EB' }}>support@questionstudio.in</a>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Inquiry Form */}
          <div style={{ background: '#ffffff', borderRadius: 18, border: '1px solid var(--line)', padding: 'clamp(24px, 4vw, 36px)', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: 19, fontWeight: 800, color: '#07154A', margin: '0 0 6px' }}>
              Send an Institutional Message
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '0 0 24px', lineHeight: 1.5 }}>
              Fill in your details and an academic onboarding coordinator will get back to you shortly.
            </p>

            {formSubmitted ? (
              <div style={{ background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: 12, padding: '24px', textAlign: 'center', color: '#14532D' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <h4 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700 }}>Thank you for reaching out!</h4>
                <p style={{ margin: 0, fontSize: 13.5 }}>
                  Your message has been received by the Leadson / QuestionStudio team. We will get back to you on WhatsApp / email within 2-4 business hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#07154A', marginBottom: 6 }}>Your Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. P. Satyanarayana"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ borderRadius: 10, padding: '11px 14px', border: '1.5px solid var(--line)' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="field" style={{ margin: 0 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#07154A', marginBottom: 6 }}>Official Email</label>
                    <input
                      type="email"
                      required
                      placeholder="you@institute.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{ borderRadius: 10, padding: '11px 14px', border: '1.5px solid var(--line)' }}
                    />
                  </div>
                  <div className="field" style={{ margin: 0 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#07154A', marginBottom: 6 }}>WhatsApp Number</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      style={{ borderRadius: 10, padding: '11px 14px', border: '1.5px solid var(--line)' }}
                    />
                  </div>
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#07154A', marginBottom: 6 }}>Coaching Center / College Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex IIT-JEE Academy, Vijayawada"
                    value={formData.institute}
                    onChange={(e) => setFormData({ ...formData, institute: e.target.value })}
                    style={{ borderRadius: 10, padding: '11px 14px', border: '1.5px solid var(--line)' }}
                  />
                </div>

                <div className="field" style={{ margin: 0 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#07154A', marginBottom: 6 }}>Message / Inquiries</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Tell us about your requirement (e.g. NEET question sets, multi-branch faculty logins, custom letterheads)..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    style={{ borderRadius: 10, padding: '11px 14px', border: '1.5px solid var(--line)', resize: 'vertical' }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    padding: '14px',
                    fontSize: 15,
                    fontWeight: 700,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #07154A 0%, #0F1E68 100%)',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    marginTop: 4
                  }}
                >
                  Send Message →
                </button>
              </form>
            )}
          </div>

        </div>

      </div>

      <MarketingFooter />
    </div>
  );
}