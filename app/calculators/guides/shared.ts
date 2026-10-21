/** Shared shape and rupee formatting for the calculator guides. */

export type CalcGuide = {
  /** Opening paragraph under the H1: what the calculator answers. */
  intro: string;
  howItWorks: string[];
  formula?: { expression: string; legend: string[] };
  example: { title: string; steps: string[] };
  table?: { caption: string; head: string[]; rows: string[][] };
  tips: string[];
};

/** ₹ in Indian digit grouping, no paise. */
export function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

/** Short lakh / crore form for tables and prose, e.g. ₹11.6 lakh, ₹1.02 crore. */
export function inrShort(n: number): string {
  const v = Math.round(n);
  const trim = (x: string) => x.replace(/\.?0+$/, "");
  if (v >= 1_00_00_000) return `₹${trim((v / 1_00_00_000).toFixed(2))} crore`;
  if (v >= 1_00_000) return `₹${trim((v / 1_00_000).toFixed(1))} lakh`;
  return inr(v);
}
