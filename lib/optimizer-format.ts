/** Whole rupees, Indian grouping — no decimals. */
export function fmt(n: number): string {
  return "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
}

/** Spoken-scale helper for subtitles (e.g. under large amounts). */
export function fmtWords(n: number): string {
  n = Math.round(Number(n) || 0);
  if (n < 0) return fmtWords(-n);
  if (n >= 1_00_00_000) {
    const cr = Math.floor(n / 1_00_00_000);
    const lakh = Math.floor((n % 1_00_00_000) / 1_00_000);
    return lakh > 0 ? `${cr} crore ${lakh} lakh` : `${cr} crore`;
  }
  if (n >= 1_00_000) {
    const lakh = Math.floor(n / 1_00_000);
    const th = Math.floor((n % 1_00_000) / 1_000);
    return th > 0 ? `${lakh} lakh ${th} thousand` : `${lakh} lakh`;
  }
  if (n >= 1_000) {
    return `${Math.floor(n / 1_000)} thousand`;
  }
  return String(n);
}
