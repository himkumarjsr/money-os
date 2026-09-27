"use client";

import {
  AUTH_RECOVERY_PATH,
  completeAuthSessionFromUrl,
  isRecoveryAuthUrl,
} from "@/lib/authRecovery";
import { applyPendingReferralRewards } from "@/lib/referralRewards";
import { peekPostLoginPath, sanitizeAppPath } from "@/lib/splitAuthRedirect";
import { getSupabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import BrandPageLoader from "@/components/ui/BrandPageLoader";
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

/** Bounce OAuth params to a native deep link without exchanging the PKCE code. */
function bounceToNativeApp(appRedirect: string) {
  let target: URL;
  try {
    target = new URL(appRedirect);
  } catch {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  params.forEach((value, key) => {
    if (key === "app") return;
    target.searchParams.set(key, value);
  });
  if (window.location.hash && window.location.hash.length > 1) {
    const hash = window.location.hash.replace(/^#/, "");
    const existing = target.hash ? target.hash.replace(/^#/, "") : "";
    target.hash = existing ? `${existing}&${hash}` : hash;
  }
  window.location.replace(target.toString());
  return true;
}

function AuthCallbackContent() {
  const router = useRouter();
  const initAuth = useAuthStore((s) => s.initAuth);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const params = new URLSearchParams(window.location.search);

        // Mobile Expo / native: forward code to the app (do not exchange here).
        const appRedirect = params.get("app");
        if (appRedirect) {
          if (!bounceToNativeApp(appRedirect)) {
            router.replace("/login?error=auth_failed");
          }
          return;
        }

        const supabase = getSupabase();
        const recoveryFromUrl = isRecoveryAuthUrl(
          window.location.search,
          window.location.hash,
        );
        // Prefer URL next, then pending Split invite in localStorage — never wipe invite yet.
        const next =
          sanitizeAppPath(params.get("next")) ??
          peekPostLoginPath(window.location.search);

        const authResult = await completeAuthSessionFromUrl(supabase);
        if (!authResult.ok) {
          console.error("Auth callback:", authResult.error);
          router.replace("/login?error=auth_failed");
          return;
        }

        await initAuth();

        if (cancelled) return;

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/login?error=auth_failed");
          return;
        }

        if (recoveryFromUrl) {
          router.replace(AUTH_RECOVERY_PATH);
          return;
        }

        await applyPendingReferralRewards(supabase, session.user.id);

        router.replace(next);
      } catch (e) {
        console.error("Auth callback error:", e);
        router.replace("/login?error=auth_failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, initAuth]);

  return <BrandPageLoader label="Completing login…" />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<BrandPageLoader label="Loading…" />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
