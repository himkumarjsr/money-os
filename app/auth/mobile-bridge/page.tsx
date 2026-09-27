"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import BrandPageLoader from "@/components/ui/BrandPageLoader";

/**
 * Mobile OAuth bridge (Expo Go / native).
 *
 * Supabase redirects here with ?code=… after Google. We do NOT exchange the
 * code on the web (PKCE verifier lives in the app). We immediately bounce to
 * the app deep link so ASWebAuthenticationSession / Expo can finish login.
 *
 * Start URL shape from the app:
 *   /auth/mobile-bridge?app=<encodeURIComponent(exp://…/auth/callback)>
 * Supabase appends &code=… (and possibly other params).
 */
function MobileBridgeInner() {
  const search = useSearchParams();

  useEffect(() => {
    const app = search?.get("app");
    if (!app) {
      window.location.replace("/login?error=auth_failed");
      return;
    }

    let target: URL;
    try {
      target = new URL(app);
    } catch {
      window.location.replace("/login?error=auth_failed");
      return;
    }

    // Forward every OAuth param except our own `app` marker.
    search?.forEach((value, key) => {
      if (key === "app") return;
      target.searchParams.set(key, value);
    });

    // Also forward hash tokens if present (implicit / recovery flows).
    if (window.location.hash && window.location.hash.length > 1) {
      const hash = window.location.hash.replace(/^#/, "");
      const existing = target.hash ? target.hash.replace(/^#/, "") : "";
      target.hash = existing ? `${existing}&${hash}` : hash;
    }

    window.location.replace(target.toString());
  }, [search]);

  return <BrandPageLoader label="Returning to Finkoin app…" />;
}

export default function AuthMobileBridgePage() {
  return (
    <Suspense fallback={<BrandPageLoader label="Returning to Finkoin app…" />}>
      <MobileBridgeInner />
    </Suspense>
  );
}
