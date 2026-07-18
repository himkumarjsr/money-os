import { NextRequest, NextResponse } from "next/server";
import { isOpenSplitInvite } from "@/lib/splitInvite";
import {
  createSupabaseServerClient,
  getSupabaseAdmin,
} from "@/lib/supabaseServer";

type JoinBody = {
  token?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as JoinBody;
    const token = body.token?.trim();
    if (!token) {
      return NextResponse.json(
        { error: "Missing invite token" },
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

    const userEmail = (user.email ?? "").toLowerCase().trim();
    if (!userEmail) {
      return NextResponse.json(
        { error: "Account email is required" },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdmin();
    const { data: invite, error: inviteErr } = await admin
      .from("split_invitations")
      .select("id,group_id,group_name,invited_email,status,expires_at")
      .eq("token", token)
      .single();

    if (inviteErr || !invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    const invitedEmail = String(invite.invited_email ?? "")
      .toLowerCase()
      .trim();
    const openInvite = isOpenSplitInvite(invitedEmail);

    if (!openInvite && (!invitedEmail || invitedEmail !== userEmail)) {
      return NextResponse.json(
        {
          error: `This invite was sent to ${invite.invited_email}. Please log in with that email.`,
        },
        { status: 403 },
      );
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This invite has expired" },
        { status: 400 },
      );
    }

    if (invite.status !== "pending" && invite.status !== "accepted") {
      return NextResponse.json({ error: "Invalid invite" }, { status: 400 });
    }

    const displayName =
      user.user_metadata?.name || userEmail.split("@")[0] || "Member";
    const now = new Date().toISOString();

    if (openInvite) {
      const { data: existing } = await admin
        .from("split_group_members")
        .select("id, status")
        .eq("group_id", invite.group_id)
        .eq("email", userEmail)
        .maybeSingle();

      if (existing?.status === "active") {
        return NextResponse.json({
          success: true,
          groupId: invite.group_id,
          groupName: invite.group_name ?? "Split",
        });
      }

      const { error: upsertErr } = await admin
        .from("split_group_members")
        .upsert(
          {
            group_id: invite.group_id,
            user_id: user.id,
            email: userEmail,
            display_name: displayName,
            status: "active",
            role: "member",
            joined_at: now,
          },
          { onConflict: "group_id,email" },
        );
      if (upsertErr) throw upsertErr;

      // Keep open invite pending so the same link can be reused.
      return NextResponse.json({
        success: true,
        groupId: invite.group_id,
        groupName: invite.group_name ?? "Split",
      });
    }

    const { error: memberErr } = await admin
      .from("split_group_members")
      .update({
        user_id: user.id,
        display_name: displayName,
        status: "active",
        joined_at: now,
      })
      .eq("group_id", invite.group_id)
      .eq("email", invitedEmail);
    if (memberErr) {
      throw memberErr;
    }

    if (invite.status === "pending") {
      const { error: acceptErr } = await admin
        .from("split_invitations")
        .update({ status: "accepted" })
        .eq("id", invite.id);
      if (acceptErr) {
        throw acceptErr;
      }
    }

    return NextResponse.json({
      success: true,
      groupId: invite.group_id,
      groupName: invite.group_name ?? "Split",
    });
  } catch (err: unknown) {
    console.error("Split join error:", err);
    const message = err instanceof Error ? err.message : "Could not join";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
