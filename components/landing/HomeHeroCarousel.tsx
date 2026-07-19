"use client";

import { ButtonLink } from "@/components/ui/button";
import { trackCta, trackEvent } from "@/lib/gtag";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

const INTERVAL_MS = 3000;

type Slide =
  | {
      key: "score";
      title: string;
      subtitle: string;
      href: "/analyse";
      cta: string;
    }
  | {
      key: "tax";
      title: string;
      subtitle: string;
      href:
        | "/calculators/tax-regime-2026"
        | "/calculators/tax-regime-2026?from=home";
      cta: string;
    }
  | {
      key: "portfolio";
      title: string;
      subtitle: string;
      comingSoon: true;
    }
  | {
      key: "tracker";
      title: string;
      subtitle: string;
      href: "/tracker";
      cta: string;
      isNew: true;
    };

const SLIDES: Slide[] = [
  {
    key: "score",
    title: "Start your financial freedom journey",
    subtitle:
      "Meet your Finkoin advisor—interactive, step-by-step guidance on emergency fund, insurance, and your fix plan in minutes.",
    href: "/analyse",
    cta: "Meet your advisor",
  },
  {
    key: "tax",
    title: "New vs old tax regime",
    subtitle:
      "Compare regimes with HRA, 80C, NPS — built for FY 2025-26 planning.",
    href: "/calculators/tax-regime-2026?from=home",
    cta: "Open calculator",
  },
  {
    key: "portfolio",
    title: "Portfolio analysis",
    subtitle:
      "Review holdings and allocation in one workspace — built for Indian investors.",
    comingSoon: true,
  },
  {
    key: "tracker",
    title: "Expense Tracker",
    subtitle:
      "Track every rupee. See where money goes. Get insights to spend better.",
    href: "/tracker",
    cta: "Start tracking",
    isNew: true,
  },
];

const fade = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -14 },
};

export default function HomeHeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  const advance = useCallback(() => {
    setIndex((i) => (i + 1) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (reduceMotion || paused) return;

    const tick = () => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState !== "visible"
      )
        return;
      advance();
    };

    const id = window.setInterval(tick, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [advance, paused, reduceMotion]);

  const slide = SLIDES[index];

  const goTo = (i: number) => {
    if (i === index || i < 0 || i >= SLIDES.length) return;
    const prevSlide = SLIDES[index];
    const nextSlide = SLIDES[i];
    trackEvent("carousel_select", {
      carousel_id: "home_hero",
      slide_from: prevSlide.key,
      slide_to: nextSlide.key,
      slide_index: i,
    });
    setIndex(i);
  };

  return (
    <div
      className="mx-auto w-full max-w-4xl rounded-xl border border-indigo-100/70 px-2.5 py-2 backdrop-blur-sm sm:rounded-3xl sm:px-6 sm:py-7"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured Finkoin tools"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node))
          setPaused(false);
      }}
    >
      <div className="relative min-h-[96px] sm:min-h-[250px] md:min-h-[230px]">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={slide.key}
            initial={reduceMotion ? false : fade.initial}
            animate={reduceMotion ? false : fade.animate}
            exit={reduceMotion ? undefined : fade.exit}
            transition={{
              duration: reduceMotion ? 0 : 0.38,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="absolute inset-x-0 top-0 flex flex-col items-center px-0.5 text-center sm:px-2"
          >
            <div className="relative inline-flex max-w-full flex-col items-center">
              {"isNew" in slide && slide.isNew ? (
                <span className="mb-0.5 inline-flex rounded-full bg-emerald-700 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-white sm:mb-2 sm:px-2 sm:py-0.5 sm:text-[10px]">
                  NEW
                </span>
              ) : null}
              {"comingSoon" in slide && slide.comingSoon ? (
                <span className="mb-0.5 inline-flex rounded-full bg-slate-200 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-slate-800 sm:mb-2 sm:px-2 sm:py-0.5 sm:text-[10px]">
                  Coming soon
                </span>
              ) : null}
              <h2 className="text-balance text-[13px] font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl sm:leading-[1.08] md:text-5xl">
                {slide.title}
              </h2>
              <p className="mx-auto mt-0.5 hidden max-w-2xl text-pretty text-slate-600 sm:mt-6 sm:block sm:text-xl sm:leading-relaxed">
                {slide.subtitle}
              </p>
            </div>

            <div className="relative mt-2 flex w-full max-w-md flex-col items-center gap-1.5 sm:mt-6 sm:max-w-none sm:flex-row sm:justify-center sm:gap-3">
              <div
                className="pointer-events-none absolute inset-0 -z-10 hidden scale-[1.35] rounded-3xl bg-gradient-to-r from-indigo-500/45 via-violet-500/40 to-purple-500/35 opacity-90 blur-2xl sm:block"
                aria-hidden
              />
              {"comingSoon" in slide && slide.comingSoon ? (
                <span className="relative z-10 inline-flex min-h-8 w-auto cursor-not-allowed items-center justify-center rounded-lg border border-slate-300 bg-white/90 px-3 text-[11px] font-semibold text-slate-500 sm:min-h-12 sm:rounded-xl sm:px-8 sm:text-sm">
                  Coming soon
                </span>
              ) : "href" in slide ? (
                <ButtonLink
                  href={slide.href}
                  variant="primary"
                  size="lg"
                  className="relative z-10 min-h-8 w-auto bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 px-3 py-1.5 text-[11px] shadow-md shadow-indigo-500/25 sm:min-h-12 sm:w-auto sm:px-8 sm:text-sm sm:shadow-lg sm:shadow-indigo-500/30 sm:transition-all sm:duration-300 sm:hover:-translate-y-0.5 sm:hover:scale-[1.02] sm:hover:shadow-xl sm:hover:shadow-indigo-500/35 sm:active:scale-[0.99]"
                  onClick={() =>
                    trackCta({
                      cta_name: slide.cta,
                      cta_location: "home_hero_carousel",
                      slide_key: slide.key,
                      href: slide.href,
                    })
                  }
                >
                  {slide.cta}
                </ButtonLink>
              ) : null}
            </div>
          </m.div>
        </AnimatePresence>
      </div>

      <div
        className="mt-1.5 flex flex-wrap items-center justify-center gap-1 sm:mt-7 sm:gap-2"
        role="tablist"
        aria-label="Choose hero slide"
      >
        {SLIDES.map((s, i) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={
              s.key === "score"
                ? `Personal finance advisor${i === index ? ", current slide" : ""}`
                : s.key === "tax"
                  ? `Tax regime calculator${i === index ? ", current slide" : ""}`
                  : s.key === "portfolio"
                    ? `Portfolio analysis${i === index ? ", current slide" : ""}`
                    : `Expense tracker${i === index ? ", current slide" : ""}`
            }
            onClick={() => goTo(i)}
            className={
              i === index
                ? "h-1.5 min-w-[18px] rounded-full bg-[#534AB7] px-1 transition sm:h-2.5 sm:min-w-[28px]"
                : "h-1.5 w-1.5 rounded-full bg-slate-300 transition hover:bg-slate-400 sm:h-2.5 sm:w-2.5"
            }
          />
        ))}
      </div>
    </div>
  );
}
