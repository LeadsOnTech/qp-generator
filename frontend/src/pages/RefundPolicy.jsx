import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';

export default function RefundPolicy() {
  useEffect(() => {
    document.title = "Refund & Cancellation Policy — QuestionStudio by Leadson";
    window.scrollTo(0, 0);
  }, []);

  const lastUpdated = "October 28, 2026";

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <MarketingHeader activePage="refund" />

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
            BILLING &amp; CHARGES
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            Refund &amp; Cancellation Policy
          </h1>
          <p style={{ fontSize: 15, color: '#93C5FD', margin: 0, lineHeight: 1.6 }}>
            Clear, transparent guidelines regarding credit purchases, lifetime validity, and duplicate payment resolution.
          </p>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', marginTop: 12 }}>
            Last Updated: {lastUpdated} • Product: <strong>QuestionStudio</strong> • Company: <strong>Leadson</strong>
          </div>
        </div>
      </div>

      {/* Main Policy Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px clamp(16px, 4vw, 32px) 80px', flex: 1, width: '100%', boxSizing: 'border-box' }}>
        
        {/* Highlight Card */}
        <div style={{
          background: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: 14,
          padding: '18px 22px',
          marginBottom: 36,
          fontSize: 14,
          lineHeight: 1.6,
          color: '#1E3A8A'
        }}>
          <strong>Core Policy Summary:</strong> QuestionStudio provides <strong>200 complimentary evaluation credits</strong> to every approved coaching institute, college, and educator so you can experience full question paper creation, LaTeX diagram quality, and print formatting 100% free before purchasing credits. Once a credit bundle (₹5,000, ₹10,000, or ₹20,000) is purchased, all credits are credited with <strong>lifetime validity</strong> and are <strong>strictly non-refundable</strong>.
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: 18,
          border: '1px solid var(--line)',
          padding: 'clamp(24px, 5vw, 44px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          lineHeight: 1.75,
          color: '#334155',
          fontSize: 15
        }}>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#07154A', borderBottom: '2px solid #F1F5F9', paddingBottom: 8, marginBottom: 14 }}>
              1. Free Evaluation Model Before Purchase
            </h2>
            <p>
              At <strong>Leadson</strong>, we believe every educational institution should be confident in the pedagogical quality, syllabus accuracy, and LaTeX typesetting of our exam software before spending funds.
            </p>
            <p>
              To eliminate financial risk for coaching institutes:
            </p>
            <ul style={{ paddingLeft: 22 }}>
              <li>Every newly registered and verified institute is granted <strong>200 Free Welcome Credits</strong>.</li>
              <li>You can generate up to two full 75-question JEE papers or one comprehensive 180-question NEET mock test completely free.</li>
              <li>You can test your custom institute letterhead, watermarking, answer keys, and local printing before making any monetary recharge.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#07154A', borderBottom: '2px solid #F1F5F9', paddingBottom: 8, marginBottom: 14 }}>
              2. Strict Non-Refundable Digital Credit Policy
            </h2>
            <p>
              Because QuestionStudio provides instantaneous provisioning of digital credits and grants extensive free testing up front:
            </p>
            <div style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 10, padding: '14px 18px', color: '#92400E', fontWeight: 600, margin: '14px 0' }}>
              All credit bundle purchases (including Starter Pack ₹5,000, Growth Academy Pack ₹10,000, Institution Master Pack ₹20,000, and custom top-ups) are strictly non-refundable, non-exchangeable, and non-transferable once provisioned to your account ledger.
            </div>
            <p>
              We do not provide partial refunds, pro-rated refunds for unused credit balances, or cash-back conversions.
            </p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#07154A', borderBottom: '2px solid #F1F5F9', paddingBottom: 8, marginBottom: 14 }}>
              3. Lifetime Credit Validity (Zero Expiration Guarantee)
            </h2>
            <p>
              Unlike traditional SaaS software with monthly "use-it-or-lose-it" recurring fees, your purchased credits in QuestionStudio come with <strong>guaranteed lifetime validity</strong>:
            </p>
            <ul style={{ paddingLeft: 22 }}>
              <li>Credits never expire at the end of the month, semester, or academic year.</li>
              <li>Unused credits remain safely preserved in your institute account throughout off-seasons, exam gaps, and summer holidays.</li>
              <li>You can draw upon your balance at any time in future academic sessions without penalty.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#07154A', borderBottom: '2px solid #F1F5F9', paddingBottom: 8, marginBottom: 14 }}>
              4. Duplicate Debits &amp; Gateway Failure Resolution
            </h2>
            <p>
              We recognize that intermittent banking timeouts or UPI gateway network delays can occasionally cause a payment glitch. We protect our institutional clients through the following protocols:
            </p>
            
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginTop: 14, marginBottom: 6 }}>
              A. Gateway Double-Debit Protection (Razorpay)
            </h3>
            <p>
              If your bank account or card is debited twice for a single order due to a network lag:
            </p>
            <ul style={{ paddingLeft: 22 }}>
              <li>Please email us at <a href="mailto:support@questionstudio.in" style={{ color: '#2563EB', fontWeight: 600 }}>support@questionstudio.in</a> with your bank reference / Razorpay Order ID.</li>
              <li>Upon verification, the duplicate charge will be refunded back to the originating bank account or card within <strong>5 to 7 business days</strong> through Razorpay’s banking channels.</li>
              <li>Alternatively, if you prefer, we can instantly convert the duplicate amount into additional credit units with bonus credits applied.</li>
            </ul>

            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginTop: 14, marginBottom: 6 }}>
              B. Direct UPI / Bank Transfer Verification
            </h3>
            <p>
              When recharging via direct UPI transfer, credits are credited upon manual verification of your 12-digit UTR/reference number by our administrative team. If a transfer cannot be reconciled with bank statements, the request will be marked as "Rejected" with a detailed explanation, and no deduction will occur from your bank account through our systems.
            </p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#07154A', borderBottom: '2px solid #F1F5F9', paddingBottom: 8, marginBottom: 14 }}>
              5. Account Cancellation
            </h2>
            <p>
              Because QuestionStudio does not charge automatic monthly recurring subscription fees, <strong>there are no recurring subscriptions to cancel</strong>. Your card will never be charged automatically. If you wish to close your institute account or request complete data erasure, you may do so at any time by sending an email request to our support desk. Any remaining credit balance at the time of voluntary account deletion is forfeited.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#07154A', borderBottom: '2px solid #F1F5F9', paddingBottom: 8, marginBottom: 14 }}>
              6. Billing Support &amp; Assistance
            </h2>
            <p>
              If you have any questions regarding your transaction history, UPI verification, or credit ledger, please reach out to our dedicated support desk:
            </p>
            <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '16px 20px', marginTop: 10 }}>
              <div><strong>Leadson</strong> (Operating Entity)</div>
              <div><strong>Product:</strong> QuestionStudio — Your Questions. Your Standards.</div>
              <div><strong>Billing Support Desk:</strong> <a href="mailto:support@questionstudio.in" style={{ color: '#2563EB', fontWeight: 600 }}>support@questionstudio.in</a></div>
              <div><strong>Jurisdiction:</strong> Andhra Pradesh / Hyderabad, India</div>
            </div>
          </section>

        </div>

        {/* Back Link */}
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link to="/" style={{ color: '#2563EB', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
            ← Return to QuestionStudio Home
          </Link>
        </div>

      </div>

      <MarketingFooter />
    </div>
  );
}