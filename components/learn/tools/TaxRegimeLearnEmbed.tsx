"use client";

import Link from "next/link";
import { useState } from "react";
import dynamic from "next/dynamic";
import LearnToolEmbed from "./LearnToolEmbed";

const TaxRegimeCalculator = dynamic(
  () =>
    import("@/components/calculators/TaxRegimeCalculator").then((m) => ({
      default: m.TaxRegimeCalculator,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="py-10 text-center text-sm text-[#9B9A94]">
        Loading tax calculator…
      </div>
    ),
  },
);

export default function TaxRegimeLearnEmbed() {
  const [open, setOpen] = useState(false);

  return (
    <LearnToolEmbed
      title="Old vs new tax regime calculator (FY 2025-26)"
      subtitle="Your edge vs plain articles: run the numbers here, then file smarter."
      fullToolHref="/calculators/tax-regime-2026"
      fullToolLabel="Open full-screen tax calculator →"
    >
      {!open ? (
        <div className="rounded-xl border border-dashed border-[#534AB7]/40 bg-[#FAFAFE] px-4 py-8 text-center">
          <p className="text-sm text-[#5F5E5A]">
            Compare old vs new regime with 80C, HRA, NPS, home loan — free,
            instant.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#534AB7] px-5 text-sm font-bold text-white"
          >
            Load calculator in this article
          </button>
          <div className="mt-3">
            <Link
              href="/calculators/tax-regime-2026"
              className="text-xs font-semibold text-[#534AB7] underline"
            >
              Or open the dedicated calculator page
            </Link>
          </div>
        </div>
      ) : (
        <div className="max-h-[70vh] overflow-y-auto rounded-xl border border-[#E8E6F0]">
          <TaxRegimeCalculator />
        </div>
      )}
    </LearnToolEmbed>
  );
}
