export function formatINR(value: number) {
  const rounded = Number.isFinite(value) ? Math.round(value) : 0;
  return `₹${rounded.toLocaleString("en-IN")}`;
}

export function formatCompactINR(value: number) {
  const rounded = Number.isFinite(value) ? Math.round(value) : 0;
  const nf = new Intl.NumberFormat("en-IN", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  });
  return `₹${nf.format(rounded)}`;
}

