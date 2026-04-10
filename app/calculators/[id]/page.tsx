"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGamificationStore } from "@/store/gamificationStore";

export default function CalculatorTrackPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const earnTokens = useGamificationStore((s) => s.earnTokens);
  const hasEarnedAction = useGamificationStore((s) => s.hasEarnedAction);
  const markEarnedAction = useGamificationStore((s) => s.markEarnedAction);

  useEffect(() => {
    const id = params?.id ?? "unknown";
    const key = `calculator:${id}`;
    if (!hasEarnedAction(key)) {
      earnTokens(5, "Used calculator");
      markEarnedAction(key);
    }
    router.replace("/calculators");
  }, [earnTokens, hasEarnedAction, markEarnedAction, params?.id, router]);

  return <div className="p-6 text-sm text-slate-600">Loading calculator...</div>;
}

