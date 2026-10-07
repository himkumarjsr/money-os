import type { LearnGuideBody } from "../types";

/** Port of components/learn/CompoundInterestGuide.tsx. */
export const COMPOUND_INTEREST_GUIDE: LearnGuideBody = {
  toc: [
    { id: "intro", label: "Start here" },
    { id: "formula", label: "The formula" },
    { id: "example", label: "Worked example" },
    { id: "mutual-funds", label: "Mutual funds" },
    { id: "rule-72", label: "Rule of 72" },
    { id: "habits", label: "Protect compounding" },
  ],
  includeArticleIntro: true,
  sections: [
    {
      id: "lead",
      blocks: [
        {
          kind: "p",
          text: "**Simple interest** pays only on the original principal each year. **Compound** pays on principal *and* on gains already added — that is the snowball.",
        },
      ],
    },
    {
      id: "formula",
      title: "The formula (lump sum, easy version)",
      card: true,
      blocks: [
        {
          kind: "p",
          text: "If you put one amount today and leave it to grow at the *same* yearly rate, a clean approximation is:",
        },
        { kind: "formula", text: "A = P × (1 + r)ⁿ" },
        {
          kind: "ul",
          items: [
            "**P** = principal (money you invest today)",
            "**r** = yearly return written as a decimal (10% → 0.10)",
            "**n** = number of years",
            "**A** = amount you end with (rough estimate; real life has fees, taxes, and uneven yearly returns)",
          ],
        },
        {
          kind: "p",
          muted: true,
          text: "Banks sometimes compound monthly; the idea is the same: you earn on a growing balance, not only on the first rupee.",
        },
      ],
    },
    {
      id: "example",
      title: "Tiny example with real numbers",
      card: true,
      blocks: [
        {
          kind: "p",
          text: "You invest **₹10,000** once. Return **10% per year** (just for maths — not a promise).",
        },
        {
          kind: "table",
          headers: ["Year", "Start balance", "10% return", "End balance"],
          rows: [
            ["1", "₹10,000", "₹1,000", "**₹11,000**"],
            ["2", "₹11,000", "₹1,100", "**₹12,100**"],
            ["3", "₹12,100", "₹1,210", "**₹13,310**"],
          ],
          boldFirstCol: true,
        },
        {
          kind: "p",
          text: "Check with the formula: ₹10,000 × (1.1)³ = **₹13,310**. With *simple* interest you would get only ₹10,000 + 3×₹1,000 = **₹13,000** — the extra ₹310 is from compounding.",
        },
      ],
    },
    {
      id: "mutual-funds",
      title: "How this helps with mutual funds (MFs) — simple picture",
      card: true,
      blocks: [
        {
          kind: "ul",
          spaced: true,
          items: [
            "In a mutual fund, your money buys **units**. When the fund does well, **NAV (price per unit)** tends to rise over long periods (not every year — markets go up and down).",
            "If you stay invested, tomorrow’s gain or loss applies to your **whole current value** — units × NAV — not only on the first SIP instalment. That is the same “growth on growth” idea as compound interest, but we usually say **compounding of returns** (returns are not fixed like an FD rate).",
            "**SIP** adds a fresh amount every month, so you keep feeding the snowball. Early SIPs get more years of compounding; that is why even small monthly amounts can become large over 10–20 years in illustrations (actual results depend on market, fund, and costs).",
            "Choosing **growth option** (instead of taking payouts) keeps gains inside the fund so the full corpus can participate in future NAV movement — mentally similar to “interest reinvested” in a deposit.",
          ],
        },
        {
          kind: "callout",
          tone: "amber",
          text: "**Remember:** mutual funds are market-linked. Past performance does not guarantee future returns. Use conservative assumptions for goals, and read scheme documents / risk factors.",
        },
      ],
    },
    {
      id: "rule-72",
      title: "Rule of 72 (quick mental maths)",
      card: true,
      blocks: [
        {
          kind: "p",
          text: "About how many years to *roughly* double money at a steady yearly rate? Divide **72** by the rate in percent. Example: at ~8% a year, 72 ÷ 8 ≈ **9 years** to double. It is an estimate, not exact.",
        },
      ],
    },
    {
      id: "habits",
      title: "Three habits that protect compounding",
      card: true,
      blocks: [
        {
          kind: "ul",
          items: [
            "Start as early as you can, even small.",
            "Avoid stopping SIPs every time the market dips (unless your goal or cash situation really changed).",
            "Keep costs low — high fees quietly eat the same compounding math in reverse.",
          ],
        },
      ],
    },
    {
      id: "cta",
      blocks: [
        {
          kind: "actions",
          tone: "grey",
          text: "Plug in your own SIP amount, return guess, and years in the calculator.",
          actions: [
            { label: "Open SIP calculator →", href: "/calculators/sip", primary: true },
            {
              label: "Index funds explained →",
              href: "/learn/what-is-an-index-fund-and-why-it-beats-most-mutual-funds",
            },
          ],
        },
      ],
    },
  ],
};
