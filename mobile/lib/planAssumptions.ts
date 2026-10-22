/**
 * The plan's assumptions in plain words, for the "What we assumed" card,
 * and the few the user can change (equity return, how fast costs rise,
 * raising SIPs each year). Every number comes from goalMath, so what the
 * card says is what the plan used. Pure; shared by web and the app (mobile
 * keeps a byte-identical copy).
 */
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import { emergencyFundMonthsNeeded } from "@/lib/financialEngine";
import {
  GLIDE_YEARS,
  GOAL_INFLATION,
  LIFE_EXPECTANCY,
  POST_RETIREMENT_RETURN,
  goalInflation,
  goalRate,
  inflationShift,
  planEquityReturn,
  sipStepUp,
  STANDARD_EQUITY_RETURN,
  taxSlab,
} from "@/lib/goalMath";
import { LONG_RUN_INFLATION } from "@/lib/holdings";

export type AssumptionRow = { label: string; value: string };

/** Equity returns (% a year) the user can plan on. 12% is the standard. */
export const EQUITY_RETURN_OPTIONS = [10, 11, 12, 13] as const;

/** How much faster (points a year) the user expects costs to rise. */
export const INFLATION_SHIFT_OPTIONS = [
  { value: -1, label: "Slower (-1%)" },
  { value: 0, label: "As expected" },
  { value: 1, label: "Faster (+1%)" },
  { value: 2, label: "Much faster (+2%)" },
] as const;

const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;

/** The user's current choices, for the card's controls. */
export function assumptionChoices(profile: Partial<FinancialProfile>) {
  return {
    equityReturnPct: Math.round(planEquityReturn(profile) * 100),
    inflationShiftPct: Math.round(inflationShift(profile) * 100),
    raisesSips: sipStepUp(profile) > 0,
  };
}

/**
 * A profile with one assumption changed. The standard choice clears the
 * field, so a later change to the standard follows the plan.
 */
export function withAssumption(
  profile: FinancialProfile,
  change:
    | { equityReturnPct: number }
    | { inflationShiftPct: number }
    | { raisesSips: boolean },
): FinancialProfile {
  if ("equityReturnPct" in change) {
    const standard =
      change.equityReturnPct === Math.round(STANDARD_EQUITY_RETURN * 100);
    return {
      ...profile,
      planEquityReturnPct: standard ? undefined : change.equityReturnPct,
    };
  }
  if ("inflationShiftPct" in change) {
    return {
      ...profile,
      planInflationShiftPct: change.inflationShiftPct || undefined,
    };
  }
  return { ...profile, sipStepUpPlanned: change.raisesSips };
}

/** Plain lines on what the plan assumed for this user. */
export function planAssumptionRows(
  profile: Partial<FinancialProfile>,
): AssumptionRow[] {
  const slab = taxSlab(profile);
  const told = profile.taxSlabPct != null;
  const long = goalRate(profile, 10, "custom");
  const mid = goalRate(profile, 5, "custom").long;
  const stepUp = sipStepUp(profile);
  const months = emergencyFundMonthsNeeded(profile);
  const prices = LONG_RUN_INFLATION + inflationShift(profile);
  const fasterGoals = (
    [
      ["kid_education", "college fees"],
      ["parents_eldercare", "medical costs"],
      ["kid_marriage", "weddings"],
      ["vehicle_purchase", "cars"],
    ] as const
  )
    .filter(([type]) => GOAL_INFLATION[type] !== LONG_RUN_INFLATION)
    .map(([type, name]) => `${name} ${pct(goalInflation(type, profile))}`)
    .join(", ");

  return [
    {
      label: "Shares (equity funds)",
      value: `${pct(planEquityReturn(profile))} a year before tax${planEquityReturn(profile) === STANDARD_EQUITY_RETURN ? ", the Nifty 50's long-run record" : " (your choice)"}`,
    },
    {
      label: "Goals 7+ years away",
      value: `${pct(long.long)} a year after tax, from the fund mix we suggest`,
    },
    {
      label: "Goals 3-7 years away",
      value: `${pct(mid)} a year after tax`,
    },
    {
      label: `Last ${GLIDE_YEARS} years before a goal`,
      value: `Money moves to FDs and short debt funds earning ${pct(long.safe)} after tax, so a market fall can't hit it`,
    },
    {
      label: "Prices",
      value: `Rise ${pct(prices)} a year; ${fasterGoals}`,
    },
    {
      label: "Tax",
      value:
        slab === 0
          ? told
            ? "No income tax"
            : "No income tax on your income (up to ₹12L under the new regime)"
          : `${pct(slab)} slab${told ? "" : " (worked out from your income)"} on FD and debt interest${slab >= 0.2 ? ", 12.5% on equity gains" : "; equity gains stay under the ₹1.25L a year tax-free limit"}`,
    },
    {
      label: "Your SIPs",
      value:
        stepUp > 0
          ? `Raised ${pct(stepUp)} every April`
          : "Stay the same every year",
    },
    {
      label: "Retirement",
      value: `Money lasts to age ${LIFE_EXPECTANCY}, earning ${pct(POST_RETIREMENT_RETURN)} a year after you retire`,
    },
    {
      label: "Emergency fund",
      value: `${months} months of essentials, EMIs and premiums`,
    },
  ];
}
