"use client";

import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import BrandCoin from "@/components/ui/BrandCoin";
import { lockBodyScroll } from "@/lib/bodyScrollLock";
import { trackCta, trackEvent } from "@/lib/gtag";
import {
  INTRO_TOUR_OPEN_EVENT,
  hasSeenIntroTour,
  markIntroTourSeen,
  setIntroTourOpen,
  shouldAutoShowIntroTour,
} from "@/lib/introTour";
import { FINKOIN_TAGLINE } from "@/lib/seo";
import {
  AnimatePresence,
  MotionConfig,
  animate,
  m,
  useReducedMotion,
} from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

/** First-visit delay: lets the page (and the PWA boot splash) settle first. */
const AUTO_OPEN_DELAY_MS = 1800;

type Scene = {
  id: string;
  eyebrow: string;
  title: string;
  caption: string;
  ms: number;
  link?: { href: string; label: string };
  Visual: () => React.ReactNode;
};

const SCENES: readonly Scene[] = [
  {
    id: "why",
    eyebrow: "Why Finkoin",
    title: "Your whole money life, in one app",
    caption:
      "Your money is spread across banks, apps and spreadsheets. Finkoin puts it in one place and shows you what to do next.",
    ms: 4000,
    Visual: WhyVisual,
  },
  {
    id: "analyse",
    eyebrow: "Analyse",
    title: "Know where you stand in 5 minutes",
    caption:
      "A free health check scores your emergency fund, insurance, loans and savings. No PAN, no Aadhaar.",
    ms: 4500,
    link: { href: "/analyse", label: "Start free check" },
    Visual: AnalyseVisual,
  },
  {
    id: "budget",
    eyebrow: "Budget split",
    title: "Give every rupee a job",
    caption:
      "Finkoin splits your salary into needs, wants, safety, loans and investing, tuned to your stage of life.",
    ms: 4500,
    link: { href: "/analyse", label: "Get my split" },
    Visual: BudgetVisual,
  },
  {
    id: "tracker",
    eyebrow: "Daily expense tracker",
    title: "Log a spend in seconds",
    caption:
      "Add chai, metro or groceries as you go. Your month stays on budget and bills never slip.",
    ms: 4500,
    link: { href: "/tracker", label: "Open tracker" },
    Visual: TrackerVisual,
  },
  {
    id: "split",
    eyebrow: "Settle Up",
    title: "Split trips and flats, no awkward maths",
    caption:
      "Add who paid and Finkoin works out who owes whom, in the fewest payments.",
    ms: 4500,
    link: { href: "/split", label: "Start a group" },
    Visual: SplitVisual,
  },
  {
    id: "manage",
    eyebrow: "Manage your finances",
    title: "Net worth, goals and bills together",
    caption:
      "See what you own and owe, track goals like a home or car, and get reminded before every due date.",
    ms: 4500,
    link: { href: "/investments", label: "Add assets" },
    Visual: ManageVisual,
  },
  {
    id: "start",
    eyebrow: "Free to start",
    title: FINKOIN_TAGLINE,
    caption:
      "Start with the free health check. It takes about 5 minutes and needs no documents.",
    ms: 3500,
    Visual: StartVisual,
  },
];

const TOTAL_SECONDS = Math.round(
  SCENES.reduce((sum, s) => sum + s.ms, 0) / 1000,
);

/**
 * "Why Finkoin" intro video: an animated, auto-playing tour of the key
 * features. Plays once for a new visitor on home or dashboard; any
 * {@link IntroTourButton} opens it again.
 */
export default function IntroTourVideo() {
  const pathname = usePathname();
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    if (
      !shouldAutoShowIntroTour(pathname, {
        seen: hasSeenIntroTour(),
        automated: navigator.webdriver === true,
      })
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      if (!hasSeenIntroTour()) setSource("auto");
    }, AUTO_OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ source?: string }>).detail;
      setSource(detail?.source ?? "button");
    };
    window.addEventListener(INTRO_TOUR_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(INTRO_TOUR_OPEN_EVENT, onOpen);
  }, []);

  if (!source) return null;
  return <IntroTourPlayer source={source} onClose={() => setSource(null)} />;
}

