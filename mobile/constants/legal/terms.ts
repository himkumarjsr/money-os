import type { LegalDoc } from "./types";

/** Verbatim port of app/legal/terms/page.tsx. */
export const TERMS_OF_SERVICE: LegalDoc = {
  slug: "terms",
  eyebrow: "Legal",
  title: "Terms of Service",
  meta: "Last updated: May 1, 2026 · Effective: May 1, 2026",
  summary: {
    tone: "warn",
    text: "**Important:** Finkoin provides educational financial guidance only. We are NOT a SEBI-registered investment advisor, insurance agent, or financial institution. Nothing on this platform constitutes professional financial advice. Always consult a qualified professional before making financial decisions.",
  },
  headingStyle: "underlined",
  sections: [
    {
      title: "1. Acceptance of Terms",
      blocks: [
        {
          kind: "p",
          text: "By accessing or using Finkoin (\"the Service\", \"the Platform\") at finkoin.com, you agree to be bound by these Terms of Service (\"Terms\"). If you do not agree to these Terms, do not use the Service.",
        },
        {
          kind: "p",
          text: "These Terms constitute a legally binding agreement between you (\"User\", \"you\") and Finkoin (\"we\", \"us\", \"our\").",
        },
        {
          kind: "p",
          text: "You must be at least 18 years of age and capable of entering into a legally binding contract under Indian law to use this Service.",
        },
      ],
    },
    {
      title: "2. Nature of Service",
      blocks: [
        { kind: "h3", text: "2.1 Educational Platform" },
        { kind: "p", text: "Finkoin is an educational personal finance platform that:" },
        {
          kind: "ul",
          items: [
            "Calculates financial health scores based on your input data",
            "Provides educational analysis of your financial situation",
            "Generates AI-powered explanations and suggested action plans",
            "Offers financial calculators for educational purposes",
          ],
        },
        { kind: "h3", text: "2.2 Not Financial Advice" },
        {
          kind: "callout",
          tone: "red",
          title: "Finkoin is NOT:",
          blocks: [
            {
              kind: "ul",
              items: [
                "A SEBI-registered investment advisor (RIA)",
                "An IRDAI-licensed insurance advisor",
                "An RBI-regulated financial entity",
                "A portfolio management service",
                "A stockbroker or mutual fund distributor",
              ],
            },
          ],
        },
        {
          kind: "p",
          text: "All analysis, recommendations, and suggestions on this platform are algorithmic and educational in nature. They do not constitute professional investment advice, tax advice, legal advice, or insurance advice.",
        },
        {
          kind: "p",
          text: "**You are solely responsible** for all financial decisions you make. Always consult qualified professionals (SEBI-registered advisors, CAs, insurance advisors) before making significant financial decisions.",
        },
      ],
    },
    {
      title: "3. User Accounts",
      blocks: [
        {
          kind: "ul",
          items: [
            "You must provide accurate information when creating your account.",
            "You are responsible for maintaining the security of your account credentials.",
            "You must notify us immediately at [security@finkoin.com](mailto:security@finkoin.com) if you suspect unauthorized access to your account.",
            "You may not share your account with others or create multiple accounts.",
            "We reserve the right to suspend or terminate accounts that violate these Terms.",
          ],
        },
      ],
    },
    {
      title: "4. Data You Provide",
      blocks: [
        { kind: "p", text: "By using Finkoin, you confirm that:" },
        {
          kind: "ul",
          items: [
            "You are voluntarily sharing your financial information for the purpose of receiving educational analysis.",
            "The financial data you provide is accurate to the best of your knowledge.",
            "You understand that analysis accuracy depends on the accuracy of data you provide.",
            "You consent to your financial numbers (not identity data) being processed by our AI systems to generate personalised guidance.",
          ],
        },
      ],
    },
    {
      title: "5. Payments and Refunds",
      blocks: [
        { kind: "h3", text: "5.1 Paid Features" },
        {
          kind: "p",
          text: "Certain features on Finkoin require payment (currently ₹99 for the complete financial fix plan). Payments are processed securely through Razorpay.",
        },
        { kind: "h3", text: "5.2 Refund Policy" },
        {
          kind: "callout",
          tone: "grey",
          title: "Digital Products — No Refund Policy",
          text: "As Finkoin delivers digital content that is instantly accessible upon payment, all purchases are final and non-refundable once the content has been accessed or unlocked.",
        },
        { kind: "p", text: "Exceptions (at our discretion):" },
        {
          kind: "ul",
          items: [
            "Technical failure: If you paid but could not access the content due to a technical error on our end, contact support@finkoin.com within 7 days for a full refund.",
            "Duplicate payment: If you were charged twice for the same purchase, we will refund the duplicate immediately.",
          ],
        },
        {
          kind: "p",
          text: "For refund requests, email support@finkoin.com with your payment ID within 7 days of purchase.",
        },
        { kind: "h3", text: "5.3 FK Tokens" },
        {
          kind: "p",
          text: "FK Tokens are virtual rewards with no monetary value. They cannot be withdrawn, transferred, or exchanged for cash. They expire if your account is deleted.",
        },
      ],
    },
    {
      title: "6. Acceptable Use",
      blocks: [
        { kind: "p", text: "You agree NOT to:" },
        {
          kind: "ul",
          items: [
            "Use the Service for any illegal purpose under Indian law",
            "Attempt to reverse engineer, hack, or compromise the platform",
            "Create fake accounts or provide false information",
            "Scrape, copy, or reproduce content from the platform without permission",
            "Use the platform to harm, deceive, or defraud others",
            "Resell or redistribute our reports or analysis without written permission",
            "Use automated tools, bots, or scripts to access the platform",
          ],
        },
      ],
    },
    {
      title: "7. Intellectual Property",
      blocks: [
        {
          kind: "p",
          text: "All content on Finkoin including but not limited to text, graphics, logos, software, algorithms, and financial analysis methodology is owned by Finkoin and protected by Indian copyright law.",
        },
        {
          kind: "p",
          text: "You may use the platform for personal, non-commercial purposes. You may download and print your own financial reports for personal use.",
        },
        {
          kind: "p",
          text: "You may not reproduce, distribute, or create derivative works from our content without explicit written permission.",
        },
      ],
    },
    {
      title: "8. Disclaimers and Limitation of Liability",
      blocks: [
        { kind: "h3", text: "8.1 No Guarantees" },
        {
          kind: "p",
          text: "Finkoin provides the Service \"as is\" without any warranties. We do not guarantee:",
        },
        {
          kind: "ul",
          items: [
            "Accuracy or completeness of financial analysis",
            "That following our suggestions will achieve any particular financial outcome",
            "Uninterrupted or error-free service availability",
          ],
        },
        { kind: "h3", text: "8.2 Limitation of Liability" },
        {
          kind: "p",
          text: "To the maximum extent permitted by Indian law, Finkoin shall not be liable for:",
        },
        {
          kind: "ul",
          items: [
            "Any financial losses arising from reliance on our analysis or recommendations",
            "Indirect, consequential, or special damages",
            "Losses due to market fluctuations, investment performance, or economic conditions",
            "Decisions made by you based on our educational content",
          ],
        },
        {
          kind: "p",
          text: "Our maximum liability to you for any claim shall not exceed the amount you paid us in the 12 months preceding the claim.",
        },
      ],
    },
    {
      title: "9. Insurance and Investment References",
      blocks: [
        {
          kind: "p",
          text: "When Finkoin mentions specific insurance products, mutual funds, or investment instruments:",
        },
        {
          kind: "ul",
          items: [
            "These are educational examples only.",
            "We are not recommending specific products for purchase.",
            "Past performance of any investment mentioned does not guarantee future results.",
            "Insurance and investment products are subject to market risks. Read all documents carefully before investing.",
            "Any insurance-related features are provided through IRDAI-licensed partners where applicable.",
          ],
        },
      ],
    },
    {
      title: "10. Third Party Services",
      blocks: [
        { kind: "p", text: "Finkoin integrates with third-party services including:" },
        {
          kind: "ul",
          items: [
            "**Razorpay:** Payment processing. Subject to Razorpay's terms.",
            "**Supabase:** Database and authentication. Subject to Supabase's terms.",
            "**Groq:** AI processing. Subject to Groq's terms.",
            "**Google:** Optional sign-in. Subject to Google's terms.",
          ],
        },
        {
          kind: "p",
          text: "We are not responsible for the practices or content of these third-party services.",
        },
      ],
    },
    {
      title: "11. Termination",
      blocks: [
        { kind: "p", text: "We may suspend or terminate your account if you:" },
        {
          kind: "ul",
          items: [
            "Violate these Terms",
            "Provide false information",
            "Engage in fraudulent activity",
            "Misuse the platform or harm other users",
          ],
        },
        {
          kind: "p",
          text: "You may delete your account at any time from your profile settings. Upon deletion, your data will be removed within 30 days as per our Privacy Policy.",
        },
      ],
    },
    {
      title: "12. Governing Law and Disputes",
      blocks: [
        {
          kind: "p",
          text: "These Terms are governed by and construed in accordance with the laws of India.",
        },
        {
          kind: "p",
          text: "Any disputes arising from these Terms or your use of Finkoin shall be subject to the exclusive jurisdiction of the courts of India.",
        },
        {
          kind: "p",
          text: "We encourage you to contact us first at support@finkoin.com to resolve any disputes amicably before pursuing legal action.",
        },
      ],
    },
    {
      title: "13. Changes to Terms",
      blocks: [
        {
          kind: "p",
          text: "We may update these Terms from time to time. We will notify you of significant changes via email or a prominent notice on the platform.",
        },
        {
          kind: "p",
          text: "Continued use of the Service after changes take effect constitutes acceptance of the updated Terms.",
        },
      ],
    },
    {
      title: "14. Contact Us",
      blocks: [
        {
          kind: "callout",
          tone: "grey",
          text: "**Finkoin**\nGeneral: [hello@finkoin.com](mailto:hello@finkoin.com)\nSupport: [support@finkoin.com](mailto:support@finkoin.com)\nLegal: [legal@finkoin.com](mailto:legal@finkoin.com)\nWebsite: finkoin.com",
        },
      ],
    },
  ],
  footer: [
    "These Terms of Service are governed by the laws of India including the Indian Contract Act 1872, Information Technology Act 2000, and Consumer Protection Act 2019.",
    "By using Finkoin, you acknowledge that you have read, understood, and agree to these Terms.",
  ],
};
