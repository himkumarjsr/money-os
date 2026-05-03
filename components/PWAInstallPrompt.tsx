"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PWAInstallPrompt() {
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const isInstalled =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari standalone
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isInstalled) return;

    const dismissedAt = localStorage.getItem("pwa-prompt-dismissed");
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;

    if (isIOS) {
      const timer = setTimeout(() => {
        setShowIOSPrompt(true);
      }, 30000);
      return () => clearTimeout(timer);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowAndroidPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("pwa-prompt-dismissed", Date.now().toString());
    setShowIOSPrompt(false);
    setShowAndroidPrompt(false);
    setDismissed(true);
  };

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowAndroidPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (dismissed) return null;

  if (showIOSPrompt) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: 80,
          left: 16,
          right: 16,
          background: "white",
          borderRadius: 20,
          padding: "20px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
          zIndex: 9999,
          border: "1px solid #E8E6F0",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "#534AB7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 800,
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            FK
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111110", marginBottom: 4 }}>Add Finkoin to Home Screen</div>
            <div style={{ fontSize: 12, color: "#5F5E5A", lineHeight: 1.5, marginBottom: 12 }}>
              Tap the share button{" "}
              <span
                style={{
                  display: "inline-block",
                  background: "#F7F7F4",
                  borderRadius: 4,
                  padding: "1px 6px",
                  fontFamily: "monospace",
                }}
              >
                ↑
              </span>{" "}
              below and select <strong>&quot;Add to Home Screen&quot;</strong> for the best experience.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={handleDismiss}
                style={{
                  flex: 1,
                  height: 36,
                  borderRadius: 10,
                  background: "#F7F7F4",
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#5F5E5A",
                  cursor: "pointer",
                }}
              >
                Maybe later
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9B9A94",
              fontSize: 18,
              padding: 0,
              flexShrink: 0,
            }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 12 }}>
          <div
            style={{
              fontSize: 11,
              color: "#9B9A94",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <span>Look for this icon in Safari</span>
            <span
              style={{
                fontSize: 16,
                background: "#F7F7F4",
                borderRadius: 6,
                padding: "2px 6px",
              }}
            >
              ↑
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (showAndroidPrompt) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: 80,
          left: 16,
          right: 16,
          background: "white",
          borderRadius: 20,
          padding: "20px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
          zIndex: 9999,
          border: "1px solid #E8E6F0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "#534AB7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 800,
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            FK
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111110", marginBottom: 2 }}>Install Finkoin</div>
            <div style={{ fontSize: 12, color: "#5F5E5A" }}>Add to your home screen for instant access</div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#9B9A94",
              fontSize: 18,
              padding: 0,
              marginLeft: "auto",
              flexShrink: 0,
            }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 12,
              background: "#F7F7F4",
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              color: "#5F5E5A",
              cursor: "pointer",
            }}
          >
            Not now
          </button>
          <button
            type="button"
            onClick={() => void handleAndroidInstall()}
            style={{
              flex: 2,
              height: 44,
              borderRadius: 12,
              background: "#534AB7",
              border: "none",
              fontSize: 14,
              fontWeight: 700,
              color: "white",
              cursor: "pointer",
            }}
          >
            Install app →
          </button>
        </div>
      </div>
    );
  }

  return null;
}
