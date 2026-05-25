"use client";

import { getSupabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

/** True when the browser has a Supabase session (cookie or refreshed token). */
export async function hasSupabaseSession(): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) return true;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    return Boolean(user);
  } catch {
    return false;
  }
}

/**
 * Reconcile Zustand auth with Supabase. Returns true if the user should be treated as logged in.
 * Clears stale persisted login when there is no server session.
 */
export async function recoverAuthSession(): Promise<boolean> {
  const hasSession = await hasSupabaseSession();
  if (!hasSession) {
    useAuthStore.setState({
      user: null,
      isLoggedIn: false,
      userId: null,
      subscriptionTier: "free",
      hasInitialized: true,
      isLoading: false,
    });
    return false;
  }

  await useAuthStore.getState().refreshUser();
  return useAuthStore.getState().isLoggedIn;
}
