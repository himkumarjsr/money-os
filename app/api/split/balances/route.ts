import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { getAuthedUser, unauthorized } from "@/lib/apiGuard";
import {
  computeGroupBalances,
  type BalanceExpense,
  type BalanceMember,
  type BalanceSettlement,
} from "@/lib/splitBalances";

/**
 * Authoritative, auditable balance computation for a split group.
 * Balances are derived from expenses + shares + settlements in-app
 * (see lib/splitBalances.ts) rather than an opaque DB RPC.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthedUser();
    if (!user) {
      return unauthorized();
    }

    const groupId = req.nextUrl.searchParams.get("groupId")?.trim();
    if (!groupId) {
      return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const actorEmail = (user.email ?? "").toLowerCase().trim();

    const { data: membership, error: memErr } = await admin
      .from("split_group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("email", actorEmail)
      .in("status", ["active", "pending"])
      .maybeSingle();
    if (memErr) throw memErr;
    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this group" },
        { status: 403 },
      );
    }

    const [membersRes, expensesRes, settlementsRes] = await Promise.all([
      admin
        .from("split_group_members")
        .select("email, display_name")
        .eq("group_id", groupId)
        .in("status", ["active", "pending"]),
      admin
        .from("split_expenses")
        .select(
          "amount, paid_by_email, paid_by_name, shares:split_expense_shares(email, display_name, share_amount)",
        )
        .eq("group_id", groupId),
      admin
        .from("split_settlements")
        .select("from_email, to_email, amount")
        .eq("group_id", groupId)
        .eq("status", "completed"),
    ]);

    if (membersRes.error) throw membersRes.error;
    if (expensesRes.error) throw expensesRes.error;
    if (settlementsRes.error) throw settlementsRes.error;

    const members = (membersRes.data ?? []) as BalanceMember[];
    const expenses = (expensesRes.data ?? []) as unknown as BalanceExpense[];
    const settlements = (settlementsRes.data ?? []) as BalanceSettlement[];

    const { net, edges } = computeGroupBalances(members, expenses, settlements);

    return NextResponse.json({ net, edges });
  } catch (err: unknown) {
    console.error("Split balances error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
