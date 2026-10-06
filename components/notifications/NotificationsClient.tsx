"use client";

import { AppIcon } from "@/components/ui/AppIcon";
import BrandPageLoader from "@/components/ui/BrandPageLoader";
import { getSupabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import {
  useNotificationStore,
  type Notification,
} from "@/store/notificationStore";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function NotificationsClient() {
  const searchParams = useSearchParams();
  const focusId = (searchParams?.get("id") || "").trim();
  const { user, isLoggedIn, hasInitialized } = useAuthStore();
  const { notifications, loading, fetchNotifications, markRead, markAllRead } =
    useNotificationStore();

  const [direct, setDirect] = useState<Notification | null>(null);
  const [directLoading, setDirectLoading] = useState(Boolean(focusId));

  useEffect(() => {
    if (!hasInitialized || !isLoggedIn || !user?.id) return;
    void fetchNotifications(user.id);
  }, [hasInitialized, isLoggedIn, user?.id, fetchNotifications]);

  // Deep-link from OS push: load that row even if not yet in store cache.
  useEffect(() => {
    if (!focusId || !isLoggedIn || !user?.id) {
      setDirectLoading(false);
      return;
    }
    let cancelled = false;
    setDirectLoading(true);

    const load = async () => {
      const fromStore = useNotificationStore.getState().getById(focusId);
      if (fromStore) {
        if (!cancelled) {
          setDirect(fromStore);
          setDirectLoading(false);
        }
        await markRead(focusId);
        return;
      }

      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("id", focusId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data) {
        setDirect(null);
        setDirectLoading(false);
        return;
      }

      const row: Notification = {
        id: String(data.id ?? ""),
        title: String(data.title ?? ""),
        content: String(data.content ?? ""),
        emoji: String(data.emoji ?? "💡"),
        category: String(data.category ?? ""),
        is_read: Boolean(data.is_read),
        shown_as_popup: Boolean(data.shown_as_popup),
        created_at: String(data.created_at ?? ""),
      };
      setDirect(row);
      setDirectLoading(false);
      await markRead(focusId);
      // Refresh list so the row appears / mark state is consistent.
      await fetchNotifications(user.id);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [focusId, isLoggedIn, user?.id, markRead, fetchNotifications]);

  const focused = useMemo(() => {
    if (!focusId) return direct;
    return notifications.find((n) => n.id === focusId) ?? direct ?? null;
  }, [focusId, notifications, direct]);

  if (!hasInitialized) {
    return <BrandPageLoader fullScreen={false} label="Loading…" />;
  }

  if (!isLoggedIn) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <p style={{ color: "#5F5E5A", marginBottom: 16 }}>
          Sign in to read your notifications.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(
            focusId ? `/notifications?id=${focusId}` : "/notifications",
          )}`}
          style={{
            display: "inline-block",
            background: "#534AB7",
            color: "#fff",
            fontWeight: 700,
            padding: "12px 20px",
            borderRadius: 12,
            textDecoration: "none",
          }}
        >
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 560,
        margin: "0 auto",
        padding: "16px 16px 120px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              color: "#111110",
            }}
          >
            Notifications
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9B9A94" }}>
            Tips and alerts from Finkoin
          </p>
        </div>
        {notifications.some((n) => !n.is_read) ? (
          <button
            type="button"
            onClick={() => user?.id && void markAllRead(user.id)}
            style={{
              border: "none",
              background: "#EEEDFE",
              color: "#534AB7",
              fontWeight: 700,
              fontSize: 12,
              padding: "8px 12px",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            Mark all read
          </button>
        ) : null}
      </div>

      {/* Deep-linked message spotlight */}
      {focusId ? (
        <div
          style={{
            background: "#fff",
            border: "1.5px solid #534AB7",
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            boxShadow: "0 8px 32px rgba(83,74,183,0.12)",
          }}
        >
          {directLoading && !focused ? (
            <BrandPageLoader fullScreen={false} size="sm" label="Opening…" />
          ) : focused ? (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: "#EEEDFE",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                  }}
                >
                  {focused.emoji || "💡"}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#534AB7",
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}
                  >
                    {focused.category === "split_expense" ||
                    focused.category === "split_invite"
                      ? "Split"
                      : focused.category === "obligation_reminder"
                        ? "Reminder"
                        : "Finance tip"}
                  </div>
                  <h2
                    style={{
                      margin: "2px 0 0",
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#111110",
                      lineHeight: 1.3,
                    }}
                  >
                    {focused.title}
                  </h2>
                </div>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 15,
                  lineHeight: 1.65,
                  color: "#5F5E5A",
                  whiteSpace: "pre-wrap",
                }}
              >
                {focused.content}
              </p>
              <div
                style={{
                  marginTop: 14,
                  fontSize: 12,
                  color: "#9B9A94",
                }}
              >
                {formatWhen(focused.created_at)}
              </div>
            </>
          ) : (
            <p style={{ margin: 0, color: "#5F5E5A" }}>
              This notification was not found. It may have been removed.
            </p>
          )}
        </div>
      ) : null}

      <h2
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: "#111110",
          margin: "0 0 10px",
        }}
      >
        {focusId ? "All notifications" : "Recent"}
      </h2>

      {loading && notifications.length === 0 ? (
        <BrandPageLoader fullScreen={false} label="Loading…" />
      ) : notifications.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 16px",
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #E8E6F0",
          }}
        >
          <AppIcon name="bell" size={40} color="#534AB7" />
          <p
            style={{
              marginTop: 12,
              fontWeight: 700,
              color: "#111110",
            }}
          >
            No notifications yet
          </p>
          <p style={{ fontSize: 13, color: "#9B9A94", marginTop: 6 }}>
            Daily finance tips and alerts will show up here.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {notifications.map((n) => {
            const isFocus = n.id === focusId;
            return (
              <Link
                key={n.id}
                href={`/notifications?id=${encodeURIComponent(n.id)}`}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: 14,
                  borderRadius: 14,
                  border: isFocus ? "1.5px solid #534AB7" : "1px solid #E8E6F0",
                  background: n.is_read ? "#fff" : "#FAFAFE",
                  textDecoration: "none",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "#EEEDFE",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  {n.emoji || "💡"}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#111110",
                        flex: 1,
                      }}
                    >
                      {n.title}
                    </span>
                    {!n.is_read ? (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#534AB7",
                          flexShrink: 0,
                        }}
                      />
                    ) : null}
                  </div>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 13,
                      color: "#5F5E5A",
                      lineHeight: 1.45,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {n.content}
                  </p>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      color: "#9B9A94",
                    }}
                  >
                    {formatWhen(n.created_at)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
