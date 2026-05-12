"use client";

import { loginHrefPreserveRef } from "@/lib/referralRewards";
import { useAuthStore } from "@/store/authStore";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";

export function ProtectedGate({ children }: { children: ReactNode }) {
  const hasInitialized = useAuthStore((s) => s.hasInitialized);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const router = useRouter();
  const pathname = usePathname();
  const redirected = useRef(false);

  useEffect(() => {
    console.log("ProtectedGate:", { hasInitialized, isLoggedIn, pathname });
    if (isLoggedIn) redirected.current = false;

    if (hasInitialized && !isLoggedIn && !redirected.current) {
      redirected.current = true;
      const redirect = pathname || "/";
      router.replace(loginHrefPreserveRef(`/login?redirect=${encodeURIComponent(redirect)}`));
    }
  }, [hasInitialized, isLoggedIn, router, pathname]);

  if (!hasInitialized) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "3px solid #534AB7",
            borderTop: "3px solid transparent",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return <>{children}</>;
}
