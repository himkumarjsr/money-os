"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

const CONSENT_KEY = "finkoin_notif_consent";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function tryRegisterPush(vapidPublicKey?: string | null) {
  if (typeof window === "undefined") return { granted: false, token: null as string | null };
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return { granted: false, token: null };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { granted: false, token: null };

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!("pushManager" in registration) || !vapidPublicKey) {
      return { granted: true, token: null };
    }

    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      }));

    return { granted: true, token: JSON.stringify(subscription.toJSON()) };
  } catch {
    // Permission granted but push subscription can still fail in unsupported browsers.
    return { granted: true, token: null };
  }
}

export default function NotificationConsent() {
  const { user, isLoggedIn } = useAuthStore();
  const [show, setShow] = useState(false);
  const [emailConsent, setEmailConsent] = useState(false);
  const [pushConsent, setPushConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !user?.id) return;
    const dismissed = localStorage.getItem(CONSENT_KEY);
    if (dismissed) return;

    const timer = setTimeout(() => {
      setShow(true);
    }, 60000);

    return () => clearTimeout(timer);
  }, [isLoggedIn, user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);

    const wantsPush = pushConsent;
    let pushGranted = false;
    let pushToken: string | null = null;

    if (wantsPush) {
      const result = await tryRegisterPush(process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY);
      pushGranted = result.granted;
      pushToken = result.token;
    }

    const supabase = getSupabase();
    await supabase.from("notification_preferences").upsert({
      user_id: user.id,
      email_consent: emailConsent,
      push_consent: wantsPush ? pushGranted : false,
      morning_tips: emailConsent,
      weekly_summary: emailConsent,
      payment_alerts: true,
      marketing: false,
      preferred_time: "08:00",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
      email_consent_at: emailConsent ? new Date().toISOString() : null,
      push_consent_at: wantsPush && pushGranted ? new Date().toISOString() : null,
      consent_version: "v1",
      push_token: pushToken,
      updated_at: new Date().toISOString(),
    });

    localStorage.setItem(CONSENT_KEY, "v1");
    setSaving(false);
    setShow(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(CONSENT_KEY, "dismissed");
    setShow(false);
  };

  if (!show) return null;

  return (
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
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          🌅
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#9B9A94",
            fontSize: 18,
          }}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "#111110",
          marginBottom: 6,
        }}
      >
        Daily finance tips 🌅
      </div>

      <div
        style={{
          fontSize: 13,
          color: "#5F5E5A",
          lineHeight: 1.6,
          marginBottom: 16,
        }}
      >
        Get one financial tip every morning. Learn about tax saving, insurance, investments in plain language. Free.
        Unsubscribe anytime.
      </div>

      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 12 }}>
        <input type="checkbox" checked={emailConsent} onChange={() => setEmailConsent(!emailConsent)} />
        <span style={{ fontSize: 12, color: "#5F5E5A", lineHeight: 1.5 }}>
          Yes, send me a daily finance tip to {user?.email}. I can unsubscribe anytime from settings.
        </span>
      </label>

      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 16 }}>
        <input type="checkbox" checked={pushConsent} onChange={() => setPushConsent(!pushConsent)} />
        <span style={{ fontSize: 12, color: "#5F5E5A", lineHeight: 1.5 }}>
          Enable Android/PWA push notifications for reminders and alerts.
        </span>
      </label>

      <button
        onClick={() => void handleSave()}
        disabled={saving}
        style={{
          width: "100%",
          height: 46,
          borderRadius: 12,
          background: "#534AB7",
          color: "white",
          border: "none",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
          marginBottom: 8,
        }}
      >
        {saving ? "Saving..." : emailConsent ? "Subscribe to tips →" : "Maybe later"}
      </button>

      <div style={{ fontSize: 10, color: "#9B9A94", textAlign: "center" }}>No spam. Unsubscribe anytime.</div>
    </div>
  );
}
