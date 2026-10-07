import type { LegalDoc } from "./types";

/** Verbatim port of app/legal/disclaimer/page.tsx. */
export const DISCLAIMER: LegalDoc = {
  slug: "disclaimer",
  eyebrow: "Legal",
  title: "Disclaimer",
  meta: "Last updated: May 1, 2026",
  summary: {
    tone: "warn",
    text: "**Important:** Finkoin is an educational platform. Nothing on this site constitutes professional financial, investment, tax, or legal advice.",
  },
  headingStyle: "small",
  sections: [
    {
      title: "Not Investment Advice",
      blocks: [
        {
          kind: "p",
          text: "Finkoin is not a SEBI-registered Investment Advisor (RIA). The analysis, scores, and recommendations provided are algorithmic and educational in nature. They do not constitute professional investment advice. Past performance of any investment product mentioned does not guarantee future results. All investments are subject to market risks.",
        },
      ],
    },
    {
      title: "Not Insurance Advice",
      blocks: [
        {
          kind: "p",
          text: "Finkoin is not an IRDAI-licensed insurance advisor or broker. Insurance product mentions are for educational illustration only. Consult an IRDAI-licensed advisor before purchasing any insurance product.",
        },
      ],
    },
    {
      title: "Not Tax Advice",
      blocks: [
        {
          kind: "p",
          text: "Tax calculations on Finkoin are estimates based on information provided and general tax rules. Tax laws change frequently. Consult a qualified Chartered Accountant (CA) for your specific tax situation.",
        },
      ],
    },
    {
      title: "Accuracy of Information",
      blocks: [
        {
          kind: "p",
          text: "While we strive for accuracy, Finkoin does not guarantee the accuracy, completeness, or timeliness of any information on this platform. Financial analysis is only as accurate as the data you provide.",
        },
      ],
    },
    {
      title: "Your Responsibility",
      blocks: [
        {
          kind: "p",
          text: "You are solely responsible for all financial decisions you make. Finkoin's analysis is one input among many that you should consider. Always do your own research and consult qualified professionals.",
        },
      ],
    },
  ],
};
