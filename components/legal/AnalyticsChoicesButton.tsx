"use client";

import { openAnalyticsChoices } from "@/components/AnalyticsConsent";

export default function AnalyticsChoicesButton() {
  return (
    <button
      type="button"
      onClick={openAnalyticsChoices}
      style={{
        minHeight: 44,
        padding: "0 16px",
        borderRadius: 12,
        border: "1px solid #E8E6F0",
        background: "#EEEDFE",
        color: "#534AB7",
        fontWeight: 600,
        fontSize: 14,
        cursor: "pointer",
      }}
    >
      Change analytics choice
    </button>
  );
}
