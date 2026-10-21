import { ProtectedGate } from "@/components/auth/ProtectedGate";
import DashboardHome from "@/components/dashboard/DashboardHome";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Finkoin",
  description:
    "Your money score, bills due this week, rewards and quick actions in one place.",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl min-w-0 gap-6 px-4 py-6 pb-28 sm:px-6 md:pb-10 lg:py-8">
      <DashboardSidebar />
      <div className="min-w-0 flex-1">
        <ProtectedGate>
          <DashboardHome />
        </ProtectedGate>
      </div>
    </div>
  );
}
