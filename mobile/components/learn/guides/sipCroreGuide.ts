import { LEARN_WIDGETS, type LearnGuideBody } from "../types";

/** Port of components/learn/SipCroreGuide.tsx. */
export const SIP_CRORE_GUIDE: LearnGuideBody = {
  toc: [
    { id: "quick-table", label: "Quick reference" },
    { id: "assumptions", label: "Assumptions" },
    { id: "how-to-use", label: "How to use" },
    { id: "related", label: "Related tools" },
  ],
  sections: [
    {
      id: "lead",
      blocks: [
        {
          kind: "p",
          text: "Searching for **sip calculator 1 crore**? Use the live tool below, then read how tenure and return assumptions change the monthly SIP you need for ₹1 crore in 10, 15, or 20 years.",
        },
        { kind: "widget", widget: LEARN_WIDGETS.sipCrore },
      ],
    },
    {
      id: "quick-table",
      title: "Quick reference — ₹1 crore at 12% p.a.",
      card: true,
      blocks: [
        {
          kind: "p",
          text: "Illustrative monthly SIP (constant 12% expected return, monthly compounding). Markets vary — treat as a planning range, not a promise.",
        },
        {
          kind: "table",
          headers: ["Horizon", "Approx. monthly SIP", "Total invested"],
          rows: [
            ["10 years", "≈ ₹43,000–45,000", "≈ ₹52–54 lakh"],
            ["15 years", "≈ ₹21,000–23,000", "≈ ₹38–41 lakh"],
            ["20 years", "≈ ₹12,000–13,000", "≈ ₹29–31 lakh"],
          ],
          boldFirstCol: true,
        },
        {
          kind: "p",
          small: true,
          muted: true,
          text: "Move the sliders above for your exact rate and goal (₹50 lakh to ₹5 crore).",
        },
      ],
    },
    {
      id: "assumptions",
      title: "Assumptions that change the answer",
      card: true,
      blocks: [
        {
          kind: "ul",
          items: [
            "**Return rate:** Equity SIP planning often uses 10–12% long-term; 15% is aggressive. Lower rates need higher SIPs.",
            "**Inflation:** ₹1 crore in 20 years buys less than today’s ₹1 crore. For lifestyle goals, inflate the target.",
            "**Step-up SIP:** Raising SIP 10% yearly can cut the starting amount — model that on the [full SIP calculator](/calculators/sip).",
            "**Taxes & costs:** Equity LTCG and expense ratios reduce net corpus vs gross calculator output.",
          ],
        },
      ],
    },
    {
      id: "how-to-use",
      title: "How to use this for a real plan",
      card: true,
      blocks: [
        {
          kind: "ul",
          ordered: true,
          items: [
            "Pick a horizon you can stick to (10 / 15 / 20 years).",
            "Set a conservative return (e.g. 10–12%).",
            "Note the monthly SIP — check it fits after rent, EMIs, and emergency fund.",
            "Run a [Finkoin financial health check](/analyse) so the SIP doesn’t starve insurance or liquidity.",
          ],
        },
      ],
    },
    {
      id: "related",
      title: "Related Finkoin tools",
      card: true,
      blocks: [
        {
          kind: "ul",
          items: [
            "[SIP calculator India](/calculators/sip) — forward returns from a monthly amount",
            "[FIRE number calculator](/calculators/fire) — when ₹1 crore is not enough",
            "[SIP vs lump sum](/learn/sip-vs-lumpsum-when-to-use-which)",
          ],
        },
      ],
    },
  ],
};
