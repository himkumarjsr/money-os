"use client";

import { AppIcon } from "@/components/ui/AppIcon";
import {
  PREMIUM_STREAK_DAYS,
  PREMIUM_TOP_RANK,
  type ThemePreference,
} from "@/lib/theme";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";

const OPTIONS: { value: ThemePreference; label: string; hint: string }[] = [
  { value: "system", label: "System", hint: "Follows your device" },
  { value: "light", label: "Light", hint: "Bright and clean" },
  { value: "dark", label: "Dark", hint: "Easy on the eyes" },
  { value: "premium", label: "Premium", hint: "Black and gold" },
];

/** Settings → Appearance. Premium is locked until the user earns it. */
export function AppearancePicker() {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const preference = useThemeStore((s) => s.preference);
  const premium = useThemeStore((s) => s.premium);
  const setPreference = useThemeStore((s) => s.setPreference);
  const unlocked = premium?.unlocked ?? false;

  return (
    <div className="mt-4 space-y-3">
      <div role="radiogroup" className="grid grid-cols-2 gap-2.5">
        {OPTIONS.map((o) => {
          const isPremium = o.value === "premium";
          const locked = isPremium && !unlocked;
          const selected = preference === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${o.label} theme${locked ? ", locked" : ""}`}
              disabled={locked}
              onClick={() => setPreference(o.value)}
              className={`min-h-16 rounded-xl border-[1.5px] p-3 text-left transition ${
                isPremium ? "fk-premium-option" : "border-[#E8E6F0] bg-white"
              } ${selected ? "fk-theme-selected" : ""} ${
                locked
                  ? "cursor-not-allowed opacity-60"
                  : "hover:border-[#534AB7]"
              }`}
            >
              <span className="flex items-center justify-between">
                <span
                  className={`text-sm font-bold ${
                    isPremium ? "text-[#D4AF37]" : "text-[#111110]"
                  }`}
                >
                  {o.label}
                </span>
                {locked ? (
                  <AppIcon name="lock" size={14} className="text-[#9B9A94]" />
                ) : selected ? (
                  <AppIcon name="check" size={14} className="text-[#534AB7]" />
                ) : null}
              </span>
              <span
                className={`mt-0.5 block text-xs ${
                  isPremium ? "text-[#C2B9A3]" : "text-[#5F5E5A]"
                }`}
              >
                {o.hint}
              </span>
            </button>
          );
        })}
      </div>

      {!unlocked ? (
        <div className="rounded-xl border border-[#F0EFF8] bg-[#FAFAFE] p-3">
          <p className="text-sm font-semibold text-[#111110]">
            How to unlock Premium
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#5F5E5A]">
            Generate your report and keep a {PREMIUM_STREAK_DAYS}-day streak
            (about 3 months of daily use), or reach the top {PREMIUM_TOP_RANK}{" "}
            on the leaderboard.
          </p>
          {premium ? (
            <p className="mt-1.5 text-xs font-semibold text-[#534AB7]">
              {premium.hasReport ? "Report done" : "No report yet"} · Streak{" "}
              {premium.streakDays}/{PREMIUM_STREAK_DAYS} days
              {premium.rank != null ? ` · Rank #${premium.rank}` : ""}
            </p>
          ) : !userId ? (
            <p className="mt-1.5 text-xs font-semibold text-[#534AB7]">
              Sign in to track progress.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs font-semibold text-[#9A7B2F]">
          Premium unlocked. Thanks for sticking with Finkoin.
        </p>
      )}
    </div>
  );
}
