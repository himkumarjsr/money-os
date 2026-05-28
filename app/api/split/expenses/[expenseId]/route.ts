import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  getSupabaseAdmin,
} from "@/lib/supabaseServer";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { expenseId: string } },
) {
  try {
    const expenseId = params.expenseId;
    if (!expenseId) {
      return NextResponse.json(
        { error: "Missing expense id" },
        { status: 400 },
      );
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
    const { data: expense, error: expErr } = await admin
      .from("split_expenses")
      .select("id, group_id, created_by")
      .eq("id", expenseId)
      .single();
    if (expErr || !expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const { data: myMembership, error: memErr } = await admin
      .from("split_group_members")
      .select("role")
      .eq("group_id", expense.group_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (memErr) throw memErr;
    const canDelete =
      expense.created_by === user.id || myMembership?.role === "admin";
    if (!canDelete) {
      return NextResponse.json(
        { error: "Not allowed to delete this expense" },
        { status: 403 },
      );
    }

    const { error: shareErr } = await admin
      .from("split_expense_shares")
      .delete()
      .eq("expense_id", expenseId);
    if (shareErr) throw shareErr;

    const { error: delErr } = await admin
      .from("split_expenses")
      .delete()
      .eq("id", expenseId);
    if (delErr) throw delErr;

    await admin
      .from("split_groups")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", expense.group_id);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Delete split expense error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Could not delete expense",
      },
      { status: 500 },
    );
  }
}
