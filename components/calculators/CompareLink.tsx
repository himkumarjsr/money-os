"use client";

import { compareHref, type Scenario } from "@/lib/compareScenarios";
import Link from "next/link";

/** "Compare with another scenario" — opens the Compare calculator prefilled with these inputs. */
export function CompareLink({ scenario }: { scenario: Scenario }) {
  return (
    <Link
      href={compareHref(scenario)}
      className="flex min-h-[48px] items-center justify-between gap-3 rounded-xl border border-[#534AB7]/25 bg-[#EEEDFE] px-4 py-3 text-sm font-semibold text-[#534AB7] transition hover:border-[#534AB7]/50"
    >
      <span>
        Compare side by side
        <span className="mt-0.5 block text-xs font-medium text-[#5F5E5A]">
          Try a different return, tenure or calculator next to this one
        </span>
      </span>
      <span aria-hidden>→</span>
    </Link>
  );
}
