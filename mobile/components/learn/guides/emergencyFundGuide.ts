import type { LearnGuideBody } from "../types";

/** Port of components/learn/EmergencyFundGuide.tsx (calculator → native tool link). */
export const EMERGENCY_FUND_GUIDE: LearnGuideBody = {
  toc: [
    { id: "intro", label: "Start here" },
    { id: "why-first", label: "Why first" },
    { id: "one-month", label: "Count one month" },
    { id: "life-stages", label: "Life stages" },
    { id: "rupee-example", label: "Rupee example" },
    { id: "where-to-keep", label: "Where to keep" },
    { id: "home-loan", label: "Home loan EMIs" },
    { id: "build-rebuild", label: "Build & rebuild" },
  ],
  asideNote: "Target: up to **12 months** of essential expenses.",
  includeArticleIntro: true,
  sections: [
    {
      id: "lead",
      blocks: [
        {
          kind: "p",
          text: "Searching for an **emergency fund calculator India**? Get your number in the tool below, then read how many months to target and where to keep the cash.",
        },
        {
          kind: "tool",
          title: "Emergency fund calculator — India",
          subtitle:
            "How much buffer do you need? Adjust expenses and life stage for your number.",
          href: "/calculators/emergency",
          label: "Open full emergency calculator →",
        },
        {
          kind: "p",
          text: "On this page we use one clear rule: build toward **up to 12 months** of your family’s **essential** (must-pay) expenses — not holidays or discretionary spends. That is the **maximum target** we recommend planning around; many people start lower and increase as life gets heavier.",
        },
      ],
    },
    {
      id: "why-first",
      title: "Why an emergency fund is the first money habit",
      card: true,
      blocks: [
        {
          kind: "p",
          text: "Job loss, health shocks, urgent travel, or a broken laptop should not force you to sell long-term investments in a bad market or swipe a credit card at 30–40% APR. Emergency cash is **cash-flow insurance** — boring, liquid, and separate from SIPs and property.",
        },
        {
          kind: "p",
          text: "Think of it as the foundation: only after a real buffer exists does it make sense to push hard into risky assets or aggressive prepayment elsewhere.",
        },
      ],
    },
    {
      id: "one-month",
      title: "What “one month” means (count essentials only)",
      card: true,
      blocks: [
        { kind: "p", text: "Add up monthly costs you would still pay in a crisis:" },
        {
          kind: "ul",
          items: [
            "Rent or home loan EMI, utilities, groceries, school fees, insurance premiums, minimum loan payments",
            "Phone, internet, medicine, transport to interviews or work",
          ],
        },
        {
          kind: "p",
          muted: true,
          text: "Skip dining out, subscriptions you would cancel, and vacation budgets. Your “month” number should feel tight but honest.",
        },
      ],
    },
    {
      id: "life-stages",
      title: "How many months? Stories by life stage (all cap at 12 months)",
      blocks: [
        {
          kind: "p",
          text: "These are **planning ranges**, not rules written in law. Pick the row that sounds closest to you, then adjust for loans, income volatility, and health.",
        },
        {
          kind: "table",
          headers: ["Life stage", "Typical situation", "Target range"],
          rows: [
            [
              "Bachelor",
              "Riya, 24, lives in a PG; parents are not dependent on her salary. Few fixed costs, but a job gap or medical bill should not mean borrowing from friends. She starts small and increases every raise.",
              "3–5 months",
            ],
            [
              "About to get married",
              "Karan is engaged. Wedding spends are planned separately; he still builds emergency cash so a notice period or relocation right after marriage does not touch the wedding corpus or new rent deposit.",
              "4–6 months",
            ],
            [
              "Married, no kids",
              "Anjali and Vikram share rent and goals. If both earn, a leaner buffer can work; if one income pays for two people and EMIs, they steer toward the higher end of the range (still within 12 months max).",
              "5–8 months",
            ],
            [
              "Married + 1 child",
              "School fees and childcare are non-negotiable each month. A layoff cannot mean ‘we will figure fees later’ — they build closer to the top half of the scale.",
              "7–10 months",
            ],
            [
              "Married + 2 children",
              "Two fee streams, activities, and higher healthcare probability. The household plans toward 9–12 months of essentials as the ceiling.",
              "9–12 months",
            ],
            [
              "… + dependents you support (e.g. parents)",
              "Neha’s parents rely on her for rent supplements and medicines. That is a fixed monthly obligation on top of her own family — she uses the same 12-month cap but aims at the top of her life-stage band.",
              "9–12 months",
            ],
          ],
          boldFirstCol: true,
          accentLastCol: true,
          colFlex: [1, 2.2, 1],
        },
        {
          kind: "p",
          small: true,
          text: "**Cap:** on Finkoin Learn we treat **12 months of essential expenses** as the maximum emergency-fund target to plan for in normal situations. Beyond that, extra safety often belongs in **insurance + diversified investments**, not only in cash.",
        },
      ],
    },
    {
      id: "rupee-example",
      title: "One rupee example (easy maths)",
      card: true,
      blocks: [
        {
          kind: "p",
          text: "Suppose your **essential** spend is **₹45,000/month** (rent, food, fees, EMIs you must keep).",
        },
        {
          kind: "ul",
          spaced: true,
          items: [
            "**6 months** → ₹45,000 × 6 = **₹2,70,000**",
            "**12 months (max target)** → ₹45,000 × 12 = **₹5,40,000**",
          ],
        },
        {
          kind: "p",
          muted: true,
          text: "If essentials are ₹80,000/month, 12 months = ₹9,60,000. The multiple is the same idea — only your monthly number changes.",
        },
      ],
    },
    {
      id: "where-to-keep",
      title: "Where to keep it (India-friendly)",
      card: true,
      blocks: [
        {
          kind: "ul",
          spaced: true,
          items: [
            "**Liquid mutual funds** or **overnight / money-market style** funds — usually redeem in a business day or as per scheme; read the SID for cut-off rules.",
            "**Sweep FD** linked to savings — auto moves surplus to FD-like interest with sweep back when needed.",
            "A **separate savings account** you do not use for UPI shopping — mental accounting helps.",
          ],
        },
        {
          kind: "callout",
          tone: "amber",
          text: "**Avoid** for this bucket: direct equity, long lock-in deposits, gold you cannot sell quickly, or money buried in illiquid assets.",
        },
      ],
    },
    {
      id: "home-loan",
      title: "Home loan? Keep EMIs liquid",
      card: true,
      blocks: [
        {
          kind: "p",
          text: "Keep at least **three home loan EMIs** in absolutely liquid form even if you prepay aggressively — banks do not pause EMIs because your net worth is in property or ELSS.",
        },
      ],
    },
    {
      id: "build-rebuild",
      title: "Build and rebuild",
      card: true,
      blocks: [
        {
          kind: "ul",
          spaced: true,
          items: [
            "Automate a fixed transfer every month until you hit your stage target (up to the 12-month cap).",
            "After any withdrawal (medical, job gap), **refill** before raising SIPs again.",
            "Once a year, bump the target if rent, fees, or family size changed — your “month” is not static for 10 years.",
          ],
        },
        {
          kind: "p",
          text: "[Why compounding matters after the buffer is in place →](/learn/what-is-compound-interest-and-why-it-changes-everything)",
        },
      ],
    },
    {
      id: "disclaimer",
      blocks: [
        {
          kind: "callout",
          tone: "amber",
          text: "**Educational only.** Mutual funds are subject to market risks; read all scheme-related documents. This page is not personalised financial advice.",
        },
      ],
    },
  ],
};
