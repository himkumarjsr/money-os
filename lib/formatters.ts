export function formatIndian(num: number): string {
  if (!num || Number.isNaN(num)) return "";
  return num.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

export function formatIndianCompact(num: number): string {
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${formatIndian(num)}`;
}

export function formatInWords(num: number): string {
  if (num === 0) return "Zero";
  if (num >= 10000000) {
    const cr = Math.floor(num / 10000000);
    const remaining = Math.round(num % 10000000);
    if (remaining === 0) return `${cr} crore`;
    if (remaining >= 100000) return `${cr} crore ${Math.floor(remaining / 100000)} lakh`;
    return `${(num / 10000000).toFixed(2)} crore`;
  }
  if (num >= 100000) {
    const l = Math.floor(num / 100000);
    const remaining = Math.round(num % 100000);
    if (remaining === 0) return `${l} lakh`;
    if (remaining >= 1000) return `${l} lakh ${Math.floor(remaining / 1000)} thousand`;
    return `${(num / 100000).toFixed(1)} lakh`;
  }
  if (num >= 1000) return `${Math.floor(num / 1000)} thousand`;
  return Math.round(num).toString();
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

