"use client";

import { getSupabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const refreshUser = useAuthStore((s) => s.refreshUser);

  useEffect(() => {
    void (async () => {
      try {
        const supabase = getSupabase();
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("Auth callback:", error);
            router.replace("/login?error=auth_failed");
            return;
          }
        }

        await refreshUser();

        const {
          data: { session },
        } = await supabase.auth.getSession();

        router.replace(session ? "/analyse" : "/login");
      } catch (e) {
        console.error("Auth callback error:", e);
        router.replace("/login?error=auth_failed");
      }
    })();
  }, [router, refreshUser]);

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
