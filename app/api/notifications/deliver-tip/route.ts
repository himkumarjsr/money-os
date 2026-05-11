import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function authorizeRequest(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  const isValidCron = !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  return isValidCron || isVercelCron;
}

async function handleDeliverTip(req: NextRequest) {
  if (!authorizeRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Missing Supabase env" }, { status: 500 });
  }

  const supabaseAdmin = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const startTime = Date.now();

  try {
    console.log("deliver-tip: START", new Date().toISOString());

    const { data: users, error: usersErr } = await supabaseAdmin.from("users").select("id");

    if (usersErr) {
      console.error("deliver-tip: users error", usersErr);
      return NextResponse.json({ error: usersErr.message }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ message: "No users found" });
    }

    console.log(`deliver-tip: ${users.length} users`);

    const today = new Date().toISOString().split("T")[0];

    let delivered = 0;
    let skipped = 0;
    let errors = 0;

    const batchSize = 50;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      const outcomes = await Promise.all(
        batch.map(async (user) => {
          try {
            const { data: existing } = await supabaseAdmin
              .from("user_notifications")
              .select("id")
              .eq("user_id", user.id)
              .gte("created_at", `${today}T00:00:00Z`)
              .limit(1)
              .maybeSingle();

            if (existing) {
              return "skipped" as const;
            }

            const { data: tipResult, error: rpcErr } = await supabaseAdmin.rpc("get_next_tip_for_user", {
              p_user_id: user.id,
            });

            if (rpcErr) {
              console.error(`deliver-tip: rpc user ${user.id}`, rpcErr);
              return "error" as const;
            }

            const rows = Array.isArray(tipResult) ? tipResult : tipResult ? [tipResult] : [];
            if (rows.length === 0) {
              return "skipped" as const;
            }

            const tip = rows[0] as Record<string, unknown>;
            const tipId = String(tip.out_tip_id ?? "");

            const { error: insertErr } = await supabaseAdmin.from("user_notifications").insert({
              user_id: user.id,
              tip_id: tipId,
              title: String(tip.out_title ?? ""),
              content: String(tip.out_content ?? ""),
              emoji: String(tip.out_emoji ?? "💡"),
              category: String(tip.out_category ?? ""),
              is_read: false,
              shown_as_popup: false,
            });

            if (insertErr) {
              console.error(`deliver-tip: insert user ${user.id}`, insertErr);
              return "error" as const;
            }

            const { error: histErr } = await supabaseAdmin.from("user_tip_history").insert({
              user_id: user.id,
              tip_id: tipId,
            });

            if (histErr && histErr.code !== "23505") {
              console.error(`deliver-tip: history user ${user.id}`, histErr);
            }

            return "delivered" as const;
          } catch (err) {
            console.error(`deliver-tip: error for user ${user.id}`, err);
            return "error" as const;
          }
        }),
      );

      for (const o of outcomes) {
        if (o === "delivered") delivered += 1;
        else if (o === "skipped") skipped += 1;
        else errors += 1;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`deliver-tip: DONE in ${duration}ms`, { delivered, skipped, errors });

    return NextResponse.json({
      success: true,
      delivered,
      skipped,
      errors,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("deliver-tip: FATAL", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return handleDeliverTip(req);
}

export async function GET(req: NextRequest) {
  return handleDeliverTip(req);
}
