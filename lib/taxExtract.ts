/**
 * ITR Phase-1 document extraction: prompts, JSON parse, tax-calculator populate.
 * Documents are never persisted — only extracted numbers (encrypted server-side).
 */

import type { ComparisonInputs } from "@/lib/taxRegimeComparisonFY2026";

export type TaxDocType =
  | "form16"
  | "ais"
  | "salary_slip"
  | "capital_gains"
  | "esop_rsu"
  | "unknown";

export type ExtractedTaxData = Record<string, unknown>;

export function buildExtractionPrompt(docType: string): string {
  const prompts: Record<string, string> = {
    form16: `
You are reading an Indian Form 16 (Part A and/or Part B).

Extract ALL of these fields and return ONLY a JSON object, no other text:

{
  "employerName": "string",
  "employerTAN": "string",
  "pan": "string",
  "employeeName": "string",
  "financialYear": "string",
  "assessmentYear": "string",
  "grossSalary": number,
  "basicSalary": number,
  "hraReceived": number,
  "lta": number,
  "otherAllowances": number,
  "perquisites": number,
  "standardDeduction": number,
  "professionalTax": number,
  "netSalary": number,
  "section80C": number,
  "section80CCD1B": number,
  "section80D": number,
  "section80E": number,
  "section80G": number,
  "section80TTA": number,
  "homeLoanInterest": number,
  "totalDeductions": number,
  "taxableIncome": number,
  "tdsFromForm16": number,
  "taxPayable": number,
  "regime": "old or new",
  "quarters": {
    "q1": number,
    "q2": number,
    "q3": number,
    "q4": number
  }
}

Use null for any field not found.
All amounts in Indian Rupees as numbers.
Do not include ₹ symbol in values.
`,

    ais: `
You are reading an Indian AIS (Annual Information Statement) or Form 26AS.

Extract and return ONLY this JSON:

{
  "pan": "string",
  "financialYear": "string",
  "totalIncome": number,
  "salaryIncome": number,
  "interestIncome": number,
  "dividendIncome": number,
  "capitalGainsST": number,
  "capitalGainsLT": number,
  "otherIncome": number,
  "tdsFromAIS": number,
  "tcsAmount": number,
  "advanceTaxPaid": number,
  "selfAssessmentTax": number,
  "highValueTransactions": [
    {
      "type": "string",
      "amount": number,
      "party": "string"
    }
  ]
}

Use null for missing fields.
Amounts as numbers without ₹.
`,

    salary_slip: `
You are reading an Indian salary slip.

Extract and return ONLY this JSON:

{
  "month": "string",
  "year": number,
  "employerName": "string",
  "employeeName": "string",
  "pan": "string",
  "employeeId": "string",
  "basicSalary": number,
  "hra": number,
  "specialAllowance": number,
  "transportAllowance": number,
  "medicalAllowance": number,
  "lta": number,
  "grossSalary": number,
  "pf": number,
  "professionalTax": number,
  "tds": number,
  "netSalary": number,
  "epfNumber": "string",
  "uan": "string"
}

Use null for missing. Amounts as numbers.
`,

    capital_gains: `
You are reading an Indian capital gains statement from a broker or mutual fund.

Extract and return ONLY this JSON:

{
  "financialYear": "string",
  "pan": "string",
  "brokerName": "string",
  "transactions": [
    {
      "securityName": "string",
      "isin": "string",
      "buyDate": "YYYY-MM-DD",
      "sellDate": "YYYY-MM-DD",
      "quantity": number,
      "buyPrice": number,
      "sellPrice": number,
      "buyValue": number,
      "sellValue": number,
      "gain": number,
      "type": "STCG or LTCG",
      "sttPaid": true or false,
      "indexedCost": number
    }
  ],
  "totalSTCG": number,
  "totalLTCG": number,
  "totalSTCGTaxable": number,
  "totalLTCGTaxable": number,
  "totalLTCGExempt": number
}

LTCG on equity above ₹1.25L is taxable.
Below ₹1.25L is exempt.
`,

    esop_rsu: `
You are reading an ESOP or RSU document from an Indian employer.

Extract and return ONLY this JSON:

{
  "employerName": "string",
  "employeeName": "string",
  "pan": "string",
  "financialYear": "string",
  "vestingEvents": [
    {
      "vestingDate": "YYYY-MM-DD",
      "sharesVested": number,
      "fmvAtVesting": number,
      "grantPrice": number,
      "perquisiteValue": number,
      "taxWithheld": number
    }
  ],
  "exerciseEvents": [
    {
      "exerciseDate": "YYYY-MM-DD",
      "sharesExercised": number,
      "exercisePrice": number,
      "fmvAtExercise": number,
      "perquisiteValue": number,
      "taxWithheld": number
    }
  ],
  "saleEvents": [
    {
      "saleDate": "YYYY-MM-DD",
      "sharesSold": number,
      "salePrice": number,
      "costBasis": number,
      "gain": number,
      "gainType": "STCG or LTCG"
    }
  ],
  "totalPerquisiteValue": number,
  "totalCapitalGain": number
}

Perquisite = ordinary income at exercise/vesting.
Capital gain = at sale vs FMV at exercise.
`,

    unknown: `
This is an Indian financial document.
Extract all financial figures you can find
and return as JSON with descriptive keys.
Include any tax-related numbers, income
figures, deductions, and TDS amounts.
Return ONLY valid JSON.
`,
  };

  return prompts[docType] || prompts.unknown;
}

