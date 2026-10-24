import { NextResponse, type NextRequest } from "next/server";
import {
  deleteAnalyseLogs,
  getConsoleAccess,
  getMyConsolePermissions,
} from "@/lib/adminConsole";
import { hasAdminPermission, sectionKey } from "@/lib/adminPermissions";
import { rateLimit, tooManyRequests, unauthorized } from "@/lib/apiGuard";

/**
 * Permanently delete analyse logs (migration 063). Super admin only; other
 * admins get 403 and non-admins 404 so the route doesn't confirm the console
 * exists. The database repeats the super admin check on every call.
 */

export const dynamic = "force-dynamic";

const MAX_IDS = 200;

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(req: NextRequest) {
  const access = await getConsoleAccess();
  if (!access.user) return unauthorized();
  if (!access.isAdmin || !access.supabase) return notFound();
  const perms = await getMyConsolePermissions(access.supabase);
  if (!hasAdminPermission(perms, sectionKey("analyse-logs"))) return notFound();

  const limit = rateLimit(
    `admin-analyse-delete:${access.user.id}`,
    120,
    60 * 60 * 1000,
  );
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  let ids: unknown;
  try {
    ({ ids } = (await req.json()) as { ids?: unknown });
  } catch {
    /* handled below */
  }
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > MAX_IDS ||
    !ids.every((id) => Number.isSafeInteger(id) && (id as number) > 0)
  ) {
    return NextResponse.json(
      { error: `Pick between 1 and ${MAX_IDS} logs` },
      { status: 400 },
    );
  }

  try {
    const deleted = await deleteAnalyseLogs(access.supabase, ids as number[]);
    return NextResponse.json({ deleted });
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "42501") {
      return NextResponse.json(
        { error: "Only the super admin can delete logs" },
        { status: 403 },
      );
    }
    const message = e instanceof Error ? e.message : String(e);
    console.error("analyse log delete failed:", message);
    return NextResponse.json(
      {
        error: /admin_console_delete_analyse_logs/.test(message)
          ? "Run migration 063 in Supabase to enable deleting."
          : "Could not delete. Please try again.",
      },
      { status: 500 },
    );
  }
}