function IntroTourPlayer({
  source,
  onClose,
}: {
  source: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const scene = SCENES[index]!;
  const isLast = index === SCENES.length - 1;

  useEffect(() => {
    markIntroTourSeen();
    setIntroTourOpen(true);
    const unlock = lockBodyScroll();
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    trackEvent("intro_tour_open", { source });
    return () => {
      setIntroTourOpen(false);
      unlock();
      previous?.focus?.();
    };
  }, [source]);

  const close = useCallback(() => {
    trackEvent("intro_tour_close", {
      source,
      scene_id: SCENES[index]!.id,
      scene_index: index,
    });
    onClose();
  }, [index, onClose, source]);

  const go = useCallback((delta: number) => {
    setIndex((i) => Math.min(SCENES.length - 1, Math.max(0, i + delta)));
  }, []);

  const replay = () => {
    setIndex(0);
    setPaused(false);
  };

  const onSceneEnd = () => {
    if (isLast) {
      trackEvent("intro_tour_complete", { source });
      return;
    }
    go(1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowRight") {
      go(1);
    } else if (e.key === "ArrowLeft") {
      go(-1);
    } else if (e.key === "Tab") {
      // Keep focus inside the dialog.
      const items = dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]), a[href]",
      );
      if (!items?.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const onLink = (href: string, label: string) => {
    trackCta({ cta_name: label, cta_location: `intro_tour_${scene.id}`, href });
    onClose();
  };

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="fk-intro fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 px-4 py-4 backdrop-blur-[3px]"
        onClick={close}
        role="presentation"
      >
        <m.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="fk-intro-title"
          aria-describedby="fk-intro-caption"
          onKeyDown={onKeyDown}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative flex max-h-full w-full max-w-[400px] flex-col overflow-hidden rounded-[24px] border border-[var(--fi-border)] bg-[var(--fi-card)] shadow-[0_24px_80px_rgba(20,16,60,0.45)]"
        >
          <div className="relative shrink-0 [background:var(--fi-stage)]">
            <div
              aria-hidden
              className="pointer-events-none absolute -left-10 top-6 h-32 w-32 rounded-full bg-[rgba(255,255,255,0.10)] blur-2xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -right-8 bottom-4 h-36 w-36 rounded-full bg-[rgba(255,255,255,0.10)] blur-2xl"
            />

            <div className="relative z-10 flex items-center gap-2 px-4 pt-3">
              <div className="flex flex-1 gap-1" aria-hidden>
                {SCENES.map((s, i) => (
                  <div
                    key={s.id}
                    className="h-[3px] flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.25)]"
                  >
                    {i < index ? (
                      <div className="h-full w-full bg-[var(--fi-on-stage)]" />
                    ) : i === index ? (
                      <div
                        key={`${s.id}-${index}`}
                        onAnimationEnd={onSceneEnd}
                        className="h-full w-full origin-left bg-[var(--fi-on-stage)]"
                        style={{
                          animation: `fk-intro-fill ${s.ms}ms linear forwards`,
                          animationPlayState: paused ? "paused" : "running",
                        }}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label="Close the intro video"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(255,255,255,0.15)] text-[var(--fi-on-stage)] outline-none transition hover:bg-[rgba(255,255,255,0.25)] focus-visible:ring-2 focus-visible:ring-[var(--fi-on-stage)]"
              >
                <AppIcon name="close" size={15} />
              </button>
            </div>

            <div className="relative z-10 h-[268px] sm:h-[296px]">
              <AnimatePresence mode="wait" initial={false}>
                <m.div
                  key={scene.id}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.28 }}
                  className="absolute inset-0 flex items-center justify-center px-5 pb-4 pt-2"
                >
                  <scene.Visual />
                </m.div>
              </AnimatePresence>
              {/* Tap the left third to go back, the rest to skip ahead. */}
              <button
                type="button"
                tabIndex={-1}
                aria-hidden
                onClick={() => go(-1)}
                className="absolute inset-y-0 left-0 w-1/3 cursor-w-resize"
              />
              <button
                type="button"
                tabIndex={-1}
                aria-hidden
                onClick={() => go(1)}
                className="absolute inset-y-0 right-0 w-2/3 cursor-e-resize"
              />
            </div>
          </div>

          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-5 pb-5 pt-4">
            <div aria-live="polite">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--fi-primary-text)]">
                {scene.eyebrow}
                <span className="ml-2 font-semibold normal-case tracking-normal text-[var(--fi-muted)]">
                  {index + 1} of {SCENES.length}
                </span>
              </p>
              <h2
                id="fk-intro-title"
                className="mt-1 text-lg font-bold leading-snug text-[var(--fi-text)]"
              >
                {scene.title}
              </h2>
              <p
                id="fk-intro-caption"
                className="mt-1 text-[13.5px] leading-relaxed text-[var(--fi-text-2)]"
              >
                {scene.caption}
              </p>
            </div>

            {isLast ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/analyse"
                  onClick={() => onLink("/analyse", "Start free health check")}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-4 text-sm font-semibold text-[var(--fi-on-cta)] shadow-[0_8px_20px_rgba(83,74,183,0.3)] [background:var(--fi-cta)]"
                >
                  Start free health check
                </Link>
                <Link
                  href="/features"
                  onClick={() => onLink("/features", "See all features")}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-[var(--fi-border)] bg-[var(--fi-surface)] px-4 text-sm font-semibold text-[var(--fi-primary-text)]"
                >
                  See all features
                </Link>
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <ControlButton
                label="Previous"
                onClick={() => go(-1)}
                disabled={index === 0}
              >
                <Chevron dir="left" />
              </ControlButton>
              {isLast ? (
                <ControlButton label="Replay" onClick={replay}>
                  <AppIcon name="repeat" size={16} />
                </ControlButton>
              ) : (
                <ControlButton
                  label={paused ? "Play" : "Pause"}
                  onClick={() => setPaused((p) => !p)}
                >
                  {paused ? <PlayGlyph /> : <PauseGlyph />}
                </ControlButton>
              )}
              <ControlButton
                label="Next"
                onClick={() => go(1)}
                disabled={isLast}
              >
                <Chevron dir="right" />
              </ControlButton>
              {scene.link ? (
                <Link
                  href={scene.link.href}
                  onClick={() => onLink(scene.link!.href, scene.link!.label)}
                  className="ml-auto inline-flex min-h-9 items-center rounded-full bg-[var(--fi-primary-light)] px-3.5 text-[13px] font-semibold text-[var(--fi-primary-text)]"
                >
                  {scene.link.label} →
                </Link>
              ) : isLast ? null : (
                <span className="ml-auto text-xs text-[var(--fi-muted)]">
                  {TOTAL_SECONDS}-sec tour
                </span>
              )}
            </div>
          </div>
        </m.div>
      </div>
    </MotionConfig>
  );
}

function ControlButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--fi-border)] bg-[var(--fi-surface)] text-[var(--fi-text)] transition hover:border-[var(--fi-primary)] disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PlayGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"
        fill="currentColor"
      />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <rect x="5" y="4" width="5" height="16" rx="1.5" fill="currentColor" />
      <rect x="14" y="4" width="5" height="16" rx="1.5" fill="currentColor" />
    </svg>
  );
}

