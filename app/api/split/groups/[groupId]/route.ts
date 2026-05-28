import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  getSupabaseAdmin,
} from "@/lib/supabaseServer";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { groupId: string } },
) {
  try {
    const groupId = params.groupId;
    if (!groupId) {
      return NextResponse.json({ error: "Missing group id" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    const { data: myMembership, error: memErr } = await admin
      .from("split_group_members")
      .select("role")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (memErr) throw memErr;
    if (!myMembership || myMembership.role !== "admin") {
      return NextResponse.json(
        { error: "Only admin can delete group" },
        { status: 403 },
      );
    }

    const { data: expenseRows, error: expIdsErr } = await admin
      .from("split_expenses")
      .select("id")
      .eq("group_id", groupId);
    if (expIdsErr) throw expIdsErr;
    const expenseIds = (expenseRows ?? []).map((r) => r.id);

    if (expenseIds.length) {
      const { error: sharesErr } = await admin
        .from("split_expense_shares")
        .delete()
        .in("expense_id", expenseIds);
      if (sharesErr) throw sharesErr;
    }

    const { error: settlementsErr } = await admin
      .from("split_settlements")
      .delete()
      .eq("group_id", groupId);
    if (settlementsErr) throw settlementsErr;

    const { error: invitesErr } = await admin
      .from("split_invitations")
      .delete()
      .eq("group_id", groupId);
    if (invitesErr) throw invitesErr;

    const { error: expensesErr } = await admin
      .from("split_expenses")
      .delete()
      .eq("group_id", groupId);
    if (expensesErr) throw expensesErr;

    const { error: membersErr } = await admin
      .from("split_group_members")
      .delete()
      .eq("group_id", groupId);
    if (membersErr) throw membersErr;

    const { error: groupErr } = await admin
      .from("split_groups")
      .delete()
      .eq("id", groupId);
    if (groupErr) throw groupErr;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Delete split group error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not delete group" },
      { status: 500 },
    );
  }
}
