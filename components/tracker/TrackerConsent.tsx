"use client";

import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import { TrackerIcon } from "@/components/tracker/TrackerIcons";
import type { TrackerIconName } from "@/lib/tracker-categories";
import { getSupabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useState } from "react";

type TrackItem =
  | { kind: "tracker"; icon: TrackerIconName; label: string }
  | { kind: "app"; icon: AppIconName; label: string };

const TRACK_ITEMS: TrackItem[] = [
  {
    kind: "tracker",
    icon: "home",
    label: "Needs — rent, groceries, utilities",
  },
  { kind: "tracker", icon: "party", label: "Wants — dining, entertainment" },
  {
    kind: "tracker",
    icon: "coffee",
    label: "Habits — tea, coffee, cigarettes",
  },
  { kind: "app", icon: "card", label: "Loans & credit card payments" },
  { kind: "app", icon: "trending", label: "Investments & savings" },
  { kind: "app", icon: "hospital", label: "Medical & insurance" },
  { kind: "tracker", icon: "cab", label: "Transport & fuel" },
  { kind: "tracker", icon: "shirt", label: "Shopping & lifestyle" },
];

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
            display: "flex",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <AppIcon name="chart" size={48} color="#534AB7" />
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
          Track every rupee you spend. See where your money goes. Get insights
          to spend better.
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
          {TRACK_ITEMS.map((item) => (
            <div
              key={item.label}
              style={{
                fontSize: 13,
                color: "#5F5E5A",
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              {item.kind === "tracker" ? (
                <TrackerIcon name={item.icon} size={16} color="#534AB7" />
              ) : (
                <AppIcon name={item.icon} size={16} color="#534AB7" />
              )}
              {item.label}
            </div>
          ))}
        </div>

        <div
          style={{
            background: "#EEEDFE",
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 20,
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: "#534AB7",
              margin: 0,
              lineHeight: 1.6,
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <AppIcon name="lock" size={16} color="#534AB7" />
            <span>
              Your expense data is private. Only you can see it. Stored securely
              and encrypted. Delete anytime from settings.
            </span>
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
              <AppIcon
                name="check"
                size={12}
                color="#FFFFFF"
                strokeWidth={2.5}
              />
            ) : null}
          </button>
          <span
            style={{
              fontSize: 13,
              color: "#5F5E5A",
              lineHeight: 1.5,
            }}
          >
            I understand that Finkoin will store my expense data to show me
            spending insights. I can delete this data anytime. I agree to the{" "}
            <a
              href="/legal/privacy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#534AB7" }}
            >
              Privacy Policy
            </a>
          </span>
        </label>

        <button
          type="button"
          disabled={!checked || saving}
          onClick={() => void handleAccept()}
          style={{
            width: "100%",
            height: 48,
            borderRadius: 12,
            border: "none",
            background: checked ? "#534AB7" : "#E8E6F0",
            color: checked ? "white" : "#9B9A94",
            fontSize: 15,
            fontWeight: 800,
            cursor: checked ? "pointer" : "not-allowed",
          }}
        >
          {saving ? "Starting…" : "Start tracking"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/")}
          style={{
            width: "100%",
            marginTop: 10,
            background: "transparent",
            border: "none",
            color: "#9B9A94",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            padding: 8,
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
