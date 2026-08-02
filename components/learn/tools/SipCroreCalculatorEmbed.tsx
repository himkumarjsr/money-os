"use client";

import { formatCurrency } from "@/lib/finance";
import { formatIndian } from "@/lib/formatters";
import { CRORE, monthlySipForGoal, sipMaturityAmount } from "@/lib/sipGoal";
import { useMemo, useState } from "react";
import LearnToolEmbed from "./LearnToolEmbed";

const YEAR_OPTIONS = [10, 15, 20] as const;

export default function SipCroreCalculatorEmbed() {
  const [years, setYears] = useState<(typeof YEAR_OPTIONS)[number]>(15);
  const [rate, setRate] = useState(12);
  const [goalLakh, setGoalLakh] = useState(100); // ₹1 crore default

  const goal = goalLakh * 1_00_000;
  const monthly = useMemo(
    () => monthlySipForGoal(goal, rate, years),
    [goal, rate, years],
  );
  const check = useMemo(
    () => sipMaturityAmount(monthly, rate, years),
    [monthly, rate, years],
  );
  const invested = monthly * years * 12;
  const gain = Math.max(0, check - invested);

  return (
    <LearnToolEmbed
      title="SIP for your goal — live calculator"
      subtitle="Target keyword: sip calculator 1 crore. Change years and return to see the monthly SIP you need."
      fullToolHref="/calculators/sip"
      fullToolLabel="Open SIP calculator →"
    >
      <div className="flex flex-wrap gap-2">
        {YEAR_OPTIONS.map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => setYears(y)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              years === y
                ? "bg-[#534AB7] text-white"
                : "border border-[#E8E6F0] bg-white text-[#5F5E5A]"
            }`}
          >
            {y} years
          </button>
        ))}
      </div>

      <label className="mt-4 block text-xs font-semibold text-[#5F5E5A]">
        Goal corpus (₹ lakh)
        <input
          type="range"
          min={50}
          max={500}
          step={10}
          value={goalLakh}
          onChange={(e) => setGoalLakh(Number(e.target.value))}
          className="mt-2 w-full accent-[#534AB7]"
        />
        <div className="mt-1 text-sm font-bold text-[#111110]">
          ₹{formatIndian(goal)}
          {goal === CRORE ? " (₹1 crore)" : ""}
        </div>
      </label>

      <label className="mt-4 block text-xs font-semibold text-[#5F5E5A]">
        Expected return (% p.a.)
        <input
          type="range"
          min={8}
          max={15}
          step={0.5}
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          className="mt-2 w-full accent-[#534AB7]"
        />
        <div className="mt-1 text-sm font-bold text-[#111110]">
          {rate}% p.a.
        </div>
      </label>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-[#EEEDFE] px-3 py-3">
          <div className="text-[11px] font-semibold text-[#534AB7]">
            Monthly SIP needed
          </div>
          <div className="mt-1 text-lg font-extrabold text-[#111110]">
            {formatCurrency(Math.round(monthly), "en-IN", "INR")}
          </div>
        </div>
        <div className="rounded-xl border border-[#E8E6F0] px-3 py-3">
          <div className="text-[11px] font-semibold text-[#9B9A94]">
            Total invested
          </div>
          <div className="mt-1 text-base font-bold text-[#111110]">
            ₹{formatIndian(Math.round(invested))}
          </div>
        </div>
        <div className="rounded-xl border border-[#E8E6F0] px-3 py-3">
          <div className="text-[11px] font-semibold text-[#9B9A94]">
            Estimated gain
          </div>
          <div className="mt-1 text-base font-bold text-[#111110]">
            ₹{formatIndian(Math.round(gain))}
          </div>
        </div>
      </div>
    </LearnToolEmbed>
  );
}