export function parseExtractionJson(text: string): ExtractedTaxData {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("No JSON object in model response");
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as ExtractedTaxData;
}

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function nOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

/** Merge multiple doc extracts; prefer non-null later values, keep AIS TDS distinct. */
export function mergeExtracted(
  into: ExtractedTaxData,
  from: ExtractedTaxData,
): ExtractedTaxData {
  const out: ExtractedTaxData = { ...into };
  for (const [k, v] of Object.entries(from)) {
    if (v == null) continue;
    if (typeof v === "object" && !Array.isArray(v) && v !== null) {
      const prev = (out[k] as ExtractedTaxData | undefined) || {};
      out[k] = mergeExtracted(
        typeof prev === "object" && prev && !Array.isArray(prev) ? prev : {},
        v as ExtractedTaxData,
      );
      continue;
    }
    out[k] = v;
  }
  return out;
}

export const TAX_EXTRACT_CRITICAL_FIELDS = [
  "grossSalary",
  "tdsDeducted",
  "pan",
  "employerName",
] as const;

/** Resolve aliases so critical-field check is useful across doc types. */
export function normalizeExtractedAliases(
  data: ExtractedTaxData,
): ExtractedTaxData {
  const out = { ...data };
  if (out.tdsDeducted == null) {
    out.tdsDeducted = out.tdsFromForm16 ?? out.tdsFromAIS ?? out.tds ?? null;
  }
  if (out.grossSalary == null && out.salaryIncome != null) {
    out.grossSalary = out.salaryIncome;
  }
  if (out.hraReceived == null && out.hra != null) {
    out.hraReceived = out.hra;
  }
  return out;
}

export function findMissingCriticalFields(data: ExtractedTaxData): string[] {
  const missing: string[] = [];
  for (const field of TAX_EXTRACT_CRITICAL_FIELDS) {
    if (data[field] == null || data[field] === "") {
      missing.push(field);
    }
  }
  return missing;
}

export function buildTdsMismatchWarning(data: ExtractedTaxData): string | null {
  const a = nOrNull(data.tdsFromForm16);
  const b = nOrNull(data.tdsFromAIS);
  if (a == null || b == null) return null;
  const diff = Math.abs(a - b);
  if (diff <= 100) return null;
  return `TDS mismatch: Form 16 shows ₹${a.toLocaleString("en-IN")} but AIS shows ₹${b.toLocaleString("en-IN")}. Difference: ₹${diff.toLocaleString("en-IN")}`;
}

/**
 * Map extracted Form 16 / AIS numbers into TaxRegimeCalculator localStorage shape
 * (schemaVersion 3) so /calculators?calc=tax-regime can open pre-filled.
 */
