"use client";

import { AUTH_RECOVERY_PATH } from "@/lib/authRecovery";
import { getSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Supabase emits PASSWORD_RECOVERY when a reset link establishes a session.
 * PKCE redirects often drop `type=recovery` from the URL, so callback alone is unreliable.
 */
export function AuthRecoveryRedirect() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabase();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "PASSWORD_RECOVERY") return;
      const path = `${window.location.pathname}${window.location.search}`;
      if (path.startsWith(AUTH_RECOVERY_PATH)) return;
      router.replace(AUTH_RECOVERY_PATH);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
