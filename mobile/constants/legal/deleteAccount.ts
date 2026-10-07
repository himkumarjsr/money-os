import type { LegalDoc } from "./types";

/** Widget id rendered by the legal screen: native in-app delete action. */
export const DELETE_ACCOUNT_WIDGET = "delete-account-action";

/** Verbatim port of app/legal/delete-account/page.tsx (+ native delete action). */
export const DELETE_ACCOUNT: LegalDoc = {
  slug: "delete-account",
  eyebrow: "Legal",
  title: "Delete your account",
  meta: "This page works whether or not you have the Finkoin app installed.",
  summary: {
    tone: "grey",
    text: "**Summary:** You can delete your account and all associated data in-app (web, Android, or iOS) in under a minute, or by emailing us if you no longer have access to the app.",
  },
  headingStyle: "plain",
  sections: [
    {
      title: "Option 1 — delete it yourself (fastest)",
      blocks: [
        {
          kind: "ul",
          items: [
            "**On the web:** log in at [finkoin.com/settings](/settings) → scroll to the bottom → **\"Delete account permanently\"**.",
            "**On Android or iOS:** open the Finkoin app → Profile tab → **\"Delete account permanently\"**.",
          ],
        },
        {
          kind: "p",
          text: "This immediately and permanently deletes your login, profile, Tracker history, Analyse results, obligations, and all other Finkoin data tied to your account. It cannot be undone.",
        },
        { kind: "widget", widget: DELETE_ACCOUNT_WIDGET },
      ],
    },
    {
      title: "Option 2 — can't log in, or no longer have the app?",
      blocks: [
        {
          kind: "p",
          text: "Email [privacy@finkoin.com](mailto:privacy@finkoin.com?subject=Account%20deletion%20request) from the email address registered on your Finkoin account, with the subject line \"Account deletion request\". We'll verify your identity and delete your account within 30 days.",
        },
      ],
    },
    {
      title: "What gets deleted",
      blocks: [
        {
          kind: "ul",
          items: [
            "Your login credentials and profile (name, email, photo)",
            "Analyse health-check profile and results",
            "Expense Tracker history and obligations",
            "Insurance policy vault entries",
            "Notifications, feedback, and FK reward balance/history",
            "Your own membership in any Split groups (shared group expense history that other members still rely on is not deleted — see our [Privacy Policy](/legal/privacy) for details)",
          ],
        },
      ],
    },
  ],
  note: "See our [Privacy Policy](/legal/privacy) for the full data retention and deletion policy.",
};
