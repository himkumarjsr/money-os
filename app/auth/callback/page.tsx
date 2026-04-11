"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      if (!supabase) {
        router.push("/login");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.push("/login");
          return;
        }
      }

      const { data } = await supabase.auth.getSession();

      if (data.session) {
        router.push("/analyse");
      } else {
        router.push("/login");
      }
    };

    void handleCallback();
  }, [router]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: "16px",
      }}
    >
      <svg width="40" height="40" viewBox="0 0 64 64">
        <rect width="64" height="64" rx="14" fill="#534AB7" />
        <text
          x="32"
          y="39"
          textAnchor="middle"
          fontFamily="system-ui"
          fontWeight="800"
          fontSize="20"
          fill="#FFFFFF"
        >
          FK
        </text>
      </svg>
      <p
        style={{
          color: "#534AB7",
          fontWeight: 600,
          fontSize: 16,
        }}
      >
        Setting up your account...
      </p>
    </div>
  );
}
