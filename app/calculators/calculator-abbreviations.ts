/**
 * Full forms for every abbreviation used in calculator names, titles and
 * descriptions. Search snippets must spell these out (STP = Systematic
 * Transfer Plan), and the schema `alternateName` is built from them.
 * The first phrase is the display form; the rest are accepted variants.
 */
export const ABBREVIATIONS: Record<string, string[]> = {
  CAGR: ["Compound Annual Growth Rate"],
  CGST: ["Central Goods and Services Tax"],
  CTC: ["Cost to Company"],
  DA: ["Dearness Allowance"],
  EMI: ["Equated Monthly Instalment", "Equated Monthly Installment"],
  EPF: ["Employees' Provident Fund", "Employee Provident Fund"],
  ETF: ["Exchange Traded Fund"],
  FD: ["Fixed Deposit"],
  FIRE: ["Financial Independence, Retire Early"],
  FOIR: ["Fixed Obligation to Income Ratio"],
  FY: ["Financial Year"],
  GST: ["Goods and Services Tax"],
  HRA: ["House Rent Allowance"],
  IGST: ["Integrated Goods and Services Tax"],
  IRR: ["Internal Rate of Return"],
  KVP: ["Kisan Vikas Patra"],
  LTCG: ["Long-Term Capital Gains", "Long-Term Capital Gain"],
  MIS: ["Monthly Income Scheme"],
  NPS: ["National Pension System", "National Pension Scheme"],
  NSC: ["National Savings Certificate"],
  PF: ["Provident Fund"],
  PPF: ["Public Provident Fund"],
  RD: ["Recurring Deposit"],
  SCSS: ["Senior Citizens' Savings Scheme", "Senior Citizen Savings Scheme"],
  SGB: ["Sovereign Gold Bond"],
  SGST: ["State Goods and Services Tax"],
  SIP: ["Systematic Investment Plan"],
  SSY: ["Sukanya Samriddhi Yojana"],
  STCG: ["Short-Term Capital Gains", "Short-Term Capital Gain"],
  STP: ["Systematic Transfer Plan"],
  SWP: ["Systematic Withdrawal Plan"],
  TCS: ["Tax Collected at Source"],
  TD: ["Time Deposit"],
  TDS: ["Tax Deducted at Source"],
  VPF: ["Voluntary Provident Fund"],
  XIRR: ["Extended Internal Rate of Return"],
};

/** All-caps tokens such as SIP, EMI or XIRR (not 80C or 44ADA). */
const ABBR_TOKEN = /\b[A-Z][A-Z0-9]{1,5}\b/g;

/** Abbreviation-like tokens in a piece of text, in order, without repeats. */
export function findAbbreviations(text: string): string[] {
  return [...new Set(text.match(ABBR_TOKEN) ?? [])];
}

/** Lower-case, apostrophes dropped, punctuation and hyphens as spaces. */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** True when the text spells out the abbreviation's full form. */
export function hasFullForm(text: string, abbr: string): boolean {
  const forms = ABBREVIATIONS[abbr];
  if (!forms) return false;
  const haystack = ` ${normalise(text)} `;
  // Plurals count too: "Sovereign Gold Bonds" spells out SGB.
  return forms.some((f) =>
    [` ${normalise(f)} `, ` ${normalise(f)}s `].some((x) =>
      haystack.includes(x),
    ),
  );
}

/** "STP Calculator" → "Systematic Transfer Plan Calculator". */
export function expandAbbreviations(text: string): string {
  return text.replace(ABBR_TOKEN, (m) => ABBREVIATIONS[m]?.[0] ?? m);
}
