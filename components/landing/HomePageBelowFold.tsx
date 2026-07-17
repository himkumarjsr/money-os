"use client";

import FeatureCardsCarousel from "@/components/landing/FeatureCardsCarousel";
import Testimonials from "@/components/Testimonials";
import { TrackImpression } from "@/components/TrackImpression";
import AnimateOnScroll from "@/components/ui/AnimateOnScroll";
import { AppIcon } from "@/components/ui/AppIcon";
import { trackCta } from "@/lib/gtag";
import { m, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";

const features = [
  {
    title: "Financial Health Check",
    body: "See exactly where your money goes and what to improve in minutes.",
  },
  {
    title: "Smart Calculators",
    body: "Plan SIP, EMI, tax, and retirement with fast, India-ready tools.",
  },
  {
    title: "AI Action Plan",
    body: "Get exact next steps to fix leaks and grow your wealth faster.",
  },
  {
    title: "Mutual Fund Analysis",
    body: "Break down returns, risk, and allocation before you invest.",
  },
  {
    title: "Monthly Finance Tracker",
    body: "Stay in control with one monthly view of income, spends, and goals.",
  },
  {
    title: "Earn Finkoin Keys",
    body: "Collect FK for consistent use of Finkoin tools — redeem on partner perks when we offer them.",
  },
] as const;

const pricing = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    description: "Financial health check, calculators, and basic guidance.",
    cta: { label: "Start free", href: "/analyse", highlight: false },
  },
  {
    name: "Pro",
    price: "₹49",
    period: "/mo",
    description:
      "AI fix plan plus optional chat with a qualified advisor for clarifications.",
    cta: { label: "Get Pro — ₹49/mo", href: "/plans", highlight: true },
    popular: true,
  },
  {
    name: "Pro Max",
    price: "₹99",
    period: "/mo",
    description:
      "Full workspace: goals, automations, exports, and priority support.",
    cta: { label: "Get Pro Max — ₹99/mo", href: "/plans", highlight: false },
  },
] as const;