/* ---------- Scene visuals ---------- */

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.4, ease: "easeOut" as const },
});

function useCountUp(to: number, delay = 0, duration = 1.2): number {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? to : 0);
  useEffect(() => {
    if (reduce) {
      setValue(to);
      return;
    }
    const controls = animate(0, to, {
      delay,
      duration,
      ease: "easeOut",
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [to, delay, duration, reduce]);
  return value;
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** The white "app screen" card the feature scenes play inside. */
function PhoneCard({ children }: { children: React.ReactNode }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-[290px] rounded-[20px] border border-[var(--fi-border)] bg-[var(--fi-card)] p-4 text-[var(--fi-text)] shadow-[0_16px_40px_rgba(10,8,40,0.35)]"
    >
      {children}
    </m.div>
  );
}

function Pill({
  tone,
  icon,
  children,
}: {
  tone: "success" | "warning" | "primary";
  icon?: AppIconName;
  children: React.ReactNode;
}) {
  const tones = {
    success: "bg-[var(--fi-success-light)] text-[var(--fi-success)]",
    warning: "bg-[var(--fi-warning-light)] text-[var(--fi-warning)]",
    primary: "bg-[var(--fi-primary-light)] text-[var(--fi-primary-text)]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}
    >
      {icon ? <AppIcon name={icon} size={12} strokeWidth={2.2} /> : null}
      {children}
    </span>
  );
}

function WhyVisual() {
  const chips: { icon: AppIconName; label: string }[] = [
    { icon: "chart", label: "Analyse" },
    { icon: "wallet", label: "Budget" },
    { icon: "notebook", label: "Track" },
    { icon: "users", label: "Split" },
    { icon: "target", label: "Goals" },
    { icon: "calendar", label: "Bills" },
  ];
  return (
    <div className="flex flex-col items-center text-[var(--fi-on-stage)]">
      <m.div
        initial={{ opacity: 0, rotateY: -360, scale: 0.6 }}
        animate={{ opacity: 1, rotateY: 0, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.3, 0.7, 0.3, 1] }}
        style={{ perspective: 600 }}
        className="drop-shadow-[0_12px_28px_rgba(10,8,40,0.45)]"
      >
        <BrandCoin size={76} decorative />
      </m.div>
      <m.p {...rise(0.7)} className="mt-3 text-2xl font-bold tracking-tight">
        Finkoin
      </m.p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {chips.map((c, i) => (
          <m.span
            key={c.label}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.1 + i * 0.22, type: "spring", bounce: 0.45 }}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.20)] bg-[rgba(255,255,255,0.15)] px-3 py-1.5 text-xs font-semibold backdrop-blur-sm"
          >
            <AppIcon name={c.icon} size={13} />
            {c.label}
          </m.span>
        ))}
      </div>
    </div>
  );
}

