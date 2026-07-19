import { NextRequest, NextResponse } from "next/server";
import {
  computeGroupBalances,
  type BalanceExpense,
  type BalanceMember,
  type BalanceSettlement,
} from "@/lib/splitBalances";
import {
  createSupabaseServerClient,
  getSupabaseAdmin,
} from "@/lib/supabaseServer";

/**
 * Leave a group (self) or remove a member (admin/creator).
 * Blocks when the target still has a non-zero net balance.
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId")?.trim();
    const targetEmailParam = searchParams.get("email")?.toLowerCase().trim();

    if (!groupId) {
      return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
    }

    const userEmail = (user.email ?? "").toLowerCase().trim();
    if (!userEmail) {
      return NextResponse.json(
        { error: "Account email is required" },
        { status: 400 },
      );
    }

    const emailToRemove = targetEmailParam || userEmail;
    const admin = getSupabaseAdmin();

    const { data: actorMembership, error: actorErr } = await admin
      .from("split_group_members")
      .select("role, status")
      .eq("group_id", groupId)
      .eq("email", userEmail)
      .maybeSingle();
    if (actorErr) throw actorErr;
    if (!actorMembership || actorMembership.status !== "active") {
      return NextResponse.json(
        { error: "You are not an active member of this group" },
        { status: 403 },
      );
    }

    const { data: group, error: groupErr } = await admin
      .from("split_groups")
      .select("created_by")
      .eq("id", groupId)
      .single();
    if (groupErr) throw groupErr;

    const isAdmin =
      actorMembership.role === "admin" || group?.created_by === user.id;

    if (emailToRemove !== userEmail && !isAdmin) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    // Creator cannot leave via this path — soft-delete the group instead.
    if (emailToRemove === userEmail && group?.created_by === user.id) {
      return NextResponse.json(
        {
          error:
            "Group creators cannot leave. Soft-delete the group instead, or transfer ownership first.",
        },
        { status: 400 },
      );
    }

    const { data: targetMembership, error: targetErr } = await admin
      .from("split_group_members")
      .select("id, role, status")
      .eq("group_id", groupId)
      .eq("email", emailToRemove)
      .maybeSingle();
    if (targetErr) throw targetErr;
    if (!targetMembership || targetMembership.status !== "active") {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Block leaving/removing with unsettled net balance (settlements-aware).
    const [membersRes, expensesRes, settlementsRes] = await Promise.all([
      admin
        .from("split_group_members")
        .select("email, display_name")
        .eq("group_id", groupId)
        .eq("status", "active"),
      admin
        .from("split_expenses")
        .select(
          "amount, paid_by_email, paid_by_name, is_deleted, shares:split_expense_shares(email, display_name, share_amount)",
        )
        .eq("group_id", groupId)
        .or("is_deleted.eq.false,is_deleted.is.null"),
      admin
        .from("split_settlements")
        .select("from_email, to_email, amount")
        .eq("group_id", groupId)
        .eq("status", "completed"),
    ]);
    if (membersRes.error) throw membersRes.error;
    if (expensesRes.error) throw expensesRes.error;
    if (settlementsRes.error) throw settlementsRes.error;

    const { net } = computeGroupBalances(
      (membersRes.data ?? []) as BalanceMember[],
      (expensesRes.data ?? []) as unknown as BalanceExpense[],
      (settlementsRes.data ?? []) as BalanceSettlement[],
    );
    const targetNet = net.find((n) => n.email === emailToRemove)?.net ?? 0;
    if (Math.abs(targetNet) > 0.01) {
      return NextResponse.json(
        {
          error: "Unsettled balances exist",
          amount: Math.abs(targetNet),
        },
        { status: 400 },
      );
    }

    const { error: leaveErr } = await admin
      .from("split_group_members")
      .update({
        status: "left",
        left_at: new Date().toISOString(),
      })
      .eq("group_id", groupId)
      .eq("email", emailToRemove);
    if (leaveErr) throw leaveErr;

    await admin
      .from("split_groups")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", groupId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Split members leave error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Could not update member",
      },
      { status: 500 },
    );
  }
}
