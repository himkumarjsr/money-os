import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delete Your Account | Finkoin",
  description:
    "How to delete your Finkoin account and data, with or without the app installed.",
};

export default function DeleteAccountPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px 80px" }}>
      <div
        style={{
          borderBottom: "1px solid #E8E6F0",
          paddingBottom: 24,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#534AB7",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          Legal
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: "#111110",
            marginBottom: 8,
          }}
        >
          Delete your account
        </h1>
        <p style={{ fontSize: 14, color: "#9B9A94", margin: 0 }}>
          This page works whether or not you have the Finkoin app installed.
        </p>
      </div>

      <div
        style={{
          background: "#F7F7F4",
          borderRadius: 14,
          padding: "20px 24px",
          marginBottom: 32,
          fontSize: 15,
          color: "#5F5E5A",
          lineHeight: 1.7,
        }}
      >
        <strong>Summary:</strong> You can delete your account and all associated
        data in-app (web, Android, or iOS) in under a minute, or by emailing us
        if you no longer have access to the app.
      </div>

      <section style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#111110",
            marginBottom: 12,
          }}
        >
          Option 1 — delete it yourself (fastest)
        </h2>
        <ul style={{ paddingLeft: 20, color: "#5F5E5A", lineHeight: 1.8 }}>
          <li>
            <strong>On the web:</strong> log in at{" "}
            <a
              href="https://www.finkoin.com/settings"
              style={{ color: "#534AB7" }}
            >
              finkoin.com/settings
            </a>{" "}
            → scroll to the bottom →{" "}
            <strong>&quot;Delete account permanently&quot;</strong>.
          </li>
          <li>
            <strong>On Android or iOS:</strong> open the Finkoin app → Profile
            tab → <strong>&quot;Delete account permanently&quot;</strong>.
          </li>
        </ul>
        <p style={{ color: "#5F5E5A", lineHeight: 1.7 }}>
          This immediately and permanently deletes your login, profile, Tracker
          history, Analyse results, obligations, and all other Finkoin data tied
          to your account. It cannot be undone.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#111110",
            marginBottom: 12,
          }}
        >
          Option 2 — can&apos;t log in, or no longer have the app?
        </h2>
        <p style={{ color: "#5F5E5A", lineHeight: 1.7 }}>
          Email{" "}
          <a
            href="mailto:privacy@finkoin.com?subject=Account%20deletion%20request"
            style={{ color: "#534AB7" }}
          >
            privacy@finkoin.com
          </a>{" "}
          from the email address registered on your Finkoin account, with the
          subject line &quot;Account deletion request&quot;. We&apos;ll verify
          your identity and delete your account within 30 days.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#111110",
            marginBottom: 12,
          }}
        >
          What gets deleted
        </h2>
        <ul style={{ paddingLeft: 20, color: "#5F5E5A", lineHeight: 1.8 }}>
          <li>Your login credentials and profile (name, email, photo)</li>
          <li>Analyse health-check profile and results</li>
          <li>Expense Tracker history and obligations</li>
          <li>Insurance policy vault entries</li>
          <li>Notifications, feedback, and FK reward balance/history</li>
          <li>
            Your own membership in any Split groups (shared group expense
            history that other members still rely on is not deleted — see our{" "}
            <a href="/legal/privacy" style={{ color: "#534AB7" }}>
              Privacy Policy
            </a>{" "}
            for details)
          </li>
        </ul>
      </section>

      <p style={{ fontSize: 13, color: "#9B9A94" }}>
        See our{" "}
        <a href="/legal/privacy" style={{ color: "#534AB7" }}>
          Privacy Policy
        </a>{" "}
        for the full data retention and deletion policy.
      </p>
    </div>
  );
}
