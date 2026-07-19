import { NextRequest, NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  getSupabaseAdmin,
} from "@/lib/supabaseServer";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 },
      );
    }

    const email = (user.email ?? "").toLowerCase().trim();
    if (!email) {
      return NextResponse.json(
        { error: "Account email is required" },
        { status: 400 },
      );
    }

    const emoji = body.emoji?.trim() || null;
    const groupType = body.type?.trim() || "general";
    const displayName =
      body.displayName?.trim() ||
      user.user_metadata?.name ||
      email.split("@")[0] ||
      "Member";

    const admin = getSupabaseAdmin();
    const inviteCode = Array.from({ length: 8 }, () =>
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".charAt(Math.floor(Math.random() * 32)),
    ).join("");

    const { data: group, error: groupError } = await admin
      .from("split_groups")
      .insert({
        name,
        emoji,
        group_type: groupType,
        created_by: user.id,
        invite_code: inviteCode,
      })
      .select("id")
      .single();

    if (groupError || !group?.id) {
      throw groupError ?? new Error("Could not create group");
    }

    const { error: memberError } = await admin
      .from("split_group_members")
      .insert({
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
    const message =
      err instanceof Error ? err.message : "Could not create group";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");

    if (!groupId) {
      return NextResponse.json({ error: "Missing groupId" }, { status: 400 });
    }

    const { data: group } = await supabase
      .from("split_groups")
      .select("created_by, name")
      .eq("id", groupId)
      .single();

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.created_by !== user.id) {
      return NextResponse.json(
        { error: "Only the group creator can delete this group" },
        { status: 403 },
      );
    }

    const { error } = await supabase
      .from("split_groups")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", groupId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Group deleted",
    });
  } catch (err: any) {
    console.error("Delete group error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
