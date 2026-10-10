import type { LegalDoc } from "./types";

/** Verbatim port of app/legal/privacy/page.tsx. */
export const PRIVACY_POLICY: LegalDoc = {
  slug: "privacy",
  eyebrow: "Legal",
  title: "Privacy Policy",
  meta: "Last updated: May 1, 2026 · Effective: May 1, 2026",
  summary: {
    tone: "violet",
    text: "**Plain language summary:** Finkoin collects only financial numbers — your income, expenses, loans, and savings amounts. We never ask for PAN, Aadhaar, bank account numbers, or passwords. Your data is encrypted, never sold, and you can delete it anytime.",
  },
  headingStyle: "underlined",
  sections: [
    {
      title: "1. Who We Are",
      blocks: [
        {
          kind: "p",
          text: 'Finkoin ("we", "us", "our") is a personal finance analysis platform operated from India. Our website is located at finkoin.com.',
        },
        {
          kind: "p",
          text: "For privacy-related queries, contact us at: [privacy@finkoin.com](mailto:privacy@finkoin.com)",
        },
      ],
    },
    {
      title: "2. What Data We Collect",
      blocks: [
        { kind: "h3", text: "2.1 Data You Provide" },
        { kind: "p", text: "When you use Finkoin, we collect:" },
        {
          kind: "ul",
          items: [
            "**Account information:** Name, email address, and password (encrypted) when you create an account.",
            "**Financial numbers:** Monthly income, expense amounts, loan EMI amounts, insurance premium amounts, savings balances, and investment values.",
            "**Profile information:** Age, city tier, life stage (single/married/etc), and financial goals.",
            "**Payment information:** For paid features, we process payments through Razorpay. We do not store your card or bank details. Razorpay handles all payment data.",
          ],
        },
        { kind: "h3", text: "2.2 What We Never Collect" },
        {
          kind: "callout",
          tone: "green",
          title: "We NEVER collect:",
          blocks: [
            {
              kind: "ul",
              plain: true,
              items: [
                "✗ PAN card number",
                "✗ Aadhaar number",
                "✗ Bank account numbers or IFSC codes",
                "✗ Credit or debit card numbers",
                "✗ Net banking credentials",
                "✗ UPI PIN or passwords",
                "✗ Any government-issued ID number",
                "✗ Physical documents or scans",
              ],
            },
          ],
        },
        { kind: "h3", text: "2.3 Automatically Collected Data" },
        {
          kind: "ul",
          items: [
            "**Usage data:** Pages visited, features used, and time spent on the platform.",
            "**Device information:** Browser type, operating system, and IP address for security purposes.",
            "**Cookies:** Session cookies to keep you logged in. No advertising cookies.",
          ],
        },
      ],
    },
    {
      title: "3. How We Use Your Data",
      blocks: [
        { kind: "p", text: "We use your data to:" },
        {
          kind: "ul",
          items: [
            "Calculate your financial health score and analysis",
            "Generate your personalised financial plan",
            "Share with our AI system (Groq) to generate personalised explanations — only financial numbers, never identity data",
            "Send you important account notifications and updates",
            "Process payments for paid features",
            "Improve our product and fix bugs",
            "Comply with legal obligations",
          ],
        },
        {
          kind: "p",
          text: "**We never use your data for:** advertising, selling to third parties, credit scoring, or any purpose beyond what is listed above.",
        },
      ],
    },
    {
      title: "4. AI and Data Processing",
      blocks: [
        {
          kind: "p",
          text: "Finkoin uses artificial intelligence to generate personalised financial plans. Here is how it works:",
        },
        {
          kind: "ul",
          items: [
            "Your financial numbers are sent to Groq AI (a US-based AI service) to generate personalised explanations.",
            "Only numerical financial data is shared — never your name, email, PAN, Aadhaar, or any identity information.",
            "Groq processes data under their privacy policy available at [groq.com/privacy](https://groq.com/privacy).",
            "AI-generated content is for educational purposes only and does not constitute SEBI-registered investment advice.",
          ],
        },
      ],
    },
    {
      title: "5. Data Storage and Security",
      blocks: [
        {
          kind: "p",
          text: "Your data is stored securely using industry-standard practices:",
        },
        {
          kind: "ul",
          items: [
            "**Database:** Supabase (PostgreSQL) hosted on AWS Singapore region — data stays within Asia Pacific.",
            "**Encryption at rest:** All data is encrypted using AES-256 encryption.",
            "**Encryption in transit:** All connections use TLS 1.3 / HTTPS.",
            "**Authentication:** Secure JWT tokens with automatic expiry and refresh rotation.",
            "**Row Level Security:** Database-level security ensures you can only access your own data.",
            "**Access control:** Only essential team members can access production systems, with audit logging enabled.",
          ],
        },
        {
          kind: "p",
          text: "Despite our best efforts, no system is 100% secure. If you discover a security vulnerability, please report it to [security@finkoin.com](mailto:security@finkoin.com) immediately.",
        },
      ],
    },
    {
      title: "6. Data Sharing",
      blocks: [
        { kind: "p", text: "We share your data only with:" },
        {
          kind: "ul",
          items: [
            "**Groq AI:** Financial numbers only (no identity data) for AI analysis.",
            "**Razorpay:** Payment processing for paid features. They handle payment data under their own privacy policy.",
            "**Supabase:** Infrastructure provider for database and authentication.",
            "**Vercel:** Hosting provider for our web application.",
          ],
        },
        {
          kind: "p",
          text: "**We never sell your data** to advertisers, data brokers, insurance companies, banks, or any third party.",
        },
      ],
    },
    {
      title: "7. Your Rights (DPDP Act 2023)",
      blocks: [
        {
          kind: "p",
          text: "Under India's Digital Personal Data Protection Act 2023, you have the following rights:",
        },
        {
          kind: "ul",
          items: [
            "**Right to access:** Request a copy of all personal data we hold about you.",
            "**Right to correction:** Update incorrect or incomplete data in your account settings.",
            "**Right to erasure:** [Request deletion](/legal/delete-account) of your account and all associated data. We will process deletion within 30 days.",
            "**Right to withdraw consent:** Withdraw your consent for data processing at any time by deleting your account.",
            "**Right to grievance redressal:** File a complaint with our Grievance Officer.",
          ],
        },
        {
          kind: "p",
          text: 'To exercise any of these rights, email us at [privacy@finkoin.com](mailto:privacy@finkoin.com) with subject line "Data Rights Request".',
        },
        { kind: "h3", text: "Grievance Officer" },
        {
          kind: "p",
          text: "As required under DPDP Act 2023 and IT Act 2000:\nName: Himanshu Kumar Gupta\nEmail: [grievance@finkoin.com](mailto:grievance@finkoin.com)\nResponse time: Within 30 days",
        },
      ],
    },
    {
      title: "8. Cookies and Tracking",
      blocks: [
        { kind: "p", text: "We use minimal cookies:" },
        {
          kind: "ul",
          items: [
            "**Essential cookies:** Authentication session cookies required for login to work. Cannot be disabled.",
            "**Preference cookies:** Save your form progress and calculator data locally.",
          ],
        },
        {
          kind: "p",
          text: "**We do not use:** advertising cookies, cross-site tracking cookies, or social media tracking pixels.",
        },
        {
          kind: "p",
          text: "The Finkoin mobile app does not use analytics or session-recording tools. On the website only, if you allow it, we use Google Analytics and Microsoft Clarity to understand usage (pages visited, time spent, clicks, general location). No personal financial data is shared with them.",
        },
      ],
    },
    {
      title: "9. Data Retention",
      blocks: [
        {
          kind: "ul",
          items: [
            "**Active accounts:** Data retained while your account is active.",
            "**Deleted accounts:** All personal data deleted within 30 days of account deletion request. Anonymised statistical data may be retained.",
            "**Payment records:** Retained for 7 years as required by Indian tax laws.",
            "**Inactive accounts:** Accounts with no activity for 3 years may be deleted after prior email notice.",
          ],
        },
      ],
    },
    {
      title: "10. Children's Privacy",
      blocks: [
        {
          kind: "p",
          text: "Finkoin is not intended for users under 18 years of age. We do not knowingly collect data from minors. If you believe a minor has created an account, please contact us at [privacy@finkoin.com](mailto:privacy@finkoin.com) and we will delete it immediately.",
        },
      ],
    },
    {
      title: "11. Changes to This Policy",
      blocks: [
        {
          kind: "p",
          text: "We may update this Privacy Policy from time to time. When we make significant changes:",
        },
        {
          kind: "ul",
          items: [
            'We will update the "Last updated" date at the top of this page.',
            "We will notify you by email if the changes materially affect your rights.",
            "For significant changes requiring re-consent, you will see a consent prompt on your next login.",
          ],
        },
      ],
    },
    {
      title: "12. Contact Us",
      blocks: [
        { kind: "p", text: "For any privacy-related questions or concerns:" },
        {
          kind: "callout",
          tone: "grey",
          text: "**Finkoin**\nEmail: [privacy@finkoin.com](mailto:privacy@finkoin.com)\nWebsite: finkoin.com\nGrievance: [grievance@finkoin.com](mailto:grievance@finkoin.com)",
        },
      ],
    },
  ],
  footer: [
    "This privacy policy is governed by the laws of India including the Information Technology Act 2000, IT (Amendment) Act 2008, and Digital Personal Data Protection Act 2023.",
  ],
};
