"use client";

import { Suspense } from "react";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import BrandPageLoader from "@/components/ui/BrandPageLoader";
import HouseholdClient from "./HouseholdClient";

export default function HouseholdPage() {
  return (
    <ProtectedGate>
      <Suspense
        fallback={<BrandPageLoader fullScreen={false} label="Loading…" />}
      >
        <HouseholdClient />
      </Suspense>
    </ProtectedGate>
  );
}
