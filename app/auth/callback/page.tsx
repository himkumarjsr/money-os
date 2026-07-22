"use client";

import { applyPendingReferralRewards } from "@/lib/referralRewards";
import { peekPostLoginPath, sanitizeAppPath } from "@/lib/splitAuthRedirect";
import { getSupabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import BrandPageLoader from "@/components/ui/BrandPageLoader";
import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

function AuthCallbackContent() {
  const router = useRouter();
  const initAuth = useAuthStore((s) => s.initAuth);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const supabase = getSupabase();
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const type = params.get("type");
        // Prefer URL next, then pending Split invite in localStorage — never wipe invite yet.
        const next =
          sanitizeAppPath(params.get("next")) ??
          peekPostLoginPath(window.location.search);

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("Auth callback:", error);
            router.replace("/login?error=auth_failed");
            return;
          }
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

        if (type === "recovery") {
          router.replace("/auth/update-password");
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
