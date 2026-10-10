import type { Metadata } from "next";
import type { ReactNode } from "react";
import AnalyticsChoicesButton from "@/components/legal/AnalyticsChoicesButton";

export const metadata: Metadata = {
  title: "Privacy Policy | Finkoin",
  description: "How Finkoin collects, uses, and protects your financial data.",
};

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px 80px" }}>
      <div
        style={{
          borderBottom: "1px solid #E8E6F0",
          paddingBottom: 24,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#534AB7",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          Legal
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: "#111110",
            marginBottom: 8,
          }}
        >
          Privacy Policy
        </h1>
        <p style={{ fontSize: 14, color: "#9B9A94" }}>
          Last updated: May 1, 2026 · Effective: May 1, 2026
        </p>
      </div>

      <div
        style={{
          background: "#EEEDFE",
          borderRadius: 14,
          padding: "20px 24px",
          marginBottom: 32,
        }}
      >
        <p
          style={{ fontSize: 15, color: "#3C3489", lineHeight: 1.7, margin: 0 }}
        >
          <strong>Plain language summary:</strong> Finkoin collects only
          financial numbers — your income, expenses, loans, and savings amounts.
          We never ask for PAN, Aadhaar, bank account numbers, or passwords.
          Your data is encrypted, never sold, and you can delete it anytime.
        </p>
      </div>

      <LegalSection title="1. Who We Are">
        <p>
          Finkoin (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is a
          personal finance analysis platform operated from India. Our website is
          located at{" "}
          <a href="https://www.finkoin.com" style={{ color: "#534AB7" }}>
            finkoin.com
          </a>
          .
        </p>
        <p>
          For privacy-related queries, contact us at:{" "}
          <a href="mailto:privacy@finkoin.com" style={{ color: "#534AB7" }}>
            privacy@finkoin.com
          </a>
        </p>
      </LegalSection>

      <LegalSection title="2. What Data We Collect">
        <SubHeading>2.1 Data You Provide</SubHeading>
        <p>When you use Finkoin, we collect:</p>
        <ul>
          <li>
            <strong>Account information:</strong> Name, email address, and
            password (encrypted) when you create an account.
          </li>
          <li>
            <strong>Financial numbers:</strong> Monthly income, expense amounts,
            loan EMI amounts, insurance premium amounts, savings balances, and
            investment values.
          </li>
          <li>
            <strong>Profile information:</strong> Age, city tier, life stage
            (single/married/etc), and financial goals.
          </li>
          <li>
            <strong>Payment information:</strong> For paid features, we process
            payments through Razorpay. We do not store your card or bank
            details. Razorpay handles all payment data.
          </li>
        </ul>

        <SubHeading>2.2 What We Never Collect</SubHeading>
        <div
          style={{
            background: "#E1F5EE",
            borderRadius: 12,
            padding: "16px 20px",
            margin: "12px 0",
          }}
        >
          <p
            style={{
              margin: 0,
              fontWeight: 600,
              color: "#1D5C3A",
              marginBottom: 8,
            }}
          >
            We NEVER collect:
          </p>
          <ul style={{ margin: 0 }}>
            {[
              "PAN card number",
              "Aadhaar number",
              "Bank account numbers or IFSC codes",
              "Credit or debit card numbers",
              "Net banking credentials",
              "UPI PIN or passwords",
              "Any government-issued ID number",
              "Physical documents or scans",
            ].map((item) => (
              <li key={item} style={{ color: "#1D5C3A", marginBottom: 4 }}>
                ✗ {item}
              </li>
            ))}
          </ul>
        </div>

        <SubHeading>2.3 Automatically Collected Data</SubHeading>
        <ul>
          <li>
            <strong>Usage data:</strong> Pages visited, features used, and time
            spent on the platform.
          </li>
          <li>
            <strong>Device information:</strong> Browser type, operating system,
            and IP address for security purposes.
          </li>
          <li>
            <strong>Cookies:</strong> Session cookies to keep you logged in. No
            advertising cookies.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. How We Use Your Data">
        <p>We use your data to:</p>
        <ul>
          <li>Calculate your financial health score and analysis</li>
          <li>Generate your personalised financial plan</li>
          <li>
            Share with our AI system (Groq) to generate personalised
            explanations — only financial numbers, never identity data
          </li>
          <li>Send you important account notifications and updates</li>
          <li>Process payments for paid features</li>
          <li>Improve our product and fix bugs</li>
          <li>Comply with legal obligations</li>
        </ul>
        <p>
          <strong>We never use your data for:</strong> advertising, selling to
          third parties, credit scoring, or any purpose beyond what is listed
          above.
        </p>
      </LegalSection>

      <LegalSection title="4. AI and Data Processing">
        <p>
          Finkoin uses artificial intelligence to generate personalised
          financial plans. Here is how it works:
        </p>
        <ul>
          <li>
            Your financial numbers are sent to Groq AI (a US-based AI service)
            to generate personalised explanations.
          </li>
          <li>
            Only numerical financial data is shared — never your name, email,
            PAN, Aadhaar, or any identity information.
          </li>
          <li>
            Groq processes data under their privacy policy available at{" "}
            <a
              href="https://groq.com/privacy"
              style={{ color: "#534AB7" }}
              rel="noopener noreferrer"
            >
              groq.com/privacy
            </a>
            .
          </li>
          <li>
            AI-generated content is for educational purposes only and does not
            constitute SEBI-registered investment advice.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Data Storage and Security">
        <p>Your data is stored securely using industry-standard practices:</p>
        <ul>
          <li>
            <strong>Database:</strong> Supabase (PostgreSQL) hosted on AWS
            Singapore region — data stays within Asia Pacific.
          </li>
          <li>
            <strong>Encryption at rest:</strong> All data is encrypted using
            AES-256 encryption.
          </li>
          <li>
            <strong>Encryption in transit:</strong> All connections use TLS 1.3
            / HTTPS.
          </li>
          <li>
            <strong>Authentication:</strong> Secure JWT tokens with automatic
            expiry and refresh rotation.
          </li>
          <li>
            <strong>Row Level Security:</strong> Database-level security ensures
            you can only access your own data.
          </li>
          <li>
            <strong>Access control:</strong> Only essential team members can
            access production systems, with audit logging enabled.
          </li>
        </ul>
        <p>
          Despite our best efforts, no system is 100% secure. If you discover a
          security vulnerability, please report it to{" "}
          <a href="mailto:security@finkoin.com" style={{ color: "#534AB7" }}>
            security@finkoin.com
          </a>{" "}
          immediately.
        </p>
      </LegalSection>

      <LegalSection title="6. Data Sharing">
        <p>We share your data only with:</p>
        <ul>
          <li>
            <strong>Groq AI:</strong> Financial numbers only (no identity data)
            for AI analysis.
          </li>
          <li>
            <strong>Razorpay:</strong> Payment processing for paid features.
            They handle payment data under their own privacy policy.
          </li>
          <li>
            <strong>Supabase:</strong> Infrastructure provider for database and
            authentication.
          </li>
          <li>
            <strong>Vercel:</strong> Hosting provider for our web application.
          </li>
        </ul>
        <p>
          <strong>We never sell your data</strong> to advertisers, data brokers,
          insurance companies, banks, or any third party.
        </p>
      </LegalSection>

      <LegalSection title="7. Your Rights (DPDP Act 2023)">
        <p>
          Under India&apos;s Digital Personal Data Protection Act 2023, you have
          the following rights:
        </p>
        <ul>
          <li>
            <strong>Right to access:</strong> Request a copy of all personal
            data we hold about you.
          </li>
          <li>
            <strong>Right to correction:</strong> Update incorrect or incomplete
            data in your account settings.
          </li>
          <li>
            <strong>Right to erasure:</strong>{" "}
            <a href="/legal/delete-account" style={{ color: "#534AB7" }}>
              Request deletion
            </a>{" "}
            of your account and all associated data. We will process deletion
            within 30 days.
          </li>
          <li>
            <strong>Right to withdraw consent:</strong> Withdraw your consent
            for data processing at any time by deleting your account.
          </li>
          <li>
            <strong>Right to grievance redressal:</strong> File a complaint with
            our Grievance Officer.
          </li>
        </ul>
        <p>
          To exercise any of these rights, email us at{" "}
          <a href="mailto:privacy@finkoin.com" style={{ color: "#534AB7" }}>
            privacy@finkoin.com
          </a>{" "}
          with subject line &quot;Data Rights Request&quot;.
        </p>

        <SubHeading>Grievance Officer</SubHeading>
        <p>
          As required under DPDP Act 2023 and IT Act 2000:
          <br />
          Name: Himanshu Kumar
          <br />
          Email:{" "}
          <a href="mailto:grievance@finkoin.com" style={{ color: "#534AB7" }}>
            grievance@finkoin.com
          </a>
          <br />
          Response time: Within 30 days
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies and Tracking">
        <p>We use minimal cookies:</p>
        <ul>
          <li>
            <strong>Essential cookies:</strong> Authentication session cookies
            required for login to work. Cannot be disabled.
          </li>
          <li>
            <strong>Preference cookies:</strong> Save your form progress and
            calculator data locally.
          </li>
        </ul>
        <p>
          <strong>We do not use:</strong> advertising cookies, cross-site
          tracking cookies, or social media tracking pixels.
        </p>
        <p id="analytics">
          <strong>Analytics (website only, opt-in):</strong> If you tap
          &quot;Allow&quot; on the analytics prompt, we use Google Analytics and
          Microsoft Clarity to understand how people use Finkoin. They collect
          usage data such as pages visited, time spent, clicks and general
          location. No personal financial data is shared with them. If you
          don&apos;t allow it, neither is loaded. The Finkoin mobile app does
          not use analytics.
        </p>
        <p>
          <AnalyticsChoicesButton />
        </p>
      </LegalSection>

      <LegalSection title="9. Data Retention">
        <ul>
          <li>
            <strong>Active accounts:</strong> Data retained while your account
            is active.
          </li>
          <li>
            <strong>Deleted accounts:</strong> All personal data deleted within
            30 days of account deletion request. Anonymised statistical data may
            be retained.
          </li>
          <li>
            <strong>Payment records:</strong> Retained for 7 years as required
            by Indian tax laws.
          </li>
          <li>
            <strong>Inactive accounts:</strong> Accounts with no activity for 3
            years may be deleted after prior email notice.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="10. Children's Privacy">
        <p>
          Finkoin is not intended for users under 18 years of age. We do not
          knowingly collect data from minors. If you believe a minor has created
          an account, please contact us at{" "}
          <a href="mailto:privacy@finkoin.com" style={{ color: "#534AB7" }}>
            privacy@finkoin.com
          </a>{" "}
          and we will delete it immediately.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. When we make
          significant changes:
        </p>
        <ul>
          <li>
            We will update the &quot;Last updated&quot; date at the top of this
            page.
          </li>
          <li>
            We will notify you by email if the changes materially affect your
            rights.
          </li>
          <li>
            For significant changes requiring re-consent, you will see a consent
            prompt on your next login.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="12. Contact Us">
        <p>For any privacy-related questions or concerns:</p>
        <div
          style={{
            background: "#F7F7F4",
            borderRadius: 12,
            padding: "16px 20px",
          }}
        >
          <p style={{ margin: 0 }}>
            <strong>Finkoin</strong>
            <br />
            Email:{" "}
            <a href="mailto:privacy@finkoin.com" style={{ color: "#534AB7" }}>
              privacy@finkoin.com
            </a>
            <br />
            Website:{" "}
            <a href="https://www.finkoin.com" style={{ color: "#534AB7" }}>
              finkoin.com
            </a>
            <br />
            Grievance:{" "}
            <a href="mailto:grievance@finkoin.com" style={{ color: "#534AB7" }}>
              grievance@finkoin.com
            </a>
          </p>
        </div>
      </LegalSection>

      <div
        style={{
          borderTop: "1px solid #E8E6F0",
          paddingTop: 24,
          marginTop: 40,
          fontSize: 12,
          color: "#9B9A94",
          textAlign: "center",
        }}
      >
        This privacy policy is governed by the laws of India including the
        Information Technology Act 2000, IT (Amendment) Act 2008, and Digital
        Personal Data Protection Act 2023.
      </div>
    </div>
  );
}

function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "#111110",
          marginBottom: 16,
          paddingBottom: 8,
          borderBottom: "1px solid #F0EFF8",
        }}
      >
        {title}
      </h2>
      <div style={{ fontSize: 15, color: "#5F5E5A", lineHeight: 1.8 }}>
        {children}
      </div>
    </div>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return (
    <h3
      style={{
        fontSize: 16,
        fontWeight: 700,
        color: "#111110",
        marginTop: 20,
        marginBottom: 8,
      }}
    >
      {children}
    </h3>
  );
}
