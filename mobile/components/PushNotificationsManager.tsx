/**
 * Root-level push wiring: token registration once signed in (the OS permission
 * itself is requested by PushPermissionPrompt), inbox refresh on receipt, and
 * deep-link routing when a notification is tapped (warm or cold start).
 */
import { useEffect, useRef } from "react";
import { router } from "expo-router";
import type * as Notifications from "expo-notifications";
import { hydrateSyncKv, syncKv } from "@/lib/syncKv";
import {
  getPushPermission,
  ensureAndroidChannel,
  getNotifications,
  registerPushToken,
  routeForPushUrl,
} from "@/lib/pushNotifications";
import { supabase } from "@/lib/supabase";
import { uniqueChannelName } from "@/lib/realtimeChannel";
import { useAuthStore } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";

// getLastNotificationResponseAsync can return the same tap on later launches.
const LAST_HANDLED_KEY = "finkoin_last_push_handled";

export function PushNotificationsManager() {
  const userId = useAuthStore((s) => (s.isLoggedIn ? s.user?.id : undefined));
  const handled = useRef(new Set<string>());

  // No OS permission request here: the signed-in PushPermissionPrompt asks
  // first (web parity). If permission was already granted, just keep this
  // device's token registered for the signed-in user.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      await hydrateSyncKv();
      await ensureAndroidChannel();
      if (cancelled) return;
      if ((await getPushPermission()) === "granted") {
        void registerPushToken(userId);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // One inbox subscription for the whole app; every header bell reads the store.
  useEffect(() => {
    if (!userId) return;
    const refresh = () =>
      void useNotificationStore.getState().fetchNotifications(userId);
    refresh();
    const channel = supabase
      .channel(uniqueChannelName(`notifications:${userId}`))
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${userId}`,
        },
        refresh,
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    const api = getNotifications();
    if (!api) return;
    const open = (response: Notifications.NotificationResponse) => {
      const id = response.notification.request.identifier;
      if (handled.current.has(id) || syncKv.getItem(LAST_HANDLED_KEY) === id) {
        return;
      }
      handled.current.add(id);
      syncKv.setItem(LAST_HANDLED_KEY, id);
      const target = routeForPushUrl(
        response.notification.request.content.data?.url,
      );
      try {
        router.push(target);
      } catch {
        setTimeout(() => {
          try {
            router.push(target);
          } catch {
            /* navigator not ready; the inbox still has the message */
          }
        }, 800);
      }
    };

    const received = api.addNotificationReceivedListener(() => {
      const uid = useAuthStore.getState().user?.id;
      if (uid) void useNotificationStore.getState().fetchNotifications(uid);
    });
    const tapped = api.addNotificationResponseReceivedListener(open);

    const coldStart = setTimeout(async () => {
      await hydrateSyncKv();
      const last = await api.getLastNotificationResponseAsync();
      if (last) open(last);
    }, 600);

    return () => {
      received.remove();
      tapped.remove();
      clearTimeout(coldStart);
    };
  }, []);

  return null;
}
