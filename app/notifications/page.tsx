import type { Metadata } from "next";
import { Suspense } from "react";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import BrandPageLoader from "@/components/ui/BrandPageLoader";
import NotificationsClient from "@/components/notifications/NotificationsClient";

export const metadata: Metadata = {
  title: "Notifications | Finkoin",
  description: "Your Finkoin tips and alerts",
  robots: { index: false, follow: false },
};

export default function NotificationsPage() {
  return (
    <ProtectedGate>
      <Suspense
        fallback={
          <BrandPageLoader fullScreen={false} label="Loading notifications…" />
        }
      >
        <NotificationsClient />
      </Suspense>
    </ProtectedGate>
  );
}
