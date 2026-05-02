"use client";

import { getSupabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
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
        const nextRaw = params.get("next") || "/analyse";
        const next = nextRaw.startsWith("/") ? nextRaw : "/analyse";

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

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#534AB7] border-t-transparent" />
      <p style={{ fontSize: 14, color: "#9B9A94" }}>Completing login…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#534AB7] border-t-transparent" />
          <p className="text-sm text-[#9B9A94]">Loading…</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
