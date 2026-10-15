"use client";

import { useEffect } from "react";
import { useGamificationStore } from "@/store/gamificationStore";

export function Toast() {
  const toastMessage = useGamificationStore((s) => s.toastMessage);
  const clearToast = useGamificationStore((s) => s.clearToast);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => clearToast(), 3000);
    return () => window.clearTimeout(timer);
  }, [toastMessage, clearToast]);

  if (!toastMessage) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[100] rounded-xl bg-[#534AB7] px-4 py-2 text-center text-sm font-semibold text-white shadow-lg sm:inset-x-auto sm:bottom-4 sm:right-4 sm:text-left"
    >
      {toastMessage}
    </div>
  );
}
