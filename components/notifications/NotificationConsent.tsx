"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { getSupabase } from "@/lib/supabase";

const CONSENT_KEY = "finkoin_notif_consent";

export default function NotificationConsent() {
  const { user, isLoggedIn, hasInitialized } = useAuthStore();

  const [show, setShow] = useState(false);
  const [emailConsent, setEmailConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!hasInitialized) return;
    if (!isLoggedIn || !user?.id) return;

    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) return;

    const timer = setTimeout(() => {
      setShow(true);
    }, 60000);

    return () => clearTimeout(timer);
  }, [hasInitialized, isLoggedIn, user?.id]);

  const handleSave = async () => {
    if (!user?.id) {
      setError("Please log in first");
      return;
    }

    setSaving(true);
    setError("");

    console.log("NotificationConsent: saving for user", user.id);
    console.log("NotificationConsent: emailConsent =", emailConsent);

    try {
      const supabase = getSupabase();

      const payload = {
        user_id: user.id,
        email_consent: emailConsent,
        push_consent: false,
        morning_tips: emailConsent,
        weekly_summary: emailConsent,
        payment_alerts: true,
        email_consent_at: emailConsent ? new Date().toISOString() : null,
        consent_version: "v1",
        updated_at: new Date().toISOString(),
      };

      console.log("NotificationConsent: upserting", payload);

      const { data, error: dbError } = await supabase
        .from("notification_preferences")
        .upsert(payload, {
          onConflict: "user_id",
        })
        .select();

      console.log("NotificationConsent: result", { data, dbError });

      if (dbError) {
        console.error("NotificationConsent DB error:", dbError);
        setError(`Save failed: ${dbError.message}`);
        setSaving(false);
        return;
      }

      console.log("NotificationConsent: saved successfully");

      localStorage.setItem(CONSENT_KEY, emailConsent ? "accepted" : "declined");

      setSaved(true);
      setSaving(false);

      setTimeout(() => {
        setShow(false);
        setSaved(false);
      }, 1500);
    } catch (err: unknown) {
      console.error("NotificationConsent catch:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(CONSENT_KEY, "dismissed");
    setShow(false);
  };

  if (!show) return null;

  return (
    <>
      <div
        onClick={handleDismiss}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.3)",
          zIndex: 998,
        }}
      />

      <div
        style={{
          position: "fixed",
          bottom: 90,
          left: 16,
          right: 16,
          background: "white",
          borderRadius: 20,
          padding: "20px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
          zIndex: 999,
          border: "1px solid #E8E6F0",
          maxWidth: 420,
          margin: "0 auto",
        }}
      >
        {saved ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>{emailConsent ? "🎉" : "👍"}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111110" }}>
              {emailConsent ? "Subscribed! Tips coming soon." : "No problem. Maybe later."}
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  background: "#EEEDFE",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  flexShrink: 0,
                }}
              >
                🌅
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                style={{
                  background: "#F7F7F4",
                  border: "none",
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  fontSize: 16,
                  color: "#5F5E5A",
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: 16, fontWeight: 800, color: "#111110", marginBottom: 6 }}>
              Daily finance tip 🌅
            </div>

            <div style={{ fontSize: 13, color: "#5F5E5A", lineHeight: 1.6, marginBottom: 16 }}>
              One tip every morning. Tax saving, insurance, investments — plain language. Free. Unsubscribe anytime.
            </div>

            {user?.email && (
              <div
                style={{
                  background: "#F7F7F4",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 13,
                  color: "#5F5E5A",
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>📧</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</span>
              </div>
            )}

            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                cursor: "pointer",
                marginBottom: 16,
              }}
            >
              <div
                onClick={() => setEmailConsent(!emailConsent)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: emailConsent ? "2px solid #534AB7" : "2px solid #E8E6F0",
                  background: emailConsent ? "#534AB7" : "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                  marginTop: 1,
                  transition: "all 0.15s",
                }}
              >
                {emailConsent && (
                  <span style={{ color: "white", fontSize: 13, fontWeight: 700, lineHeight: 1 }}>✓</span>
                )}
              </div>
              <span style={{ fontSize: 12, color: "#5F5E5A", lineHeight: 1.5 }}>
                Yes, send me daily finance tips. I can unsubscribe anytime from Settings.
              </span>
            </label>

            {error && (
              <div
                style={{
                  background: "#FCEBEB",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 12,
                  color: "#791F1F",
                  marginBottom: 12,
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              style={{
                width: "100%",
                height: 48,
                borderRadius: 12,
                background: saving ? "#9B9A94" : "#534AB7",
                color: "white",
                border: "none",
                fontSize: 15,
                fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                marginBottom: 8,
                transition: "background 0.15s",
              }}
            >
              {saving ? "Saving..." : emailConsent ? "Subscribe to tips →" : "No thanks"}
            </button>

            <div style={{ fontSize: 10, color: "#9B9A94", textAlign: "center" }}>
              No spam. Financial tips only.
            </div>
          </>
        )}
      </div>
    </>
  );
}
