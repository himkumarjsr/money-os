"use client";

import { useMemo, useState } from "react";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { buildNetWorthBreakup, type BreakupGroup } from "@/lib/netWorthBreakup";

const rs = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

function Groups({ title, groups }: { title: string; groups: BreakupGroup[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#534AB7]">
        {title}
      </p>
      {groups.length === 0 ? (
        <p className="mt-1 text-sm text-[#5F5E5A]">Nothing entered.</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {groups.flatMap((g) =>
            (g.rows.length > 0
              ? g.rows
              : [{ id: g.id, label: g.label, amount: g.total }]
            ).map((r) => (
              <li
                key={`${g.id}:${r.id}`}
                className="flex justify-between gap-3 text-sm text-[#3D3C38]"
              >
                <span className="min-w-0">{r.label}</span>
                <span className="shrink-0 tabular-nums">{rs(r.amount)}</span>
              </li>
            )),
          )}
        </ul>
      )}
    </div>
  );
}

/** "What's included" under the net worth summary: every asset and loan counted. */
export default function NetWorthIncluded({
  profile,
  totalAssets,
  totalLiabilities,
}: {
  profile: FinancialProfile;
  totalAssets: number;
  totalLiabilities: number;
}) {
  const [open, setOpen] = useState(false);
  const breakup = useMemo(
    () => buildNetWorthBreakup(profile, { totalAssets, totalLiabilities }),
    [profile, totalAssets, totalLiabilities],
  );
  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[44px] items-center text-sm font-semibold text-[#534AB7]"
      >
        {open ? "Hide what's included ↑" : "What's included ↓"}
      </button>
      {open ? (
        <div className="mt-1 space-y-3 rounded-xl bg-[#F7F7F4] p-3">
          <Groups title="What you own" groups={breakup.assets} />
          <Groups title="What you owe" groups={breakup.liabilities} />
          <p className="text-xs text-[#5F5E5A]">
            Gold, your car and your home count at today&apos;s value. Insurance
            policies are not counted until they pay out.
          </p>
        </div>
      ) : null}
    </div>
  );
}
