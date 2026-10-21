import { ProtectedGate } from "@/components/auth/ProtectedGate";
import DashboardHome from "@/components/dashboard/DashboardHome";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";

/** Signed-in home: shown at finkoin.com/ once the user is logged in. */
export default function DashboardScreen() {
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
