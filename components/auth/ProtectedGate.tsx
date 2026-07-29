"use client";

import BrandPageLoader from "@/components/ui/BrandPageLoader";
import { resolveAuthenticated } from "@/lib/authSession";
import { loginHrefPreserveRef } from "@/lib/referralRewards";
import { useAuthStore } from "@/store/authStore";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";

export function ProtectedGate({ children }: { children: ReactNode }) {
  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const router = useRouter();
  const pathname = usePathname();
  const redirected = useRef(false);
  // Start false so SSR + first client render match; persist applies in layout effect.
  const [accessGranted, setAccessGranted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Persisted login: show the app immediately; verify session in the background.
    if (isLoggedIn) {
      redirected.current = false;
      setAccessGranted(true);
      return;
    }

    // Avoid infinite "Checking sign-in…" if initAuth never finishes (env / network).
    if (!hasInitialized) {
      const t = window.setTimeout(() => {
        if (!useAuthStore.getState().hasInitialized) {
          useAuthStore.setState({ hasInitialized: true, isLoading: false });
        }
      }, 8000);
      return () => window.clearTimeout(t);
    }

    let cancelled = false;

    void (async () => {
      const authenticated = await resolveAuthenticated();
      if (cancelled) return;

      if (authenticated) {
        redirected.current = false;
        setAccessGranted(true);
        return;
      }

      setAccessGranted(false);
      if (!redirected.current) {
        redirected.current = true;
        const redirect = pathname || "/";
        router.replace(
          loginHrefPreserveRef(
            `/login?redirect=${encodeURIComponent(redirect)}`,
          ),
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, hasInitialized, isLoggedIn, router, pathname]);

  // Until mounted, always spinner — matches SSR and avoids hydration mismatch.
  if (!mounted) {
    return <BrandPageLoader fullScreen={false} label="Loading…" />;
  }

  // Already logged in from persist / session — never gate behind a spinner.
  if (isLoggedIn || accessGranted) {
    return <>{children}</>;
  }

  return <BrandPageLoader fullScreen={false} label="Checking sign-in…" />;
}
