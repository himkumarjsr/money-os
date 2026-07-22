"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Analytics } from "@/lib/analytics";
import BrandPageLoader from "@/components/ui/BrandPageLoader";

export default function CalculatorTrackPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    const id = params?.id ?? "unknown";
    Analytics.calculatorUsed(id);
    const calcMap: Record<string, string> = {
      "tax-regime-2026": "tax-regime",
    };
    const calc = calcMap[id] ?? id;
    router.replace(`/calculators?calc=${encodeURIComponent(calc)}`);
  }, [params?.id, router]);

  return <BrandPageLoader fullScreen={false} label="Loading…" />;
}
