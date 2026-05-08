"use client";

import { getSupabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useFinancialStore } from "@/store/financialStore";
import { useGamificationStore } from "@/store/gamificationStore";
import { useMemo, useState } from "react";

interface FeedbackWidgetProps {
  pageContext: string;
  onClose?: () => void;
}

export default function FeedbackWidget({ pageContext, onClose }: FeedbackWidgetProps) {
  const { user, isLoggedIn } = useAuthStore();
  const { addFK } = useGamificationStore();
  const result = useFinancialStore((s) => s.result);

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const feedbackKey = useMemo(
    () => `finkoin_feedback_${pageContext}_${user?.id?.substring(0, 8) ?? "guest"}`,
    [pageContext, user?.id],
  );

  if (typeof window !== "undefined" && localStorage.getItem(feedbackKey)) {
    return null;
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const supabase = getSupabase();
      const { error: dbError } = await supabase.from("feedback").insert({
        user_id: user?.id ?? null,
        rating,
        message: message.trim() || null,
        page_context: pageContext,
        score_at_time: result?.overallScore ?? null,
        is_approved: false,
        is_featured: false,
      });

      if (dbError) {
        setError(dbError.message);
        setSaving(false);
        return;
      }

      if (isLoggedIn && user?.id) {
        await addFK(user.id, 50, "feedback_submitted", pageContext);
      }

      localStorage.setItem(feedbackKey, "1");
      setSaving(false);
      setDone(true);
      setTimeout(() => onClose?.(), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div
        style={{
          background: "white",
          borderRadius: 16,
          padding: "20px",
          textAlign: "center",
          border: "1px solid #E8E6F0",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            background: "#EEEDFE",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 12px",
            fontSize: 22,
          }}
        >
          ✓
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#111110", marginBottom: 4 }}>Thank you for your feedback!</div>
        <div style={{ fontSize: 12, color: "#534AB7", fontWeight: 600 }}>+50 FK tokens added</div>
      </div>
    );
  }

  return (
    <div style={{ background: "white", borderRadius: 16, padding: "20px", border: "1px solid #E8E6F0" }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#111110", marginBottom: 4 }}>How was your Finkoin experience?</div>
      <div style={{ fontSize: 12, color: "#9B9A94", marginBottom: 14 }}>Takes 20 seconds · Earn 50 FK tokens</div>

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
            }}
          >
            <span style={{ color: "#534AB7", fontSize: 18 }}>★</span>
          </button>
        ))}
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Tell us what you found most useful or what can be improved..."
        style={{
          width: "100%",
          height: 70,
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
      />

      {error ? (
        <div style={{ fontSize: 12, color: "#E24B4A", marginTop: 6 }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1,
            height: 44,
            borderRadius: 11,
            background: "transparent",
            border: "1px solid #E8E6F0",
            fontSize: 13,
            color: "#9B9A94",
            cursor: "pointer",
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
          }}
        >
          {saving ? "Saving..." : "Submit and earn 50 FK"}
        </button>
      </div>
    </div>
  );
}
