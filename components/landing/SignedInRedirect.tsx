"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

/** Sends signed-in visitors from the marketing homepage to their dashboard. */
export default function SignedInRedirect() {
  const router = useRouter();
  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const hasUser = useAuthStore((s) => Boolean(s.user));

  useEffect(() => {
    // Wait for the session check so a stale persisted login doesn't redirect.
    if (hasInitialized && isLoggedIn && hasUser) router.replace("/dashboard");
  }, [hasInitialized, isLoggedIn, hasUser, router]);

  return null;
}
