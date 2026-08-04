"use client";

import { peekPostLoginPath } from "@/lib/splitAuthRedirect";
import { useAuthStore } from "@/store/authStore";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * If a Split invite is pending in localStorage/cookies (same browser/PWA
 * storage), route to join — or to login with ?next= when signed out.
 *
 * Note: iOS Safari/WhatsApp storage is siloed from the home-screen PWA, so
 * invites opened in those browsers must complete join in-browser; this
 * resume path only helps when storage is shared (e.g. Android Chrome ↔ TWA).
 */
export function SplitInviteResume() {
  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const pathname = usePathname();
  const router = useRouter();
  const attempted = useRef(false);

  useEffect(() => {
    if (!hasInitialized) return;
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
    if (isLoggedIn) {
      router.replace(pending);
      return;
    }
    router.replace(`/login?next=${encodeURIComponent(pending)}`);
  }, [hasInitialized, isLoggedIn, pathname, router]);

  return null;
}
