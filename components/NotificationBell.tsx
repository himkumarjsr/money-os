"use client";

import { AppIcon } from "@/components/ui/AppIcon";
import BrandPageLoader from "@/components/ui/BrandPageLoader";
import { getSupabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { uniqueChannelName } from "@/lib/realtimeChannel";

export default function NotificationBell() {
  const { user, isLoggedIn } = useAuthStore();
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAllRead,
  } = useNotificationStore();

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoggedIn || !user?.id) return;

    void fetchNotifications(user.id);

    const supabase = getSupabase();
    const sub = supabase
      .channel(uniqueChannelName(`notifications:${user.id}`))
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void fetchNotifications(user.id);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(sub);
    };
  }, [isLoggedIn, user?.id]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Keep absolute dropdown inside the viewport (no position:fixed).
  useEffect(() => {
    if (!open) return;
    const el = dropdownRef.current;
    if (!el) return;

    const clamp = () => {
      el.style.transform = "";
      const rect = el.getBoundingClientRect();
      const pad = 12;
      let shift = 0;
      if (rect.left < pad) shift = pad - rect.left;
      if (rect.right + shift > window.innerWidth - pad) {
        shift -= rect.right + shift - (window.innerWidth - pad);
      }
      el.style.transform = shift ? `translateX(${shift}px)` : "";
    };

    clamp();
    window.addEventListener("resize", clamp);
    return () => {
      window.removeEventListener("resize", clamp);
      el.style.transform = "";
    };
  }, [open, loading, notifications.length]);

  const handleOpen = async () => {
    const isOpening = !open;
    setOpen(!open);
    if (isOpening && unreadCount > 0 && user?.id) {
      await markAllRead(user.id);
    }
  };

  if (!isLoggedIn) return null;

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => void handleOpen()}
        style={{
          position: "relative",
          width: 38,
          height: 38,
          borderRadius: 10,
          background: open ? "#EEEDFE" : "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.15s",
          WebkitTapHighlightColor: "transparent",
        }}
        aria-label="Notifications"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={open ? "#534AB7" : "#5F5E5A"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <div
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              background: "#E24B4A",
              border: "2px solid white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              fontWeight: 700,
              color: "white",
              padding: "0 3px",
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </div>
        )}
      </button>

      {open && (
        <div
          ref={dropdownRef}
          style={{
            position: "absolute",
            top: 44,
            right: 0,
            width: "min(320px, calc(100vw - 24px))",
            background: "white",
            borderRadius: 16,
            boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
            border: "1px solid #E8E6F0",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid #F0EFF8",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#FAFAFE",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link
                href="/notifications"
                style={{
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <span
                  style={{ fontSize: 16, fontWeight: 800, color: "#111110" }}
                >
                  Finance Tips
                </span>
              </Link>
              {unreadCount > 0 && (
                <div
                  style={{
                    background: "#534AB7",
                    color: "white",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 7px",
                    borderRadius: 20,
                  }}
                >
                  {unreadCount} new
                </div>
              )}
            </div>
            <span style={{ fontSize: 11, color: "#9B9A94" }}>
              Daily at 8:30 AM
            </span>
          </div>

          <div
            style={{
              maxHeight: 400,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {loading ? (
              <BrandPageLoader
                fullScreen={false}
                size="sm"
                minHeight={80}
                label="Loading…"
              />
            ) : notifications.length === 0 ? (
              <div style={{ padding: "40px 16px", textAlign: "center" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: 12,
                  }}
                >
                  <AppIcon name="bell" size={44} color="#534AB7" />
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#111110",
                    marginBottom: 6,
                  }}
                >
                  No tips yet
                </div>
                <div
                  style={{ fontSize: 12, color: "#9B9A94", lineHeight: 1.5 }}
                >
                  Your daily finance tip will appear here every morning at 8:30
                  AM
                </div>
              </div>
            ) : (
              notifications.map((n, i) => (
                <div
                  key={n.id}
                  style={{
                    padding: "14px 16px",
                    borderBottom:
                      i < notifications.length - 1
                        ? "1px solid #F7F7F4"
                        : "none",
                    background: n.is_read ? "white" : "#FAFAFE",
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 11,
                      background: "#EEEDFE",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <AppIcon name="bulb" size={18} color="#534AB7" />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 3,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#111110",
                          flex: 1,
                        }}
                      >
                        {n.title}
                      </span>
                      {!n.is_read && (
                        <div
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: "#534AB7",
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#5F5E5A",
                        lineHeight: 1.55,
                        marginBottom: 6,
                      }}
                    >
                      {n.content}
                    </div>
                    <div style={{ fontSize: 10, color: "#9B9A94" }}>
                      {new Date(n.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div
              style={{
                padding: "10px 16px",
                borderTop: "1px solid #F0EFF8",
                textAlign: "center",
                background: "#FAFAFE",
              }}
            >
              <span style={{ fontSize: 11, color: "#9B9A94" }}>
                Tips refresh daily · No spam ever
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
