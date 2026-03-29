"use client";

import type { LearnArticle, LearnCategory } from "@/lib/learnContent";
import { learnCategories } from "@/lib/learnContent";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useMemo, useState } from "react";

const badgeColors: Record<LearnCategory, string> = {
  Basics: "bg-slate-100 text-slate-800 ring-slate-200",
  Tax: "bg-violet-50 text-violet-800 ring-violet-200",
  Investment: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  Insurance: "bg-sky-50 text-sky-800 ring-sky-200",
  Loans: "bg-amber-50 text-amber-900 ring-amber-200",
  Property: "bg-rose-50 text-rose-900 ring-rose-200",
};

type Props = {
  articles: LearnArticle[];
};

export function LearnHub({ articles }: Props) {
  const [filter, setFilter] = useState<LearnCategory | "All">("All");

  const filtered = useMemo(() => {
    if (filter === "All") return articles;
    return articles.filter((a) => a.category === filter);
  }, [articles, filter]);

  return (
    <div>
      <nav
        className="flex flex-wrap gap-2 border-b border-slate-200 pb-4"
        aria-label="Filter by category"
      >
        <button
          type="button"
          onClick={() => setFilter("All")}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-semibold transition",
            filter === "All"
              ? "bg-[#534AB7] text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200",
          )}
        >
          All
        </button>
        {learnCategories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition",
              filter === c
                ? "bg-[#534AB7] text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200",
            )}
          >
            {c}
          </button>
        ))}
      </nav>

      <ul className="mt-8 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((a) => (
          <li key={a.id}>
            <Link
              href={`/learn/${a.id}`}
              className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#534AB7]/40 hover:shadow-md"
            >
              <span
                className={cn(
                  "inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
                  badgeColors[a.category],
                )}
              >
                {a.category}
              </span>
              <h2 className="mt-3 text-lg font-semibold leading-snug text-slate-900 group-hover:text-[#534AB7]">
                {a.title}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                {a.subtitle}
              </p>
              <p className="mt-4 text-xs font-medium text-slate-500">
                {a.readTime} min read
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-slate-600">
          No articles in this category yet.
        </p>
      ) : null}
    </div>
  );
}
