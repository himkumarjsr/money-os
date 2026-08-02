"use client";

import { peekPostLoginPath } from "@/lib/splitAuthRedirect";
import { useAuthStore } from "@/store/authStore";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * After login (any page), if a Split invite is still pending in
 * localStorage/cookies, send the user to /split/join?token=… so membership
 * is created (including when the installed PWA opens after a browser invite).
 */
export function SplitInviteResume() {
  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const pathname = usePathname();
  const router = useRouter();
  const attempted = useRef(false);

  useEffect(() => {
    if (!hasInitialized || !isLoggedIn) return;
    if (attempted.current) return;
    if (pathname?.startsWith("/split/join")) return;
    if (pathname?.startsWith("/login") || pathname?.startsWith("/auth/")) {
      return;
    }

    const pending = peekPostLoginPath("", "");
    if (!pending.startsWith("/split/join")) return;

    attempted.current = true;
    // Keep invite storage until join succeeds — clearing here dropped tokens when
    // auth was still settling and left users stuck on a bare join URL / home.
    router.replace(pending);
  }, [hasInitialized, isLoggedIn, pathname, router]);

  return null;
}
