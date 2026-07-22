import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { z } from "zod";

const bodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid subscription" },
        { status: 400 },
      );
    }

    const { endpoint, keys, userAgent } = parsed.data;
    const now = new Date().toISOString();

    const { error: subError } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          user_agent: userAgent ?? null,
          updated_at: now,
        },
        { onConflict: "user_id,endpoint" },
      );

    if (subError) {
      console.error("push-subscribe upsert", subError);
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    const { error: prefError } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: user.id,
          push_consent: true,
          push_consent_at: now,
          morning_tips: true,
          updated_at: now,
        },
        { onConflict: "user_id" },
      );

    if (prefError) {
      console.error("push-subscribe prefs upsert", prefError);
      return NextResponse.json(
        {
          error: prefError.message || "Failed to save notification preferences",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      endpoint?: string | null;
    };

    if (body.endpoint) {
      const { error: delError } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id)
        .eq("endpoint", body.endpoint);
      if (delError) {
        console.error("push-unsubscribe delete", delError);
        return NextResponse.json({ error: delError.message }, { status: 500 });
      }
    } else {
      const { error: delError } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id);
      if (delError) {
        console.error("push-unsubscribe delete all", delError);
        return NextResponse.json({ error: delError.message }, { status: 500 });
      }
    }

    const { error: prefError } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: user.id,
          push_consent: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (prefError) {
      console.error("push-unsubscribe prefs upsert", prefError);
      return NextResponse.json(
        {
          error:
            prefError.message || "Failed to update notification preferences",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
