import { pageMetadata } from "@/lib/seo";
import PolicyVaultClient from "@/components/policies/PolicyVaultClient";
import BrandPageLoader from "@/components/ui/BrandPageLoader";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = pageMetadata({
  title: "My Insurance Policies | Finkoin",
  description: "Track renewals and manage your insurance in one place.",
  path: "/policies",
  noindex: true,
});

export default function PoliciesPage() {
  return (
    <Suspense
      fallback={<BrandPageLoader fullScreen={false} label="Loading…" />}
    >
      <PolicyVaultClient />
    </Suspense>
  );
}
