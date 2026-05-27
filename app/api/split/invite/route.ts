import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  try {
    const { groupId, groupName, invitedEmail, invitedByName, invitedById } = (await req.json()) as {
      groupId?: string;
      groupName?: string;
      invitedEmail?: string;
      invitedByName?: string;
      invitedById?: string;
    };

    if (!groupId || !invitedEmail || !invitedByName || !invitedById) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const email = invitedEmail.toLowerCase().trim();
    const safeGroupName = groupName?.trim() || "Finkoin Split group";

    const supabaseAdmin = getSupabaseAdmin();

    const { data: invite, error } = await supabaseAdmin
      .from("split_invitations")
      .insert({
        group_id: groupId,
        group_name: safeGroupName,
        invited_email: email,
        invited_by: invitedById,
        invited_by_name: invitedByName,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "";
    const inviteUrl = `${siteUrl}/split/join?token=${invite.token}`;

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
          Join the group to split bills, track shared spending, and settle up easily.
        </p>

        <a href="${inviteUrl}" style="display:block;background:#534AB7;color:white;text-decoration:none;text-align:center;padding:14px 18px;border-radius:12px;font-weight:800;font-size:14px;">
          Join “${safeGroupName}” →
        </a>

        <p style="color:#9B9A94;font-size:12px;text-align:center;margin:14px 0 0;">
          This invite expires in 7 days. Free forever. No ads.
        </p>
      </div>
    `;

    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: "FK Split <split@finkoin.com>",
        to: email,
        subject: `${invitedByName} added you to "${safeGroupName}" on Finkoin Split`,
        html: emailHtml,
      });
    }

    return NextResponse.json({ success: true, inviteUrl, token: invite.token });
  } catch (err: any) {
    console.error("Split invite error:", err);
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 });
  }
}

