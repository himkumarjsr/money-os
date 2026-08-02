"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  fullToolHref: string;
  fullToolLabel?: string;
  analyseHref?: string;
  children: ReactNode;
};

/** Chrome around an interactive calculator inside Learn articles. */
export default function LearnToolEmbed({
  title,
  subtitle,
  fullToolHref,
  fullToolLabel = "Open full calculator",
  analyseHref = "/analyse",
  children,
}: Props) {
  return (
    <section
      aria-label={title}
      className="my-8 overflow-hidden rounded-2xl border border-[#E8E6F0] bg-white shadow-sm"
    >
      <div className="border-b border-[#EEEDFE] bg-[#FAFAFE] px-4 py-3 sm:px-5">
        <div className="text-sm font-bold text-[#111110]">{title}</div>
        {subtitle ? (
          <p className="mt-1 text-xs leading-relaxed text-[#5F5E5A]">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
      <div className="flex flex-col gap-2 border-t border-[#E8E6F0] bg-[#F7F7F4] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-[11px] text-[#9B9A94]">
          Educational estimate — not investment advice. Know it. Fix it. Grow
          it.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href={fullToolHref}
            className="inline-flex min-h-9 items-center justify-center rounded-lg bg-[#534AB7] px-3 text-xs font-bold text-white no-underline"
          >
            {fullToolLabel}
          </Link>
          <Link
            href={analyseHref}
            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[#E8E6F0] bg-white px-3 text-xs font-bold text-[#534AB7] no-underline"
          >
            Full health check →
          </Link>
        </div>
      </div>
    </section>
  );
}
