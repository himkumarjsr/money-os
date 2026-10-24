import { NextResponse, type NextRequest } from "next/server";
import { getConsoleAccess, listConsoleAdmins } from "@/lib/adminConsole";
import { normalizeAdminEmail } from "@/lib/adminEmail";
import { ADMIN_DOC_SECTIONS } from "@/lib/adminDocs";
import {
  ADMIN_FEATURES,
  ALL_SECTIONS_KEY,
  isGrantableKey,
  sectionKey,
} from "@/lib/adminPermissions";
import { rateLimit, tooManyRequests, unauthorized } from "@/lib/apiGuard";

/**
 * Admin console access list (migration 053) and each admin's permissions
 * (migration 062). Only the super admin gets anything back; everyone else
 * sees 404 so the route doesn't confirm the console exists. The database
 * repeats the super admin check on every call.
 */

export const dynamic = "force-dynamic";

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

/** Keys this build knows about; the database checks the shape again. */
const KNOWN_KEYS = new Set<string>([
  ALL_SECTIONS_KEY,
  ...ADMIN_DOC_SECTIONS.map((s) => sectionKey(s.id)),
  ...ADMIN_FEATURES.map((f) => f.key),
]);

/** Maps the RAISEs in migrations 053 / 062 to HTTP. */
function rpcError(error: { code?: string; message: string }) {
  if (error.code === "42501") return notFound();
  if (error.code === "22023") {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  console.error("admin console rpc failed:", error.message);
  return NextResponse.json(
    { error: "Could not update admins. Please try again." },
    { status: 500 },
  );
}

async function requireAdmin() {
  const access = await getConsoleAccess();
  if (!access.user) return { response: unauthorized() } as const;
  if (!access.isAdmin || !access.supabase)
    return { response: notFound() } as const;
  return { access } as const;
}

async function listResponse(
  supabase: NonNullable<
    Awaited<ReturnType<typeof getConsoleAccess>>["supabase"]
  >,
) {
  try {
    return NextResponse.json({ admins: await listConsoleAdmins(supabase) });
  } catch (e) {
    return rpcError({
      message: e instanceof Error ? e.message : "list failed",
    });
  }
}

export async function GET() {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;
  return listResponse(gate.access.supabase!);
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;
  const { user, supabase } = gate.access;

  const limit = rateLimit(`admin-grant:${user!.id}`, 30, 60 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  let email: string | null = null;
  try {
    email = normalizeAdminEmail(
      ((await req.json()) as { email?: unknown }).email,
    );
  } catch {
    /* handled below */
  }
  if (!email) {
    return NextResponse.json(
      { error: "Enter a valid email address" },
      { status: 400 },
    );
  }

  const { error } = await supabase!.rpc("admin_console_grant", {
    p_email: email,
  });
  if (error) return rpcError(error);
  return listResponse(supabase!);
}

export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;
  const { user, supabase } = gate.access;

  const limit = rateLimit(`admin-revoke:${user!.id}`, 30, 60 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const email = normalizeAdminEmail(req.nextUrl.searchParams.get("email"));
  if (!email) {
    return NextResponse.json(
      { error: "Enter a valid email address" },
      { status: 400 },
    );
  }

  const { error } = await supabase!.rpc("admin_console_revoke", {
    p_email: email,
  });
  if (error) return rpcError(error);
  return listResponse(supabase!);
}

export async function PUT(req: NextRequest) {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;
  const { user, supabase } = gate.access;

  const limit = rateLimit(`admin-perms:${user!.id}`, 120, 60 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  let email: string | null = null;
  let perms: unknown;
  try {
    const body = (await req.json()) as { email?: unknown; perms?: unknown };
    email = normalizeAdminEmail(body.email);
    perms = body.perms;
  } catch {
    /* handled below */
  }
  if (!email) {
    return NextResponse.json(
      { error: "Enter a valid email address" },
      { status: 400 },
    );
  }
  if (
    !Array.isArray(perms) ||
    perms.length > 100 ||
    !perms.every((p) => isGrantableKey(p) && KNOWN_KEYS.has(p))
  ) {
    return NextResponse.json({ error: "Unknown permission" }, { status: 400 });
  }

  const { error } = await supabase!.rpc("admin_console_set_permissions", {
    p_email: email,
    p_perms: [...new Set(perms as string[])],
  });
  if (error) return rpcError(error);
  return listResponse(supabase!);
}
