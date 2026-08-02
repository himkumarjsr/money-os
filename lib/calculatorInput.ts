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

export function clampCalculatorValue(
  value: number,
  min: number,
  max: number,
  step = 1,
): number {
  const upper = Math.max(min, max);
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
    const decimals = Math.max(1, stepDecimals(step));
    return Number(value.toFixed(decimals)).toString();
  }
  if (type === "years" || type === "months") {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  return formatMoney(value);
}
