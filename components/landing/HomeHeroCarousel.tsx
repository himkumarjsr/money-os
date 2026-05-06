"use client";

import { ButtonLink } from "@/components/ui/button";
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
      href: "/calculators/tax-regime-2026";
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
    title: "Start your financial freedom journey with Finkoin",
    subtitle: "Meet your personal finance advisor. Interactive, step-by-step guidance in minutes.",
    href: "/analyse",
    cta: "Meet your advisor",
  },
  {
    key: "tax",
    title: "New vs old tax regime",
    subtitle: "Compare regimes with HRA, 80C, NPS — built for FY 2025-26 planning.",
    href: "/calculators/tax-regime-2026",
    cta: "Open calculator",
  },
  {
    key: "portfolio",
    title: "Portfolio analysis",
    subtitle: "Review holdings and allocation in one workspace — built for Indian investors.",
    comingSoon: true,
  },
  {
    key: "tracker",
    title: "Expense Tracker",
    subtitle: "Track every rupee. See where money goes. Get insights to spend better.",
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
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      advance();
    };

    const id = window.setInterval(tick, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [advance, paused, reduceMotion]);

  const slide = SLIDES[index];

  const goTo = (i: number) => {
    if (i === index || i < 0 || i >= SLIDES.length) return;
    setIndex(i);
  };

  return (
    <div
      className="mx-auto w-full max-w-4xl rounded-3xl border border-indigo-100/70 bg-white/70 px-4 py-5 backdrop-blur-sm sm:px-6 sm:py-7"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured Finkoin tools"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false);
      }}
    >
      <div className="relative min-h-[280px] sm:min-h-[250px] md:min-h-[230px]">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={slide.key}
            initial={reduceMotion ? false : fade.initial}
            animate={reduceMotion ? false : fade.animate}
            exit={reduceMotion ? undefined : fade.exit}
            transition={{ duration: reduceMotion ? 0 : 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute inset-x-0 top-0 flex flex-col items-center px-1 text-center sm:px-2"
          >
            <div className="relative inline-flex max-w-full flex-col items-center">
              {"isNew" in slide && slide.isNew ? (
                <span className="mb-2 inline-flex rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  NEW
                </span>
              ) : null}
              {"comingSoon" in slide && slide.comingSoon ? (
                <span className="mb-2 inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-800">
                  Coming soon
                </span>
              ) : null}
              <h1 className="text-balance text-3xl font-bold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
                {slide.title}
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm leading-relaxed text-slate-600 sm:mt-6 sm:text-xl sm:leading-relaxed">
                {slide.subtitle}
              </p>
            </div>

            <div className="relative mt-6 flex w-full max-w-md flex-col items-center gap-3 sm:max-w-none sm:flex-row sm:justify-center">
              <div
                className="pointer-events-none absolute inset-0 -z-10 scale-[1.35] rounded-3xl bg-gradient-to-r from-indigo-500/45 via-violet-500/40 to-purple-500/35 opacity-90 blur-2xl"
                aria-hidden
              />
              {"comingSoon" in slide && slide.comingSoon ? (
                <span className="relative z-10 inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-xl border border-slate-300 bg-white/90 px-8 text-sm font-semibold text-slate-500 sm:w-auto">
                  Coming soon
                </span>
              ) : "href" in slide ? (
                <ButtonLink
                  href={slide.href}
                  variant="primary"
                  size="lg"
                  className="relative z-10 w-full bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/35 active:scale-[0.99] sm:w-auto"
                >
                  {slide.cta}
                </ButtonLink>
              ) : null}
            </div>
          </m.div>
        </AnimatePresence>
      </div>

      <div
        className="mt-7 flex flex-wrap items-center justify-center gap-2"
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
                ? "h-2.5 min-w-[28px] rounded-full bg-[#534AB7] px-1 transition"
                : "h-2.5 w-2.5 rounded-full bg-slate-300 transition hover:bg-slate-400"
            }
          />
        ))}
      </div>
    </div>
  );
}
