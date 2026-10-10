"use client";

import { AppIcon } from "@/components/ui/AppIcon";
import { trackCta } from "@/lib/gtag";
import {
  FEATURE_TAGS,
  FEATURE_USPS,
  FINKOIN_FEATURES,
  type FeatureTag,
} from "@/lib/featuresContent";
import Link from "next/link";
import { useMemo, useState } from "react";

const SIGNUP_HREF = "/login?redirect=%2Fanalyse&mode=signup";

/** Only offer filters for tags at least one feature uses. */
const USED_TAGS = FEATURE_TAGS.filter((tag) =>
  FINKOIN_FEATURES.some((f) => f.tags.includes(tag)),
);

export default function FeaturesShowcase() {
  const [activeTag, setActiveTag] = useState<FeatureTag | null>(null);

  const visible = useMemo(
    () =>
      activeTag
        ? FINKOIN_FEATURES.filter((f) => f.tags.includes(activeTag))
        : FINKOIN_FEATURES,
    [activeTag],
  );

  return (
    <div className="relative min-h-dvh overflow-x-clip bg-gradient-to-b from-indigo-50 via-[#F4F2FC] to-violet-50/80 text-slate-900 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-48 h-72 w-72 rounded-full bg-indigo-400/15 blur-3xl"
      />

      <section className="relative mx-auto max-w-3xl px-4 pb-12 pt-10 text-center sm:px-6 sm:pb-16 sm:pt-16">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#534AB7]">
          Why Finkoin
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#1a1824] sm:text-5xl sm:leading-[1.1]">
          One app for your whole money life
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
          Check your financial health, plan with India-ready calculators, track
          every month and split bills with friends. Free to start, built for
          India.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/analyse"
            onClick={() =>
              trackCta({
                cta_name: "Start free health check",
                cta_location: "features_hero",
                href: "/analyse",
              })
            }
            className="inline-flex min-h-12 w-full max-w-xs items-center justify-center rounded-full bg-[#534AB7] px-6 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(83,74,183,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(83,74,183,0.45)] sm:w-auto"
          >
            Start free health check
          </Link>
          <Link
            href="/plans"
            className="inline-flex min-h-12 w-full max-w-xs items-center justify-center rounded-full border border-[#534AB7]/25 bg-white/70 px-6 text-sm font-semibold text-[#534AB7] backdrop-blur-sm transition hover:bg-white sm:w-auto"
          >
            Compare plans
          </Link>
        </div>
      </section>

      <section
        aria-label="What makes Finkoin different"
        className="relative mx-auto max-w-5xl px-4 sm:px-6"
      >
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURE_USPS.map((usp) => (
            <li
              key={usp.title}
              className="rounded-2xl border border-white/40 bg-white/70 p-5 text-left shadow-sm backdrop-blur-md"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#534AB7]/10">
                <AppIcon name={usp.icon} size={20} color="#534AB7" />
              </span>
              <h2 className="mt-3 text-base font-semibold text-[#1a1824]">
                {usp.title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {usp.body}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="relative mx-auto mt-16 max-w-5xl px-4 sm:mt-20 sm:px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight text-[#1a1824]">
          Every feature, explained
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-600">
          Tap a tag to see the features that match.
        </p>

        <div
          className="mt-6 flex flex-wrap justify-center gap-2"
          role="group"
          aria-label="Filter features by tag"
        >
          <TagChip
            label={`All (${FINKOIN_FEATURES.length})`}
            active={activeTag === null}
            onClick={() => setActiveTag(null)}
          />
          {USED_TAGS.map((tag) => (
            <TagChip
              key={tag}
              label={tag}
              active={activeTag === tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            />
          ))}
        </div>

        <p className="sr-only" aria-live="polite">
          Showing {visible.length} features
        </p>

        <ul className="mt-8 grid gap-5 md:grid-cols-2">
          {visible.map((f) => (
            <li
              key={f.id}
              id={f.id}
              className="flex scroll-mt-24 flex-col rounded-2xl border border-white/40 bg-white/75 p-6 shadow-[0_12px_38px_rgba(79,70,229,0.10)] backdrop-blur-md"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#534AB7]/10">
                  <AppIcon name={f.icon} size={22} color="#534AB7" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-600/80">
                    {f.category}
                  </p>
                  <h3 className="text-lg font-semibold leading-snug text-[#1a1824]">
                    {f.name}
                  </h3>
                </div>
              </div>

              <p className="mt-4 text-base font-semibold text-[#534AB7]">
                {f.headline}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {f.body}
              </p>

              <ul className="mt-4 space-y-2">
                {f.highlights.map((h) => (
                  <li
                    key={h}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <span className="mt-0.5 text-[#534AB7]">
                      <AppIcon name="check" size={16} />
                    </span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex flex-wrap gap-1.5">
                {f.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setActiveTag(tag)}
                    className={
                      tag === "Pro"
                        ? "rounded-full bg-[#534AB7] px-2.5 py-0.5 text-[11px] font-semibold text-white"
                        : "rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 transition hover:bg-indigo-100"
                    }
                    aria-label={`Show ${tag} features`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>

              <Link
                href={f.href}
                onClick={() =>
                  trackCta({
                    cta_name: f.cta,
                    cta_location: `features_${f.id}`,
                    href: f.href,
                  })
                }
                className="mt-5 inline-flex items-center gap-1 self-start text-sm font-semibold text-[#534AB7] hover:underline"
              >
                {f.cta}
                <AppIcon name="chevronRight" size={16} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="relative mx-auto mt-16 max-w-2xl px-4 pb-8 text-center sm:mt-20 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-[#1a1824]">
          Start with a free health check
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          It takes about 5 minutes and needs no PAN or Aadhaar.
        </p>
        <Link
          href={SIGNUP_HREF}
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#534AB7] px-8 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(83,74,183,0.35)] transition hover:-translate-y-0.5"
        >
          Create free account
        </Link>
        <p className="mx-auto mt-8 max-w-xl text-xs leading-relaxed text-slate-500">
          Finkoin is an educational tool. It is not a SEBI-registered investment
          adviser and does not sell or recommend insurance or investment
          products. FK are in-app rewards with no cash value. Read the{" "}
          <Link
            href="/legal/disclaimer"
            className="font-semibold text-[#534AB7]"
          >
            disclaimer
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

function TagChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "min-h-9 rounded-full bg-[#534AB7] px-4 text-sm font-semibold text-white shadow-sm"
          : "min-h-9 rounded-full border border-[#534AB7]/20 bg-white/80 px-4 text-sm font-semibold text-[#534AB7] transition hover:bg-white"
      }
    >
      {label}
    </button>
  );
}
