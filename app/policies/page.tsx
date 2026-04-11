import PolicyVaultClient from "@/components/policies/PolicyVaultClient";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "My insurance policies | Finkoin",
  description: "Track renewals and manage your insurance in one place.",
};

export default function PoliciesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center bg-[#F7F7F4] text-sm text-slate-500">
          Loading…
        </div>
      }
    >
      <PolicyVaultClient />
    </Suspense>
  );
}
