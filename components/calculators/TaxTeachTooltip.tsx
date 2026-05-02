"use client";

import { cn } from "@/lib/cn";
import type { TaxTeachContent } from "@/lib/taxTeachContent";
import type { ReactNode } from "react";

export type { TaxTeachContent } from "@/lib/taxTeachContent";

export function TaxTeachTooltip({
  content,
  ariaLabel = "Learn more about this field",
}: {
  content: TaxTeachContent;
  ariaLabel?: string;
}): ReactNode {
  return (
    <details className={cn("group relative inline-flex")}>
      <summary
        className={cn(
          "flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-full border border-[#E8E6F0] bg-[#F4F2FC] text-xs font-bold leading-none text-[#534AB7]",
          "transition-colors hover:border-[#534AB7]/40 hover:bg-[#EEEDFE]",
          "[&::-webkit-details-marker]:hidden",
        )}
        aria-label={ariaLabel}
      >
        ?
      </summary>
      <div
        className={cn(
          "absolute right-0 top-9 z-[100] w-[min(calc(100vw-2rem),22rem)] rounded-xl border border-[#E8E6F0] bg-white p-4 text-left shadow-xl",
          "ring-1 ring-black/5",
        )}
        role="tooltip"
      >
        <dl className="space-y-2 text-xs leading-relaxed text-[#5F5E5A]">
          <div>
            <dt className="font-semibold text-[#534AB7]">What it is</dt>
            <dd className="mt-0.5">{content.what}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[#534AB7]">Who can claim</dt>
            <dd className="mt-0.5">{content.who}</dd>
          </div>
          {content.limit ? (
            <div>
              <dt className="font-semibold text-[#534AB7]">Maximum limit</dt>
              <dd className="mt-0.5">{content.limit}</dd>
            </div>
          ) : null}
          <div>
            <dt className="font-semibold text-[#534AB7]">Example</dt>
            <dd className="mt-0.5">{content.example}</dd>
          </div>
          <div className="rounded-lg bg-[#F7F6FE] px-3 py-2 text-[#3C3489]">
            <dt className="font-semibold">Pro tip</dt>
            <dd className="mt-0.5">{content.proTip}</dd>
          </div>
        </dl>
      </div>
    </details>
  );
}

export function SectionTeachHeading({
  title,
  content,
}: {
  title: string;
  content: TaxTeachContent;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-[#534AB7]">{title}</span>
      <TaxTeachTooltip content={content} ariaLabel={`Learn more: ${title}`} />
    </div>
  );
}
