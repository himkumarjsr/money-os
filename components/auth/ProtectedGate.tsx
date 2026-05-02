"use client";

import { useAuthStore } from "@/store/authStore";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

/**
 * Waits for `hasInitialized` before treating `isLoggedIn` as authoritative.
 * Avoids false redirects to `/login` on refresh while Zustand + Supabase hydrate.
 */
export function ProtectedGate({ children }: { children: ReactNode }) {
  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!hasInitialized || isLoggedIn) return;
    const redirect = pathname || "/";
    router.replace(`/login?redirect=${encodeURIComponent(redirect)}`);
  }, [hasInitialized, isLoggedIn, router, pathname]);

  if (!hasInitialized) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-[#FAFAFA] px-4">
        <div
          className="h-11 w-11 animate-spin rounded-full border-[3px] border-[#534AB7] border-t-transparent"
          aria-hidden
        />
        <p className="text-sm font-medium text-[#9B9A94]">Loading…</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return <>{children}</>;
}
