"use client";

import { useState } from "react";
import { AppIcon } from "@/components/ui/AppIcon";
import { trackShare } from "@/lib/gtag";

export default function InviteLinkShare({
  inviteUrl,
  groupName,
}: {
  inviteUrl: string;
  groupName: string;
}) {
  const [copied, setCopied] = useState(false);

  const shareText = `Join "${groupName}" on Finkoin Split and we'll track shared expenses together: ${inviteUrl}`;
  const waHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      trackShare({
        method: "clipboard",
        content_type: "split_invite",
        content_id: groupName,
        outcome: "completed",
      });
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      trackShare({
        method: "fallback_prompt",
        content_type: "split_invite",
        content_id: groupName,
        outcome: "failed",
      });
      window.prompt("Copy this invite link:", inviteUrl);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-[#F7F7F4] px-3 py-3 overflow-hidden">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9B9A94]">
          Invite link
        </p>
        <p className="mt-1 max-w-full break-all font-mono text-xs font-medium text-[#534AB7]">
          {inviteUrl}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void copyLink()}
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[#E8E6F0] bg-white px-3 text-sm font-bold text-[#534AB7]"
        >
          <AppIcon name={copied ? "check" : "doc"} size={16} color="#534AB7" />
          {copied ? "Copied" : "Copy"}
        </button>
        <a
          href={waHref}
          target="_blank"
          rel="noreferrer"
          onClick={() =>
            trackShare({
              method: "whatsapp",
              content_type: "split_invite",
              content_id: groupName,
              outcome: "completed",
            })
          }
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3 text-sm font-bold text-white no-underline"
        >
          <AppIcon name="phone" size={16} color="#FFFFFF" />
          WhatsApp
        </a>
      </div>
    </div>
  );
}
