"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        if (session) {
          router.push("/analyse");
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="max-w-sm text-slate-600">
        If you opened an invite or reset link, your session will continue automatically. Otherwise use{" "}
        <strong className="text-slate-900">Sign in</strong> in the header.
      </p>
    </div>
  );
}
