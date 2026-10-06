import { create } from "zustand";
import { supabase } from "@/lib/supabase";

export type AppNotification = {
  id: string;
  title: string;
  content: string;
  emoji: string;
  category: string;
  is_read: boolean;
  shown_as_popup: boolean;
  created_at: string;
};

export function mapNotificationRow(
  row: Record<string, unknown>,
): AppNotification {
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    content: String(row.content ?? ""),
    emoji: String(row.emoji ?? "💡"),
    category: String(row.category ?? ""),
    is_read: Boolean(row.is_read),
    shown_as_popup: Boolean(row.shown_as_popup),
    created_at: String(row.created_at ?? ""),
  };
}

type NotificationStore = {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: (userId: string) => Promise<void>;
  markAllRead: (userId: string) => Promise<void>;
  markRead: (notifId: string) => Promise<void>;
  markPopupShown: (notifId: string) => Promise<void>;
  getTodayUnshownPopup: () => AppNotification | null;
  getById: (notifId: string) => AppNotification | null;
};

/** Port of web store/notificationStore.ts. */
export const useNotificationStore = create<NotificationStore>((set, get) => {
  const markLocally = (notifId: string) =>
    set((state) => {
      const prev = state.notifications.find((n) => n.id === notifId);
      const dec = prev && !prev.is_read ? 1 : 0;
      return {
        notifications: state.notifications.map((n) =>
          n.id === notifId ? { ...n, is_read: true, shown_as_popup: true } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - dec),
      };
    });

  return {
    notifications: [],
    unreadCount: 0,
    loading: false,

    fetchNotifications: async (userId) => {
      set({ loading: true });
      try {
        const { data, error } = await supabase
          .from("user_notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) {
          console.warn("fetchNotifications:", error.message);
          set({ loading: false });
          return;
        }

        const notifs = (data ?? []).map((row) =>
          mapNotificationRow(row as Record<string, unknown>),
        );
        set({
          notifications: notifs,
          unreadCount: notifs.filter((n) => !n.is_read).length,
          loading: false,
        });
      } catch (e) {
        console.warn("fetchNotifications", e);
        set({ loading: false });
      }
    },

    markAllRead: async (userId) => {
      try {
        const { error } = await supabase
          .from("user_notifications")
          .update({ is_read: true })
          .eq("user_id", userId)
          .eq("is_read", false);

        if (error) {
          console.warn("markAllRead:", error.message);
          return;
        }

        set((state) => ({
          notifications: state.notifications.map((n) => ({
            ...n,
            is_read: true,
          })),
          unreadCount: 0,
        }));
      } catch (e) {
        console.warn("markAllRead", e);
      }
    },

    markRead: async (notifId) => {
      try {
        const { error } = await supabase
          .from("user_notifications")
          .update({ is_read: true, shown_as_popup: true })
          .eq("id", notifId);
        if (error) {
          console.warn("markRead:", error.message);
          return;
        }
        markLocally(notifId);
      } catch (e) {
        console.warn("markRead", e);
      }
    },

    markPopupShown: async (notifId) => {
      try {
        const { error } = await supabase
          .from("user_notifications")
          .update({ shown_as_popup: true, is_read: true })
          .eq("id", notifId);
        if (error) {
          console.warn("markPopupShown:", error.message);
          return;
        }
        markLocally(notifId);
      } catch (e) {
        console.warn("markPopupShown", e);
      }
    },

    getTodayUnshownPopup: () => {
      const unshown = get().notifications.filter((n) => !n.shown_as_popup);
      if (unshown.length === 0) return null;
      return (
        [...unshown].sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        )[0] ?? null
      );
    },

    getById: (notifId) =>
      get().notifications.find((n) => n.id === notifId) ?? null,
  };
});
