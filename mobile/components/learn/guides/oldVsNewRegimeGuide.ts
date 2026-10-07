import type { Faq } from "@/components/content/FaqAccordion";
import type { LearnGuideBody } from "../types";

const FAQS: Faq[] = [
  {
    q: "Which is better: old or new tax regime?",
    a: "There is no universal winner. Compare using your real deductions/exemptions (80C/80D/HRA/home loan/NPS) and compute final tax after rebate, surcharge, and cess.",
  },
  {
    q: "Can I switch regimes every year?",
    a: "Many salaried individuals can choose each year at filing time, but rules can differ for business income. Verify current-year conditions for your case.",
  },
  {
    q: "Does HRA matter for the decision?",
    a: "Yes. If you pay rent and are eligible for HRA exemption (old regime), it can materially change taxable income.",
  },
  {
    q: "What is the fastest way to decide?",
    a: "List eligible deductions you can actually claim with proofs. If the list is small, new regime often wins; if large (within caps), old regime can win. Then verify using a calculator.",
  },
  {
    q: "Should I trust slab rates only?",
    a: "No. Always compute the full tax: taxable income → slab tax → rebate (87A if applicable) → surcharge (if applicable) → cess.",
  },
  {
    q: "What if I have capital gains?",
    a: "Compute capital gains separately using their own rules/rates; don’t treat them as plain salary slab income.",
  },
  {
    q: "Does employer declaration lock my final choice?",
    a: "Often it affects TDS during the year, but the final choice may be made at filing time. Confirm rules for your case.",
  },
  {
    q: "What deductions are common in old regime?",
    a: "80C, 80D, home loan interest (24(b)), HRA exemption, NPS (80CCD(1B)), and others subject to conditions.",
  },
];

/** Port of components/learn/tax/OldVsNewRegimeGuideFY2526.tsx (calculator → native tool link). */
export const OLD_VS_NEW_REGIME_GUIDE: LearnGuideBody = {
  toc: [
    { id: "calculator", label: "Live calculator" },
    { id: "how-to-decide", label: "How to decide (2-minute method)" },
    { id: "comparison", label: "Side-by-side comparison" },
    { id: "examples", label: "Examples by salary" },
    { id: "checklist", label: "Proof checklist" },
  ],
  asideNote: "Use the calculator for the exact number.",
  faqs: FAQS,
  faqSubtitle:
    "Clear answers using official Income Tax terminology. Educational guidance only.",
  faqPlaceholder: "Search (e.g. ITR-1, FY vs AY, 80C)",
  sections: [
    {
      id: "calculator",
      title: "Old vs new tax regime calculator (embedded)",
      blocks: [
        {
          kind: "p",
          muted: true,
          text: "This is the advantage vs text-only articles: run **old new tax regime 2026** numbers here with your deductions, then keep reading the examples below.",
        },
        {
          kind: "tool",
          title: "Old vs new tax regime calculator (FY 2025-26)",
          subtitle: "Your edge vs plain articles: run the numbers here, then file smarter.",
          text: "Compare old vs new regime with 80C, HRA, NPS, home loan — free, instant.",
          href: "/calculators/tax-regime-2026",
          label: "Open full-screen tax calculator →",
        },
      ],
    },
    {
      id: "how-to-decide",
      title: "How to decide (2-minute method)",
      card: true,
      blocks: [
        {
          kind: "ul",
          ordered: true,
          items: [
            "Write your annual salary components (basic, HRA, allowances) and other income (interest, capital gains).",
            "List deductions/exemptions you can actually claim with proofs (80C, 80D, HRA, 24(b), NPS).",
            "Compute tax under both regimes using the same income, then apply rebate/surcharge/cess.",
            "Pick the lower tax (and consider effort: proof collection + complexity).",
          ],
        },
        {
          kind: "actions",
          tone: "grey",
          actions: [
            {
              label: "Compare both regimes in calculator →",
              href: "/calculators?calc=tax-regime",
              primary: true,
            },
            {
              label: "Read tax basics (FY vs AY, ITR, TDS) →",
              href: "/learn/know-taxation-in-india-old-vs-new-slabs-interest-rates",
            },
          ],
        },
      ],
    },
    {
      id: "comparison",
      title: "Old vs new regime — side-by-side comparison",
      blocks: [
        {
          kind: "table",
          headers: ["Feature", "Old regime", "New regime"],
          rows: [
            [
              "Deductions/exemptions",
              "More allowed (subject to conditions)",
              "Fewer allowed (simpler)",
            ],
            ["HRA benefit", "Can apply if eligible", "Typically not applicable"],
            ["Proof burden", "Higher (rent receipts, policy docs, etc.)", "Lower"],
            [
              "Who it suits (often)",
              "People with meaningful eligible deductions",
              "People with few deductions",
            ],
          ],
          boldFirstCol: true,
        },
      ],
    },
    {
      id: "examples",
      title: "Examples (how the decision changes by salary)",
      blocks: [
        {
          kind: "cards",
          tone: "grey",
          items: [
            {
              title: "₹10L salary — common pivot point",
              text: "If you claim HRA + 80C + 80D (and/or home loan interest), old regime often becomes competitive. If deductions are minimal, new regime often wins.",
            },
            {
              title: "₹15L+ salary",
              text: "Compare full tax and watch surcharge bands. Keep capital gains separate; don’t mix them into salary slabs.",
            },
          ],
        },
        {
          kind: "p",
          muted: true,
          text: "For detailed beginner fundamentals (FY vs AY, ITR, AIS/26AS), start here: [Indian income tax explained simply →](/learn/know-taxation-in-india-old-vs-new-slabs-interest-rates)",
        },
      ],
    },
    {
      id: "checklist",
      title: "Proof checklist (old regime)",
      card: true,
      blocks: [
        {
          kind: "ul",
          items: [
            "Form 16 (salary + TDS)",
            "Rent receipts / rental agreement (if claiming HRA exemption)",
            "Life insurance premium / PPF / ELSS proofs (80C)",
            "Health insurance premium proofs (80D)",
            "Home loan interest certificate (24(b))",
            "NPS contribution proof (80CCD(1B))",
            "Bank interest certificates (FD/RD/savings)",
            "Capital gains statements (if any)",
          ],
        },
      ],
    },
  ],
};
