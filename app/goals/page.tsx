"use client";

import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { AppIcon } from "@/components/ui/AppIcon";
import { TrackerIcon } from "@/components/tracker/TrackerIcons";
import { ButtonLink } from "@/components/ui/button";
import Link from "next/link";

const THEME = "#534AB7";

const goals = [
  {
    id: "emergency",
    icon: <AppIcon name="lifebuoy" size={32} color={THEME} />,
    title: "Emergency Fund",
    description: "6–9 months of expenses saved",
  },
  {
    id: "home",
    icon: <AppIcon name="home" size={32} color={THEME} />,
    title: "Buy a Home",
    description: "Save for down payment",
  },
  {
    id: "retirement",
    icon: <AppIcon name="beach" size={32} color={THEME} />,
    title: "Retirement Corpus",
    description: "25× annual expenses by retirement",
  },
  {
    id: "education",
    icon: <TrackerIcon name="graduation" size={32} color={THEME} />,
    title: "Child Education",
    description: "Fund for children's education",
  },
  {
    id: "vehicle",
    icon: <TrackerIcon name="car" size={32} color={THEME} />,
    title: "Buy a Vehicle",
    description: "Save for car or bike",
  },
  {
    id: "travel",
    icon: <AppIcon name="plane" size={32} color={THEME} />,
    title: "Dream Vacation",
    description: "Save for travel goals",
  },
];

export default function GoalsPage() {
  return (
    <ProtectedGate>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#111110]">My Goals</h1>
            <p className="mt-2 max-w-xl text-sm text-[#5F5E5A]">
              Goal-based planning ties every rupee to a milestone. We&apos;re
              rolling out trackers per goal soon.
            </p>
          </div>
          <ButtonLink
            href="/analyse"
            variant="primary"
            className="bg-[#534AB7] text-white hover:opacity-95"
          >
            Complete your analysis →
          </ButtonLink>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => (
            <div
              key={g.id}
              className="relative rounded-2xl border border-[#F0EFF8] bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <span className="absolute right-4 top-4 rounded-full bg-[#F7F7F4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#9B9A94]">
                Coming soon
              </span>
              <div className="text-3xl" aria-hidden>
                {g.icon}
              </div>
              <h2 className="mt-3 text-lg font-bold text-[#111110]">
                {g.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5F5E5A]">
                {g.description}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-[#9B9A94]">
          Educational guidance only.{" "}
          <Link
            href="/legal/disclaimer"
            className="font-semibold text-[#534AB7]"
          >
            Disclaimer
          </Link>
        </p>
      </main>
    </ProtectedGate>
  );
}
