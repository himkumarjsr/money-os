/** Future value of a monthly SIP (end-of-month contributions). */
export function sipMaturityAmount(
  monthly: number,
  annualPct: number,
  years: number,
): number {
  const n = Math.max(1, Math.round(years * 12));
  const r = annualPct / 100 / 12;
  if (!Number.isFinite(monthly) || monthly <= 0) return 0;
  if (r <= 0) return monthly * n;
  return monthly * ((Math.pow(1 + r, n) - 1) / r);
}

/**
 * Monthly SIP needed to reach a target corpus (reverse SIP).
 * Assumes end-of-month contributions and constant expected return.
 */
export function monthlySipForGoal(
  goalAmount: number,
  annualPct: number,
  years: number,
): number {
  const n = Math.max(1, Math.round(years * 12));
  const r = annualPct / 100 / 12;
  if (!Number.isFinite(goalAmount) || goalAmount <= 0) return 0;
  if (r <= 0) return goalAmount / n;
  return (goalAmount * r) / (Math.pow(1 + r, n) - 1);
}

/**
 * Starting monthly SIP to reach a target when the SIP rises by
 * `stepUpPct` every 12 months (e.g. in line with salary hikes).
 * Falls back to the flat SIP when there is no step-up.
 */
export function monthlyStepUpSipForGoal(
  goalAmount: number,
  annualPct: number,
  years: number,
  stepUpPct: number,
): number {
  if (!Number.isFinite(stepUpPct) || stepUpPct <= 0) {
    return monthlySipForGoal(goalAmount, annualPct, years);
  }
  if (!Number.isFinite(goalAmount) || goalAmount <= 0) return 0;
  const n = Math.max(1, Math.round(years * 12));
  const r = annualPct / 100 / 12;
  const g = stepUpPct / 100;
  // Future value of a ₹1 starting SIP (end-of-month contributions).
  let unit = 0;
  for (let m = 0; m < n; m++) {
    unit += Math.pow(1 + g, Math.floor(m / 12)) * Math.pow(1 + r, n - 1 - m);
  }
  return unit > 0 ? goalAmount / unit : 0;
}

export const CRORE = 1_00_00_000;
