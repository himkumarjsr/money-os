import type { LearnGuideBody } from "../types";

/** Port of components/learn/IndexFundGuide.tsx. */
export const INDEX_FUND_GUIDE: LearnGuideBody = {
  toc: [
    { id: "intro", label: "Start here" },
    { id: "cricket-analogy", label: "Cricket analogy" },
    { id: "what-is-index", label: "What is an index?" },
    { id: "what-is-index-fund", label: "Index funds" },
    { id: "fee-example", label: "Fee example" },
    { id: "spiva", label: "SPIVA data" },
    { id: "expense-ratio", label: "Expense ratio" },
    { id: "active-wins", label: "Active funds" },
    { id: "how-to-start", label: "How to start" },
    { id: "taxes", label: "Taxes" },
    { id: "myths", label: "Myths busted" },
  ],
  includeArticleIntro: true,
  sections: [
    {
      id: "lead",
      blocks: [
        {
          kind: "tags",
          items: [
            { label: "Investments", tone: "emerald" },
            { label: "Index Funds", tone: "violet" },
            { label: "SIP", tone: "amber" },
          ],
        },
        {
          kind: "p",
          text: "An **index fund** copies a market benchmark like Nifty 50 instead of trying to beat it. Most active managers fail to outperform after fees — SPIVA data makes that hard to ignore. Below: the cricket analogy, how indices work, fee math, where active still has a role, and how to start sensibly.",
        },
        { kind: "p", small: true, muted: true, text: "Last updated: May 2026" },
      ],
    },
    {
      id: "cricket-analogy",
      title: "The cricket team analogy",
      card: true,
      blocks: [
        { kind: "p", text: "Imagine you want to bet on Indian cricket. You have two choices:" },
        {
          kind: "ul",
          spaced: true,
          items: [
            "**Option A — the expert:** Hire someone who watches every match, studies every player, picks the best 11, and charges you **₹15,000 per year** for that expertise (like an active mutual fund).",
            "**Option B — the BCCI ranking:** Copy whoever is in the official top 50 list automatically. Cost: **₹200 per year** (like an index fund).",
          ],
        },
        {
          kind: "callout",
          tone: "violet",
          text: "**SPIVA India 2024:** **81.5%** of active fund managers (the “experts”) picked a worse portfolio than simply copying the benchmark index over the period studied. That is exactly the bet index investors are making — own the ranking, not the guru.",
        },
      ],
    },
    {
      id: "what-is-index",
      title: "What is an index?",
      card: true,
      blocks: [
        {
          kind: "p",
          text: "An index is just a **list**. **Nifty 50** = the top 50 companies on the National Stock Exchange of India by free-float market cap. The list changes as companies grow or shrink — TCS replaced a weaker name; Zomato entered when it was big enough. No committee “picks winners”; the index is always the current top 50.",
        },
        { kind: "p", text: "**Sample weights in Nifty 50 (illustrative):**" },
        {
          kind: "table",
          headers: ["Company", "Index weight"],
          rows: [
            ["HDFC Bank", "**11.83%**"],
            ["Reliance Industries", "**8.79%**"],
            ["ICICI Bank", "**8.21%**"],
            ["Bharti Airtel", "**4.56%**"],
            ["Infosys", "**3.97%**"],
          ],
        },
      ],
    },
    {
      id: "what-is-index-fund",
      title: "What is an index fund?",
      card: true,
      blocks: [
        {
          kind: "p",
          text: "An index fund **copies the index** — same stocks, same proportions. No fund manager picking names; the fund’s job is to track the benchmark as closely as costs allow.",
        },
        {
          kind: "p",
          text: "When you invest **₹10,000** in a Nifty 50 index fund, roughly:",
        },
        {
          kind: "ul",
          items: [
            "**₹1,183** goes to HDFC Bank (11.83%)",
            "**₹879** goes to Reliance (8.79%)",
            "**₹821** goes to ICICI Bank (8.21%)",
            "…and so on for the rest of the 50 stocks",
          ],
        },
        { kind: "p", muted: true, text: "No research team. No stock-picking mandate. Just copy." },
      ],
    },
    {
      id: "fee-example",
      title: "The chai stall example — fees compound",
      card: true,
      blocks: [
        {
          kind: "p",
          text: "**Rohan** and **Priya** each invest **₹5,000/month** for 20 years. The market returns about **12%** a year before fees.",
        },
        {
          kind: "ul",
          spaced: true,
          items: [
            "**Rohan** — popular large-cap active fund, expense ratio **1.5%/year**. Net ~10.5% after fees → corpus about **₹38.8 lakh**.",
            "**Priya** — UTI Nifty 50 Index Fund, expense ratio **0.20%/year**. Net ~11.8% after fees → corpus about **₹46.3 lakh**.",
          ],
        },
        {
          kind: "callout",
          tone: "emerald",
          title: "Difference: ₹7.5 lakh",
          text: "Same market, same monthly amount, same 20 years — only fees differ. That gap is what a small expense ratio costs you when it compounds for decades (the “chai” the active team drinks every day, metaphorically).",
        },
      ],
    },
    {
      id: "spiva",
      title: "SPIVA — the shocking data",
      card: true,
      blocks: [
        {
          kind: "p",
          text: "This is not theory. **SPIVA India Year-End 2024** is among the most cited studies on active vs passive performance in India.",
        },
        {
          kind: "callout",
          tone: "violet",
          blocks: [
            {
              kind: "ul",
              items: [
                "**81.5%** of large-cap active managers failed to beat the Nifty 50 benchmark in 2024.",
                "Over **5 years**, **92.9%** of large-cap active funds underperformed their benchmark.",
                "Translation: only about **7 out of 100** active managers beat the index over that horizon — and you do not know in advance which seven.",
              ],
            },
          ],
        },
        {
          kind: "p",
          text: "Last year’s chart-topper rarely repeats. Large caps like Reliance, TCS, and HDFC Bank are covered by hundreds of analysts globally — “hidden” information is scarce. Index funds ride the market; active funds pay to fight it.",
        },
      ],
    },
    {
      id: "expense-ratio",
      title: "Expense ratio — the silent killer",
      card: true,
      blocks: [
        {
          kind: "p",
          text: "Every mutual fund charges an annual **expense ratio**. You never write a separate cheque; it is deducted from NAV and quietly reduces your compounding.",
        },
        {
          kind: "table",
          headers: ["Fund type", "Typical expense ratio"],
          rows: [
            ["UTI Nifty 50 Index (direct)", "**0.20%**"],
            ["HDFC Nifty 50 Index (direct)", "**0.20%**"],
            ["Average large-cap active", "**1.5% – 2.0%**"],
            ["Active flexi-cap", "**1.0% – 1.8%**"],
          ],
        },
        {
          kind: "p",
          text: "A **₹10,000/month SIP** for 30 years at ~12% market return (illustrative):",
        },
        {
          kind: "ul",
          items: [
            "**0.2% expense** (index) → about **₹3.49 crore**",
            "**1.5% expense** (active) → about **₹2.79 crore**",
          ],
        },
        {
          kind: "callout",
          tone: "violet",
          text: "**81.5%** of large-cap active funds underperformed the index in 2024 (SPIVA) — paying more does not buy you a better odds of winning.",
        },
        {
          kind: "callout",
          tone: "amber",
          text: "**~₹70 lakh lost to fees** in this 30-year illustration — same market return assumption, only expense ratio differs. Over a working lifetime, that gap is enormous for no guaranteed extra return.",
        },
      ],
    },
    {
      id: "active-wins",
      title: "Where active funds still win",
      card: true,
      blocks: [
        {
          kind: "p",
          text: "Index funds are not perfect for every pocket of the market. SPIVA India **Mid-Year 2025**: in mid and small cap, only **34.5%** of active funds underperformed in that window — skilled managers can sometimes find less-researched names.",
        },
        {
          kind: "p",
          text: "A common **core–satellite** approach for many long-term investors:",
        },
        {
          kind: "ul",
          spaced: true,
          items: [
            "**Core (60–70% of equity):** Nifty 50 or broader index (e.g. Nifty 500) — boring, low cost, hard to beat in large cap.",
            "**Satellite (30–40%):** carefully chosen mid/small-cap active funds only if you accept higher volatility and can judge a long track record.",
          ],
        },
      ],
    },
    {
      id: "how-to-start",
      title: "How to start",
      card: true,
      blocks: [
        {
          kind: "ul",
          spaced: true,
          items: [
            "Minimum: many index funds allow SIP from about **₹500/month** (scheme rules vary).",
            "**Examples to research** (educational, not a recommendation): UTI Nifty 50 Index Fund Direct (~0.20% expense, large AUM); HDFC Nifty 50 Index Fund Direct (~0.20%, min SIP can be as low as ₹100 on some platforms).",
            "Platforms: **Groww**, **Zerodha Coin**, **Kuvera** — use **DIRECT** plans only.",
            "**Regular** plans pay distributor commission (~0.5–1% extra from your returns every year). Over 20 years that is lakhs lost vs direct.",
          ],
        },
      ],
    },
    {
      id: "taxes",
      title: "Taxes on index funds",
      card: true,
      blocks: [
        {
          kind: "p",
          text: "Index funds are taxed like other equity mutual funds (rules as commonly understood in 2026):",
        },
        {
          kind: "ul",
          spaced: true,
          items: [
            "Held **less than 1 year** — STCG: **20%**",
            "Held **more than 1 year** — LTCG: **12.5%**",
            "First **₹1.25 lakh** of LTCG in a year: **tax-free** (subject to current law)",
          ],
        },
        {
          kind: "p",
          muted: true,
          text: "For long goals, holding beyond one year avoids unnecessary STCG and lets compounding run.",
        },
      ],
    },
    {
      id: "myths",
      title: "Common myths busted",
      card: true,
      blocks: [
        {
          kind: "ul",
          plain: true,
          spaced: true,
          items: [
            "**Myth 1: “Index funds only give average returns.”**\n“Average” here means the top 50 Indian companies compounding for decades — Nifty 50 has delivered roughly **~12% CAGR** since inception in many long-window studies (not a promise for the future).",
            "**Myth 2: “Wait for a crash, then buy.”**\nTime in the market usually beats timing. Start SIP today; you automatically buy more units when prices dip.",
            "**Myth 3: “Active funds protect you in crashes.”**\nMost active large-cap funds fall as much or more than the index in sharp selloffs, then lag on the recovery because of fees.",
            "**Myth 4: “My fund manager is different.”**\nSPIVA 2024: **81.5%** of managers underperformed — many families heard the same story.",
          ],
        },
      ],
    },
    {
      id: "summary",
      blocks: [
        {
          kind: "callout",
          tone: "emerald",
          title: "Summary",
          blocks: [
            {
              kind: "p",
              text: "**Index fund** = own the market’s largest companies cheaply, by copying the index.",
            },
            { kind: "p", text: "**Why it often wins:**" },
            {
              kind: "ul",
              items: [
                "Lower fees (about 0.20% vs 1.5–2% on many active funds)",
                "No manager-selection risk or style drift",
                "SPIVA 2024: 81.5% of large-cap active funds lagged the index in that year",
                "Simple, transparent, predictable",
              ],
            },
            { kind: "p", text: "**Best for:**" },
            {
              kind: "ul",
              items: [
                "Goals 5+ years away, large-cap equity, beginners, anyone who values low cost",
              ],
            },
            { kind: "p", text: "**Less ideal for:**" },
            {
              kind: "ul",
              items: [
                "Money needed within ~3 years; mid/small-cap sleeves where active may still add value",
              ],
            },
            { kind: "p", text: "*The boring choice is often the best choice in investing.*" },
          ],
        },
      ],
    },
    {
      id: "related-index-fund",
      blocks: [
        {
          kind: "links",
          title: "Related articles",
          items: [
            {
              label: "SIP vs lumpsum — when to use which →",
              href: "/learn/sip-vs-lumpsum-when-to-use-which",
            },
            { label: "What is asset allocation? →", href: "/learn/what-is-asset-allocation" },
            {
              label: "Old vs New Tax Regime →",
              href: "/learn/old-vs-new-tax-regime-which-saves-you-more-money",
            },
          ],
        },
        {
          kind: "callout",
          tone: "amber",
          text: "**Educational only.** This is not investment advice. Finkoin is not a SEBI-registered investment advisor. Consult a qualified financial advisor before investing. Past performance does not guarantee future results. Data referenced from SPIVA India 2024, AMFI, and fund factsheets as of 2026 — verify current expense ratios and tax rules before you act.",
        },
      ],
    },
  ],
};
