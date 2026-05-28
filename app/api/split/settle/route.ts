import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId, toEmail, amount, paymentMethod } = (await req.json()) as {
      groupId?: string;
      toEmail?: string;
      amount?: number;
      paymentMethod?: string;
    };

    if (!groupId || !toEmail || !amount) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const fromEmail = (user.email ?? "").toLowerCase();
    const toEmailLower = toEmail.toLowerCase();

    const { data: toMember } = await supabase
      .from("split_group_members")
      .select("user_id, display_name")
      .eq("group_id", groupId)
      .eq("email", toEmailLower)
      .single();

    const { data: settlement, error } = await supabase
      .from("split_settlements")
      .insert({
        group_id: groupId,
        from_user_id: user.id,
        from_email: fromEmail,
        to_user_id: toMember?.user_id || null,
        to_email: toEmailLower,
        amount: Number(amount),
        payment_method: paymentMethod || "other",
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    const { data: expenses } = await supabase
      .from("split_expenses")
      .select("id")
      .eq("group_id", groupId)
      .eq("paid_by_email", toEmailLower);

    if (expenses?.length) {
      const expenseIds = expenses.map((e) => e.id);
      await supabase
        .from("split_expense_shares")
        .update({
          is_settled: true,
          settled_at: new Date().toISOString(),
        })
        .in("expense_id", expenseIds)
        .eq("email", fromEmail)
        .eq("is_settled", false);
    }

    return NextResponse.json({ success: true, settlement });
  } catch (err: unknown) {
    console.error("Settle up error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
