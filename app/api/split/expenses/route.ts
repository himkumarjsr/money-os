import { NextRequest, NextResponse } from "next/server";
import { computeSplitShares } from "@/lib/splitShares";
import {
  createSupabaseServerClient,
  getSupabaseAdmin,
} from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await req.json()) as {
      groupId?: string;
      title?: string;
      amount?: number;
      category?: string;
      paidByEmail?: string;
      paidByName?: string;
      paidByUserId?: string | null;
      splitType?: "equal" | "exact" | "percentage";
      expenseDate?: string;
      notes?: string;
      includedMembers?: Array<{
        email: string;
        display_name: string;
        user_id?: string | null;
      }>;
      exactAmounts?: Record<string, number>;
      percentages?: Record<string, number>;
    };

    const groupId = body.groupId?.trim();
    const title = body.title?.trim();
    const amount = Number(body.amount);
    const splitType = body.splitType;
    const expenseDate = body.expenseDate?.trim();
    const paidByEmail = body.paidByEmail?.toLowerCase().trim();

    if (!groupId || !title || !paidByEmail || !splitType || !expenseDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Enter a valid amount" },
        { status: 400 },
      );
    }

    const userEmail = (user.email ?? "").toLowerCase().trim();
    if (!userEmail) {
      return NextResponse.json(
        { error: "Account email is required" },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();

    const { data: membership, error: memErr } = await admin
      .from("split_group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("email", userEmail)
      .in("status", ["active", "pending"])
      .maybeSingle();

    if (memErr) throw memErr;
    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this group" },
        { status: 403 },
      );
    }

    const includedMembers = body.includedMembers ?? [];
    const { shares, error: shareErr } = computeSplitShares({
      amount,
      splitType,
      includedMembers,
      exactAmounts: body.exactAmounts,
      percentages: body.percentages,
    });
    if (shareErr) {
      return NextResponse.json({ error: shareErr }, { status: 400 });
    }

    const { data: newExpense, error: expenseErr } = await admin
      .from("split_expenses")
      .insert({
        group_id: groupId,
        title,
        amount,
        currency: "INR",
        category: body.category?.trim() || "general",
        paid_by_user_id: body.paidByUserId ?? null,
        paid_by_email: paidByEmail,
        paid_by_name:
          body.paidByName?.trim() || paidByEmail.split("@")[0] || "Member",
        split_type: splitType,
        expense_date: expenseDate,
        notes: body.notes?.trim() || null,
        is_settlement: false,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (expenseErr) throw expenseErr;

    const sharesWithExpense = shares.map((s) => ({
      ...s,
      expense_id: newExpense.id,
      group_id: groupId,
    }));

    const { error: shareInsertErr } = await admin
      .from("split_expense_shares")
      .insert(sharesWithExpense);
    if (shareInsertErr) throw shareInsertErr;

    await admin
      .from("split_groups")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", groupId);

    return NextResponse.json({
      success: true,
      expense: {
        ...newExpense,
        shares: sharesWithExpense,
      },
    });
  } catch (err: unknown) {
    console.error("Add split expense error:", err);
    const message =
      err instanceof Error ? err.message : "Could not add expense";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