export default function HomePageBelowFold() {
  return (
    <>
      <TrackImpression component_id="home_top_picks" threshold={0.18}>
        <section className="relative z-10 border-b border-indigo-100/80 bg-white/55 px-4 py-12 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600/85">
              Start here
            </p>
            <p className="mx-auto mt-2 max-w-xl text-center text-lg font-semibold text-slate-900 sm:text-xl">
              Top picks on Finkoin — advisor, tax, portfolio, and tracking
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Link
                href="/analyse"
                className="group flex flex-col rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-white to-indigo-50/90 p-6 shadow-md shadow-indigo-500/10 transition hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-lg"
                onClick={() =>
                  trackCta({
                    cta_name: "Meet your finance advisor",
                    cta_location: "home_top_picks",
                    href: "/analyse",
                  })
                }
              >
                <span className="text-2xl" aria-hidden>
                  ◉
                </span>
                <span className="mt-3 text-lg font-bold text-slate-900">
                  Meet your finance advisor
                </span>
                <span className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                  Start your financial independence journey with interactive
                  guidance — not just form filling.
                </span>
                <span className="mt-4 text-sm font-semibold text-indigo-700 group-hover:underline">
                  Start guided checkup →
                </span>
              </Link>
              <Link
                href="/calculators/tax-regime-2026"
                className="group flex flex-col rounded-2xl border border-violet-200/80 bg-gradient-to-br from-white to-violet-50/90 p-6 shadow-md shadow-violet-500/10 transition hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-lg"
                onClick={() =>
                  trackCta({
                    cta_name: "Tax regime card",
                    cta_location: "home_top_picks",
                    href: "/calculators/tax-regime-2026",
                  })
                }
              >
                <span className="text-2xl" aria-hidden>
                  <AppIcon name="receipt" size={28} color="#534AB7" />
                </span>
                <span className="mt-3 text-lg font-bold text-slate-900">
                  New vs old tax regime
                </span>
                <span className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                  Compare regimes with HRA, 80C, NPS, and equity gains — built
                  for FY 2025-26 planning.
                </span>
                <span className="mt-4 text-sm font-semibold text-violet-700 group-hover:underline">
                  Open calculator →
                </span>
              </Link>
              <div
                className="relative flex flex-col rounded-2xl border border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm"
                aria-label="Portfolio analysis — coming soon"
              >
                <span className="absolute right-4 top-4 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-800">
                  Coming soon
                </span>
                <span className="text-2xl opacity-80" aria-hidden>
                  <AppIcon name="chart" size={28} color="#534AB7" />
                </span>
                <span className="mt-3 text-lg font-bold text-slate-900">
                  Portfolio analysis
                </span>
                <span className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                  Review holdings and allocation in one workspace — built for
                  Indian investors.
                </span>
                <span className="mt-4 text-sm font-semibold text-slate-500">
                  Coming soon
                </span>
              </div>
              <Link
                href="/tracker"
                className="relative group flex flex-col rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/90 p-6 shadow-md shadow-emerald-500/10 transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-lg"
                onClick={() =>
                  trackCta({
                    cta_name: "Expense tracker card",
                    cta_location: "home_top_picks",
                    href: "/tracker",
                  })
                }
              >
                <span className="absolute right-4 top-4 rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  NEW
                </span>
                <span className="text-2xl" aria-hidden>
                  <AppIcon name="chart" size={28} color="#534AB7" />
                </span>
                <span className="mt-3 text-lg font-bold text-slate-900">
                  Expense Tracker
                </span>
                <span className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                  Track every rupee. See where money goes. Get insights to spend
                  better.
                </span>
                <span className="mt-4 text-sm font-semibold text-emerald-700 group-hover:underline">
                  Start tracking →
                </span>
              </Link>

              <Link
                href="/split"
                className="group flex flex-col rounded-2xl border border-violet-200/80 bg-gradient-to-br from-white to-violet-50/90 p-6 shadow-md shadow-violet-500/10 transition hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-lg"
                onClick={() =>
                  trackCta({
                    cta_name: "FK Split card",
                    cta_location: "home_top_picks",
                    href: "/split",
                  })
                }
              >
                <span className="text-2xl" aria-hidden>
                  <AppIcon name="users" size={28} color="#534AB7" />
                </span>
                <span className="mt-3 text-lg font-bold text-slate-900">
                  FK Split
                </span>
                <span className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                  Split bills, track shared expenses, and settle up — ₹ first.
                  No ads.
                </span>
                <span className="mt-4 text-sm font-semibold text-violet-700 group-hover:underline">
                  Open FK Split →
                </span>
              </Link>
            </div>
          </div>
        </section>
      </TrackImpression>

      <StorySection
        impressionId="home_features_what_you_get"
        className="z-20 border-b border-indigo-100/60 bg-gradient-to-b from-white/80 via-indigo-50/30 to-violet-50/40"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-px max-w-3xl bg-gradient-to-r from-transparent via-indigo-200/80 to-transparent"
          aria-hidden
        />
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <AnimateOnScroll variant="fadeUp" aboveFold>
            <h2 className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600/85 sm:text-sm">
              What you get
            </h2>
          </AnimateOnScroll>
          <AnimateOnScroll variant="fadeUp" aboveFold>
            <p className="mx-auto mt-3 max-w-2xl text-center text-xl font-semibold leading-snug tracking-tight text-slate-900 sm:mt-4 sm:text-2xl sm:leading-snug">
              Understand your money. Take control. Grow it faster.
            </p>
          </AnimateOnScroll>
          <FeatureCardsCarousel features={features} />
        </div>
      </StorySection>

      {/* <StorySection impressionId="home_testimonials" className="z-30 border-b border-indigo-100/50 bg-white/55 backdrop-blur-[2px]">
        <Testimonials />
      </StorySection> */}

      <StorySection
        impressionId="home_pricing"
        className="z-40 border-b border-indigo-100/60 bg-gradient-to-b from-violet-50/50 via-white to-indigo-50/40"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <AnimateOnScroll variant="fadeUp" aboveFold>
            <h2 className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600/85 sm:text-sm">
              Pricing
            </h2>
          </AnimateOnScroll>
          <AnimateOnScroll variant="fadeUp" aboveFold>
            <p className="mx-auto mt-3 max-w-xl text-center text-xl font-semibold leading-snug tracking-tight text-slate-900 sm:mt-4 sm:text-2xl sm:leading-snug">
              Start free. Upgrade when you want a human in the loop.
            </p>
          </AnimateOnScroll>
          <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
            {pricing.map((tier, index) => (
              <AnimateOnScroll
                key={tier.name}
                variant={
                  index === 0
                    ? "slideInLeft"
                    : index === 1
                      ? "fadeUp"
                      : "slideInRight"
                }
                delay={index * 0.1}
                aboveFold
                className={`relative flex flex-col overflow-hidden rounded-2xl border p-6 shadow-lg shadow-indigo-500/[0.06] backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/15 sm:p-7 ${
                  tier.cta.highlight
                    ? "border-indigo-400/70 bg-white/80 ring-2 ring-indigo-500/30"
                    : "border-white/70 bg-white/65"
                }`}
              >
                {"popular" in tier && tier.popular ? (
                  <span className="absolute right-4 top-4 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-md shadow-indigo-500/30">
                    Most Popular
                  </span>
                ) : null}
                <p className="text-sm font-semibold text-slate-600">
                  {tier.name}
                </p>
                <p className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tight text-slate-900">
                    {tier.price}
                  </span>
                  <span className="text-slate-600">{tier.period}</span>
                </p>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">
                  {tier.description}
                </p>
                <Link
                  href={tier.cta.href}
                  onClick={() =>
                    trackCta({
                      cta_name: tier.cta.label,
                      cta_location: "home_pricing",
                      href: tier.cta.href,
                      tier: tier.name,
                    })
                  }
                  className={`relative mt-6 inline-flex min-h-11 items-center justify-center rounded-xl text-center text-sm font-semibold no-underline transition duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.99] ${
                    tier.cta.highlight
                      ? "bg-[#534AB7] text-white shadow-md shadow-indigo-500/25 hover:bg-[#44399a] hover:shadow-indigo-500/35"
                      : "border border-slate-300 bg-white text-slate-900 hover:border-indigo-300 hover:bg-white"
                  } `}
                >
                  {tier.cta.label}
                </Link>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </StorySection>
    </>
  );
}

function StorySection({
  children,
  className,
  impressionId,
}: {
  children: React.ReactNode;
  className?: string;
  impressionId: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 0.45, 1], [0.965, 1, 0.975]);
  const rotate = useTransform(scrollYProgress, [0, 0.5, 1], [-0.45, 0, 0.45]);
  const y = useTransform(scrollYProgress, [0, 1], [30, -24]);
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.12, 0.88, 1],
    [0.55, 1, 1, 0.75],
  );

  return (
    <TrackImpression component_id={impressionId} threshold={0.14}>
      <section
        ref={ref}
        className="relative min-h-[102vh] snap-start scroll-mt-24"
      >
        <m.div
          style={{ scale, rotate, y, opacity }}
          className={`sticky top-20 mx-auto overflow-hidden rounded-[2rem] shadow-[0_24px_80px_rgba(61,44,140,0.12)] ${className ?? ""}`}
        >
          {children}
        </m.div>
      </section>
    </TrackImpression>
  );
}
