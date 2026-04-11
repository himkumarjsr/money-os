export function formatIndian(num: number): string {
  if (!num || Number.isNaN(num)) return "0";
  return Math.round(num).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });
}

export function formatIndianCompact(num: number): string {
  if (num >= 10000000) return `₹${Math.round(num / 10000000)} Cr`;
  if (num >= 100000) return `₹${Math.round(num / 100000)} L`;
  if (num >= 1000) return `₹${Math.round(num / 1000)}K`;
  return `₹${formatIndian(num)}`;
}

const BELOW_TWENTY = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];

const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function spellUnder100(n: number): string {
  if (n < 20) return BELOW_TWENTY[n] ?? "";
  const t = Math.floor(n / 10);
  const o = n % 10;
  const ten = TENS[t] ?? "";
  if (o === 0) return ten;
  return `${ten}-${BELOW_TWENTY[o]}`;
}

function spellUnder1000(n: number): string {
  if (n < 100) return spellUnder100(n);
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const hundreds = `${BELOW_TWENTY[h]} hundred`;
  if (rest === 0) return hundreds;
  return `${hundreds} ${spellUnder100(rest)}`;
}

/** Spells 1–99,999 in words (e.g. 2,895 → "two thousand eight hundred ninety-five"). */
function spellUnder100000(n: number): string {
  if (n < 1000) return spellUnder1000(n);
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  const head = `${spellUnder1000(thousands)} thousand`;
  if (rest === 0) return head;
  return `${head} ${spellUnder1000(rest)}`;
}

function formatBelowOneCrore(n: number): string {
  if (n < 100000) return spellUnder100000(n);
  const lakhs = Math.floor(n / 100000);
  const rem = n % 100000;
  const lw = `${spellUnder1000(lakhs)} ${lakhs === 1 ? "lakh" : "lakhs"}`;
  if (rem === 0) return lw;
  return `${lw} ${spellUnder100000(rem)}`;
}

function capitalizePhrase(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Full rupee amount in English words (Indian grouping for lakh/crore). */
export function formatInWords(num: number): string {
  if (num === 0) return "Zero";
  if (!Number.isFinite(num) || Number.isNaN(num)) return "";
  const n = Math.round(Math.abs(num));
  if (n === 0) return "Zero";

  let out: string;
  if (n < 10000000) {
    out = formatBelowOneCrore(n);
  } else {
    const crores = Math.floor(n / 10000000);
    const rem = n % 10000000;
    const cw = `${spellUnder1000(crores)} ${crores === 1 ? "crore" : "crores"}`;
    out = rem === 0 ? cw : `${cw} ${formatBelowOneCrore(rem)}`;
  }

  return capitalizePhrase(out);
}

export function parseIndianInput(rawInput: string): number | null {
  let raw = rawInput.trim();
  if (!raw) return null;
  raw = raw.replace(/,/g, "");

  const lower = raw.toLowerCase();
  const numMatch = lower.match(/-?\d+(\.\d+)?/);
  if (!numMatch) return null;
  let num = Number(numMatch[0]);
  if (Number.isNaN(num)) return null;

  if (/cr|crore/.test(lower)) num *= 10000000;
  else if (/l|lakh/.test(lower)) num *= 100000;
  else if (/k$|thousand/.test(lower)) num *= 1000;

  return num;
}

export function handleMoneyInput(
  raw: string,
  min: number = 0,
  max: number = 1000000000,
): number | null {
  let cleaned = raw.replace(/,/g, "").trim();
  cleaned = cleaned.replace(/₹/g, "").trim();

  if (/^\d*\.?\d*$/.test(cleaned)) {
    const num = parseFloat(cleaned);
    if (!Number.isNaN(num)) {
      return Math.min(max, Math.max(min, num));
    }
  }
  return null;
}

export function formatSliderLabel(
  value: number,
  type: "money" | "percent" | "years" | "months" | "number",
): string {
  if (type === "money") return `₹${formatInWords(value)}`;
  if (type === "percent") return `${value}% p.a.`;
  if (type === "years") return `${value}${value === 1 ? " year" : " years"}`;
  if (type === "months") return `${value}${value === 1 ? " month" : " months"}`;
  if (type === "number") return formatIndian(value);
  return value.toString();
}

