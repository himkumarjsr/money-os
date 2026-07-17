import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import {
  getAuthedUser,
  rateLimit,
  tooManyRequests,
  unauthorized,
} from "@/lib/apiGuard";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthedUser();
    if (!user) {
      return unauthorized();
    }

    const { groupId, toEmail, amount, paymentMethod } = (await req.json()) as {
      groupId?: string;
      toEmail?: string;
      amount?: number;
      paymentMethod?: string;
    };

    const numericAmount = Number(amount);
    if (!groupId || !toEmail) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { error: "Enter a valid amount" },
        { status: 400 },
      );
    }

    const limit = rateLimit(`split-settle:${user.id}`, 60, 60 * 60 * 1000);
    if (!limit.ok) {
      return tooManyRequests(limit.retryAfter);
    }

    const admin = getSupabaseAdmin();
    const fromEmail = (user.email ?? "").toLowerCase().trim();
    const toEmailLower = toEmail.toLowerCase().trim();

    if (fromEmail === toEmailLower) {
      return NextResponse.json(
        { error: "You cannot settle up with yourself" },
        { status: 400 },
      );
    }

    // The payer must be an active member of the group.
    const { data: fromMember, error: fromErr } = await admin
      .from("split_group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("email", fromEmail)
      .eq("status", "active")
      .maybeSingle();
    if (fromErr) throw fromErr;
    if (!fromMember) {
      return NextResponse.json(
        { error: "You are not a member of this group" },
        { status: 403 },
      );
    }

    // The recipient must belong to the same group too.
    const { data: toMember, error: toErr } = await admin
      .from("split_group_members")
      .select("user_id, display_name")
      .eq("group_id", groupId)
      .eq("email", toEmailLower)
      .in("status", ["active", "pending"])
      .maybeSingle();
    if (toErr) throw toErr;
    if (!toMember) {
      return NextResponse.json(
        { error: "That person is not in this group" },
        { status: 400 },
      );
    }

    const { data: settlement, error } = await admin
      .from("split_settlements")
      .insert({
        group_id: groupId,
        from_user_id: user.id,
        from_email: fromEmail,
        to_user_id: toMember.user_id || null,
        to_email: toEmailLower,
        amount: Math.round(numericAmount * 100) / 100,
        payment_method: paymentMethod || "other",
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Touch the group so listeners/caches refresh.
    await admin
      .from("split_groups")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", groupId);

    return NextResponse.json({ success: true, settlement });
  } catch (err: unknown) {
    console.error("Settle up error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