function AnalyseVisual() {
  const score = useCountUp(72, 0.35, 1.4);
  const rows: {
    label: string;
    value: string;
    tone: "success" | "warning";
  }[] = [
    { label: "Emergency fund", value: "4 of 6 months", tone: "success" },
    { label: "Term cover", value: "Gap found", tone: "warning" },
    { label: "Loans", value: "Healthy", tone: "success" },
  ];
  return (
    <PhoneCard>
      <div className="flex items-center gap-4">
        <div className="relative h-[84px] w-[84px] shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="var(--fi-primary-light)"
              strokeWidth="10"
            />
            <m.circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="var(--fi-primary)"
              strokeWidth="10"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 0.72 }}
              transition={{ delay: 0.35, duration: 1.4, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold leading-none">{score}</span>
            <span className="text-[10px] text-[var(--fi-muted)]">/ 100</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--fi-muted)]">
            Money score
          </p>
          <m.div {...rise(1.6)} className="mt-1">
            <Pill tone="success" icon="check">
              On track
            </Pill>
          </m.div>
        </div>
      </div>
      <ul className="mt-3 space-y-1.5">
        {rows.map((r, i) => (
          <m.li
            key={r.label}
            {...rise(1.9 + i * 0.35)}
            className="flex items-center justify-between rounded-xl bg-[var(--fi-surface)] px-3 py-2 text-[12.5px]"
          >
            <span className="font-medium">{r.label}</span>
            <Pill tone={r.tone} icon={r.tone === "success" ? "check" : "alert"}>
              {r.value}
            </Pill>
          </m.li>
        ))}
      </ul>
    </PhoneCard>
  );
}

const BUCKETS = [
  { label: "Needs", pct: 30, color: "#6C63E0" },
  { label: "Wants", pct: 5, color: "#EC6FA7" },
  { label: "Safety", pct: 10, color: "#2BB673" },
  { label: "Loans", pct: 30, color: "#F08A4B" },
  { label: "Invest", pct: 25, color: "#3B9BF0" },
] as const;

