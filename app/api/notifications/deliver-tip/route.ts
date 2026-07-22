import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isWebPushConfigured, sendWebPush } from "@/lib/webPush";

function authorizeRequest(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  const isValidCron =
    !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  return isValidCron || isVercelCron;
}

async function sendTipPush(
  supabaseAdmin: SupabaseClient,
  userId: string,
  tip: { title: string; content: string; tipId: string },
) {
  if (!isWebPushConfigured()) return { pushed: 0, cleaned: 0 };

  const { data: subs, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error || !subs?.length) return { pushed: 0, cleaned: 0 };

  let pushed = 0;
  let cleaned = 0;

  await Promise.all(
    (
      subs as Array<{
        id: string;
        endpoint: string;
        p256dh: string;
        auth: string;
      }>
    ).map(async (sub) => {
      const result = await sendWebPush(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        {
          title: tip.title || "Finkoin tip",
          body: tip.content || "Your daily finance tip is ready.",
          url: "/",
          tag: `tip-${tip.tipId || "daily"}`,
        },
      );
      if (result.ok) {
        pushed += 1;
        return;
      }
      if (result.gone) {
        await supabaseAdmin
          .from("push_subscriptions")
          .delete()
          .eq("id", sub.id);
        cleaned += 1;
      }
    }),
  );

  return { pushed, cleaned };
}

async function handleDeliverTip(req: NextRequest) {
  if (!authorizeRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Missing Supabase env" },
      { status: 500 },
    );
  }

  const supabaseAdmin = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const startTime = Date.now();

  try {
    console.info("deliver-tip: START", new Date().toISOString());

    const { data: users, error: usersErr } = await supabaseAdmin
      .from("users")
      .select("id");

    if (usersErr) {
      console.error("deliver-tip: users error", usersErr);
      return NextResponse.json({ error: usersErr.message }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ message: "No users found" });
    }

    console.info(`deliver-tip: ${users.length} users`);

    const today = new Date().toISOString().split("T")[0];

    let delivered = 0;
    let skipped = 0;
    let errors = 0;
    let pushed = 0;
    let pushCleaned = 0;

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
              return {
                status: "skipped" as const,
                pushed: 0,
                cleaned: 0,
              };
            }

            const { data: tipResult, error: rpcErr } = await supabaseAdmin.rpc(
              "get_next_tip_for_user",
              {
                p_user_id: user.id,
              },
            );

            if (rpcErr) {
              console.error(`deliver-tip: rpc user ${user.id}`, rpcErr);
              return { status: "error" as const, pushed: 0, cleaned: 0 };
            }

            const rows = Array.isArray(tipResult)
              ? tipResult
              : tipResult
                ? [tipResult]
                : [];
            if (rows.length === 0) {
              return { status: "skipped" as const, pushed: 0, cleaned: 0 };
            }

            const tip = rows[0] as Record<string, unknown>;
            const tipId = String(tip.out_tip_id ?? "");
            const title = String(tip.out_title ?? "");
            const content = String(tip.out_content ?? "");

            const { error: insertErr } = await supabaseAdmin
              .from("user_notifications")
              .insert({
                user_id: user.id,
                tip_id: tipId,
                title,
                content,
                emoji: String(tip.out_emoji ?? "💡"),
                category: String(tip.out_category ?? ""),
                is_read: false,
                shown_as_popup: false,
              });

            if (insertErr) {
              console.error(`deliver-tip: insert user ${user.id}`, insertErr);
              return { status: "error" as const, pushed: 0, cleaned: 0 };
            }

            const { error: histErr } = await supabaseAdmin
              .from("user_tip_history")
              .insert({
                user_id: user.id,
                tip_id: tipId,
              });

            if (histErr && histErr.code !== "23505") {
              console.error(`deliver-tip: history user ${user.id}`, histErr);
            }

            const pushResult = await sendTipPush(supabaseAdmin, user.id, {
              title,
              content,
              tipId,
            });

            return {
              status: "delivered" as const,
              pushed: pushResult.pushed,
              cleaned: pushResult.cleaned,
            };
          } catch (err) {
            console.error(`deliver-tip: error for user ${user.id}`, err);
            return { status: "error" as const, pushed: 0, cleaned: 0 };
          }
        }),
      );

      for (const o of outcomes) {
        if (o.status === "delivered") delivered += 1;
        else if (o.status === "skipped") skipped += 1;
        else errors += 1;
        pushed += o.pushed;
        pushCleaned += o.cleaned;
      }
    }

    const duration = Date.now() - startTime;
    console.info(`deliver-tip: DONE in ${duration}ms`, {
      delivered,
      skipped,
      errors,
      pushed,
      pushCleaned,
    });

    return NextResponse.json({
      success: true,
      delivered,
      skipped,
      errors,
      pushed,
      push_cleaned: pushCleaned,
      push_configured: isWebPushConfigured(),
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
