import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getSupabaseAdmin } from "@/lib/supabaseServer";

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
      name?: string;
      emoji?: string;
      type?: string;
      displayName?: string;
    };

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    const email = (user.email ?? "").toLowerCase().trim();
    if (!email) {
      return NextResponse.json({ error: "Account email is required" }, { status: 400 });
    }

    const emoji = body.emoji?.trim() || "👥";
    const groupType = body.type?.trim() || "general";
    const displayName =
      body.displayName?.trim() || user.user_metadata?.name || email.split("@")[0] || "Member";

    const admin = getSupabaseAdmin();

    const { data: group, error: groupError } = await admin
      .from("split_groups")
      .insert({
        name,
        emoji,
        group_type: groupType,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (groupError || !group?.id) {
      throw groupError ?? new Error("Could not create group");
    }

    const { error: memberError } = await admin.from("split_group_members").insert({
      group_id: group.id,
      user_id: user.id,
      email,
      display_name: displayName,
      role: "admin",
      status: "active",
      joined_at: new Date().toISOString(),
    });

    if (memberError) {
      await admin.from("split_groups").delete().eq("id", group.id);
      throw memberError;
    }

    return NextResponse.json({ success: true, groupId: group.id });
  } catch (err: unknown) {
    console.error("Create split group error:", err);
    const message = err instanceof Error ? err.message : "Could not create group";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