export function mapExtractedToTaxCalculatorStorage(
  data: ExtractedTaxData,
): Record<string, unknown> {
  const grossAnnual = n(data.grossSalary);
  const basicAnnual = n(data.basicSalary) || Math.round(grossAnnual * 0.4);
  const hraAnnual = n(data.hraReceived);
  const otherAllow =
    n(data.otherAllowances) ||
    Math.max(0, grossAnnual - basicAnnual - hraAnnual);
  const pf = n(data.pf);
  const section80C = n(data.section80C) || pf;

  return {
    schemaVersion: 3,
    source: "itr_autofill_phase1",
    savedAt: new Date().toISOString(),
    employments: ["salaried"],
    employment: "salaried",
    age: 30,
    widowed: false,
    disabledSelf: false,
    nri: false,
    parentsSenior: false,
    basicMonthly: Math.round(basicAnnual / 12),
    specialAllowanceMonthly: Math.round(otherAllow / 12),
    mealVoucherMonthly: 0,
    mealVoucherWorkDaysPerMonth: 22,
    mealVoucherUse200Cap: true,
    secHRA: hraAnnual > 0,
    hraMonthly: Math.round(hraAnnual / 12),
    rentPaidMonthly: 0,
    isMetro: true,
    sec80GG: false,
    rentPaidNoHra: 0,
    secLTA: n(data.lta) > 0,
    ltaAnnualRecv: n(data.lta),
    ltaClaiming: false,
    ltaTravelCost: 0,
    secRSU: n(data.totalPerquisiteValue) > 0 || n(data.perquisites) > 0,
    rsuListing: "india",
    rsuUnits: 0,
    rsuFmvPerUnit: 0,
    rsuPlanSell: false,
    rsuUnitsSold: 0,
    rsuSalePrice: 0,
    rsuCostPrice: 0,
    rsuShortTerm: true,
    secInterest: n(data.interestIncome) > 0,
    savingsInterest: n(data.interestIncome),
    fdInterest: 0,
    postOfficeInterest: 0,
    bondsInterest: 0,
    secDividend: n(data.dividendIncome) > 0,
    divIndian: n(data.dividendIncome),
    divForeign: 0,
    secCG: n(data.capitalGainsST) > 0 || n(data.capitalGainsLT) > 0,
    equityStcg: n(data.capitalGainsST) || n(data.totalSTCG),
    equityLtcg: n(data.capitalGainsLT) || n(data.totalLTCG),
    c80Elss: section80C > 0 && !pf ? section80C : 0,
    c80Epf: pf,
    c80Ppf: 0,
    c80Lic: 0,
    c80Tuition: 0,
    c80Principal: 0,
    secDed80c: section80C > 0 || pf > 0,
    nps80CCD1B: n(data.section80CCD1B),
    secDed80d: n(data.section80D) > 0,
    deductions80DSelf: n(data.section80D),
    deductions80DParents: 0,
    deduction80E: n(data.section80E),
    deduction80G: n(data.section80G),
    deduction80TTA: n(data.section80TTA),
    homeLoanInterest24b: n(data.homeLoanInterest),
    secHomeLoan: n(data.homeLoanInterest) > 0,
    professionalTax: n(data.professionalTax),
    itrExtract: {
      pan: data.pan ?? null,
      employerName: data.employerName ?? null,
      tdsFromForm16: data.tdsFromForm16 ?? data.tdsDeducted ?? null,
      tdsFromAIS: data.tdsFromAIS ?? null,
      grossSalary: grossAnnual,
      financialYear: data.financialYear ?? null,
    },
  };
}

/** Populate tax calculator localStorage (browser only). */
export function populateTaxCalculatorFromExtract(data: ExtractedTaxData): void {
  if (typeof window === "undefined") return;
  const payload = mapExtractedToTaxCalculatorStorage(data);
  localStorage.setItem("finkoin_tax_calculator", JSON.stringify(payload));
}

export function mapExtractedToComparisonInputs(
  data: ExtractedTaxData,
): ComparisonInputs {
  const grossAnnual = n(data.grossSalary);
  const basicAnnual = n(data.basicSalary) || Math.round(grossAnnual * 0.4);
  const hraAnnual = n(data.hraReceived);
  const otherAllow =
    n(data.otherAllowances) ||
    Math.max(0, grossAnnual - basicAnnual - hraAnnual);

  return {
    age: 30,
    employment: "salaried",
    flags: { widowed: false, disabledSelf: false, nri: false },
    basicMonthly: Math.round(basicAnnual / 12),
    hraMonthly: Math.round(hraAnnual / 12),
    allowancesMonthly: Math.round(otherAllow / 12),
    mealVoucherExemptionAnnual: 0,
    hraSalaryBaseAnnualOverride: 0,
    rsuVestingAnnual: n(data.totalPerquisiteValue) || n(data.perquisites),
    rsuSaleStcg: 0,
    rsuSaleLtcg: 0,
    otherStcg: n(data.capitalGainsST) || n(data.totalSTCG),
    otherLtcg: n(data.capitalGainsLT) || n(data.totalLTCG),
    leaveEncashmentTaxable: 0,
    gratuityTaxable: 0,
    ltaTaxable: n(data.lta),
    previousEmployerSalaryAnnual: 0,
    ffSettlementOtherTaxable: 0,
    businessProfit: 0,
    freelanceIncome: 0,
    pension: 0,
    familyPension: 0,
    rentalIncome: 0,
    interestIncome: n(data.interestIncome),
    dividendIncome: n(data.dividendIncome),
    interestSavingsPortion: n(data.interestIncome),
    slabTaxedOtherGains: 0,
    propertyLtcgGains: 0,
    lotteryGamblingIncome: 0,
    agriculturalIncome: 0,
    excludeAgriculturalFromTax: true,
    hasHRA: hraAnnual > 0,
    hraReceivedAnnual: hraAnnual,
    rentPaidAnnual: 0,
    isMetro: true,
    rentPaidNoHra: 0,
    deductions80C: n(data.section80C) || n(data.pf),
    nps80CCD1B: n(data.section80CCD1B),
    deductions80DSelf: n(data.section80D),
    deductions80DParents: 0,
    parentsSenior: false,
    deduction80DD: 0,
    deduction80DDB: 0,
    deduction80E: n(data.section80E),
    deduction80EEA: 0,
    deduction80G: n(data.section80G),
    deduction80TTA: n(data.section80TTA),
    deduction80TTB: 0,
    deduction80U: 0,
    deduction80RRB: 0,
    homeLoanInterest24b: n(data.homeLoanInterest),
    professionalTax: n(data.professionalTax),
  };
}
