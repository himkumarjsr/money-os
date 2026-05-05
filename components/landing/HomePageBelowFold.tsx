"use client";

import FeatureCardsCarousel from "@/components/landing/FeatureCardsCarousel";
import AnimateOnScroll from "@/components/ui/AnimateOnScroll";
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
    title: "Pay Insurance with Finkoins",
    body: "Use earned Finkoins to reduce your insurance payment burden.",
  },
] as const;

const testimonials = [
  {
    quote:
      "The health check spelled out what I was ignoring — overspending on UPI and no emergency fund. The fix list felt doable.",
    name: "Ananya Krishnan",
    city: "Bengaluru",
    role: "Product designer",
  },
  {
    quote:
      "I use the SIP and EMI calculators before every decision. Finally one place that doesn’t push random products on me.",
    name: "Rohit Verma",
    city: "Pune",
    role: "IT consultant",
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
    description: "AI fix plan plus optional chat with a qualified advisor for clarifications.",
    cta: { label: "Get Pro — ₹49/mo", href: "/plans", highlight: true },
    popular: true,
  },
  {
    name: "Pro Max",
    price: "₹99",
    period: "/mo",
    description: "Full workspace: goals, automations, exports, and priority support.",
    cta: { label: "Get Pro Max — ₹99/mo", href: "/plans", highlight: false },
  },
] as const;

export default function HomePageBelowFold() {
  return (
    <>
      <section className="relative z-10 border-b border-indigo-100/80 bg-white/55 px-4 py-12 backdrop-blur-md sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600/85">
            Start here
          </p>
          <p className="mx-auto mt-2 max-w-xl text-center text-lg font-semibold text-slate-900 sm:text-xl">
            Four ways to level up your money this week
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/analyse"
              className="group flex flex-col rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-white to-indigo-50/90 p-6 shadow-md shadow-indigo-500/10 transition hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-lg"
            >
              <span className="text-2xl" aria-hidden>
                ◉
              </span>
              <span className="mt-3 text-lg font-bold text-slate-900">Financial health check</span>
              <span className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                Answer a short questionnaire — see gaps in emergency fund, insurance, debt, and investing.
              </span>
              <span className="mt-4 text-sm font-semibold text-indigo-700 group-hover:underline">
                Start free →
              </span>
            </Link>
            <Link
              href="/calculators/tax-regime-2026"
              className="group flex flex-col rounded-2xl border border-violet-200/80 bg-gradient-to-br from-white to-violet-50/90 p-6 shadow-md shadow-violet-500/10 transition hover:-translate-y-0.5 hover:border-violet-400 hover:shadow-lg"
            >
              <span className="text-2xl" aria-hidden>
                🧾
              </span>
              <span className="mt-3 text-lg font-bold text-slate-900">Tax regime calculator</span>
              <span className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                Compare old vs new regime with HRA, 80C, NPS, equity gains — built for FY 2025-26 planning.
              </span>
              <span className="mt-4 text-sm font-semibold text-violet-700 group-hover:underline">
                Open calculator →
              </span>
            </Link>
            <Link
              href="/portfolio"
              className="group flex flex-col rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/90 p-6 shadow-md shadow-slate-500/10 transition hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-lg"
            >
              <span className="text-2xl" aria-hidden>
                📊
              </span>
              <span className="mt-3 text-lg font-bold text-slate-900">Portfolio analysis</span>
              <span className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                Review holdings and allocation in one workspace — built for Indian investors.
              </span>
              <span className="mt-4 text-sm font-semibold text-slate-800 group-hover:underline">
                Open portfolio →
              </span>
            </Link>
            <Link
              href="/tracker"
              className="relative group flex flex-col rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/90 p-6 shadow-md shadow-emerald-500/10 transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-lg"
            >
              <span className="absolute right-4 top-4 rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                NEW
              </span>
              <span className="text-2xl" aria-hidden>
                📊
              </span>
              <span className="mt-3 text-lg font-bold text-slate-900">Expense Tracker</span>
              <span className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                Track every rupee. See where money goes. Get insights to spend better.
              </span>
              <span className="mt-4 text-sm font-semibold text-emerald-700 group-hover:underline">
                Start tracking →
              </span>
            </Link>
          </div>
        </div>
      </section>

      <StorySection className="z-20 border-b border-indigo-100/60 bg-gradient-to-b from-white/80 via-indigo-50/30 to-violet-50/40">
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

      <StorySection className="z-30 border-b border-indigo-100/50 bg-white/55 backdrop-blur-[2px]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <AnimateOnScroll variant="fadeUp" aboveFold>
            <h2 className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600/85 sm:text-sm">
              Loved by Indians building better money habits
            </h2>
          </AnimateOnScroll>
          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
            {testimonials.map((t, index) => (
              <AnimateOnScroll
                key={t.name}
                variant="fadeUp"
                delay={index * 0.08}
                aboveFold
                className="flex flex-col rounded-2xl border border-white/60 bg-white/70 p-6 shadow-lg shadow-indigo-500/[0.06] backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/12 sm:p-7"
              >
                <p className="flex-1 text-sm leading-relaxed text-slate-700 sm:text-[0.9375rem]">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-5 border-t border-slate-100 pt-5">
                  <p className="font-semibold text-slate-900">{t.name}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {t.role} · {t.city}
                  </p>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </div>
      </StorySection>

      <StorySection className="z-40 border-b border-indigo-100/60 bg-gradient-to-b from-violet-50/50 via-white to-indigo-50/40">
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
                variant={index === 0 ? "slideInLeft" : index === 1 ? "fadeUp" : "slideInRight"}
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
                <p className="text-sm font-semibold text-slate-600">{tier.name}</p>
                <p className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tight text-slate-900">
                    {tier.price}
                  </span>
                  <span className="text-slate-600">{tier.period}</span>
                </p>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">{tier.description}</p>
                <Link
                  href={tier.cta.href}
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
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0, 0.45, 1], [0.965, 1, 0.975]);
  const rotate = useTransform(scrollYProgress, [0, 0.5, 1], [-0.45, 0, 0.45]);
  const y = useTransform(scrollYProgress, [0, 1], [30, -24]);
  const opacity = useTransform(scrollYProgress, [0, 0.12, 0.88, 1], [0.55, 1, 1, 0.75]);

  return (
    <section ref={ref} className="relative min-h-[102vh] snap-start scroll-mt-24">
      <m.div
        style={{ scale, rotate, y, opacity }}
        className={`sticky top-20 mx-auto overflow-hidden rounded-[2rem] shadow-[0_24px_80px_rgba(61,44,140,0.12)] ${className ?? ""}`}
      >
        {children}
      </m.div>
    </section>
  );
}
