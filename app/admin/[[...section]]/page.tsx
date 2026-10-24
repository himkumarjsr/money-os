import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminAccessManager } from "@/components/admin/AdminAccessManager";
import { AdminShell } from "@/components/admin/AdminShell";
import { AnalyseLogsViewer } from "@/components/admin/AnalyseLogsViewer";
import { DocContent } from "@/components/admin/DocContent";
import { PlanChecklist } from "@/components/admin/PlanChecklist";
import { WebOnlyGate } from "@/components/admin/WebOnlyGate";
import {
  getConsoleAccess,
  getMyConsolePermissions,
  isConsoleSuperAdmin,
  listAnalyseLogs,
  listConsoleAdmins,
  listPlanTicks,
  type AnalyseLogRow,
  type ConsoleAdmin,
  type PlanTick,
} from "@/lib/adminConsole";
import { PLAN_CHECKLIST } from "@/lib/adminDocs/planChecklist";
import {
  ADMIN_DOC_SECTIONS,
  DEFAULT_ADMIN_SECTION,
  getAdminDocSection,
} from "@/lib/adminDocs";
import { hasAdminPermission, sectionKey } from "@/lib/adminPermissions";

/**
 * Admin console (web only). Rendered on the server, and only after the
 * database confirms the caller is a console admin (migration 053), so the
 * documentation never reaches anyone else, not even in a JS bundle. Each
 * admin sees only the sections the super admin gave them (migration 062);
 * the database repeats that check for sections that read live data.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false, nocache: true },
};

type PageProps = {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<{
    email?: string | string[];
    checks?: string | string[];
  }>;
};

function NoSections({ email }: { email: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-[#111110]">No sections yet</h1>
      <p className="mt-2 text-sm text-[#5F5E5A]">
        {email} is an admin, but no console sections have been shared with you.
        Ask the super admin to give you access.
      </p>
    </div>
  );
}

function SignInPrompt() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-[#111110]">Sign in to continue</h1>
      <p className="mt-2 text-sm text-[#5F5E5A]">
        This page needs a signed-in account.
      </p>
      <Link
        href={`/login?redirect=${encodeURIComponent("/admin")}`}
        className="mt-5 inline-flex rounded-xl bg-[#534AB7] px-4 py-2 text-sm font-semibold text-white"
      >
        Sign in
      </Link>
    </div>
  );
}

export default async function AdminPage(props: PageProps) {
  const { section } = await props.params;
  const { user, isAdmin, supabase } = await getConsoleAccess();
  if (!user) return <SignInPrompt />;
  if (!isAdmin || !supabase) notFound();

  if (section && section.length > 1) notFound();
  const email = (user.email ?? "").toLowerCase();
  const perms = await getMyConsolePermissions(supabase);
  const sectionIds = ADMIN_DOC_SECTIONS.map((s) => s.id).filter((id) =>
    hasAdminPermission(perms, sectionKey(id)),
  );
  const requested =
    section?.[0] ??
    (sectionIds.includes(DEFAULT_ADMIN_SECTION)
      ? DEFAULT_ADMIN_SECTION
      : sectionIds[0]);
  if (!requested) {
    return (
      <WebOnlyGate>
        <NoSections email={email} />
      </WebOnlyGate>
    );
  }
  const doc = getAdminDocSection(requested);
  if (!doc || !sectionIds.includes(doc.id)) notFound();

  let admins: ConsoleAdmin[] = [];
  if (doc.id === "admin-access") {
    try {
      admins = await listConsoleAdmins(supabase);
    } catch (e) {
      console.error("admin list failed:", e);
    }
  }
  let logs: AnalyseLogRow[] = [];
  let logsError: string | null = null;
  const query = await props.searchParams;
  const logEmail = typeof query.email === "string" ? query.email.trim() : "";
  const onlyChecks = query.checks === "1";
  if (doc.id === "analyse-logs") {
    try {
      logs = await listAnalyseLogs(supabase, {
        email: logEmail,
        onlyChecks,
      });
    } catch (e) {
      logsError = e instanceof Error ? e.message : String(e);
    }
  }
  let ticks: PlanTick[] = [];
  let canTick = false;
  let ticksError: string | null = null;
  if (doc.id === "plan-checklist") {
    try {
      [ticks, canTick] = await Promise.all([
        listPlanTicks(supabase),
        isConsoleSuperAdmin(supabase),
      ]);
    } catch (e) {
      ticksError =
        e instanceof Error && /admin_console_plan_ticks/.test(e.message)
          ? "Run migration 060 in Supabase to enable ticks."
          : "Could not load ticks. Please reload.";
      console.error("plan ticks failed:", e);
    }
  }

  return (
    <WebOnlyGate>
      <AdminShell
        active={doc.id}
        activeTitle={doc.title}
        email={email}
        sectionIds={sectionIds}
      >
        <DocContent section={doc}>
          {doc.id === "admin-access" ? (
            <AdminAccessManager
              initialAdmins={admins}
              currentEmail={email}
              sections={ADMIN_DOC_SECTIONS.filter(
                (s) => s.id !== "admin-access",
              ).map((s) => ({ id: s.id, title: s.title, group: s.group }))}
            />
          ) : doc.id === "analyse-logs" ? (
            <AnalyseLogsViewer
              logs={logs}
              email={logEmail}
              onlyChecks={onlyChecks}
              error={logsError}
            />
          ) : doc.id === "plan-checklist" ? (
            <PlanChecklist
              docs={PLAN_CHECKLIST}
              initialTicks={ticks}
              canEdit={canTick}
              error={ticksError}
            />
          ) : null}
        </DocContent>
      </AdminShell>
    </WebOnlyGate>
  );
}
