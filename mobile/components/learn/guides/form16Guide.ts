import type { LearnGuideBody } from "../types";

/** Port of components/learn/Form16ItrGuide.tsx. */
export const FORM16_GUIDE: LearnGuideBody = {
  toc: [
    { id: "what-form-16", label: "What Form 16 is" },
    { id: "verify", label: "What to verify" },
    { id: "free-filing", label: "Free filing angle" },
    { id: "steps", label: "5-step path" },
    { id: "disclaimer", label: "Disclaimer" },
  ],
  sections: [
    {
      id: "lead",
      blocks: [
        {
          kind: "p",
          text: "Looking for **free ITR filing 2025-26** help? Finkoin’s angle is simple: start from your **Form 16 / salary numbers**, compare old vs new regime, and walk into filing with clarity — without paying for a basic comparison.",
        },
        {
          kind: "actions",
          title: "Use Finkoin’s free tax tool (FY 2025-26)",
          text: "Enter salary / Form 16 style numbers, deductions (80C, HRA, NPS, home loan), and see which regime saves more — before you open the income-tax portal.",
          actions: [
            {
              label: "Open tax regime calculator →",
              href: "/calculators/tax-regime-2026",
              primary: true,
            },
            { label: "Full financial health check →", href: "/analyse" },
          ],
        },
      ],
    },
    {
      id: "what-form-16",
      title: "What Form 16 is (and what it is not)",
      card: true,
      blocks: [
        {
          kind: "p",
          text: "Form 16 is your employer’s TDS certificate: Part A (employer TAN, tax deposited) and Part B (salary, allowances, perquisites, deductions considered by payroll, taxable income).",
        },
        {
          kind: "p",
          text: "It is **not** your ITR. Bank interest, capital gains, rent income, and second Form 16s (job switch) often sit outside what one employer saw.",
        },
      ],
    },
    {
      id: "verify",
      title: "What to verify before you file",
      card: true,
      blocks: [
        {
          kind: "ul",
          items: [
            "Gross salary and exemptions match salary slips / CTC letters.",
            "HRA exemption matches rent proofs and metro vs non-metro rules.",
            "80C shows PF correctly — don’t double-count ELSS you never declared.",
            "Two employers → two Form 16s; merge incomes carefully.",
            "Download AIS / Form 26AS and match TDS credits.",
          ],
        },
      ],
    },
    {
      id: "free-filing",
      title: "“Free ITR filing” — what Finkoin helps with",
      card: true,
      blocks: [
        {
          kind: "p",
          text: "Many sites promise free e-filing in June–July. Finkoin’s unique early step is **decision support**: which regime, which deductions matter, and whether your salary story needs ITR-1 vs a more complex form.",
        },
        {
          kind: "p",
          text: "Use the [Old vs New Tax Regime Calculator 2025-26](/calculators/tax-regime-2026) with Form 16 figures, then file on the official Income Tax portal (or your preferred e-filing partner) with numbers you already understand.",
        },
      ],
    },
    {
      id: "steps",
      title: "Practical 5-step path for FY 2025-26",
      card: true,
      blocks: [
        {
          kind: "ul",
          ordered: true,
          items: [
            "Collect Form 16 (all employers), AIS, 26AS, bank interest certificates.",
            "Run [regime comparison](/calculators/tax-regime-2026) with realistic 80C / HRA / 24B / NPS.",
            "Read [old vs new regime guide](/learn/old-vs-new-tax-regime-which-saves-you-more-money) if deductions are large.",
            "Pick the regime, gather proofs, reconcile AIS mismatches.",
            "File ITR on the government portal; keep acknowledgements.",
          ],
        },
      ],
    },
    {
      id: "disclaimer",
      title: "Important",
      card: true,
      blocks: [
        {
          kind: "p",
          text: "Finkoin is educational software — not a CA firm or authorised e-filing intermediary. Complex cases (capital gains schedules, business income, NRI) need a qualified professional.",
        },
      ],
    },
  ],
};
