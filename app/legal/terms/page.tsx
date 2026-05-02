import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Terms of Service | Finkoin",
  description: "Terms and conditions for using Finkoin financial analysis platform.",
};

export default function TermsPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px 80px" }}>
      <div style={{ borderBottom: "1px solid #E8E6F0", paddingBottom: 24, marginBottom: 32 }}>
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
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#111110", marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ fontSize: 14, color: "#9B9A94" }}>Last updated: May 1, 2026 · Effective: May 1, 2026</p>
      </div>

      <div
        style={{
          background: "#FFF8F0",
          border: "1px solid #FAEEDA",
          borderRadius: 14,
          padding: "20px 24px",
          marginBottom: 32,
        }}
      >
        <p style={{ fontSize: 15, color: "#633806", lineHeight: 1.7, margin: 0 }}>
          <strong>Important:</strong> Finkoin provides educational financial guidance only. We are NOT a SEBI-registered
          investment advisor, insurance agent, or financial institution. Nothing on this platform constitutes
          professional financial advice. Always consult a qualified professional before making financial decisions.
        </p>
      </div>

      <LegalSection title="1. Acceptance of Terms">
        <p>
          By accessing or using Finkoin (&quot;the Service&quot;, &quot;the Platform&quot;) at finkoin.com, you agree
          to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, do not use the
          Service.
        </p>
        <p>
          These Terms constitute a legally binding agreement between you (&quot;User&quot;, &quot;you&quot;) and Finkoin
          (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;).
        </p>
        <p>
          You must be at least 18 years of age and capable of entering into a legally binding contract under Indian law
          to use this Service.
        </p>
      </LegalSection>

      <LegalSection title="2. Nature of Service">
        <SubHeading>2.1 Educational Platform</SubHeading>
        <p>Finkoin is an educational personal finance platform that:</p>
        <ul>
          <li>Calculates financial health scores based on your input data</li>
          <li>Provides educational analysis of your financial situation</li>
          <li>Generates AI-powered explanations and suggested action plans</li>
          <li>Offers financial calculators for educational purposes</li>
        </ul>

        <SubHeading>2.2 Not Financial Advice</SubHeading>
        <div style={{ background: "#FCEBEB", borderRadius: 12, padding: "16px 20px", margin: "12px 0" }}>
          <p style={{ margin: 0, color: "#791F1F", fontWeight: 600 }}>Finkoin is NOT:</p>
          <ul style={{ margin: "8px 0 0", color: "#791F1F" }}>
            <li>A SEBI-registered investment advisor (RIA)</li>
            <li>An IRDAI-licensed insurance advisor</li>
            <li>An RBI-regulated financial entity</li>
            <li>A portfolio management service</li>
            <li>A stockbroker or mutual fund distributor</li>
          </ul>
        </div>
        <p>
          All analysis, recommendations, and suggestions on this platform are algorithmic and educational in nature.
          They do not constitute professional investment advice, tax advice, legal advice, or insurance advice.
        </p>
        <p>
          <strong>You are solely responsible</strong> for all financial decisions you make. Always consult qualified
          professionals (SEBI-registered advisors, CAs, insurance advisors) before making significant financial
          decisions.
        </p>
      </LegalSection>

      <LegalSection title="3. User Accounts">
        <ul>
          <li>You must provide accurate information when creating your account.</li>
          <li>You are responsible for maintaining the security of your account credentials.</li>
          <li>
            You must notify us immediately at{" "}
            <a href="mailto:security@finkoin.com" style={{ color: "#534AB7" }}>
              security@finkoin.com
            </a>{" "}
            if you suspect unauthorized access to your account.
          </li>
          <li>You may not share your account with others or create multiple accounts.</li>
          <li>We reserve the right to suspend or terminate accounts that violate these Terms.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Data You Provide">
        <p>By using Finkoin, you confirm that:</p>
        <ul>
          <li>You are voluntarily sharing your financial information for the purpose of receiving educational analysis.</li>
          <li>The financial data you provide is accurate to the best of your knowledge.</li>
          <li>You understand that analysis accuracy depends on the accuracy of data you provide.</li>
          <li>You consent to your financial numbers (not identity data) being processed by our AI systems to generate personalised guidance.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Payments and Refunds">
        <SubHeading>5.1 Paid Features</SubHeading>
        <p>
          Certain features on Finkoin require payment (currently ₹99 for the complete financial fix plan). Payments are
          processed securely through Razorpay.
        </p>

        <SubHeading>5.2 Refund Policy</SubHeading>
        <div style={{ background: "#F7F7F4", borderRadius: 12, padding: "16px 20px", margin: "12px 0" }}>
          <p style={{ margin: 0, fontWeight: 600, color: "#111110" }}>Digital Products — No Refund Policy</p>
          <p style={{ marginTop: 8, marginBottom: 0, color: "#5F5E5A" }}>
            As Finkoin delivers digital content that is instantly accessible upon payment, all purchases are final and
            non-refundable once the content has been accessed or unlocked.
          </p>
        </div>
        <p>Exceptions (at our discretion):</p>
        <ul>
          <li>
            Technical failure: If you paid but could not access the content due to a technical error on our end,
            contact support@finkoin.com within 7 days for a full refund.
          </li>
          <li>Duplicate payment: If you were charged twice for the same purchase, we will refund the duplicate immediately.</li>
        </ul>
        <p>For refund requests, email support@finkoin.com with your payment ID within 7 days of purchase.</p>

        <SubHeading>5.3 FK Tokens</SubHeading>
        <p>
          FK Tokens are virtual rewards with no monetary value. They cannot be withdrawn, transferred, or exchanged for
          cash. They expire if your account is deleted.
        </p>
      </LegalSection>

      <LegalSection title="6. Acceptable Use">
        <p>You agree NOT to:</p>
        <ul>
          <li>Use the Service for any illegal purpose under Indian law</li>
          <li>Attempt to reverse engineer, hack, or compromise the platform</li>
          <li>Create fake accounts or provide false information</li>
          <li>Scrape, copy, or reproduce content from the platform without permission</li>
          <li>Use the platform to harm, deceive, or defraud others</li>
          <li>Resell or redistribute our reports or analysis without written permission</li>
          <li>Use automated tools, bots, or scripts to access the platform</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Intellectual Property">
        <p>
          All content on Finkoin including but not limited to text, graphics, logos, software, algorithms, and
          financial analysis methodology is owned by Finkoin and protected by Indian copyright law.
        </p>
        <p>You may use the platform for personal, non-commercial purposes. You may download and print your own financial reports for personal use.</p>
        <p>You may not reproduce, distribute, or create derivative works from our content without explicit written permission.</p>
      </LegalSection>

      <LegalSection title="8. Disclaimers and Limitation of Liability">
        <SubHeading>8.1 No Guarantees</SubHeading>
        <p>Finkoin provides the Service &quot;as is&quot; without any warranties. We do not guarantee:</p>
        <ul>
          <li>Accuracy or completeness of financial analysis</li>
          <li>That following our suggestions will achieve any particular financial outcome</li>
          <li>Uninterrupted or error-free service availability</li>
        </ul>

        <SubHeading>8.2 Limitation of Liability</SubHeading>
        <p>To the maximum extent permitted by Indian law, Finkoin shall not be liable for:</p>
        <ul>
          <li>Any financial losses arising from reliance on our analysis or recommendations</li>
          <li>Indirect, consequential, or special damages</li>
          <li>Losses due to market fluctuations, investment performance, or economic conditions</li>
          <li>Decisions made by you based on our educational content</li>
        </ul>
        <p>Our maximum liability to you for any claim shall not exceed the amount you paid us in the 12 months preceding the claim.</p>
      </LegalSection>

      <LegalSection title="9. Insurance and Investment References">
        <p>When Finkoin mentions specific insurance products, mutual funds, or investment instruments:</p>
        <ul>
          <li>These are educational examples only.</li>
          <li>We are not recommending specific products for purchase.</li>
          <li>Past performance of any investment mentioned does not guarantee future results.</li>
          <li>
            Insurance and investment products are subject to market risks. Read all documents carefully before investing.
          </li>
          <li>Any insurance-related features are provided through IRDAI-licensed partners where applicable.</li>
        </ul>
      </LegalSection>

      <LegalSection title="10. Third Party Services">
        <p>Finkoin integrates with third-party services including:</p>
        <ul>
          <li>
            <strong>Razorpay:</strong> Payment processing. Subject to Razorpay&apos;s terms.
          </li>
          <li>
            <strong>Supabase:</strong> Database and authentication. Subject to Supabase&apos;s terms.
          </li>
          <li>
            <strong>Groq:</strong> AI processing. Subject to Groq&apos;s terms.
          </li>
          <li>
            <strong>Google:</strong> Optional sign-in. Subject to Google&apos;s terms.
          </li>
        </ul>
        <p>We are not responsible for the practices or content of these third-party services.</p>
      </LegalSection>

      <LegalSection title="11. Termination">
        <p>We may suspend or terminate your account if you:</p>
        <ul>
          <li>Violate these Terms</li>
          <li>Provide false information</li>
          <li>Engage in fraudulent activity</li>
          <li>Misuse the platform or harm other users</li>
        </ul>
        <p>
          You may delete your account at any time from your profile settings. Upon deletion, your data will be removed
          within 30 days as per our Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection title="12. Governing Law and Disputes">
        <p>These Terms are governed by and construed in accordance with the laws of India.</p>
        <p>
          Any disputes arising from these Terms or your use of Finkoin shall be subject to the exclusive jurisdiction of
          the courts of India.
        </p>
        <p>
          We encourage you to contact us first at support@finkoin.com to resolve any disputes amicably before pursuing
          legal action.
        </p>
      </LegalSection>

      <LegalSection title="13. Changes to Terms">
        <p>We may update these Terms from time to time. We will notify you of significant changes via email or a prominent notice on the platform.</p>
        <p>Continued use of the Service after changes take effect constitutes acceptance of the updated Terms.</p>
      </LegalSection>

      <LegalSection title="14. Contact Us">
        <div style={{ background: "#F7F7F4", borderRadius: 12, padding: "16px 20px" }}>
          <p style={{ margin: 0 }}>
            <strong>Finkoin</strong>
            <br />
            General:{" "}
            <a href="mailto:hello@finkoin.com" style={{ color: "#534AB7" }}>
              hello@finkoin.com
            </a>
            <br />
            Support:{" "}
            <a href="mailto:support@finkoin.com" style={{ color: "#534AB7" }}>
              support@finkoin.com
            </a>
            <br />
            Legal:{" "}
            <a href="mailto:legal@finkoin.com" style={{ color: "#534AB7" }}>
              legal@finkoin.com
            </a>
            <br />
            Website:{" "}
            <a href="https://finkoin.com" style={{ color: "#534AB7" }}>
              finkoin.com
            </a>
          </p>
        </div>
      </LegalSection>

      <div style={{ borderTop: "1px solid #E8E6F0", paddingTop: 24, marginTop: 40, fontSize: 12, color: "#9B9A94", textAlign: "center" }}>
        These Terms of Service are governed by the laws of India including the Indian Contract Act 1872, Information
        Technology Act 2000, and Consumer Protection Act 2019.
        <br />
        <br />
        By using Finkoin, you acknowledge that you have read, understood, and agree to these Terms.
      </div>
    </div>
  );
}

function LegalSection({ title, children }: { title: string; children: ReactNode }) {
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
      <div style={{ fontSize: 15, color: "#5F5E5A", lineHeight: 1.8 }}>{children}</div>
    </div>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return (
    <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111110", marginTop: 20, marginBottom: 8 }}>{children}</h3>
  );
}
