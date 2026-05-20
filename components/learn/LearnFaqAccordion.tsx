"use client";

import { useMemo, useState } from "react";

export type LearnFaq = { q: string; a: string };

type LearnFaqAccordionProps = {
  faqs: LearnFaq[];
  subtitle?: string;
  searchPlaceholder?: string;
};

export default function LearnFaqAccordion({
  faqs,
  subtitle = "Clear answers in plain language. Educational guidance only.",
  searchPlaceholder = "Search FAQs",
}: LearnFaqAccordionProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter((f) => `${f.q} ${f.a}`.toLowerCase().includes(q));
  }, [faqs, query]);

  return (
    <section id="faq" className="scroll-mt-24 mt-10" aria-labelledby="faq-heading">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 id="faq-heading" className="text-xl font-semibold text-slate-900">
            FAQs
          </h2>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
        <label className="w-full shrink-0 sm:w-[320px]">
          <span className="sr-only">Search FAQs</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-[#534AB7]/60"
          />
        </label>
      </div>

      <div className="mt-5 space-y-3">
        {filtered.map((f) => (
          <details key={f.q} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 outline-none">
              <span className="flex items-start justify-between gap-4">
                <span>{f.q}</span>
                <span className="mt-0.5 text-slate-400 transition group-open:rotate-180">⌄</span>
              </span>
            </summary>
            <div className="mt-3 text-sm leading-relaxed text-slate-700">{f.a}</div>
          </details>
        ))}
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            No matches. Try a shorter keyword.
          </p>
        ) : null}
      </div>
    </section>
  );
}
