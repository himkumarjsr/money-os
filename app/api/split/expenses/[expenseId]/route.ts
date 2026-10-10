import { NextRequest, NextResponse } from "next/server";
import { computeSplitShares } from "@/lib/splitShares";
import {
  createSupabaseServerClient,
  getSupabaseAdmin,
} from "@/lib/supabaseServer";

type PutBody = {
  title?: string;
  amount?: number;
  category?: string;
  expense_date?: string;
  expenseDate?: string;
  notes?: string | null;
  splitType?: "equal" | "exact" | "percentage" | "shares";
  includedMembers?: Array<{
    email: string;
    display_name: string;
    user_id?: string | null;
  }>;
  exactAmounts?: Record<string, number>;
  percentages?: Record<string, number>;
  shareCounts?: Record<string, number>;
  /** Optional payer change; must be an active member of the group. */
  paidByEmail?: string;
  paidByName?: string;
  paidByUserId?: string | null;
  /** Precomputed share rows (optional; recomputed when splitType + members given). */
  shares?: Array<{
    email: string;
    display_name: string;
    user_id?: string | null;
    share_amount: number;
    share_percentage?: number | null;
  }>;
};

export async function PUT(req: NextRequest, props: { params: Promise<{ expenseId: string }> }) {
  const params = await props.params;
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

    const body = (await req.json()) as PutBody;
    const admin = getSupabaseAdmin();

    const { data: expense, error: expErr } = await admin
      .from("split_expenses")
      .select("id, group_id, created_by, is_deleted")
      .eq("id", expenseId)
      .single();
    if (expErr || !expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }
    if (expense.is_deleted) {
      return NextResponse.json(
        { error: "Expense already deleted" },
        { status: 400 },
      );
    }
    if (expense.created_by !== user.id) {
      return NextResponse.json(
        { error: "Only the expense creator can edit" },
        { status: 403 },
      );
    }

    const title = body.title?.trim();
    const amount = Number(body.amount);
    const expenseDate = (body.expense_date ?? body.expenseDate)?.trim();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Enter a valid amount" },
        { status: 400 },
      );
    }
    if (!expenseDate) {
      return NextResponse.json(
        { error: "Expense date is required" },
        { status: 400 },
      );
    }

    let payerUpdate: Record<string, string | null> = {};
    const payerEmail = body.paidByEmail?.toLowerCase().trim();
    if (payerEmail) {
      const { data: payer } = await admin
        .from("split_group_members")
        .select("user_id, display_name")
        .eq("group_id", expense.group_id)
        .eq("email", payerEmail)
        .eq("status", "active")
        .maybeSingle();
      if (!payer) {
        return NextResponse.json(
          { error: "Payer must be a member of this group" },
          { status: 400 },
        );
      }
      payerUpdate = {
        paid_by_email: payerEmail,
        paid_by_name: body.paidByName?.trim() || payer.display_name,
        paid_by_user_id: payer.user_id ?? null,
      };
    }

    let shareRows: Array<{
      expense_id: string;
      group_id: string;
      user_id: string | null;
      email: string;
      display_name: string;
      share_amount: number;
      share_percentage: number | null;
      is_settled: boolean;
    }> | null = null;

    if (body.splitType && body.includedMembers?.length) {
      const { shares, error: shareErr } = computeSplitShares({
        amount,
        splitType: body.splitType,
        includedMembers: body.includedMembers,
        exactAmounts: body.exactAmounts,
        percentages: body.percentages,
        shareCounts: body.shareCounts,
      });
      if (shareErr) {
        return NextResponse.json({ error: shareErr }, { status: 400 });
      }
      shareRows = shares.map((s) => ({
        expense_id: expenseId,
        group_id: expense.group_id,
        user_id: s.user_id,
        email: s.email,
        display_name: s.display_name,
        share_amount: s.share_amount,
        share_percentage: s.share_percentage,
        is_settled: false,
      }));
    } else if (body.shares?.length) {
      const sum =
        Math.round(
          body.shares.reduce((s, r) => s + Number(r.share_amount || 0), 0) *
            100,
        ) / 100;
      if (Math.abs(sum - amount) > 0.01) {
        return NextResponse.json(
          {
            error: `Shares must total ₹${amount.toFixed(2)} (currently ₹${sum.toFixed(2)}).`,
          },
          { status: 400 },
        );
      }
      shareRows = body.shares.map((s) => ({
        expense_id: expenseId,
        group_id: expense.group_id,
        user_id: s.user_id ?? null,
        email: s.email.toLowerCase().trim(),
        display_name: s.display_name,
        share_amount: Math.round(Number(s.share_amount) * 100) / 100,
        share_percentage: s.share_percentage ?? null,
        is_settled: false,
      }));
    }

    const { data: updated, error: updErr } = await admin
      .from("split_expenses")
      .update({
        title,
        amount,
        category: body.category ?? "general",
        expense_date: expenseDate,
        notes: body.notes ?? null,
        ...(body.splitType ? { split_type: body.splitType } : {}),
        ...payerUpdate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", expenseId)
      .select()
      .single();
    if (updErr) throw updErr;

    if (shareRows) {
      const { error: delShareErr } = await admin
        .from("split_expense_shares")
        .delete()
        .eq("expense_id", expenseId);
      if (delShareErr) throw delShareErr;

      const { error: insShareErr } = await admin
        .from("split_expense_shares")
        .insert(shareRows);
      if (insShareErr) throw insShareErr;
    }

    await admin
      .from("split_groups")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", expense.group_id);

    return NextResponse.json({ success: true, expense: updated });
  } catch (err: unknown) {
    console.error("Update split expense error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Could not update expense",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ expenseId: string }> }) {
  const params = await props.params;
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

    if (expense.created_by !== user.id) {
      return NextResponse.json(
        { error: "Only the expense creator can delete" },
        { status: 403 },
      );
    }

    const { error: softErr } = await admin
      .from("split_expenses")
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", expenseId);
    if (softErr) throw softErr;

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
