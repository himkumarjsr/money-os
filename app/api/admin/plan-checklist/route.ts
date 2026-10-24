import { NextResponse, type NextRequest } from "next/server";
import {
  getConsoleAccess,
  getMyConsolePermissions,
  isConsoleSuperAdmin,
  listPlanTicks,
} from "@/lib/adminConsole";
import { allPlanChecklistIds } from "@/lib/adminDocs/planChecklist";
import { hasAdminPermission, sectionKey } from "@/lib/adminPermissions";
import { rateLimit, tooManyRequests, unauthorized } from "@/lib/apiGuard";

/**
 * Plan checklist ticks (migration 060). Any console admin can read; only a
 * super admin can tick. Non-admins get 404 so the route doesn't confirm the
 * console exists. The database repeats both checks on every call.
 */

export const dynamic = "force-dynamic";

const ITEM_IDS = new Set(allPlanChecklistIds());

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

function forbidden() {
  return NextResponse.json(
    { error: "Only the super admin can tick items" },
    { status: 403 },
  );
}

async function requireAdmin() {
  const access = await getConsoleAccess();
  if (!access.user) return { response: unauthorized() } as const;
  if (!access.isAdmin || !access.supabase)
    return { response: notFound() } as const;
  // Only admins given this section (migration 062).
  const perms = await getMyConsolePermissions(access.supabase);
  if (!hasAdminPermission(perms, sectionKey("plan-checklist")))
    return { response: notFound() } as const;
  return { access } as const;
}

async function ticksResponse(
  supabase: NonNullable<
    Awaited<ReturnType<typeof getConsoleAccess>>["supabase"]
  >,
) {
  try {
    const [ticks, canEdit] = await Promise.all([
      listPlanTicks(supabase),
      isConsoleSuperAdmin(supabase),
    ]);
    return NextResponse.json({ ticks, canEdit });
  } catch (e) {
    console.error(
      "plan checklist read failed:",
      e instanceof Error ? e.message : e,
    );
    return NextResponse.json(
      { error: "Could not load the checklist. Please try again." },
      { status: 500 },
    );
  }
}

export async function GET() {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;
  return ticksResponse(gate.access.supabase!);
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;
  const { user, supabase } = gate.access;

  const limit = rateLimit(`admin-plan-tick:${user!.id}`, 300, 60 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  let itemId: unknown;
  let done: unknown;
  try {
    ({ itemId, done } = (await req.json()) as {
      itemId?: unknown;
      done?: unknown;
    });
  } catch {
    /* handled below */
  }
  if (
    typeof itemId !== "string" ||
    !ITEM_IDS.has(itemId) ||
    typeof done !== "boolean"
  ) {
    return NextResponse.json({ error: "Unknown item" }, { status: 400 });
  }

  const { error } = await supabase!.rpc("admin_console_set_plan_tick", {
    p_item_id: itemId,
    p_done: done,
  });
  if (error) {
    if (error.code === "42501") return forbidden();
    if (error.code === "22023") {
      return NextResponse.json({ error: "Unknown item" }, { status: 400 });
    }
    console.error("plan checklist tick failed:", error.message);
    return NextResponse.json(
      { error: "Could not save. Please try again." },
      { status: 500 },
    );
  }
  return ticksResponse(supabase!);
}
