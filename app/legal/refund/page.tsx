import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy | Finkoin",
  description: "Refund policy for Finkoin digital products and Razorpay payments.",
};

export default function RefundPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px 80px" }}>
      <div style={{ borderBottom: "1px solid #E8E6F0", paddingBottom: 24, marginBottom: 24 }}>
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
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#111110", marginBottom: 8 }}>Refund Policy</h1>
        <p style={{ fontSize: 14, color: "#9B9A94", margin: 0 }}>Last updated: May 1, 2026</p>
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
        <strong>Summary:</strong> Digital products are non-refundable once accessed. We offer refunds only for technical
        failures or duplicate charges.
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: "#111110" }}>Digital Products (Fix Plan, Tax Report)</h2>
      <p style={{ fontSize: 15, color: "#5F5E5A", lineHeight: 1.8, marginBottom: 24 }}>
        Once you purchase and access a digital product on Finkoin, the purchase is final and non-refundable. This includes:
      </p>
      <ul style={{ fontSize: 15, color: "#5F5E5A", lineHeight: 1.8 }}>
        <li>Financial Fix Plan (₹99)</li>
        <li>Tax Analysis Report (₹99)</li>
        <li>Any future paid reports</li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12, color: "#111110" }}>When We Do Refund</h2>
      <ul style={{ fontSize: 15, color: "#5F5E5A", lineHeight: 1.8 }}>
        <li>
          <strong>Technical failure:</strong> You paid but could not access the content due to a technical error on our
          end. Contact us within 7 days.
        </li>
        <li>
          <strong>Duplicate payment:</strong> You were charged twice for the same purchase. We will refund the duplicate
          within 5–7 business days.
        </li>
      </ul>

      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 32, marginBottom: 12, color: "#111110" }}>How to Request a Refund</h2>
      <p style={{ fontSize: 15, color: "#5F5E5A", lineHeight: 1.8 }}>
        Email{" "}
        <a href="mailto:support@finkoin.com" style={{ color: "#534AB7" }}>
          support@finkoin.com
        </a>{" "}
        with:
      </p>
      <ul style={{ fontSize: 15, color: "#5F5E5A", lineHeight: 1.8 }}>
        <li>Your registered email address</li>
        <li>Razorpay Payment ID</li>
        <li>Reason for refund request</li>
        <li>Screenshot of the issue (if technical)</li>
      </ul>
      <p style={{ fontSize: 15, color: "#5F5E5A", lineHeight: 1.8 }}>
        We will respond within 2 business days. Approved refunds are processed within 5–7 business days to your original
        payment method.
      </p>

      <div style={{ borderTop: "1px solid #E8E6F0", paddingTop: 24, marginTop: 40, fontSize: 12, color: "#9B9A94", textAlign: "center" }}>
        Questions? Email support@finkoin.com
      </div>
    </div>
  );
}
