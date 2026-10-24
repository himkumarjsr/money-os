"use client";

import { SearchResults } from "@/components/search/SearchResults";
import { AppIcon } from "@/components/ui/AppIcon";
import { trackEvent } from "@/lib/gtag";
import {
  POPULAR_SEARCHES,
  searchEntries,
  type SearchEntry,
} from "@/lib/siteSearch";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

/** Full-page search at /search?q=…, the "See all results" view. */
export default function SearchPageClient({
  entries,
  initialQuery,
}: {
  entries: SearchEntry[];
  initialQuery: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const results = useMemo(
    () => searchEntries(entries, query, 80),
    [entries, query],
  );
  const trimmed = query.trim();

  // Keep ?q= in step with the box so the page can be shared or refreshed.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = trimmed
        ? `/search?q=${encodeURIComponent(trimmed)}`
        : "/search";
      router.replace(next, { scroll: false });
    }, 300);
    return () => clearTimeout(t);
  }, [trimmed, router]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        Search Finkoin
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Features, calculators, Learn guides and blog articles in one place.
      </p>

      <label className="mt-5 flex items-center gap-2 rounded-2xl border border-[#F0EFF8] bg-white px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-[#534AB7]/30">
        <AppIcon name="search" size={18} color="#534AB7" />
        <input
          type="text"
          inputMode="search"
          enterKeyHint="search"
          value={query}
          autoFocus={!initialQuery}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try “tax regime”, “SIP” or “emergency fund”"
          aria-label="Search"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
        />
      </label>

      <div className="mt-6">
        {!trimmed ? (
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setQuery(s)}
                className="rounded-full bg-[#EEEDFE] px-3 py-1.5 text-xs font-semibold text-[#534AB7] hover:bg-[#E3E1FD]"
              >
                {s}
              </button>
            ))}
          </div>
        ) : results.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-600">
            Nothing found for “{trimmed}”. Try a shorter word like “tax” or
            “loan”.
          </p>
        ) : (
          <>
            <p className="mb-3 text-xs text-slate-600">
              {results.length} result{results.length === 1 ? "" : "s"}
            </p>
            <SearchResults
              results={results}
              onPick={(r) =>
                trackEvent("site_search_pick", {
                  search_term: trimmed,
                  result_kind: r.kind,
                  link_href: r.href,
                  surface: "search_page",
                })
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
