"use client";

import { lazyCalculatorsById } from "@/components/calculators/lazy-calculators";
import { cn } from "@/lib/cn";
import { fadeUp, scaleIn, staggerContainer } from "@/lib/animations";
import BottomSheet from "@/components/ui/BottomSheet";
import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";

type Cat = "investment" | "loans" | "life" | "postoffice";

type Item = {
  id: string;
  title: string;
  blurb: string;
};

const CATEGORIES: { id: Cat; label: string; items: Item[] }[] = [
  {
    id: "investment",
    label: "Investment",
    items: [
      {
        id: "sip",
        title: "SIP",
        blurb: "Monthly mutual fund SIP projections",
      },
      {
        id: "swp",
        title: "SWP",
        blurb: "Withdrawals from a fixed corpus",
      },
      {
        id: "ppf",
        title: "PPF",
        blurb: "15-year Public Provident Fund",
      },
      {
        id: "nsc",
        title: "NSC",
        blurb: "5-year National Savings Certificate",
      },
      {
        id: "emergency",
        title: "Emergency fund",
        blurb: "Target vs gap by life stage",
      },
    ],
  },
  {
    id: "loans",
    label: "Loans",
    items: [
      {
        id: "emi",
        title: "EMI",
        blurb: "Any reducing-balance loan",
      },
      {
        id: "home",
        title: "Home loan",
        blurb: "Property + income stress test",
      },
      {
        id: "car",
        title: "Car loan",
        blurb: "EMI + 6× salary rule",
      },
    ],
  },
  {
    id: "life",
    label: "Life decisions",
    items: [
      {
        id: "rentbuy",
        title: "Rent vs buy",
        blurb: "Home: cash-outflow comparison",
      },
      {
        id: "rentcar",
        title: "Rent vs own car",
        blurb: "Cab cost vs ownership estimate",
      },
      {
        id: "whencar",
        title: "When to buy car",
        blurb: "Down payment timeline & afford rule",
      },
    ],
  },
  {
    id: "postoffice",
    label: "Post Office",
    items: [
      {
        id: "po",
        title: "Post Office suite",
        blurb: "Seven popular schemes",
      },
    ],
  },
];

export default function CalculatorsPage() {
  const [category, setCategory] = useState<Cat>("investment");
  const activeCat = useMemo(
    () => CATEGORIES.find((c) => c.id === category)!,
    [category],
  );
  const [calcId, setCalcId] = useState(() => activeCat.items[0].id);
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeItem = useMemo(() => {
    const item = activeCat.items.find((i) => i.id === calcId);
    return item ?? activeCat.items[0];
  }, [activeCat.items, calcId]);

  const ActiveCalc =
    lazyCalculatorsById[activeItem.id] ?? lazyCalculatorsById[activeCat.items[0].id];

  return (
    <div className="min-h-dvh bg-white text-slate-900">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <Link
              href="/"
              className="text-sm font-semibold text-[#534AB7] hover:underline"
            >
              Back
            </Link>
            <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
              Calculators
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Sliders update results instantly — illustrative, not advice.
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
                setCategory(c.id);
                setCalcId(c.items[0].id);
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
                  onClick={() => setCalcId(item.id)}
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
            {activeItem.title}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{activeItem.blurb}</p>
          <div className="mt-8">
            <ActiveCalc />
          </div>
        </section>
      </div>

      <div className="mx-auto px-4 py-6 md:hidden">
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          {activeCat.label}
        </motion.p>
        <motion.ul
          className="mt-3 space-y-2"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {activeCat.items.map((item, index) => (
            <motion.li key={item.id} variants={fadeUp} transition={{ delay: index * 0.05 }}>
              <button
                type="button"
                onClick={() => {
                  setCalcId(item.id);
                  setSheetOpen(true);
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left"
              >
                <span className="block text-sm font-semibold text-slate-900">{item.title}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{item.blurb}</span>
              </button>
            </motion.li>
          ))}
        </motion.ul>
      </div>

      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={activeItem.title}
      >
        <motion.section
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
        </motion.section>
      </BottomSheet>
    </div>
  );
}
