/** Max amount for calculator money inputs (₹99 crore). */
export const CALCULATOR_MONEY_MAX = 990_000_000;

export function stepDecimals(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 0;
  const s = step.toString();
  if (s.includes("e-") || s.includes("E-")) {
    const exp = Number(s.split(/e-/i)[1] ?? 0);
    return Math.min(6, Math.max(0, exp));
  }
  const frac = s.split(".")[1];
  return frac ? Math.min(6, frac.length) : 0;
}

/** Snap to step grid and kill float noise (e.g. 7.149999 → 7.15). */
export function snapToStep(value: number, min: number, step: number): number {
  if (!Number.isFinite(value)) return min;
  if (!Number.isFinite(step) || step <= 0) return value;
  const decimals = stepDecimals(step);
  const snapped = Math.round((value - min) / step) * step + min;
  return Number(snapped.toFixed(decimals));
}

/** Min/max only — keeps exact typed amounts (no step rounding). */
export function clampToRange(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  const upper = Math.max(min, max);
  return Math.min(upper, Math.max(min, value));
}

/**
 * Clamp to range, then optionally snap to the step grid (for slider drags).
 * Pass snap=false for free-form text inputs so values like 2,25,00,000 stay exact.
 */
export function clampCalculatorValue(
  value: number,
  min: number,
  max: number,
  step = 1,
  options?: { snap?: boolean },
): number {
  const upper = Math.max(min, max);
  const bounded = clampToRange(value, min, upper);
  if (options?.snap === false) return bounded;
  if (!Number.isFinite(step) || step <= 0) return bounded;
  const snapped = snapToStep(value, min, step);
  return Math.min(upper, Math.max(min, snapped));
}

export function formatCalculatorFieldValue(
  value: number,
  type: "money" | "percent" | "years" | "months" | "number",
  step: number,
  formatMoney: (n: number) => string,
): string {
  if (!Number.isFinite(value)) return "0";
  if (type === "percent") {
    // Keep typed precision; only trim binary float noise (do not force-step).
    if (Number.isInteger(value)) return String(value);
    const cleaned = Number(value.toPrecision(12));
    return String(cleaned);
  }
  if (type === "years" || type === "months") {
    return Number.isInteger(value) ? String(value) : String(value);
  }
  return formatMoney(value);
}
