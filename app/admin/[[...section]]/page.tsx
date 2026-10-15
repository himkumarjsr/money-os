import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminAccessManager } from "@/components/admin/AdminAccessManager";
import { AdminShell } from "@/components/admin/AdminShell";
import { DocContent } from "@/components/admin/DocContent";
import { WebOnlyGate } from "@/components/admin/WebOnlyGate";
import {
  getConsoleAccess,
  listConsoleAdmins,
  type ConsoleAdmin,
} from "@/lib/adminConsole";
import { DEFAULT_ADMIN_SECTION, getAdminDocSection } from "@/lib/adminDocs";

/**
 * Admin console (web only). Rendered on the server, and only after the
 * database confirms the caller is a console admin (migration 053), so the
 * documentation never reaches anyone else, not even in a JS bundle.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false, nocache: true },
};

type PageProps = { params: Promise<{ section?: string[] }> };

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
  const doc = getAdminDocSection(section?.[0] ?? DEFAULT_ADMIN_SECTION);
  if (!doc) notFound();

  let admins: ConsoleAdmin[] = [];
  if (doc.id === "admin-access") {
    try {
      admins = await listConsoleAdmins(supabase);
    } catch (e) {
      console.error("admin list failed:", e);
    }
  }
  const email = (user.email ?? "").toLowerCase();

  return (
    <WebOnlyGate>
      <AdminShell active={doc.id} activeTitle={doc.title} email={email}>
        <DocContent section={doc}>
          {doc.id === "admin-access" ? (
            <AdminAccessManager initialAdmins={admins} currentEmail={email} />
          ) : null}
        </DocContent>
      </AdminShell>
    </WebOnlyGate>
  );
}
