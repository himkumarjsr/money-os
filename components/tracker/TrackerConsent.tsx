"use client";

import { getSupabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TrackerConsent({ onAccept }: { onAccept: () => void }) {
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const handleAccept = async () => {
    if (!checked || !user?.id) return;
    setSaving(true);

    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("tracker_consent").upsert({
        user_id: user.id,
        consent_given: true,
        consent_at: new Date().toISOString(),
        consent_version: "v1",
      });
      if (error) {
        console.warn("tracker_consent upsert:", error.message);
      }
      localStorage.setItem("finkoin_tracker_consent", "v1");
      onAccept();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: 520,
        margin: "0 auto",
        padding: "40px 24px",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 20,
          padding: "32px 28px",
          boxShadow: "0 4px 40px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            fontSize: 48,
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          📊
        </div>

        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#111110",
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          Start your money tracker
        </h2>

        <p
          style={{
            fontSize: 14,
            color: "#5F5E5A",
            textAlign: "center",
            marginBottom: 24,
            lineHeight: 1.6,
          }}
        >
          Track every rupee you spend. See where your money goes. Get insights to spend better.
        </p>

        <div
          style={{
            background: "#F7F7F4",
            borderRadius: 12,
            padding: "16px",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#534AB7",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            WHAT YOU CAN TRACK
          </div>
          {[
            "🏠 Needs — rent, groceries, utilities",
            "🎉 Wants — dining, entertainment",
            "☕ Habits — tea, coffee, cigarettes",
            "💳 Loans & credit card payments",
            "📈 Investments & savings",
            "🏥 Medical & insurance",
            "🚗 Transport & fuel",
            "👗 Shopping & lifestyle",
          ].map((item, i) => (
            <div
              key={i}
              style={{
                fontSize: 13,
                color: "#5F5E5A",
                marginBottom: 6,
              }}
            >
              {item}
            </div>
          ))}
        </div>

        <div
          style={{
            background: "#E1F5EE",
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 20,
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: "#1D5C3A",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            🔒 Your expense data is private. Only you can see it. Stored securely and encrypted. Delete anytime from settings.
          </p>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            cursor: "pointer",
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            onClick={() => setChecked(!checked)}
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              border: checked ? "2px solid #534AB7" : "2px solid #E8E6F0",
              background: checked ? "#534AB7" : "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginTop: 1,
              cursor: "pointer",
              transition: "all 0.15s",
              padding: 0,
            }}
            aria-checked={checked}
            role="checkbox"
          >
            {checked ? (
              <span
                style={{
                  color: "white",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                ✓
              </span>
            ) : null}
          </button>
          <span
            style={{
              fontSize: 13,
              color: "#5F5E5A",
              lineHeight: 1.5,
            }}
          >
            I understand that Finkoin will store my expense data to show me spending insights. I can delete this data anytime. I agree to the{" "}
            <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#534AB7" }}>
              Privacy Policy
            </a>
            .
          </span>
        </label>

        <button
          type="button"
          onClick={() => void handleAccept()}
          disabled={!checked || saving || !user?.id}
          style={{
            width: "100%",
            height: 52,
            borderRadius: 14,
            background: checked ? "#534AB7" : "#E8E6F0",
            color: checked ? "white" : "#9B9A94",
            border: "none",
            fontSize: 16,
            fontWeight: 700,
            cursor: checked ? "pointer" : "not-allowed",
            marginBottom: 12,
            transition: "all 0.15s",
          }}
        >
          {saving ? "Starting..." : "Start tracking my money →"}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          style={{
            width: "100%",
            height: 44,
            borderRadius: 12,
            background: "transparent",
            color: "#9B9A94",
            border: "1px solid #E8E6F0",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
