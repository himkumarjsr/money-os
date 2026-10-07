import type { LearnGuideBody } from "../types";

/** Port of components/learn/TermInsuranceVsEndowmentGuide.tsx. */
export const TERM_INSURANCE_GUIDE: LearnGuideBody = {
  toc: [
    { id: "intro", label: "Start here" },
    { id: "why-matters", label: "Why this matters" },
    { id: "example", label: "Illustrative example" },
    { id: "buying-wrong", label: "Buying wrong" },
    { id: "premium-discipline", label: "Premium discipline" },
  ],
  includeArticleIntro: true,
  sections: [
    {
      id: "lead",
      blocks: [
        {
          kind: "p",
          text: "Term insurance is **pure protection**: a fixed premium buys a large sum payable if you die during the policy term. Below is a practical “why”, how to think about **how much**, what people buy wrong, and why **premium you can always pay** matters as much as the cover amount.",
        },
      ],
    },
    {
      id: "why-matters",
      title: "Why this matters — money for obligations, then survival",
      card: true,
      blocks: [
        {
          kind: "p",
          text: "If the main earner dies early, the family still faces the same world: **loan EMIs**, **children’s education**, **rent or home costs**, day-to-day expenses, and possible **large medical bills** (even with health insurance, cash flow and co-pay gaps exist).",
        },
        {
          kind: "p",
          text: "Term cover is meant so that, in that worst case, the payout can: **pay off or sharply reduce big debts you choose to include** (for example home loan), **fund non-negotiable goals** you had planned (education), set aside a **medical / liquidity buffer**, and rebuild an **emergency runway** — and **still leave enough corpus** so dependents can live without your income for many years, not just survive the first 12 months.",
        },
        {
          kind: "p",
          text: "Many families plan an emergency fund of **several months up to about 12 months** of must-pay expenses (see our emergency fund guide). If income is volatile or you are the only earner, you usually steer toward the **upper end** of that range. Term insurance does not replace that fund while you are alive — but the **sum assured** should reflect that the family may need to recreate buffers *and* replace lost income after big one-time uses.",
        },
        {
          kind: "p",
          text: "[Emergency fund — how much, where to keep it →](/learn/emergency-fund-how-much-where-to-keep-it)",
        },
      ],
    },
    {
      id: "example",
      title: "Illustrative example (numbers are not advice)",
      card: true,
      blocks: [
        {
          kind: "p",
          text: "Imagine a sole earner wants the family to be able to: clear a large home loan, keep education on track, hold liquidity for shocks, and then still have years of living costs. A **needs-based** list might look like this (purely educational):",
        },
        {
          kind: "table",
          headers: ["Bucket (illustrative)", "Example amount"],
          rows: [
            ["Outstanding home loan you want extinguished", "**₹35,00,000**"],
            ["Education corpus (say next 8–10 years)", "**₹25,00,000**"],
            [
              "Medical / liquidity buffer (not a substitute for health insurance)",
              "**₹10,00,000**",
            ],
            [
              "Emergency fund to recreate (e.g. ~12 months essential costs — see emergency fund guide)",
              "**₹5,40,000**",
            ],
            [
              "Income replacement — essential household costs for several years",
              "**₹35,00,000**",
            ],
            ["Rough total to discuss with family / advisor", "~₹1.10 crore"],
          ],
          totalRow: true,
        },
        {
          kind: "p",
          muted: true,
          text: "Shortcut checks people use: **10–15× annual income** (sometimes + loan outstanding). Use that as a cross-check to your needs list — city, lifestyle, number of dependents, and existing assets change everything.",
        },
      ],
    },
    {
      id: "buying-wrong",
      title: "Buying wrong — what to avoid",
      card: true,
      blocks: [
        {
          kind: "ul",
          spaced: true,
          items: [
            "**Endowment / money-back as “main protection”:** the death benefit per rupee of premium is usually small. You may get a “maturity story”, but the family might be severely underinsured if you die young.",
            "**Confusing savings with life cover:** keep investments in transparent products (MFs, PPF, etc.) and life cover as term — same message as mixing goals in one opaque bundle.",
            "**Under-buying because the premium “feels wasted”:** term has no maturity value; that is why it is cheap enough to buy meaningful cover.",
          ],
        },
        {
          kind: "p",
          text: "Before any bundled product, ask for **net return after all charges** and compare with a simple **term + PPF / MF** combo you understand.",
        },
      ],
    },
    {
      id: "premium-discipline",
      title: "Do not buy so much cover that the premium breaks you",
      card: true,
      blocks: [
        {
          kind: "p",
          text: "The **right** term plan is one your family can rely on for **the full term**. That means you must be able to pay the premium after a bad year too — **job loss**, **business dip**, or **income shock**. If the premium is too large a share of take-home, people often **stop paying**; a lapsed term policy leaves you with **no cover** when you restart later (and you will be older — new cover may cost more or have health underwriting hurdles).",
        },
        {
          kind: "ul",
          spaced: true,
          items: [
            "Size cover from **needs + a premium stress test**: “Can I pay this every year for 20–30 years even if income drops 20–30% for a while?”",
            "If the honest answer is no, prefer a **slightly lower sum assured you will not lapse** over a heroic number on paper.",
            "When income rises, **add cover or a second term policy** rather than over-stretching today (subject to insurer rules and health declarations).",
            "Revisit cover every few years: as **loans shrink** and **investments grow**, you may need less pure risk cover — but don’t cut blindly; dependents and goals matter.",
          ],
        },
      ],
    },
    {
      id: "disclaimer",
      blocks: [
        {
          kind: "callout",
          tone: "amber",
          text: "**Educational only.** This is not personalised insurance advice, not a recommendation to buy or skip any product, and not a solicitation. Sum assured, riders, and tax treatment depend on insurer terms and current law — verify with a **registered insurance advisor / financial planner** and official policy documents before you commit.",
        },
      ],
    },
  ],
};
