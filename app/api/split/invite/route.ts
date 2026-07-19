import { NextRequest, NextResponse } from "next/server";
import {
  getAuthedUser,
  rateLimit,
  tooManyRequests,
  unauthorized,
} from "@/lib/apiGuard";
import { getPublicSiteUrl } from "@/lib/siteUrl";
import { isOpenSplitInvite, OPEN_SPLIT_INVITE_EMAIL } from "@/lib/splitInvite";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthedUser();
    if (!user) {
      return unauthorized();
    }

    const { groupId, groupName, invitedEmail, linkOnly } =
      (await req.json()) as {
        groupId?: string;
        groupName?: string;
        invitedEmail?: string;
        /** When true (or email omitted), create a reusable shareable invite link. */
        linkOnly?: boolean;
      };

    if (!groupId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const wantsLinkOnly =
      linkOnly === true || !invitedEmail || !String(invitedEmail).trim();

    let email = "";
    if (!wantsLinkOnly) {
      email = invitedEmail!.toLowerCase().trim();
      if (!EMAIL_RE.test(email)) {
        return NextResponse.json(
          { error: "Enter a valid email address" },
          { status: 400 },
        );
      }
    } else {
      email = OPEN_SPLIT_INVITE_EMAIL;
    }

    const limit = rateLimit(`split-invite:${user.id}`, 30, 60 * 60 * 1000);
    if (!limit.ok) {
      return tooManyRequests(limit.retryAfter);
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Only an active member of the group may invite others, and we trust the
    // server session for the inviter identity (never the client payload).
    const actorEmail = (user.email ?? "").toLowerCase().trim();
    const { data: membership, error: memErr } = await supabaseAdmin
      .from("split_group_members")
      .select("id, role, display_name")
      .eq("group_id", groupId)
      .eq("email", actorEmail)
      .eq("status", "active")
      .maybeSingle();
    if (memErr) throw memErr;
    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this group" },
        { status: 403 },
      );
    }

    // Ensure permanent group invite_code exists for /split/join?code=
    const { data: groupRow } = await supabaseAdmin
      .from("split_groups")
      .select("invite_code")
      .eq("id", groupId)
      .maybeSingle();
    if (!groupRow?.invite_code) {
      const inviteCode = Array.from({ length: 8 }, () =>
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".charAt(
          Math.floor(Math.random() * 32),
        ),
      ).join("");
      await supabaseAdmin
        .from("split_groups")
        .update({ invite_code: inviteCode })
        .eq("id", groupId);
    }

    const invitedById = user.id;
    const invitedByName =
      membership.display_name?.trim() ||
      user.user_metadata?.name ||
      actorEmail.split("@")[0] ||
      "Finkoin user";
    const safeGroupName = groupName?.trim() || "Finkoin Split";

    // Reuse / refresh an existing open invite link when possible.
    if (isOpenSplitInvite(email)) {
      const { data: existing } = await supabaseAdmin
        .from("split_invitations")
        .select("id, token, expires_at")
        .eq("group_id", groupId)
        .eq("invited_email", OPEN_SPLIT_INVITE_EMAIL)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing?.token) {
        const siteUrl = getPublicSiteUrl();
        const expired =
          existing.expires_at && new Date(existing.expires_at) <= new Date();
        if (expired && existing.id) {
          const nextExpiry = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString();
          await supabaseAdmin
            .from("split_invitations")
            .update({ expires_at: nextExpiry })
            .eq("id", existing.id);
        }
        return NextResponse.json({
          success: true,
          inviteUrl: `${siteUrl}/split/join?token=${existing.token}`,
          token: existing.token,
          emailSent: false,
          emailError: null,
          linkOnly: true,
        });
      }
    }

    const { data: invite, error } = await supabaseAdmin
      .from("split_invitations")
      .insert({
        group_id: groupId,
        group_name: safeGroupName,
        invited_email: email,
        invited_by: invitedById,
        invited_by_name: invitedByName,
        status: "pending",
        expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Email invites reserve a pending seat; open links add members on join.
    if (!isOpenSplitInvite(email)) {
      await supabaseAdmin.from("split_group_members").upsert(
        {
          group_id: groupId,
          email,
          display_name: email.split("@")[0] || "Member",
          status: "pending",
          invited_by: invitedById,
          role: "member",
        },
        { onConflict: "group_id,email" },
      );
    }

    const siteUrl = getPublicSiteUrl();
    const inviteUrl = `${siteUrl}/split/join?token=${invite.token}`;

    if (isOpenSplitInvite(email)) {
      return NextResponse.json({
        success: true,
        inviteUrl,
        token: invite.token,
        emailSent: false,
        emailError: null,
        linkOnly: true,
      });
    }

    const emailHtml = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;">
        <div style="background:#534AB7;border-radius:16px;padding:22px;text-align:center;margin-bottom:22px;">
          <h1 style="color:white;margin:0;font-size:22px;letter-spacing:-0.2px;">FK Split</h1>
          <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:13px;">by Finkoin</p>
        </div>

        <h2 style="color:#111110;font-size:18px;margin:0 0 10px;">
          ${invitedByName} added you to “${safeGroupName}”
        </h2>

        <p style="color:#5F5E5A;font-size:14px;line-height:1.6;margin:0 0 20px;">
          Join to split bills, track shared spending, and settle up easily.
        </p>

        <a href="${inviteUrl}" style="display:block;background:#534AB7;color:white;text-decoration:none;text-align:center;padding:14px 18px;border-radius:12px;font-weight:800;font-size:14px;">
          Join “${safeGroupName}” →
        </a>

        <p style="color:#9B9A94;font-size:12px;text-align:center;margin:14px 0 0;">
          This invite expires in 7 days. Free forever. No ads.
        </p>
      </div>
    `;

    let emailSent = false;
    let emailError: string | null = null;

    const resendKey = process.env.RESEND_API_KEY?.trim();
    const emailFrom = process.env.EMAIL_FROM?.trim();

    if (!resendKey) {
      emailError =
        "Email is not configured (missing RESEND_API_KEY). Share the invite link manually.";
    } else if (!emailFrom) {
      emailError =
        "Email is not configured (missing EMAIL_FROM). Share the invite link manually.";
    } else {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(resendKey);
        const { error: sendErr } = await resend.emails.send({
          from: `FK Split <${emailFrom}>`,
          to: email,
          subject: `${invitedByName} added you to "${safeGroupName}" on Finkoin Split`,
          html: emailHtml,
        });
        if (sendErr) {
          emailError = sendErr.message;
        } else {
          emailSent = true;
        }
      } catch (sendErr: unknown) {
        emailError =
          sendErr instanceof Error
            ? sendErr.message
            : "Could not send invite email";
      }
    }

    return NextResponse.json({
      success: true,
      inviteUrl,
      token: invite.token,
      emailSent,
      emailError,
      linkOnly: false,
    });
  } catch (err: unknown) {
    console.error("Split invite error:", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
