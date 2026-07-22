"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

/** Hidden for Quick Tools (`from=home`) so close never flashes this block. */
export default function TaxExploreMore() {
  const searchParams = useSearchParams();
  if (searchParams?.get("from") === "home") return null;

  return (
    <section className="mx-auto max-w-6xl border-t border-slate-200 px-4 py-8 sm:px-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Explore more
      </h2>
      <ul className="mt-3 flex flex-wrap gap-4 text-sm font-semibold text-[#534AB7]">
        <li>
          <Link href="/analyse" className="hover:underline">
            Financial health check
          </Link>
        </li>
        <li>
          <Link href="/learn" className="hover:underline">
            Learn personal finance
          </Link>
        </li>
        <li>
          <Link
            href="/blog/80c-deductions-guide-2026"
            className="hover:underline"
          >
            80C deductions guide 2026
          </Link>
        </li>
        <li>
          <Link href="/calculators?calc=sip" className="hover:underline">
            SIP calculator
          </Link>
        </li>
      </ul>
    </section>
  );
}
