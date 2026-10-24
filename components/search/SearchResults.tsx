"use client";

import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import {
  groupSearchResults,
  type SearchKind,
  type SearchResult,
} from "@/lib/siteSearch";
import Link from "next/link";

const KIND_ICON: Record<SearchKind, AppIconName> = {
  feature: "sparkle",
  page: "home",
  calculator: "bulb",
  learn: "notebook",
  blog: "doc",
};

type Props = {
  results: SearchResult[];
  /** Index into `results` of the keyboard-highlighted row, or -1. */
  activeIndex?: number;
  onPick?: (result: SearchResult) => void;
  onHover?: (index: number) => void;
  /** DOM id prefix so the input can point aria-activedescendant at a row. */
  idPrefix?: string;
};

/** Results grouped as Features, App, Calculators, Learn and Blog. */
export function SearchResults({
  results,
  activeIndex = -1,
  onPick,
  onHover,
  idPrefix = "search-result",
}: Props) {
  const groups = groupSearchResults(results);
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.kind} aria-label={group.label}>
          <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            {group.label}
          </p>
          <ul className="space-y-0.5" role="listbox" aria-label={group.label}>
            {group.items.map((item) => {
              const index = results.indexOf(item);
              const active = index === activeIndex;
              return (
                <li
                  key={item.href}
                  id={`${idPrefix}-${index}`}
                  role="option"
                  aria-selected={active}
                >
                  <Link
                    href={item.href}
                    scroll
                    onClick={() => onPick?.(item)}
                    onMouseEnter={() => onHover?.(index)}
                    className={`flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-slate-50 ${active ? "bg-slate-50" : ""}`}
                  >
                    <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEEDFE]">
                      <AppIcon
                        name={KIND_ICON[item.kind]}
                        size={16}
                        color="#534AB7"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">
                        {item.title}
                      </span>
                      <span className="line-clamp-2 block text-xs text-slate-600">
                        {item.description}
                      </span>
                    </span>
                    {item.tag ? (
                      <span className="mt-0.5 hidden shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 sm:inline">
                        {item.tag}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
