"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function CalculatorTrackPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    const id = params?.id ?? "unknown";
    const calcMap: Record<string, string> = {
      "tax-regime-2026": "tax-regime",
    };
    const calc = calcMap[id] ?? id;
    router.replace(`/calculators?calc=${encodeURIComponent(calc)}`);
  }, [params?.id, router]);

  return <div className="p-6 text-sm text-slate-600">Loading calculator...</div>;
}
