"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import AnimateOnScroll from "@/components/ui/AnimateOnScroll";
import { fadeUp } from "@/lib/animations";
import { m } from "framer-motion";

const plans = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    features: [
      { label: "Financial health score", yes: true },
      { label: "15+ calculators", yes: true },
      { label: "Learn finance articles", yes: true },
      { label: "AI fix plan", yes: false },
      { label: "MF portfolio analysis", yes: false },
    ],
  },
  {
    name: "Pro",
    price: "₹49",
    period: "/month",
    features: [
      { label: "Everything in Free", yes: true },
      { label: "AI fix plan with ₹ amounts", yes: true },
      { label: "Goal roadmap", yes: true },
      { label: "Smart debt advice", yes: true },
      { label: "MF portfolio analysis", yes: false },
    ],
  },
  {
    name: "Pro Max",
    price: "₹99",
    period: "/month",
    features: [
      { label: "Everything in Pro", yes: true },
      { label: "MF portfolio analysis", yes: true },
      { label: "AI fund verdicts", yes: true },
      { label: "Portfolio migration", yes: true },
    ],
  },
] as const;

export default function PlansPage() {
  const router = useRouter();
  const setSubscription = useAuthStore((s) => s.setSubscription);

  return (
    <div className="min-h-dvh bg-white px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-semibold">Choose your Finkoin plan</h1>
        <p className="mt-2 text-slate-600">Upgrade instantly. You can test full product flow without payment now.</p>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {plans.map((plan, planIndex) => (
            <AnimateOnScroll
              key={plan.name}
              variant={planIndex === 0 ? "slideInLeft" : planIndex === 1 ? "fadeUp" : "slideInRight"}
              delay={planIndex * 0.1}
              className={`rounded-2xl border p-6 ${plan.name === "Pro" ? "border-[#534AB7] ring-1 ring-[#534AB7]" : "border-slate-200"}`}
            >
              {plan.name === "Pro" ? (
                <span className="inline-flex rounded-full bg-[#EEEDFE] px-2 py-1 text-xs font-semibold text-[#534AB7]">
                  Most popular
                </span>
              ) : null}
              <h2 className="mt-2 text-xl font-semibold">{plan.name}</h2>
              <p className="mt-2">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-slate-600"> {plan.period}</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {plan.features.map((feature, featureIndex) => (
                  <m.li
                    key={feature.label}
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    transition={{ delay: featureIndex * 0.04 }}
                    className={feature.yes ? "text-slate-800" : "text-slate-500"}
                  >
                    {feature.yes ? "✓" : "✗"} {feature.label}
                  </m.li>
                ))}
              </ul>
              <div className="mt-6">
                {plan.name === "Free" ? (
                  <button
                    type="button"
                    onClick={() => router.push("/analyse")}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2 font-semibold"
                  >
                    Start free
                  </button>
                ) : null}
                {plan.name === "Pro" ? (
                  <button
                    type="button"
                    onClick={() => {
                      // TODO: Replace with Razorpay later
                      setSubscription("pro");
                      router.push("/analyse/result");
                    }}
                    className="w-full rounded-xl bg-[#534AB7] px-4 py-2 font-semibold text-white"
                  >
                    Get Pro
                  </button>
                ) : null}
                {plan.name === "Pro Max" ? (
                  <button
                    type="button"
                    onClick={() => {
                      // TODO: Replace with Razorpay later
                      setSubscription("promax");
                      router.push("/analyse/result");
                    }}
                    className="w-full rounded-xl bg-[#534AB7] px-4 py-2 font-semibold text-white"
                  >
                    Get Pro Max
                  </button>
                ) : null}
              </div>
            </AnimateOnScroll>
          ))}
        </div>
        <Link href="/" className="mt-8 inline-flex text-sm font-semibold text-[#534AB7] hover:underline">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}