function BudgetVisual() {
  const income = 80_000;
  return (
    <PhoneCard>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--fi-muted)]">
        Monthly take-home
      </p>
      <p className="text-xl font-bold">{inr(income)}</p>
      <div className="mt-3 flex h-3.5 w-full overflow-hidden rounded-full bg-[var(--fi-surface)]">
        {BUCKETS.map((b, i) => (
          <m.div
            key={b.label}
            initial={{ width: 0 }}
            animate={{ width: `${b.pct}%` }}
            transition={{
              delay: 0.4 + i * 0.3,
              duration: 0.5,
              ease: "easeOut",
            }}
            style={{ background: b.color }}
            className="h-full"
          />
        ))}
      </div>
      <ul className="mt-3 space-y-1">
        {BUCKETS.map((b, i) => (
          <m.li
            key={b.label}
            {...rise(0.5 + i * 0.3)}
            className="flex items-center gap-2 text-[12.5px]"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: b.color }}
            />
            <span className="flex-1 font-medium">{b.label}</span>
            <span className="w-9 text-right text-[var(--fi-muted)]">
              {b.pct}%
            </span>
            <span className="w-[70px] text-right font-semibold tabular-nums">
              {inr((income * b.pct) / 100)}
            </span>
          </m.li>
        ))}
      </ul>
    </PhoneCard>
  );
}

function TrackerVisual() {
  const spent = useCountUp(18_420, 1.6, 1);
  const entries: {
    icon: AppIconName;
    label: string;
    cat: string;
    amount: number;
  }[] = [
    { icon: "coin", label: "Chai & samosa", cat: "Food", amount: 60 },
    { icon: "briefcase", label: "Metro to office", cat: "Travel", amount: 45 },
    { icon: "home", label: "Groceries", cat: "Needs", amount: 1_240 },
  ];
  return (
    <PhoneCard>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">Today</p>
        <m.span {...rise(2.6)}>
          <Pill tone="warning" icon="flame">
            7-day streak
          </Pill>
        </m.span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {entries.map((e, i) => (
          <m.li
            key={e.label}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.4, type: "spring", bounce: 0.3 }}
            className="flex items-center gap-2.5 rounded-xl bg-[var(--fi-surface)] px-2.5 py-2"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--fi-primary-light)] text-[var(--fi-primary-text)]">
              <AppIcon name={e.icon} size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-semibold">
                {e.label}
              </span>
              <span className="block text-[10.5px] text-[var(--fi-muted)]">
                {e.cat}
              </span>
            </span>
            <span className="text-[12.5px] font-semibold tabular-nums">
              −{inr(e.amount)}
            </span>
          </m.li>
        ))}
      </ul>
      <m.div {...rise(1.5)} className="mt-3">
        <div className="flex items-baseline justify-between text-[11.5px]">
          <span className="text-[var(--fi-muted)]">This month</span>
          <span>
            <b className="tabular-nums">{inr(spent)}</b>
            <span className="text-[var(--fi-muted)]"> of {inr(30_000)}</span>
          </span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--fi-surface)]">
          <m.div
            initial={{ width: 0 }}
            animate={{ width: "61%" }}
            transition={{ delay: 1.6, duration: 1, ease: "easeOut" }}
            className="h-full rounded-full bg-[var(--fi-success)]"
          />
        </div>
      </m.div>
    </PhoneCard>
  );
}

