"use client";

import { lazyCalculatorsById } from "@/components/calculators/lazy-calculators";
import { AppIcon } from "@/components/ui/AppIcon";
import BottomSheet from "@/components/ui/BottomSheet";
import { cn } from "@/lib/cn";
import { trackToolOpen } from "@/lib/gtag";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

  const fromHome = searchParams?.get("from") === "home";
  const initialCategory = findCategoryForCalc(initialCalcId);
  const [category, setCategory] = useState<Cat>(initialCategory);
  const activeCat = useMemo(
    () => CATEGORIES.find((c) => c.id === category)!,
    [category],
  );
  const [calcId, setCalcId] = useState(initialCalcId);
  const [sheetOpen, setSheetOpen] = useState(false);
  const lastDeepLinkCalc = useRef<string | null>(null);
  /** Once user picks a calc from the hub list, close should stay on calculators. */
  const openedFromHub = useRef(false);

  const activeItem = useMemo(() => {
    const item = activeCat.items.find((i) => i.id === calcId);
    return item ?? activeCat.items[0];
  }, [activeCat.items, calcId]);

  const ActiveCalc =
    lazyCalculatorsById[activeItem.id] ??
    lazyCalculatorsById[activeCat.items[0].id];

  const goHomeFast = useCallback(() => {
    router.replace("/");
  }, [router]);

  const buildCalcUrl = useCallback(
    (nextCalcId: string, keepFromHome: boolean) => {
      if (urlBaseForTaxCanonical && nextCalcId === "tax-regime") {
        return keepFromHome
          ? `${urlBaseForTaxCanonical}?from=home`
          : urlBaseForTaxCanonical;
      }
      const base =
        urlBaseForTaxCanonical && nextCalcId !== "tax-regime"
          ? "/calculators"
          : pathname || "/calculators";
      const next = new URLSearchParams();
      next.set("calc", nextCalcId);
      if (keepFromHome) next.set("from", "home");
      return `${base}?${next.toString()}`;
    },
    [pathname, urlBaseForTaxCanonical],
  );

  const updateCalcInUrl = useCallback(
    (nextCalcId: string, keepFromHome = false) => {
      router.replace(buildCalcUrl(nextCalcId, keepFromHome), { scroll: false });
    },
    [buildCalcUrl, router],
  );

  useEffect(() => {
    trackToolOpen({
      tool_category: "calculator",
      tool_id: activeItem.id,
      tool_name: activeItem.title,
    });
  }, [activeItem.id, activeItem.title]);

  // Deep links (?calc=sip|swp|emi) select category AND open the mobile sheet once per calc id.
  useEffect(() => {
    const fromUrl = searchParams?.get("calc") ?? initialCalcId;
    if (!fromUrl) return;
    setCategory(findCategoryForCalc(fromUrl));
    setCalcId(fromUrl);
    if (lastDeepLinkCalc.current === fromUrl) return;
    lastDeepLinkCalc.current = fromUrl;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches
    ) {
      setSheetOpen(true);
    }
  }, [initialCalcId, searchParams]);

  useEffect(() => {
    if (urlBaseForTaxCanonical && calcId === "tax-regime") {
      const expected = fromHome
        ? `${urlBaseForTaxCanonical}?from=home`
        : urlBaseForTaxCanonical;
      const current = `${pathname}${searchParams?.toString() ? `?${searchParams}` : ""}`;
      if (
        pathname === urlBaseForTaxCanonical &&
        (fromHome
          ? searchParams?.get("from") === "home"
          : !searchParams?.get("from"))
      ) {
        return;
      }
      if (current !== expected) {
        router.replace(expected, { scroll: false });
      }
      return;
    }
    const currentCalc = searchParams?.get("calc");
    if (currentCalc === calcId) return;
    // Preserve from=home only for the initial deep-link session, not hub picks.
    updateCalcInUrl(calcId, fromHome && !openedFromHub.current);
  }, [
    calcId,
    fromHome,
    pathname,
    router,
    searchParams,
    updateCalcInUrl,
    urlBaseForTaxCanonical,
  ]);

  const selectCalcFromHub = (nextCalcId: string, openSheet: boolean) => {
    openedFromHub.current = true;
    setCategory(findCategoryForCalc(nextCalcId));
    setCalcId(nextCalcId);
    updateCalcInUrl(nextCalcId, false);
    if (openSheet) setSheetOpen(true);
  };

  const handleSheetClose = () => {
    setSheetOpen(false);
    // Home deep-link: closing the calculator returns to home, not the hub.
    if (fromHome && !openedFromHub.current) {
      goHomeFast();
      return;
    }
    // Hub browse: stay on calculators list without calc query noise optional.
  };

  const handleBack = () => {
    if (sheetOpen) {
      handleSheetClose();
      return;
    }
    if (fromHome && !openedFromHub.current) {
      goHomeFast();
      return;
    }
    // Fast path — avoid slow history.back() on this heavy page.
    goHomeFast();
  };

  return (
    <div className="min-h-0 bg-white text-slate-900 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <button
              type="button"
              onClick={handleBack}
              aria-label="Back"
              className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-[#534AB7]"
            >
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#EEEDFE] text-base font-bold leading-none"
                aria-hidden
              >
                ←
              </span>
              <span>Back</span>
            </button>
            <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
              Calculators
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Sliders update results instantly — illustrative, not advice.
            </p>
            <p className="mt-3 text-xs font-medium text-slate-500">
              Includes SIP calculator India, EMI calculator, and income tax
              planning tools.
            </p>
          </div>
        </div>
        <nav
          className="mx-auto flex max-w-6xl gap-2 overflow-x-auto overscroll-x-contain px-4 pb-3 [-webkit-overflow-scrolling:touch] sm:px-6"
          aria-label="Calculator categories"
        >
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                selectCalcFromHub(c.items[0].id, false);
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
                  onClick={() => selectCalcFromHub(item.id, false)}
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
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
            {activeItem.icon ? (
              <AppIcon name={activeItem.icon} size={20} color="#534AB7" />
            ) : null}
            {activeItem.title}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{activeItem.blurb}</p>
          <div className="mt-8">
            <ActiveCalc />
          </div>
        </section>
      </div>

      <div className="mx-auto px-4 py-6 md:hidden">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {activeCat.label}
        </p>
        <ul className="mt-3 space-y-2">
          {activeCat.items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => selectCalcFromHub(item.id, true)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left"
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
      </div>

      <BottomSheet
        isOpen={sheetOpen}
        onClose={handleSheetClose}
        title={activeItem.title}
        fullscreen
        closeOnBackdrop={false}
        closeOnDrag={false}
      >
        <section
          key={calcId}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          aria-live="polite"
        >
          <p className="text-sm text-slate-600">{activeItem.blurb}</p>
          <div className="mt-5 min-w-0">
            <ActiveCalc />
          </div>
        </section>
      </BottomSheet>
    </div>
  );
}
