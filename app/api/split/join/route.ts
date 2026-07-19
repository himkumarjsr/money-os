import { NextRequest, NextResponse } from "next/server";
import { isOpenSplitInvite } from "@/lib/splitInvite";
import {
  createSupabaseServerClient,
  getSupabaseAdmin,
} from "@/lib/supabaseServer";

type JoinBody = {
  token?: string;
  code?: string;
};

async function activateMember(input: {
  admin: ReturnType<typeof getSupabaseAdmin>;
  groupId: string;
  userId: string;
  email: string;
  displayName: string;
}) {
  const now = new Date().toISOString();
  const { data: existing } = await input.admin
    .from("split_group_members")
    .select("id, status")
    .eq("group_id", input.groupId)
    .eq("email", input.email)
    .maybeSingle();

  if (existing?.status === "active") {
    return { alreadyActive: true as const };
  }

  const { error } = await input.admin.from("split_group_members").upsert(
    {
      group_id: input.groupId,
      user_id: input.userId,
      email: input.email,
      display_name: input.displayName,
      status: "active",
      role: "member",
      joined_at: now,
      left_at: null,
    },
    { onConflict: "group_id,email" },
  );
  if (error) throw error;
  return { alreadyActive: false as const };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as JoinBody;
    const token = body.token?.trim();
    const code = body.code?.trim().toUpperCase();

    if (!token && !code) {
      return NextResponse.json(
        { error: "Missing invite token or code" },
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
    const displayName =
      user.user_metadata?.name || userEmail.split("@")[0] || "Member";

    // ── Join by group invite_code ──────────────────────────────────
    if (code && !token) {
      const { data: group, error: groupErr } = await admin
        .from("split_groups")
        .select("id, name, is_active")
        .eq("invite_code", code)
        .maybeSingle();
      if (groupErr) throw groupErr;
      if (!group || group.is_active === false) {
        return NextResponse.json(
          { error: "Group not found for this invite code" },
          { status: 404 },
        );
      }

      await activateMember({
        admin,
        groupId: group.id,
        userId: user.id,
        email: userEmail,
        displayName,
      });

      await admin
        .from("split_groups")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", group.id);

      return NextResponse.json({
        success: true,
        groupId: group.id,
        groupName: group.name ?? "Split",
      });
    }

    // ── Join by invitation token ───────────────────────────────────
    const { data: invite, error: inviteErr } = await admin
      .from("split_invitations")
      .select("id,group_id,group_name,invited_email,status,expires_at")
      .eq("token", token!)
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

    const now = new Date().toISOString();

    if (openInvite) {
      const result = await activateMember({
        admin,
        groupId: invite.group_id,
        userId: user.id,
        email: userEmail,
        displayName,
      });
      if (result.alreadyActive) {
        return NextResponse.json({
          success: true,
          groupId: invite.group_id,
          groupName: invite.group_name ?? "Split",
        });
      }

      return NextResponse.json({
        success: true,
        groupId: invite.group_id,
        groupName: invite.group_name ?? "Split",
      });
    }

    const { data: existingMember } = await admin
      .from("split_group_members")
      .select("id, status")
      .eq("group_id", invite.group_id)
      .eq("email", invitedEmail)
      .maybeSingle();

    if (existingMember) {
      const { error: memberErr } = await admin
        .from("split_group_members")
        .update({
          user_id: user.id,
          display_name: displayName,
          status: "active",
          joined_at: now,
          left_at: null,
        })
        .eq("id", existingMember.id);
      if (memberErr) throw memberErr;
    } else {
      const { error: insertErr } = await admin
        .from("split_group_members")
        .upsert(
          {
            group_id: invite.group_id,
            user_id: user.id,
            email: invitedEmail,
            display_name: displayName,
            status: "active",
            role: "member",
            joined_at: now,
            left_at: null,
          },
          { onConflict: "group_id,email" },
        );
      if (insertErr) throw insertErr;
    }

    if (invite.status === "pending") {
      const { error: acceptErr } = await admin
        .from("split_invitations")
        .update({ status: "accepted" })
        .eq("id", invite.id);
      if (acceptErr) throw acceptErr;
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
