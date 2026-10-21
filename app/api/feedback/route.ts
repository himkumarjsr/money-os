import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  clientKeyFromHeaders,
  getAuthedUser,
  rateLimit,
  tooManyRequests,
} from "@/lib/apiGuard";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_LEN = 4000;
const FEEDBACK_REWARD_FK = 50;
const FEEDBACK_REASON = "feedback_submitted";

export async function POST(req: NextRequest) {
  const supabaseAdmin = getAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Missing Supabase env" },
      { status: 500 },
    );
  }

  try {
    // Trust the session (not the client) for identity. Anonymous feedback is
    // allowed but never earns FK tokens - this kills token farming.
    const sessionUser = await getAuthedUser();
    const user_id = sessionUser?.id ?? null;

    const rateKey = user_id
      ? `feedback:${user_id}`
      : `feedback:ip:${clientKeyFromHeaders(req.headers)}`;
    const limit = rateLimit(rateKey, 10, 60 * 60 * 1000);
    if (!limit.ok) {
      return tooManyRequests(limit.retryAfter);
    }

    const body = (await req.json()) as Record<string, unknown>;

    const rating = body.rating;
    const message = typeof body.message === "string" ? body.message : "";
    const page_context =
      typeof body.page_context === "string" ? body.page_context : "app";
    const scoreRaw = body.score_at_time;
    const scoreNum =
      scoreRaw != null && scoreRaw !== "" ? Number(scoreRaw) : NaN;

    if (rating == null || Number(rating) < 1 || Number(rating) > 5) {
      return NextResponse.json(
        { error: "Rating 1 to 5 required" },
        { status: 400 },
      );
    }

    const insertData: Record<string, unknown> = {
      rating: Number(rating),
      message: message?.trim().slice(0, MAX_MESSAGE_LEN) || null,
      page_context: page_context.slice(0, 120) || "app",
      score_at_time: Number.isFinite(scoreNum) ? scoreNum : null,
      is_approved: false,
      is_featured: false,
    };

    if (user_id && UUID_RE.test(user_id)) {
      insertData.user_id = user_id;
    }

    const { data, error } = await supabaseAdmin
      .from("feedback")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Feedback API DB error:", error.code, error.message);
      return NextResponse.json(
        { error: "Could not save feedback" },
        { status: 500 },
      );
    }

    let fkAwarded = 0;
    if (user_id && UUID_RE.test(user_id)) {
      try {
        // Feedback pays 50 FK once per user, ever. Older rewards used other
        // reference ids (a date or a page), so check for any earlier one too.
        const { count, error: countErr } = await supabaseAdmin
          .from("fk_transactions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user_id)
          .eq("reason", FEEDBACK_REASON);
        if (countErr) throw countErr;
        if (!count) {
          const { data: awarded, error: awardErr } = await supabaseAdmin.rpc(
            "award_fk",
            {
              p_user_id: user_id,
              p_amount: FEEDBACK_REWARD_FK,
              p_reason: FEEDBACK_REASON,
              p_reference_id: "first_feedback",
            },
          );
          if (awardErr) throw awardErr;
          if (awarded) fkAwarded = FEEDBACK_REWARD_FK;
        }
      } catch (fkErr) {
        console.error("FK award error:", fkErr);
      }
    }

    return NextResponse.json({
      success: true,
      feedback_id: data?.id,
      fk_awarded: fkAwarded,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    console.error("Feedback API catch:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const supabaseAdmin = getAdmin();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Missing Supabase env" },
      { status: 500 },
    );
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("feedback")
      .select(
        `
          id,
          rating,
          message,
          user_name,
          user_city,
          user_profession,
          score_at_time,
          created_at
        `,
      )
      .eq("is_approved", true)
      .eq("is_featured", true)
      .gte("rating", 4)
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      testimonials: data || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
