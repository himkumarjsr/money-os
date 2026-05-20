"use client";

import type { ReactNode } from "react";

export type LearnTocItem = { id: string; label: string };

type LearnArticleLayoutProps = {
  toc: LearnTocItem[];
  asideNote?: ReactNode;
  children: ReactNode;
};

function TocLinks({ toc, className }: { toc: LearnTocItem[]; className?: string }) {
  return (
    <nav className={className} aria-label="Table of contents">
      {toc.map((t) => (
        <a
          key={t.id}
          href={`#${t.id}`}
          className="block rounded-lg px-2 py-1 text-slate-700 hover:bg-slate-50 hover:text-[#534AB7]"
        >
          {t.label}
        </a>
      ))}
    </nav>
  );
}

export function LearnArticleLayout({ toc, asideNote, children }: LearnArticleLayoutProps) {
  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[280px_1fr] lg:gap-10">
      <aside className="hidden lg:block">
        <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">On this page</div>
          <div className="mt-3 space-y-2 text-sm">
            <TocLinks toc={toc} />
          </div>
          {asideNote ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              {asideNote}
            </div>
          ) : null}
        </div>
      </aside>

      <div className="min-w-0">
        <nav
          className="mb-8 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 lg:hidden"
          aria-label="Table of contents"
        >
          <p className="text-sm font-semibold text-slate-900">On this page</p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 text-sm">
            {toc.map((t) => (
              <a
                key={t.id}
                href={`#${t.id}`}
                className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:border-[#534AB7]/40 hover:text-[#534AB7]"
              >
                {t.label}
              </a>
            ))}
          </div>
        </nav>

        {children}
      </div>
    </div>
  );
}
