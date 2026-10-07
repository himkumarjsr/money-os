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

export const CRORE = 1_00_00_000;
