"use client";

import { AppIcon } from "@/components/ui/AppIcon";
import { timeGreeting } from "@/lib/greeting";
import { useAuthStore } from "@/store/authStore";
import type { Notification } from "@/store/notificationStore";
import { useNotificationStore } from "@/store/notificationStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** IST calendar date for localStorage (en-CA avoids UTC midnight mismatch). */
function tipPopupStorageKey(): string {
  const istDate =
    new Date()
      .toLocaleString("en-CA", {
        timeZone: "Asia/Kolkata",
      })
      .split(",")[0]
      ?.trim() ?? "";
  return `finkoin_tip_popup_${istDate}`;
}

function getIstHour(): number {
  const hourPart = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: false,
  })
    .formatToParts(new Date())
    .find((p) => p.type === "hour")?.value;
  return parseInt(hourPart ?? "0", 10);
}

export default function MorningTipPopup() {
  const router = useRouter();
  const { user, isLoggedIn, hasInitialized } = useAuthStore();
  const { fetchNotifications, getNextRelevantPopup, markPopupShown } =
    useNotificationStore();

  const [tip, setTip] = useState<Notification | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hasInitialized) return;
    if (!isLoggedIn || !user?.id) return;

    // Show popup 6 AM–11 PM IST (tips may arrive mid-day; user opens app later).
    const istHour = getIstHour();
    if (istHour < 6 || istHour >= 23) return;

    if (typeof window === "undefined") return;

    const todayKey = tipPopupStorageKey();
    if (localStorage.getItem(todayKey)) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const init = async () => {
      await fetchNotifications(user.id);
      if (cancelled) return;

      const todayTip = await getNextRelevantPopup(user.id);
      if (todayTip && !cancelled) {
        timer = setTimeout(() => {
          if (!cancelled) {
            setTip(todayTip);
            setVisible(true);
          }
        }, 3000);
      }
    };

    void init();

    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [hasInitialized, isLoggedIn, user?.id]);

  const handleClose = async () => {
    if (tip?.id) {
      await markPopupShown(tip.id);
      localStorage.setItem(tipPopupStorageKey(), "1");
    }
    setVisible(false);
  };

  const handleLearnMore = async () => {
    await handleClose();
    router.push("/learn");
  };

  if (!visible || !tip) return null;
  const greeting = timeGreeting();

  return (
    <>
      <div
        role="presentation"
        onClick={() => void handleClose()}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 990,
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
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
          padding: "22px 20px 20px",
          boxShadow: "0 16px 60px rgba(83,74,183,0.2)",
          zIndex: 991,
          maxWidth: 420,
          margin: "0 auto",
          border: "1px solid #E8E6F0",
          animation: "morningTipSlideUp 0.3s ease",
        }}
      >
        <style>{`
          @keyframes morningTipSlideUp {
            from {
              transform: translateY(30px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}</style>

        <button
          type="button"
          onClick={() => void handleClose()}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            background: "#F7F7F4",
            border: "none",
            borderRadius: 8,
            width: 30,
            height: 30,
            cursor: "pointer",
            fontSize: 14,
            color: "#9B9A94",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
          }}
        >
          <AppIcon name="close" size={14} color="#9B9A94" />
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 13,
              background: "#EEEDFE",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <AppIcon name="bulb" size={22} color="#534AB7" />
          </div>
          <div>
            <div
              style={{
                fontSize: 11,
                color: "#534AB7",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginBottom: 3,
              }}
            >
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                {greeting}
                {greeting === "Good morning" ? (
                  <AppIcon name="sunrise" size={14} color="#534AB7" />
                ) : null}
              </span>
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "#111110",
                lineHeight: 1.2,
                paddingRight: 32,
              }}
            >
              {tip.title}
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: 14,
            color: "#5F5E5A",
            lineHeight: 1.7,
            background: "#F7F7F4",
            borderRadius: 12,
            padding: "14px",
            marginBottom: 18,
          }}
        >
          {tip.content}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => void handleClose()}
            style={{
              flex: 1,
              height: 46,
              borderRadius: 12,
              background: "#534AB7",
              color: "white",
              border: "none",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Got it
          </button>
          <button
            type="button"
            onClick={() => void handleLearnMore()}
            style={{
              flex: 1,
              height: 46,
              borderRadius: 12,
              background: "#EEEDFE",
              color: "#534AB7",
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Learn more →
          </button>
        </div>
      </div>
    </>
  );
}