function SplitVisual() {
  const people = [
    { name: "Rahul", tint: "#6C63E0" },
    { name: "Aman", tint: "#F08A4B" },
    { name: "Priya", tint: "#2BB673" },
  ];
  return (
    <PhoneCard>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold">Goa trip</p>
          <p className="text-[11px] text-[var(--fi-muted)]">3 friends</p>
        </div>
        <div className="flex -space-x-2">
          {people.map((p, i) => (
            <m.span
              key={p.name}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.15, type: "spring" }}
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--fi-card)] text-[11px] font-bold text-white"
              style={{ background: p.tint }}
            >
              {p.name[0]}
            </m.span>
          ))}
        </div>
      </div>
      <m.div
        {...rise(0.7)}
        className="mt-3 rounded-xl bg-[var(--fi-surface)] px-3 py-2"
      >
        <div className="flex items-center justify-between text-[12.5px]">
          <span className="font-semibold">Villa stay</span>
          <span className="font-semibold tabular-nums">{inr(6_000)}</span>
        </div>
        <p className="text-[11px] text-[var(--fi-muted)]">
          Rahul paid · split equally, {inr(2_000)} each
        </p>
      </m.div>
      <m.p
        {...rise(1.6)}
        className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--fi-muted)]"
      >
        Settle up
      </m.p>
      <ul className="mt-1 space-y-1.5">
        {["Aman", "Priya"].map((from, i) => (
          <m.li
            key={from}
            {...rise(1.9 + i * 0.4)}
            className="flex items-center gap-2 text-[12.5px]"
          >
            <span className="font-semibold">{from}</span>
            <m.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 2.1 + i * 0.4, duration: 0.4 }}
              className="h-px flex-1 origin-left bg-[var(--fi-primary)]"
            />
            <span className="font-semibold">Rahul</span>
            <span className="w-[56px] text-right font-semibold tabular-nums text-[var(--fi-primary-text)]">
              {inr(2_000)}
            </span>
          </m.li>
        ))}
      </ul>
      <m.div {...rise(3)} className="mt-2.5">
        <Pill tone="success" icon="check">
          Just 2 payments, all square
        </Pill>
      </m.div>
    </PhoneCard>
  );
}

function ManageVisual() {
  const netWorth = useCountUp(12_40_000, 0.3, 1.4);
  const goals = [
    { label: "Home down payment", pct: 42 },
    { label: "New car", pct: 70 },
  ];
  return (
    <PhoneCard>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--fi-muted)]">
        Net worth
      </p>
      <div className="flex items-baseline gap-2">
        <p className="text-xl font-bold tabular-nums">{inr(netWorth)}</p>
        <m.span {...rise(1.6)}>
          <Pill tone="success" icon="trending">
            +8% this year
          </Pill>
        </m.span>
      </div>
      <ul className="mt-3 space-y-2">
        {goals.map((g, i) => (
          <m.li key={g.label} {...rise(1.2 + i * 0.35)}>
            <div className="flex justify-between text-[12px]">
              <span className="font-medium">{g.label}</span>
              <span className="text-[var(--fi-muted)]">{g.pct}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--fi-surface)]">
              <m.div
                initial={{ width: 0 }}
                animate={{ width: `${g.pct}%` }}
                transition={{ delay: 1.4 + i * 0.35, duration: 0.8 }}
                className="h-full rounded-full bg-[var(--fi-primary)]"
              />
            </div>
          </m.li>
        ))}
      </ul>
      <m.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0, rotate: [0, -2, 2, 0] }}
        transition={{ delay: 2.4, duration: 0.6 }}
        className="mt-3 flex items-center gap-2.5 rounded-xl border border-[var(--fi-border)] bg-[var(--fi-warning-light)] px-3 py-2"
      >
        <span className="text-[var(--fi-warning)]">
          <AppIcon name="bell" size={16} />
        </span>
        <span className="min-w-0 flex-1 text-[12px]">
          <b>Credit card bill</b>
          <span className="block text-[11px] text-[var(--fi-text-2)]">
            Due in 3 days · {inr(14_500)}
          </span>
        </span>
      </m.div>
    </PhoneCard>
  );
}

function StartVisual() {
  const steps = ["Know it", "Fix it", "Grow it"];
  return (
    <div className="flex flex-col items-center text-[var(--fi-on-stage)]">
      <m.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="drop-shadow-[0_12px_28px_rgba(10,8,40,0.45)]"
      >
        <BrandCoin size={64} spinning decorative />
      </m.div>
      <ul className="mt-5 flex flex-col gap-2">
        {steps.map((s, i) => (
          <m.li
            key={s}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.4 }}
            className="flex items-center gap-2.5 text-xl font-bold tracking-tight"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(255,255,255,0.20)]">
              <AppIcon name="check" size={14} strokeWidth={2.6} />
            </span>
            {s}.
          </m.li>
        ))}
      </ul>
      <m.p {...rise(1.8)} className="mt-4 text-xs font-medium opacity-80">
        Free · No PAN · Built for India
      </m.p>
    </div>
  );
}
