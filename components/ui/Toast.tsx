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
    <div className="fixed bottom-4 right-4 z-[100] rounded-xl bg-[#534AB7] px-4 py-2 text-sm font-semibold text-white shadow-lg">
      {toastMessage}
    </div>
  );
}

