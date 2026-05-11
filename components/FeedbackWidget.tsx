"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useFinancialStore } from "@/store/financialStore";

interface FeedbackWidgetProps {
  pageContext: string;
  onClose?: () => void;
}

export default function FeedbackWidget({ pageContext, onClose }: FeedbackWidgetProps) {
  const { user, isLoggedIn } = useAuthStore();
  const result = useFinancialStore((s) => s.result);

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a star rating");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        user_id: user?.id || null,
        rating,
        message: message.trim() || null,
        page_context: pageContext,
        score_at_time: result?.overallScore ?? null,
      };

      console.log("FeedbackWidget: submitting", payload);

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { error?: string; success?: boolean };

      console.log("FeedbackWidget: response", res.status, data);

      if (!res.ok) {
        setError(data.error || `Error ${res.status}`);
        setSaving(false);
        return;
      }

      const key = `finkoin_feedback_${pageContext}`;
      localStorage.setItem(key, "1");

      setSaving(false);
      setDone(true);

      setTimeout(() => onClose?.(), 2000);
    } catch (err: unknown) {
      console.error("FeedbackWidget error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "#EEEDFE",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 12px",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#111110", marginBottom: 4 }}>Thanks for your feedback!</div>
        {isLoggedIn && (
          <div style={{ fontSize: 13, color: "#534AB7", fontWeight: 600 }}>+50 FK tokens added</div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#111110", marginBottom: 4 }}>Was this helpful?</div>
      <div style={{ fontSize: 12, color: "#9B9A94", marginBottom: 16 }}>Rate your experience · Earn 50 FK tokens</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: (hovered || rating) >= star ? "#EEEDFE" : "#F7F7F4",
              border: `1.5px solid ${(hovered || rating) >= star ? "#534AB7" : "#E8E6F0"}`,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={(hovered || rating) >= star ? "#534AB7" : "none"}
              stroke="#534AB7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="What did you find most useful? What can we improve?"
        style={{
          width: "100%",
          height: 72,
          borderRadius: 10,
          border: "1.5px solid #E8E6F0",
          padding: "10px 12px",
          fontSize: 13,
          fontFamily: "inherit",
          resize: "none",
          outline: "none",
          color: "#111110",
          background: "white",
          boxSizing: "border-box",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "#534AB7";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "#E8E6F0";
        }}
      />

      {error ? (
        <div style={{ fontSize: 12, color: "#E24B4A", marginTop: 6, marginBottom: 4 }}>{error}</div>
      ) : null}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          type="button"
          onClick={() => onClose?.()}
          style={{
            flex: 1,
            height: 44,
            borderRadius: 11,
            background: "transparent",
            border: "1px solid #E8E6F0",
            fontSize: 13,
            color: "#9B9A94",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Skip
        </button>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={saving}
          style={{
            flex: 2,
            height: 44,
            borderRadius: 11,
            background: saving ? "#9B9A94" : "#534AB7",
            border: "none",
            fontSize: 13,
            fontWeight: 700,
            color: "white",
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {saving ? "Saving..." : "Submit · Earn 50 FK"}
        </button>
      </div>
    </div>
  );
}
