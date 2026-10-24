"use client";

import { SearchResults } from "@/components/search/SearchResults";
import { AppIcon } from "@/components/ui/AppIcon";
import { lockBodyScroll } from "@/lib/bodyScrollLock";
import { trackEvent } from "@/lib/gtag";
import {
  POPULAR_SEARCHES,
  searchEntries,
  type SearchEntry,
  type SearchResult,
} from "@/lib/siteSearch";
import { AnimatePresence, m } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

let indexPromise: Promise<SearchEntry[]> | null = null;

/** Fetches /search-index.json once per page load; retries after a failure. */
function loadSearchIndex(): Promise<SearchEntry[]> {
  indexPromise ??= fetch("/search-index.json")
    .then((r) => {
      if (!r.ok) throw new Error(`search index ${r.status}`);
      return r.json() as Promise<SearchEntry[]>;
    })
    .catch((err) => {
      indexPromise = null;
      throw err;
    });
  return indexPromise;
}

export function useSearchIndex(enabled: boolean) {
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!enabled || entries) return;
    let alive = true;
    setFailed(false);
    loadSearchIndex()
      .then((e) => alive && setEntries(e))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [enabled, entries]);
  return { entries, failed };
}

function isTypingTarget(t: EventTarget | null) {
  if (!(t instanceof HTMLElement)) return false;
  return (
    t.isContentEditable ||
    t.tagName === "INPUT" ||
    t.tagName === "TEXTAREA" ||
    t.tagName === "SELECT"
  );
}

/**
 * Header search: a button that opens a search panel over the page.
 * Ctrl/Cmd+K or "/" opens it from anywhere.
 */
export function SiteSearch() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (k === "/" && !isTypingTarget(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search Finkoin"
        aria-haspopup="dialog"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/75 text-[#534AB7] shadow-sm transition-transform duration-300 hover:scale-105"
      >
        <AppIcon name="search" size={18} color="#534AB7" />
      </button>
      <AnimatePresence>
        {open ? <SearchPanel onClose={() => setOpen(false)} /> : null}
      </AnimatePresence>
    </>
  );
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const { entries, failed } = useSearchIndex(true);

  const results: SearchResult[] = useMemo(
    () => (entries ? searchEntries(entries, query, 24) : []),
    [entries, query],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const unlock = lockBodyScroll();
    inputRef.current?.focus();
    return unlock;
  }, []);

  useEffect(() => {
    document
      .getElementById(`site-search-${activeIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const onPick = (r: SearchResult) => {
    trackEvent("site_search_pick", {
      search_term: query.trim(),
      result_kind: r.kind,
      link_href: r.href,
    });
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const picked = results[activeIndex];
      if (picked) {
        onPick(picked);
        router.push(picked.href);
      } else if (query.trim()) {
        go(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  const trimmed = query.trim();

  return (
    <m.div
      key="site-search"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.14 }}
      className="fixed inset-0 z-[80] flex items-start justify-center bg-slate-900/40 px-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-[2px] sm:pt-[10vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <m.div
        role="dialog"
        aria-modal="true"
        aria-label="Search Finkoin"
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -8, opacity: 0 }}
        transition={{ duration: 0.16 }}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#F0EFF8] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.12)] sm:max-h-[75vh]"
      >
        <div className="flex items-center gap-2 border-b border-[#F0EFF8] px-4 py-3">
          <AppIcon name="search" size={18} color="#534AB7" />
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search features, calculators, Learn and blog"
            aria-label="Search"
            aria-controls="site-search-results"
            aria-activedescendant={
              results[activeIndex] ? `site-search-${activeIndex}` : undefined
            }
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 hover:bg-slate-50"
          >
            <AppIcon name="close" size={16} />
          </button>
        </div>

        <div id="site-search-results" className="overflow-y-auto p-3">
          {!trimmed ? (
            <div className="px-2 py-1">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                Popular
              </p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setQuery(s);
                      inputRef.current?.focus();
                    }}
                    className="rounded-full bg-[#EEEDFE] px-3 py-1.5 text-xs font-semibold text-[#534AB7] hover:bg-[#E3E1FD]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : failed ? (
            <p className="px-2 py-6 text-center text-sm text-slate-600">
              Search could not load. Check your connection and try again.
            </p>
          ) : !entries ? (
            <p className="px-2 py-6 text-center text-sm text-slate-600">
              Loading…
            </p>
          ) : results.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-slate-600">
              Nothing found for “{trimmed}”. Try a shorter word like “tax” or
              “loan”.
            </p>
          ) : (
            <SearchResults
              results={results}
              activeIndex={activeIndex}
              onPick={onPick}
              onHover={setActiveIndex}
              idPrefix="site-search"
            />
          )}
        </div>

        {trimmed && results.length > 0 ? (
          <div className="flex items-center justify-between gap-3 border-t border-[#F0EFF8] px-4 py-2.5 text-xs text-slate-600">
            <span className="hidden sm:inline">↑ ↓ to move, Enter to open</span>
            <button
              type="button"
              onClick={() => go(`/search?q=${encodeURIComponent(trimmed)}`)}
              className="font-semibold text-[#534AB7] hover:underline"
            >
              See all results ›
            </button>
          </div>
        ) : null}
      </m.div>
    </m.div>
  );
}
