import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import MarketingHeader from '../components/MarketingHeader';
import MarketingFooter from '../components/MarketingFooter';

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = "Privacy Policy — QuestionStudio by Leadson";
    window.scrollTo(0, 0);
  }, []);

  const lastUpdated = "October 28, 2026";

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <MarketingHeader activePage="privacy" />

      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(145deg, #07154A 0%, #0F1E68 60%, #08113B 100%)',
        color: '#ffffff',
        padding: ' clamp(48px, 6vw, 72px) clamp(16px, 5vw, 64px) clamp(36px, 5vw, 56px)',
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
            LEGAL &amp; COMPLIANCE
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: 15, color: '#93C5FD', margin: 0, lineHeight: 1.6 }}>
            Compliance with the Digital Personal Data Protection Act, 2023 (DPDPA) and the Information Technology Act, 2000.
          </p>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', marginTop: 12 }}>
            Last Updated: {lastUpdated} • Product: <strong>QuestionStudio</strong> • Entity: <strong>Leadson</strong>
          </div>
        </div>
      </div>

      {/* Main Policy Content */}
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
          <strong>Summary for Educators &amp; Institutes:</strong> QuestionStudio is a dedicated B2B educational software platform operated by <strong>Leadson</strong> (a sole proprietorship entity registered in India). We collect only necessary institutional and educator information to verify legitimate coaching centers and colleges, deliver question paper generation services, and maintain secure billing ledgers. We <strong>never sell, lease, or broker</strong> your faculty or examination data to third-party advertisers.
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
              1. Introduction &amp; Operating Entity
            </h2>
            <p>
              This Privacy Policy describes how <strong>Leadson</strong> (referred to as "the Company", "Leadson", "we", "us", or "our"), a sole proprietorship established and operating in accordance with the laws of India, collects, processes, stores, and protects personal and institutional information obtained through our proprietary cloud-based examination platform, <strong>QuestionStudio</strong> ("Platform", "Website", "Service").
            </p>
            <p>
              By applying for an account, accessing, or using QuestionStudio, the participating educational institution, coaching academy, college, or individual educator ("Institute", "Subscriber", "You") acknowledges and consents to the data practices described in this policy.
            </p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#07154A', borderBottom: '2px solid #F1F5F9', paddingBottom: 8, marginBottom: 14 }}>
              2. Governing Legal Framework
            </h2>
            <p>
              This policy is prepared and published in strict compliance with:
            </p>
            <ul style={{ paddingLeft: 22 }}>
              <li>The <strong>Digital Personal Data Protection Act, 2023 (DPDPA)</strong>;</li>
              <li>Section 43A of the <strong>Information Technology Act, 2000</strong>;</li>
              <li>The <strong>Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011</strong>; and</li>
              <li>The <strong>Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</strong>.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#07154A', borderBottom: '2px solid #F1F5F9', paddingBottom: 8, marginBottom: 14 }}>
              3. Information We Collect
            </h2>
            <p>
              Because QuestionStudio is exclusively a business-to-business (B2B) platform for accredited educators and academic organizations, we collect only information relevant to professional validation and service delivery:
            </p>
            
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginTop: 16, marginBottom: 8 }}>
              A. Institutional &amp; Verification Data
            </h3>
            <ul style={{ paddingLeft: 22 }}>
              <li><strong>Educator / Administrator Profile:</strong> Full name, official email address, mobile/WhatsApp telephone number, and professional designation.</li>
              <li><strong>Institute Details:</strong> Legal institute/college name, registered campus address, website or Google Business Profile URL.</li>
              <li><strong>Verification Credentials:</strong> Scanned images of business cards, institute visiting cards, faculty identity cards, or institutional affiliation certificates uploaded during the registration request process. This information is used strictly to verify educator credentials and prevent unauthorized student or bot access.</li>
            </ul>

            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginTop: 16, marginBottom: 8 }}>
              B. Exam Customization &amp; Letterhead Assets
            </h3>
            <ul style={{ paddingLeft: 22 }}>
              <li>High-resolution institute logos, letterhead banners, custom watermarks, branch names, and contact footers uploaded by the institute to brand their question papers.</li>
            </ul>

            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginTop: 16, marginBottom: 8 }}>
              C. Billing &amp; Transaction Information
            </h3>
            <ul style={{ paddingLeft: 22 }}>
              <li>Payment records including Razorpay transaction/order IDs, bank UPI reference / UTR numbers, recharge pack selections, credit timestamps, and credit deduction history.</li>
              <li><strong style={{ color: '#07154A' }}>Payment Security Guarantee:</strong> We <strong>do not collect, process, or store</strong> credit card numbers, debit card PINs, CVV codes, net banking passwords, or UPI MPINs. All online monetary transactions are handled by RBI-licensed payment aggregators (Razorpay Software Private Limited) or bank-to-bank UPI transfers.</li>
            </ul>

            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginTop: 16, marginBottom: 8 }}>
              D. Technical &amp; Device Information
            </h3>
            <ul style={{ paddingLeft: 22 }}>
              <li>IP addresses, browser type, operating system version, and system event logs recorded solely for network security, session persistence, and preventing unauthorized account takeover.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#07154A', borderBottom: '2px solid #F1F5F9', paddingBottom: 8, marginBottom: 14 }}>
              4. Purpose of Processing &amp; Legal Basis
            </h2>
            <p>
              Leadson processes institutional personal data strictly for lawful academic and operational purposes:
            </p>
            <ul style={{ paddingLeft: 22 }}>
              <li>Verifying the identity and eligibility of applicants prior to granting access to the QuestionStudio question repository;</li>
              <li>Delivering multi-factor authentication (2FA) and WhatsApp/SMS verification codes;</li>
              <li>Compiling, formatting, and generating PDF question papers, answer keys, and worked solutions under the institute’s branding;</li>
              <li>Managing the institute’s credit balance, generating purchase receipts, and maintaining auditable transaction ledgers;</li>
              <li>Communicating critical service updates, platform security advisories, and syllabus adjustments; and</li>
              <li>Complying with statutory tax, GST, and legal accounting obligations under Indian law.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#07154A', borderBottom: '2px solid #F1F5F9', paddingBottom: 8, marginBottom: 14 }}>
              5. Zero Data Brokering Policy (No Third-Party Sale)
            </h2>
            <p style={{ background: '#F8FAFC', borderLeft: '4px solid #16A34A', padding: '12px 18px', borderRadius: 6, fontWeight: 600 }}>
              Leadson operates on a transparent software credit model. We do NOT monetize user data. Under no circumstances will we sell, rent, license, or barter your institute's contact lists, teacher details, or generated question papers to external advertising networks, student lead aggregators, or marketing brokers.
            </p>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#07154A', borderBottom: '2px solid #F1F5F9', paddingBottom: 8, marginBottom: 14 }}>
              6. Third-Party Service Providers &amp; Data Processors
            </h2>
            <p>
              To provide robust, uninterrupted software services, we collaborate with vetted infrastructure and technology partners who process data strictly under confidentiality agreements:
            </p>
            <ul style={{ paddingLeft: 22 }}>
              <li><strong>Payment Aggregator:</strong> Razorpay Software Private Limited (PCI-DSS Level 1 compliant gateway for cards, UPI, and net banking).</li>
              <li><strong>Communication Gateways:</strong> WhatsApp Cloud API / Meta for Business and certified transactional telecom providers for 2FA OTPs and account notifications.</li>
              <li><strong>Cloud &amp; Database Hosting:</strong> Secure cloud infrastructure adhering to ISO/IEC 27001 standards and automated encrypted backups.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#07154A', borderBottom: '2px solid #F1F5F9', paddingBottom: 8, marginBottom: 14 }}>
              7. Data Retention &amp; Right to Erasure
            </h2>
            <p>
              Institutional profile data and question paper archives are retained as long as your institute account remains active to enable re-downloading previously generated test papers and maintaining credit balances.
            </p>
            <p>
              Under the Digital Personal Data Protection Act, 2023, authorized representatives of an institute have the right to request:
            </p>
            <ul style={{ paddingLeft: 22 }}>
              <li><strong>Access &amp; Review:</strong> A summary of personal and institutional data held by QuestionStudio;</li>
              <li><strong>Correction:</strong> Rectification of inaccurate or outdated contact information; and</li>
              <li><strong>Erasure &amp; Account Deletion:</strong> Complete deletion of your account, uploaded identification cards, and letterheads upon settlement of outstanding transactions, provided retention is not required by statutory taxation or auditing laws.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#07154A', borderBottom: '2px solid #F1F5F9', paddingBottom: 8, marginBottom: 14 }}>
              8. Security Practices &amp; Local Storage
            </h2>
            <p>
              We implement industry-standard administrative, technical, and physical safeguards:
            </p>
            <ul style={{ paddingLeft: 22 }}>
              <li>All web traffic between your browser and our servers is encrypted using 256-bit TLS 1.3 (Transport Layer Security).</li>
              <li>Session tokens are stored securely in browser local storage (`qf_auth_token`) solely for keeping authorized users signed in. We do not deploy third-party advertising tracking cookies or cross-site fingerprinting scripts.</li>
            </ul>
          </section>

          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#07154A', borderBottom: '2px solid #F1F5F9', paddingBottom: 8, marginBottom: 14 }}>
              9. Grievance Redressal Mechanism
            </h2>
            <p>
              In accordance with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023, Leadson has appointed a dedicated Grievance Officer to address any privacy concerns, data inquiries, or complaints:
            </p>
            
            <div style={{
              background: '#F8FAFC',
              border: '1.5px solid #E2E8F0',
              borderRadius: 12,
              padding: '18px 24px',
              marginTop: 14
            }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#07154A', marginBottom: 6 }}>
                Grievance Officer — Leadson / QuestionStudio
              </div>
              <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.6 }}>
                <div><strong>Operating Entity:</strong> Leadson (Sole Proprietorship)</div>
                <div><strong>Product:</strong> QuestionStudio</div>
                <div><strong>Designation:</strong> Compliance &amp; Grievance Lead</div>
                <div><strong>Jurisdiction:</strong> Andhra Pradesh / Hyderabad (Telangana), India</div>
                <div><strong>Email:</strong> <a href="mailto:support@questionstudio.in" style={{ color: '#2563EB', fontWeight: 600 }}>support@questionstudio.in</a></div>
                <div style={{ marginTop: 8, fontSize: 13, color: '#64748B' }}>
                  *All privacy inquiries are formally acknowledged within 36 hours and resolved within 15 working days as required by Indian IT rules.
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#07154A', borderBottom: '2px solid #F1F5F9', paddingBottom: 8, marginBottom: 14 }}>
              10. Amendments to this Policy
            </h2>
            <p>
              Leadson reserves the right to update this Privacy Policy from time to time to reflect modifications in software functionality or statutory regulatory requirements. Any material changes will be notified via prominent notice on the QuestionStudio platform or via registered email prior to taking effect.
            </p>
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