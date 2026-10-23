/**
 * Plain-words "how the target is worked out" and "what fills it" lines for
 * the emergency and medical funds on the report's safety-net card.
 * Shared by web and the app (mobile keeps a byte-identical copy).
 */
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import {
  emergencyFundMonthsNeeded,
  emergencyMonthlyBase,
  IRREGULAR_INCOME_EXTRA_MONTHS,
  type RealEmergencyFundBreakdown,
} from "@/lib/financialEngine";
import { formatIndian } from "@/lib/formatters";
import { getUniversalBucketActuals } from "@/lib/universal-buckets";

export type SafetyExplain = { target: string; filled: string };

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : 0;
};
const rs = (v: number) => `₹${formatIndian(Math.round(Math.max(0, v)))}`;

const STAGE: Record<string, string> = {
  bachelor: "single",
  married: "married",
  kids: "a family with kids",
  senior: "a senior",
};

export function emergencyFundExplain(
  profile: FinancialProfile,
  fund: Partial<RealEmergencyFundBreakdown> | undefined,
  target: number,
): SafetyExplain {
  const months = emergencyFundMonthsNeeded({
    lifeStage: profile.lifeStage,
    parentsSupport: profile.parentsSupport,
    selfAge: profile.selfAge,
    kidsAges: profile.kidsAges,
    employmentType: profile.employmentType,
  });
  const base = emergencyMonthlyBase(profile);
  const b = getUniversalBucketActuals(profile);
  const emis = Math.max(0, b.loans - n(profile.creditCardBillMonthly));
  const irregular =
    profile.employmentType === "self_employed" ||
    profile.employmentType === "business";
  const parts = [
    `essentials ${rs(b.needs)}`,
    emis > 0 ? `EMIs ${rs(emis)}` : "",
    b.security > 0 ? `premiums ${rs(b.security)}` : "",
  ].filter(Boolean);
  const why = `${months} months for ${STAGE[String(profile.lifeStage)] ?? "your life stage"}${n(profile.parentsSupport) > 0 ? " supporting parents" : ""}${irregular ? ` (+${IRREGULAR_INCOME_EXTRA_MONTHS} for irregular income)` : ""}`;
  const targetLine = `${why} × ${rs(base)}/month you'd still have to pay if income stopped (${parts.join(" + ")}) = ${rs(target)}.`;

  const f = fund ?? {};
  const pieces = [
    n(f.savingsCounted) > 0 ? `savings ${rs(n(f.savingsCounted))}` : "",
    n(f.liquidCounted) > 0
      ? `liquid funds ${rs(n(f.liquidCounted))} (95% of ${rs(n(f.liquidRaw))})`
      : "",
    n(f.fdCounted) > 0
      ? `FDs ${rs(n(f.fdCounted))} (70% of ${rs(n(f.fdRaw))}: breaking early costs interest)`
      : "",
    n(f.otherCounted) > 0
      ? `other savings ${rs(n(f.otherCounted))} (half of ${rs(n(f.otherRaw))})`
      : "",
    n(f.legacyCounted) > 0 ? `fund set aside ${rs(n(f.legacyCounted))}` : "",
  ].filter(Boolean);
  const have = n(f.realTotal);
  const filled =
    pieces.length === 0
      ? "Nothing set aside yet - start with a liquid fund or sweep-in FD."
      : `Filled by ${pieces.join(" + ")} = ${rs(have)}.${
          have >= target
            ? have - target >= 1000
              ? ` The extra ${rs(have - target)} goes to your medical fund first.`
              : ""
            : ` Still short by ${rs(target - have)}.`
        }`;
  return { target: targetLine, filled };
}

export function medicalFundExplain(
  profile: FinancialProfile,
  fund: { current?: number; target?: number; fromSavings?: number } | undefined,
): SafetyExplain {
  const city =
    profile.cityTier === "metro"
      ? { amount: 3_00_000, label: "a metro city" }
      : profile.cityTier === "tier2"
        ? { amount: 2_50_000, label: "a tier-2 city" }
        : { amount: 2_00_000, label: "your city" };
  const adds = [
    profile.selfAge >= 45 ? `${rs(50_000)} for age 45+` : "",
    profile.lifeStage === "kids" ? `${rs(50_000)} for kids` : "",
  ].filter(Boolean);
  const target = n(fund?.target);
  const targetLine = `${rs(city.amount)} for ${city.label}${adds.length ? ` + ${adds.join(" + ")}` : ""} = ${rs(target)}. It pays what insurance doesn't: the hospital deposit, room-rent caps, co-pay and bills while a claim settles.`;
  const entered = Math.max(0, n(fund?.current) - n(fund?.fromSavings));
  const fromSavings = n(fund?.fromSavings);
  const have = n(fund?.current);
  const pieces = [
    entered > 0 ? `${rs(entered)} you set aside` : "",
    fromSavings > 0
      ? `${rs(fromSavings)} of savings left over after the emergency fund`
      : "",
  ].filter(Boolean);
  const filled =
    pieces.length === 0
      ? "Nothing set aside yet - keep it in a savings account or liquid fund."
      : `Filled by ${pieces.join(" + ")} = ${rs(have)}.${have < target ? ` Still short by ${rs(target - have)}.` : ""}`;
  return { target: targetLine, filled };
}
