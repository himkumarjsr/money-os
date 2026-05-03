"use client";

import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useState } from "react";

export default function AppInitializer({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      console.log("AppInitializer: starting");
      try {
        await useAuthStore.persist.rehydrate();

        if (!useAuthStore.persist.hasHydrated()) {
          await new Promise<void>((resolve) => {
            const unsub = useAuthStore.persist.onFinishHydration(() => {
              unsub();
              resolve();
            });
            setTimeout(resolve, 1000);
          });
        }

        if (cancelled) return;

        await useAuthStore.getState().initAuth();
      } catch (err) {
        console.error("AppInitializer error:", err);
      } finally {
        if (!cancelled) {
          setReady(true);
          console.log("AppInitializer: ready");
        }
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          flexDirection: "column",
          gap: 12,
          background: "#FAFAFA",
          position: "fixed",
          inset: 0,
          zIndex: 9999,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "3px solid #534AB7",
            borderTop: "3px solid transparent",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ fontSize: 13, color: "#9B9A94", fontWeight: 500, margin: 0 }}>Loading Finkoin...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      {children}
      <PWAInstallPrompt />
    </>
  );
}
