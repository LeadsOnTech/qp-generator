import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';

export default function TermsAndConditions() {
  useEffect(() => {
    document.title = "Terms & Conditions — QuestionStudio by Leadson";
    window.scrollTo(0, 0);
  }, []);

  const lastUpdated = "October 28, 2026";

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <MarketingHeader activePage="terms" />

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
            SERVICE AGREEMENT
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            Terms &amp; Conditions
          </h1>
          <p style={{ fontSize: 15, color: '#93C5FD', margin: 0, lineHeight: 1.6 }}>
            B2B SaaS Terms of Service and Master License Agreement for Educational Institutions &amp; Educators.
          </p>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', marginTop: 12 }}>
            Last Updated: {lastUpdated} • Product: <strong>QuestionStudio</strong> • Operating Entity: <strong>Leadson</strong>
          </div>
        </div>
      </div>

      {/* Main Terms Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px clamp(16px, 4vw, 32px) 80px', flex: 1, width: '100%', boxSizing: 'border-box' }}>
        
        {/* Notice Card */}
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
          <strong>Important Notice:</strong> This document constitutes a legally binding contract between your educational institution ("Institute", "Subscriber", or "User") and <strong>Leadson</strong> (a sole proprietorship registered in India), governing access to the <strong>QuestionStudio</strong> platform. Please review sections regarding credit allocation, intellectual property ownership, and our non-refundable purchase policy carefully.
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
              1. Acceptance of Terms &amp; Contracting Parties
            </h2>
            <p>
              By accessing, registering an account, purchasing credits, or generating examination materials on <strong>QuestionStudio</strong> ("Service", "Platform"), you signify your agreement to these Terms &amp; Conditions. This agreement is entered into between:
            </p>
            <ul style={{ paddingLeft: 22 }}>
              <li><strong>The Company:</strong> <strong>Leadson</strong> (Sole Proprietorship), having its principal place of operation in India (hereinafter referred to as "Leadson", "Company", "we", "us", or "our"); and</li>
              <li><strong>The Subscriber:</strong> The coaching academy, college, school, educational institution, or verified independent educator accessing the platform ("Institute", "Subscriber", or "You").</li>
            </ul>
            <p>
              If you are registering on behalf of a college, coaching academy, or educational trust, you represent and warrant that you possess full legal authority to bind said entity to these Terms.
            </p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#07154A', borderBottom: '2px solid #F1F5F9', paddingBottom: 8, marginBottom: 14 }}>
              2. Eligibility &amp; Institutional Verification
            </h2>
            <p>
              QuestionStudio is designed exclusively as a <strong>B2B academic productivity tool</strong> for recognized coaching institutions, colleges, schools, and independent teachers preparing students for Indian competitive entrance examinations (including NEET UG, JEE Main, JEE Advanced, AP &amp; TS EAMCET / EAPCET).
            </p>
            <ul style={{ paddingLeft: 22 }}>
              <li><strong>No Direct Student Access:</strong> Underage minors, individual students, and candidates are strictly prohibited from creating accounts. The platform is restricted to faculty, directors, and institutional administrators.</li>
              <li><strong>Mandatory Verification:</strong> Leadson reserves the absolute right to screen all access requests. Applicants must submit verifiable credentials (such as an institute visiting card, employee identity badge, or institutional registration document). Leadson reserves the right to reject any application suspected of being submitted by unauthorized individuals or data scrapers.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#07154A', borderBottom: '2px solid #F1F5F9', paddingBottom: 8, marginBottom: 14 }}>
              3. Account Security &amp; Credentials
            </h2>
            <p>
              Subscribers are responsible for safeguarding their login credentials and enabling Two-Factor Authentication (2FA). You agree to:
            </p>
            <ul style={{ paddingLeft: 22 }}>
              <li>Provide accurate, truthful institutional information during registration;</li>
              <li>Maintain the confidentiality of your passwords and 2FA authentication devices;</li>
              <li>Notify Leadson immediately at <a href="mailto:support@questionstudio.in" style={{ color: '#2563EB' }}>support@questionstudio.in</a> upon suspecting any unauthorized breach or account misuse; and</li>
              <li>Accept sole responsibility for all test papers generated and credits consumed under your account credentials.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#07154A', borderBottom: '2px solid #F1F5F9', paddingBottom: 8, marginBottom: 14 }}>
              4. The QuestionStudio Credit System &amp; Usage Rules
            </h2>
            <p>
              QuestionStudio operates on a transparent, pay-as-you-generate credit model rather than recurring subscription entrapment:
            </p>
            <ul style={{ paddingLeft: 22 }}>
              <li><strong>Unit Definition:</strong> One (1) credit entitles the Subscriber to compile and finalize one (1) verified question from our curated repository into an exportable test paper.</li>
              <li><strong>Worked Solutions:</strong> If the Subscriber chooses to include detailed, step-by-step worked solutions for questions containing worked derivations, each question with an included worked solution consumes one (1) additional credit.</li>
              <li><strong>100% Free Capabilities:</strong> LaTeX mathematical typography formatting, high-resolution diagram layout, custom letterhead generation, watermarking, question re-ordering, and unlimited PDF downloads consume zero credits.</li>
              <li><strong>Lifetime Credit Validity:</strong> All purchased and promotional credits carry <strong>lifetime validity</strong>. Credits never expire, do not lapse during summer breaks or academic transitions, and carry forward indefinitely.</li>
              <li><strong>Welcome Evaluation Credits:</strong> Newly approved institutes receive 200 free evaluation credits to test the repository, print output, and layout quality prior to committing funds.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#07154A', borderBottom: '2px solid #F1F5F9', paddingBottom: 8, marginBottom: 14 }}>
              5. Payment, Pricing &amp; Strict Non-Refundable Policy
            </h2>
            <p>
              Credit bundles may be acquired via our automated online payment gateway (powered by Razorpay) or direct UPI / Bank Transfer:
            </p>
            <ul style={{ paddingLeft: 22 }}>
              <li><strong>Bundles &amp; Pricing Tiers:</strong>
                <ul style={{ marginTop: 6 }}>
                  <li><em>Starter Pack:</em> ₹5,000 for 5,000 Credits (₹1.00 / Credit)</li>
                  <li><em>Growth Academy Pack:</em> ₹10,000 for 11,500 Credits (Includes 15% promotional bonus, ~₹0.87 / Credit)</li>
                  <li><em>Institution Master Pack:</em> ₹20,000 for 25,000 Credits (Includes 25% promotional bonus, ₹0.80 / Credit)</li>
                  <li><em>Custom Amounts:</em> Minimum single recharge is ₹5,000.</li>
                </ul>
              </li>
              <li><strong>Strict No-Refund Policy:</strong> All credit purchases are <strong>final, non-refundable, non-exchangeable, and non-transferable</strong> once provisioned into the institute's account ledger. Because QuestionStudio grants 200 complimentary credits to thoroughly evaluate the platform without payment, and because digital credits are provisioned immediately with lifetime validity, no cash refunds will be entertained under any circumstances.</li>
              <li><strong>Duplicate Debit Protection:</strong> In the rare event that a Subscriber's bank account or UPI handle is debited twice for a single transaction due to a payment gateway timeout without credits being provisioned, the duplicate amount will be refunded back to the originating bank account within 5 to 7 business days, or credited as additional credits at the Subscriber's election.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#07154A', borderBottom: '2px solid #F1F5F9', paddingBottom: 8, marginBottom: 14 }}>
              6. Intellectual Property &amp; Ownership Boundaries
            </h2>
            <p>
              To maintain absolute legal clarity regarding proprietary rights, the intellectual property relationship is established as follows:
            </p>
            
            <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '18px 22px', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#07154A', margin: '0 0 6px' }}>
                A. Leadson Intellectual Property
              </h3>
              <p style={{ margin: 0, fontSize: 14 }}>
                Leadson owns and retains all right, title, interest, and intellectual property in and to the QuestionStudio platform, including but not limited to source code, algorithms, database structure, question curation metadata, LaTeX typesetting templates, diagram rendering engines, and associated trademarks.
              </p>
            </div>

            <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: 12, padding: '18px 22px', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#166534', margin: '0 0 6px' }}>
                B. Institute Ownership &amp; Exported Materials
              </h3>
              <p style={{ margin: 0, fontSize: 14, color: '#14532D' }}>
                The participating Institute retains sole and exclusive ownership of its trademarks, logos, custom letterhead banners, campus details, and student data. <strong>The Institute owns all finalized PDF question papers and answer keys generated under their account</strong>, and possesses unrestricted rights to print, photocopy, bind, and distribute these exam papers to their enrolled classroom students.
              </p>
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginTop: 16, marginBottom: 8 }}>
              C. Express Restrictions
            </h3>
            <p>The Subscriber shall NOT:</p>
            <ul style={{ paddingLeft: 22 }}>
              <li>Use web scrapers, bots, automated scripts, or programmatic extractors to bulk-download the raw QuestionStudio question database;</li>
              <li>Reverse engineer, decompile, or disassemble the platform or LaTeX formatting pipeline;</li>
              <li>Resell, sub-license, rent, or distribute raw question bank exports as a standalone database product to competing software vendors or publishing houses; or</li>
              <li>Share account access credentials across unrelated third-party commercial tutoring chains.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#07154A', borderBottom: '2px solid #F1F5F9', paddingBottom: 8, marginBottom: 14 }}>
              7. Service Availability &amp; Quality
            </h2>
            <p>
              Leadson exercises professional care to maintain high platform availability, sharp mathematical rendering, and rigorous syllabus alignment. However:
            </p>
            <ul style={{ paddingLeft: 22 }}>
              <li>The Service is provided on an "as is" and "as available" basis. Periodic scheduled maintenance will be communicated in advance.</li>
              <li>While questions undergo multi-stage algorithmic and editorial verification, educators are expected to perform final academic review of generated test papers prior to conducting formal statewide or institutional mock exams.</li>
              <li>Leadson shall not be liable for typographical errors resulting from user modifications or examination performance outcomes of enrolled students.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#07154A', borderBottom: '2px solid #F1F5F9', paddingBottom: 8, marginBottom: 14 }}>
              8. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable Indian law, in no event shall Leadson, its proprietor, or affiliates be liable for any indirect, punitive, incidental, special, or consequential damages (including loss of profits, academic interruption, or goodwill) arising out of the use or inability to use the Service.
            </p>
            <p>
              Leadson’s aggregate monetary liability under all circumstances shall be strictly limited to the actual credit recharge fees paid by the Subscriber in the three (3) months immediately preceding the claim.
            </p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#07154A', borderBottom: '2px solid #F1F5F9', paddingBottom: 8, marginBottom: 14 }}>
              9. Termination &amp; Suspension
            </h2>
            <p>
              Leadson reserves the right to suspend or terminate Subscriber access immediately, with or without notice, in the event of:
            </p>
            <ul style={{ paddingLeft: 22 }}>
              <li>Fraudulent registration (e.g. submitting fake visiting cards or forged educator IDs);</li>
              <li>Automated scraping or unauthorized extraction of the question repository;</li>
              <li>Unlawful commercial resale of raw question databases; or</li>
              <li>Breach of any material provision of these Terms.</li>
            </ul>
            <p>
              Upon termination for verified fraud or repository scraping, all accumulated credit balances shall be forfeited without refund.
            </p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#07154A', borderBottom: '2px solid #F1F5F9', paddingBottom: 8, marginBottom: 14 }}>
              10. Governing Law &amp; Dispute Jurisdiction
            </h2>
            <p>
              These Terms and any dispute, controversy, or claim arising out of or related to them or the breach thereof shall be governed exclusively by and construed in accordance with the <strong>laws of the Republic of India</strong>.
            </p>
            <p style={{ background: '#F8FAFC', borderLeft: '4px solid #07154A', padding: '12px 18px', borderRadius: 6, fontWeight: 600 }}>
              The parties mutually agree that any legal suit, action, arbitration, or proceeding arising out of or relating to these Terms shall be instituted exclusively in the competent civil courts situated in <strong>Andhra Pradesh / Hyderabad (Telangana), India</strong>.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#07154A', borderBottom: '2px solid #F1F5F9', paddingBottom: 8, marginBottom: 14 }}>
              11. Official Contact &amp; Notices
            </h2>
            <p>
              For formal legal notices, institutional inquiries, or clarification regarding these Terms, please contact:
            </p>
            <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '16px 20px' }}>
              <div><strong>Leadson</strong> (Sole Proprietorship)</div>
              <div><strong>Product:</strong> QuestionStudio — Your Questions. Your Standards.</div>
              <div><strong>Location:</strong> Andhra Pradesh / Hyderabad, India</div>
              <div><strong>Email:</strong> <a href="mailto:support@questionstudio.in" style={{ color: '#2563EB', fontWeight: 600 }}>support@questionstudio.in</a></div>
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