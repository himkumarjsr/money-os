import type { LegalDoc } from "./types";

/** Verbatim port of app/legal/refund/page.tsx. */
export const REFUND_POLICY: LegalDoc = {
  slug: "refund",
  eyebrow: "Legal",
  title: "Refund Policy",
  meta: "Last updated: May 1, 2026",
  summary: {
    tone: "grey",
    text: "**Summary:** Digital products are non-refundable once accessed. We offer refunds only for technical failures or duplicate charges.",
  },
  headingStyle: "plain",
  sections: [
    {
      title: "Digital Products (Fix Plan, Tax Report)",
      blocks: [
        {
          kind: "p",
          text: "Once you purchase and access a digital product on Finkoin, the purchase is final and non-refundable. This includes:",
        },
        {
          kind: "ul",
          items: [
            "Financial Fix Plan (₹99)",
            "Tax Analysis Report (₹99)",
            "Any future paid reports",
          ],
        },
      ],
    },
    {
      title: "When We Do Refund",
      blocks: [
        {
          kind: "ul",
          items: [
            "**Technical failure:** You paid but could not access the content due to a technical error on our end. Contact us within 7 days.",
            "**Duplicate payment:** You were charged twice for the same purchase. We will refund the duplicate within 5–7 business days.",
          ],
        },
      ],
    },
    {
      title: "How to Request a Refund",
      blocks: [
        {
          kind: "p",
          text: "Email [support@finkoin.com](mailto:support@finkoin.com) with:",
        },
        {
          kind: "ul",
          items: [
            "Your registered email address",
            "Razorpay Payment ID",
            "Reason for refund request",
            "Screenshot of the issue (if technical)",
          ],
        },
        {
          kind: "p",
          text: "We will respond within 2 business days. Approved refunds are processed within 5–7 business days to your original payment method.",
        },
      ],
    },
  ],
  footer: ["Questions? Email [support@finkoin.com](mailto:support@finkoin.com)"],
};
