"use client";

import { create } from "zustand";
import { getSupabase } from "@/lib/supabase";

export interface Notification {
  id: string;
  title: string;
  content: string;
  emoji: string;
  category: string;
  is_read: boolean;
  shown_as_popup: boolean;
  created_at: string;
}

function mapRow(row: Record<string, unknown>): Notification {
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

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: (userId: string) => Promise<void>;
  markAllRead: (userId: string) => Promise<void>;
  markPopupShown: (notifId: string) => Promise<void>;
  getTodayUnshownPopup: () => Notification | null;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async (userId) => {
    set({ loading: true });
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("fetchNotifications error:", error);
        set({ loading: false });
        return;
      }

      const notifs = (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
      const unread = notifs.filter((n) => !n.is_read).length;

      set({
        notifications: notifs,
        unreadCount: unread,
        loading: false,
      });
    } catch (err) {
      console.error("fetchNotifications error:", err);
      set({ loading: false });
    }
  },

  markAllRead: async (userId) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from("user_notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) {
        console.error("markAllRead error:", error);
        return;
      }

      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error("markAllRead error:", err);
    }
  },

  markPopupShown: async (notifId) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from("user_notifications")
        .update({ shown_as_popup: true, is_read: true })
        .eq("id", notifId);

      if (error) {
        console.error("markPopupShown error:", error);
        return;
      }

      set((state) => {
        const prev = state.notifications.find((n) => n.id === notifId);
        const dec = prev && !prev.is_read ? 1 : 0;
        return {
          notifications: state.notifications.map((n) =>
            n.id === notifId ? { ...n, shown_as_popup: true, is_read: true } : n,
          ),
          unreadCount: Math.max(0, state.unreadCount - dec),
        };
      });
    } catch (err) {
      console.error("markPopupShown error:", err);
    }
  },

  getTodayUnshownPopup: () => {
    const today = new Date().toISOString().split("T")[0];
    return (
      get().notifications.find((n) => !n.shown_as_popup && n.created_at.startsWith(today)) ?? null
    );
  },
}));
