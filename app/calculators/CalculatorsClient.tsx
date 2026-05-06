"use client";

import { lazyCalculatorsById } from "@/components/calculators/lazy-calculators";
import BottomSheet from "@/components/ui/BottomSheet";
import { fadeUp, scaleIn, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/cn";
import { m } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CATEGORIES, type Cat } from "./calculator-config";

function findCategoryForCalc(calcId: string): Cat {
  for (const category of CATEGORIES) {
    if (category.items.some((item) => item.id === calcId)) return category.id;
  }
  return CATEGORIES[0].id;
}

export default function CalculatorsClient({
  initialCalcId,
  urlBaseForTaxCanonical,
}: {
  initialCalcId: string;
  /** When set, keeps tax-regime on this path; other calcs use `/calculators?calc=…`. */
  urlBaseForTaxCanonical?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialCategory = findCategoryForCalc(initialCalcId);
  const [category, setCategory] = useState<Cat>(initialCategory);
  const activeCat = useMemo(() => CATEGORIES.find((c) => c.id === category)!, [category]);
  const [calcId, setCalcId] = useState(initialCalcId);
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeItem = useMemo(() => {
    const item = activeCat.items.find((i) => i.id === calcId);
    return item ?? activeCat.items[0];
  }, [activeCat.items, calcId]);

  const ActiveCalc =
    lazyCalculatorsById[activeItem.id] ?? lazyCalculatorsById[activeCat.items[0].id];

  const updateCalcInUrl = useCallback(
    (nextCalcId: string) => {
      if (urlBaseForTaxCanonical) {
        if (nextCalcId === "tax-regime") {
          router.replace(urlBaseForTaxCanonical, { scroll: false });
          return;
        }
        router.replace(`/calculators?calc=${encodeURIComponent(nextCalcId)}`, { scroll: false });
        return;
      }
      const next = new URLSearchParams(searchParams?.toString() ?? "");
      next.set("calc", nextCalcId);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams, urlBaseForTaxCanonical],
  );

  useEffect(() => {
    if (urlBaseForTaxCanonical && calcId === "tax-regime") {
      if (pathname === urlBaseForTaxCanonical) return;
      router.replace(urlBaseForTaxCanonical, { scroll: false });
      return;
    }
    const currentCalc = searchParams?.get("calc");
    if (currentCalc === calcId) return;
    updateCalcInUrl(calcId);
  }, [calcId, pathname, router, searchParams, updateCalcInUrl, urlBaseForTaxCanonical]);

  return (
    <div className="min-h-dvh bg-white text-slate-900">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <Link href="/" className="text-sm font-semibold text-[#534AB7] hover:underline">
              Back
            </Link>
            <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
              Calculators
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Sliders update results instantly — illustrative, not advice.
            </p>
            <p className="mt-3 text-xs font-medium text-slate-500">
              Includes SIP calculator India, EMI calculator, and income tax planning tools.
            </p>
          </div>
        </div>
        <nav
          className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3 sm:px-6"
          aria-label="Calculator categories"
        >
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                const nextCalc = c.items[0].id;
                setCategory(c.id);
                setCalcId(nextCalc);
                updateCalcInUrl(nextCalc);
              }}
              className={cn(
                "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition",
                category === c.id
                  ? "bg-[#534AB7] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200",
              )}
            >
              {c.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto hidden max-w-6xl gap-8 px-4 py-8 md:grid lg:grid-cols-[280px,1fr] lg:gap-10 lg:px-6 lg:py-10">
        <aside>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {activeCat.label}
          </p>
          <ul className="mt-3 space-y-2">
            {activeCat.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCalcId(item.id);
                    updateCalcInUrl(item.id);
                  }}
                  className={cn(
                    "w-full rounded-2xl border px-4 py-3 text-left transition",
                    calcId === item.id
                      ? "border-[#534AB7] bg-[#534AB7]/10 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300",
                  )}
                >
                  <span className="block text-sm font-semibold text-slate-900">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {item.blurb}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
          aria-live="polite"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            {activeItem.icon ? `${activeItem.icon} ` : ""}
            {activeItem.title}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{activeItem.blurb}</p>
          <div className="mt-8">
            <ActiveCalc />
          </div>
        </section>
      </div>

      <div className="mx-auto px-4 py-6 md:hidden">
        <m.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          {activeCat.label}
        </m.p>
        <m.ul
          className="mt-3 space-y-2"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {activeCat.items.map((item, index) => (
            <m.li key={item.id} variants={fadeUp} transition={{ delay: index * 0.05 }}>
              <button
                type="button"
                onClick={() => {
                  setCalcId(item.id);
                  updateCalcInUrl(item.id);
                  setSheetOpen(true);
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left"
              >
                <span className="block text-sm font-semibold text-slate-900">{item.title}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{item.blurb}</span>
              </button>
            </m.li>
          ))}
        </m.ul>
      </div>

      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={`${activeItem.icon ? `${activeItem.icon} ` : ""}${activeItem.title}`}
        fullscreen
        closeOnBackdrop={false}
        closeOnDrag={false}
      >
        <m.section
          key={calcId}
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          aria-live="polite"
        >
          <p className="text-sm text-slate-600">{activeItem.blurb}</p>
          <div className="mt-5">
            <ActiveCalc />
          </div>
        </m.section>
      </BottomSheet>
    </div>
  );
}

