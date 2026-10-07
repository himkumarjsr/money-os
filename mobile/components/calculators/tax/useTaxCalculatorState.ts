import { useCallback, useEffect, useMemo, useState } from "react";
import {
  businessIncomeIllustrative,
  commutedPensionExemptIllustrative,
  familyPensionExemptAnnual,
  gratuityTaxableExempt,
  leaveEncashmentTaxableExemptIllustrative,
  ltaSplit,
  pensionAnnualFromMonthly,
  rentalTaxableIncomeIllustrative,
  rsuSaleGain,
  rsuVestingIncomeAnnual,
  type BusinessMode,
  type GratuityEmployer,
  type LeaveEncashEmployer,
  type LeaveEncashTiming,
  type PensionKind,
  type RsuListing,
} from "@/lib/taxCalculatorHelpers";
import { buildMissedDeductionAlerts } from "@/lib/taxMissedDeductionAlerts";
import {
  calculateHRAExemption,
  compareRegimes,
  computeIllustrativeEquityCgTax,
  getDeduction80GGComputed,
  salaryAnnualFromMonthly,
  sumEquityLtcg,
  sumEquityStcg,
  type ComparisonInputs,
  type EmploymentKind,
} from "@/lib/taxRegimeComparisonFY2026";
import { hydrateSyncKv, syncKv } from "@/lib/syncKv";
import { rupees } from "./format";

export const TAX_CALCULATOR_STORAGE_KEY = "finkoin_tax_calculator";
const TAX_CALC_SCHEMA_VERSION = 3;

export const EMPLOYMENT_OPTIONS: { id: EmploymentKind; label: string }[] = [
  { id: "salaried", label: "Salaried" },
  { id: "business_owner", label: "Business owner" },
  { id: "freelancer", label: "Freelancer" },
  { id: "retired", label: "Retired" },
  { id: "pensioner", label: "Pensioner" },
];

// Single primary classification for the engine (ITR hints / missed-deduction
// alerts, not tax math) — the source that unlocks the most guidance wins.
const EMPLOYMENT_PRIORITY: EmploymentKind[] = [
  "salaried",
  "freelancer",
  "business_owner",
  "pensioner",
  "retired",
];

export const DEFAULT_TAX_INPUTS = {
  employments: ["salaried"] as EmploymentKind[],
  widowed: false,
  disabledSelf: false,
  nri: false,
  /** Oldest parent’s age (for 80D parents cap). 0 = not entered yet. */
  parentsAge: 0,
  parentsSenior: false,
  age: 18,

  basicMonthly: 0,
  specialAllowanceMonthly: 0,
  mealVoucherMonthly: 0,
  mealVoucherWorkDaysPerMonth: 22,
  mealVoucherUse200Cap: true,

  secHRA: false,
  hraMonthly: 0,
  rentPaidMonthly: 0,
  isMetro: true,

  sec80GG: false,
  rentPaidNoHra: 0,

  secLTA: false,
  ltaAnnualRecv: 0,
  ltaClaiming: false,
  ltaTravelCost: 0,

  secRSU: false,
  rsuListing: "india" as RsuListing,
  rsuUnits: 0,
  rsuFmvPerUnit: 0,
  rsuPlanSell: false,
  rsuUnitsSold: 0,
  rsuSalePrice: 0,
  rsuCostPrice: 0,
  rsuShortTerm: true,

  secGratuity: false,
  gratEmployer: "private" as GratuityEmployer,
  gratReceived: 0,
  gratYears: 0,
  gratLastSalaryAnnual: 0,

  secLeave: false,
  leaveTiming: "during_service" as LeaveEncashTiming,
  leaveEmployer: "private" as LeaveEncashEmployer,
  leaveReceived: 0,
  leaveAvgMonthly: 0,
  leaveYears: 0,
  leaveDays: 0,

  secBusiness: false,
  bizMode: "regular" as BusinessMode,
  bizGrossReceipts: 0,
  bizExpenses: 0,
  bizTurnover44AD: 0,
  bizDigital44AD: false,
  bizReceipts44ADA: 0,

  secRental: false,
  rentAnnualGross: 0,
  rentMunicipal: 0,
  rentLoanInterest: 0,

  secPension: false,
  pensionKind: "private" as PensionKind,
  pensionMonthly: 0,
  familyPensionMonthly: 0,
  commutedPension: 0,

  secInterest: false,
  savingsInterest: 0,
  fdInterest: 0,
  postOfficeInterest: 0,
  bondsInterest: 0,

  secDividend: false,
  divIndian: 0,
  divForeign: 0,

  secCG: false,
  cgEquityStcgExtra: 0,
  cgEquityLtcgExtra: 0,
  cgDebtStcg: 0,
  cgDebtLtcg: 0,
  cgPropStcg: 0,
  cgPropLtcg: 0,

  secAgri: false,
  agriculturalIncome: 0,
  excludeAgriculturalFromTax: true,

  secOther: false,
  lotteryIncome: 0,
  giftsTaxable: 0,
  commissionIncome: 0,
  otherMiscIncome: 0,

  freelanceIncome: 0,

  /** Mid-year job switch / Full & Final settlement */
  secJobSwitch: false,
  prevEmployerSalaryAnnual: 0,
  prevEmployerTds: 0,
  currentEmployerTds: 0,
  ffOtherTaxable: 0,

  secDed80c: false,
  secDed80d: false,
  secDedRest: false,

  c80Elss: 0,
  c80Ppf: 0,
  c80Lic: 0,
  c80Epf: 0,
  c80Tuition: 0,
  c80Principal: 0,
  nps80CCD1B: 0,
  deductions80DSelf: 0,
  deductions80DParents: 0,
  deduction80DD: 0,
  deduction80DDB: 0,
  deduction80E: 0,
  deduction80EEA: 0,
  deduction80G: 0,
  deduction80TTA: 0,
  deduction80TTB: 0,
  deduction80U: 0,
  deduction80RRB: 0,
  homeLoanInterest24b: 0,
  professionalTax: 0,

  hraSalaryBaseAnnualOverride: 0,
};

export type TaxInputs = typeof DEFAULT_TAX_INPUTS;
export type TaxInputPatch =
  | Partial<TaxInputs>
  | ((prev: TaxInputs) => Partial<TaxInputs>);

function readStoredInputs(): { inputs: TaxInputs; savedAt: string | null } {
  const fallback = { inputs: DEFAULT_TAX_INPUTS, savedAt: null };
  const saved = syncKv.getItem(TAX_CALCULATOR_STORAGE_KEY);
  if (!saved) return fallback;
  const d = JSON.parse(saved) as Record<string, unknown>;
  if (
    typeof d !== "object" ||
    d === null ||
    (d as { schemaVersion?: number }).schemaVersion !== TAX_CALC_SCHEMA_VERSION
  ) {
    syncKv.removeItem(TAX_CALCULATOR_STORAGE_KEY);
    return fallback;
  }

  const g = <T>(key: string, fb: T): T =>
    d[key] !== undefined && d[key] !== null ? (d[key] as T) : fb;

  const next = { ...DEFAULT_TAX_INPUTS } as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_TAX_INPUTS)) {
    next[key] = g(key, next[key]);
  }

  const storedEmployments = g<EmploymentKind[] | null>("employments", null);
  const legacyEmployment = g<EmploymentKind | null>("employment", null);
  next.employments =
    Array.isArray(storedEmployments) && storedEmployments.length > 0
      ? storedEmployments
      : legacyEmployment
        ? [legacyEmployment]
        : ["salaried"];
  const legacySenior = g("parentsSenior", false);
  next.parentsAge = g("parentsAge", legacySenior ? 60 : 0);
  next.specialAllowanceMonthly = g(
    "specialAllowanceMonthly",
    g("allowancesMonthly", 0),
  );
  next.secHRA = g("secHRA", g("hasHRA", false));
  next.cgEquityStcgExtra = g("cgEquityStcgExtra", g("otherStcg", 0));
  next.cgEquityLtcgExtra = g("cgEquityLtcgExtra", g("otherLtcg", 0));

  return {
    inputs: next as TaxInputs,
    savedAt: typeof d.savedAt === "string" ? d.savedAt : null,
  };
}

export function clearStoredTaxInputs() {
  try {
    syncKv.removeItem(TAX_CALCULATOR_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export type LearnedRow = { emoji: string; title: string; body: string };

export function useTaxCalculatorState() {
  const [storageReady, setStorageReady] = useState(false);
  const [savedAtDisplay, setSavedAtDisplay] = useState<string | null>(null);
  const [i, setInputs] = useState<TaxInputs>(DEFAULT_TAX_INPUTS);

  const update = useCallback((patch: TaxInputPatch) => {
    setInputs((prev) => ({
      ...prev,
      ...(typeof patch === "function" ? patch(prev) : patch),
    }));
  }, []);

  const primaryEmployment: EmploymentKind =
    EMPLOYMENT_PRIORITY.find((k) => i.employments.includes(k)) ?? "salaried";

  const toggleEmployment = useCallback(
    (id: EmploymentKind) =>
      update((prev) => {
        if (prev.employments.includes(id)) {
          const next = prev.employments.filter((x) => x !== id);
          // keep at least one selected
          return { employments: next.length > 0 ? next : prev.employments };
        }
        return { employments: [...prev.employments, id] };
      }),
    [update],
  );

  /** Section 80D parents premium cap: ₹50k if either parent is 60+, else ₹25k. */
  const parentsSeniorEffective =
    i.parentsAge > 0 ? i.parentsAge >= 60 : i.parentsSenior;
  const parents80DCap = parentsSeniorEffective ? 50_000 : 25_000;
  const self80DCap = i.age >= 60 ? 50_000 : 25_000;

  const setParentsSeniorChecked = useCallback(
    (on: boolean) =>
      update((prev) => {
        const a = prev.parentsAge;
        return {
          parentsSenior: on,
          parentsAge: on ? (a >= 60 ? a : 60) : a > 0 && a < 60 ? a : 0,
        };
      }),
    [update],
  );

  const setParentsAgeValue = useCallback(
    (v: number) => {
      const next = Math.round(v);
      update({ parentsAge: next, parentsSenior: next >= 60 });
    },
    [update],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await hydrateSyncKv();
      if (cancelled) return;
      try {
        const { inputs, savedAt } = readStoredInputs();
        setInputs(inputs);
        if (savedAt) setSavedAtDisplay(savedAt);
      } catch {
        /* ignore */
      }
      setStorageReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      const savedAt = new Date().toISOString();
      const dataToSave = {
        schemaVersion: TAX_CALC_SCHEMA_VERSION,
        ...i,
        employment: primaryEmployment,
        parentsSenior: i.parentsAge > 0 ? i.parentsAge >= 60 : i.parentsSenior,
        savedAt,
      };
      syncKv.setItem(TAX_CALCULATOR_STORAGE_KEY, JSON.stringify(dataToSave));
      setSavedAtDisplay(savedAt);
    } catch {
      /* ignore */
    }
  }, [storageReady, i, primaryEmployment]);

  useEffect(() => {
    if (i.age >= 60) update({ deduction80TTA: 0 });
  }, [i.age, update]);

  const derived = useMemo(() => {
    const rsuVestingAnnual = i.secRSU
      ? rsuVestingIncomeAnnual(i.rsuUnits, i.rsuFmvPerUnit)
      : 0;
    let rsuSaleStcg = 0;
    let rsuSaleLtcg = 0;
    if (i.secRSU && i.rsuPlanSell) {
      const g = rsuSaleGain(
        i.rsuUnitsSold,
        i.rsuSalePrice,
        i.rsuCostPrice > 0 ? i.rsuCostPrice : i.rsuFmvPerUnit,
      );
      if (g > 0) {
        if (i.rsuShortTerm) rsuSaleStcg = g;
        else rsuSaleLtcg = g;
      }
    }

    const grat = i.secGratuity
      ? gratuityTaxableExempt(
          i.gratReceived,
          i.gratEmployer,
          i.gratLastSalaryAnnual,
          i.gratYears,
        )
      : { exempt: 0, taxable: 0 };

    const leave = i.secLeave
      ? leaveEncashmentTaxableExemptIllustrative(
          i.leaveReceived,
          i.leaveTiming,
          i.leaveEmployer,
          i.leaveAvgMonthly,
          i.leaveYears,
          i.leaveDays,
        )
      : { exempt: 0, taxable: 0 };

    const lta = i.secLTA
      ? ltaSplit(i.ltaAnnualRecv, i.ltaClaiming, i.ltaTravelCost)
      : { exempt: 0, taxable: 0 };

    const bizProfit = i.secBusiness
      ? businessIncomeIllustrative(
          i.bizMode,
          i.bizGrossReceipts,
          i.bizExpenses,
          i.bizTurnover44AD,
          i.bizDigital44AD,
          i.bizReceipts44ADA,
        )
      : 0;

    const rental = i.secRental
      ? rentalTaxableIncomeIllustrative(
          i.rentAnnualGross,
          i.rentMunicipal,
          i.rentLoanInterest,
        )
      : null;

    let pensionForEngine = 0;
    let familyPensionForEngine = 0;
    if (i.secPension) {
      if (i.pensionKind === "family") {
        const fam = pensionAnnualFromMonthly(i.familyPensionMonthly);
        const ex = familyPensionExemptAnnual(i.familyPensionMonthly);
        familyPensionForEngine = Math.max(0, fam - ex);
      } else {
        const reg = pensionAnnualFromMonthly(i.pensionMonthly);
        const commEx = commutedPensionExemptIllustrative(
          i.commutedPension,
          i.pensionKind,
        );
        const commTaxable = Math.max(0, i.commutedPension - commEx);
        pensionForEngine = reg + commTaxable;
      }
    }

    const interestTotal = i.secInterest
      ? i.savingsInterest + i.fdInterest + i.postOfficeInterest + i.bondsInterest
      : 0;

    const dividendTotal = i.secDividend ? i.divIndian + i.divForeign : 0;

    const slabExtrasOther =
      (i.secCG ? i.cgDebtStcg + i.cgDebtLtcg + i.cgPropStcg : 0) +
      (i.secOther ? i.giftsTaxable + i.commissionIncome + i.otherMiscIncome : 0);

    const equityStcgTotal = (i.secCG ? i.cgEquityStcgExtra : 0) + rsuSaleStcg;
    const equityLtcgTotal = (i.secCG ? i.cgEquityLtcgExtra : 0) + rsuSaleLtcg;

    const hraSalaryAnnualForEngine = i.secHRA ? i.hraMonthly : 0;
    const rentAnnualEngine = i.secHRA ? Math.round(i.rentPaidMonthly * 12) : 0;
    const rentNoHraEngine = !i.secHRA && i.sec80GG ? i.rentPaidNoHra : 0;

    const salaryAnnualCore =
      (Math.max(0, i.basicMonthly) +
        Math.max(0, hraSalaryAnnualForEngine) +
        Math.max(0, i.specialAllowanceMonthly)) *
      12;

    return {
      rsuVestingAnnual,
      rsuSaleStcg,
      rsuSaleLtcg,
      gratuityTaxable: grat.taxable,
      gratuityExemptRec: grat.exempt,
      leaveTaxable: leave.taxable,
      leaveExemptRec: leave.exempt,
      ltaTaxable: lta.taxable,
      ltaExemptRec: lta.exempt,
      businessProfit: bizProfit,
      rentalTaxable: rental?.taxable ?? 0,
      rentalBreakdown: rental,
      pensionForEngine,
      familyPensionForEngine,
      interestIncome: interestTotal,
      dividendIncome: dividendTotal,
      slabTaxedOtherGains: slabExtrasOther,
      propertyLtcgGains: i.secCG ? i.cgPropLtcg : 0,
      lotteryGamblingIncome: i.secOther ? i.lotteryIncome : 0,
      equityStcgTotal,
      equityLtcgTotal,
      hasHRAFlag: i.secHRA,
      rentAnnualEngine,
      rentNoHraEngine,
      salaryAnnualCore,
      interestFor80TTAHint: i.secInterest ? i.savingsInterest : 0,
    };
  }, [i]);

  const running80C = Math.min(
    150_000,
    i.c80Elss + i.c80Ppf + i.c80Lic + i.c80Epf + i.c80Tuition + i.c80Principal,
  );

  const mealVoucherAnnualExemption = useMemo(() => {
    const monthly = Math.max(0, i.mealVoucherMonthly);
    if (monthly <= 0) return 0;
    const days = Math.max(0, i.mealVoucherWorkDaysPerMonth);
    const capPerMeal = i.mealVoucherUse200Cap ? 200 : 50;
    const monthlyCap = capPerMeal * days;
    return Math.max(0, Math.min(monthly, monthlyCap) * 12);
  }, [
    i.mealVoucherMonthly,
    i.mealVoucherWorkDaysPerMonth,
    i.mealVoucherUse200Cap,
  ]);

  const comparisonInputs = useMemo<ComparisonInputs>(
    () => ({
      age: i.age,
      employment: primaryEmployment,
      flags: { widowed: i.widowed, disabledSelf: i.disabledSelf, nri: i.nri },
      basicMonthly: i.basicMonthly,
      hraMonthly: i.secHRA ? i.hraMonthly : 0,
      allowancesMonthly: i.specialAllowanceMonthly,
      mealVoucherExemptionAnnual: mealVoucherAnnualExemption,
      hraSalaryBaseAnnualOverride: i.hraSalaryBaseAnnualOverride,
      rsuVestingAnnual: derived.rsuVestingAnnual,
      rsuSaleStcg: derived.rsuSaleStcg,
      rsuSaleLtcg: derived.rsuSaleLtcg,
      otherStcg: i.secCG ? i.cgEquityStcgExtra : 0,
      otherLtcg: i.secCG ? i.cgEquityLtcgExtra : 0,
      leaveEncashmentTaxable: derived.leaveTaxable,
      gratuityTaxable: derived.gratuityTaxable,
      ltaTaxable: derived.ltaTaxable,
      previousEmployerSalaryAnnual: i.secJobSwitch
        ? i.prevEmployerSalaryAnnual
        : 0,
      ffSettlementOtherTaxable: i.secJobSwitch ? i.ffOtherTaxable : 0,
      businessProfit: derived.businessProfit,
      freelanceIncome: i.freelanceIncome,
      pension: derived.pensionForEngine,
      familyPension: derived.familyPensionForEngine,
      rentalIncome: derived.rentalTaxable,
      interestIncome: derived.interestIncome,
      interestSavingsPortion: derived.interestFor80TTAHint,
      dividendIncome: derived.dividendIncome,
      slabTaxedOtherGains: derived.slabTaxedOtherGains,
      propertyLtcgGains: derived.propertyLtcgGains,
      lotteryGamblingIncome: derived.lotteryGamblingIncome,
      agriculturalIncome: i.secAgri ? i.agriculturalIncome : 0,
      excludeAgriculturalFromTax: i.excludeAgriculturalFromTax,
      hasHRA: derived.hasHRAFlag,
      hraReceivedAnnual: i.secHRA ? Math.round(i.hraMonthly * 12) : 0,
      rentPaidAnnual: derived.rentAnnualEngine,
      isMetro: i.isMetro,
      rentPaidNoHra: derived.rentNoHraEngine,
      deductions80C: i.secDed80c ? running80C : 0,
      nps80CCD1B: i.secDed80c ? i.nps80CCD1B : 0,
      deductions80DSelf: i.secDed80d ? i.deductions80DSelf : 0,
      deductions80DParents: i.secDed80d ? i.deductions80DParents : 0,
      parentsSenior: parentsSeniorEffective,
      deduction80DD: i.secDedRest ? i.deduction80DD : 0,
      deduction80DDB: i.secDedRest ? i.deduction80DDB : 0,
      deduction80E: i.secDedRest ? i.deduction80E : 0,
      deduction80EEA: i.secDedRest ? i.deduction80EEA : 0,
      deduction80G: i.secDedRest ? i.deduction80G : 0,
      deduction80TTA: i.secDedRest ? i.deduction80TTA : 0,
      deduction80TTB: i.secDedRest ? i.deduction80TTB : 0,
      deduction80U: i.secDedRest ? i.deduction80U : 0,
      deduction80RRB: i.secDedRest ? i.deduction80RRB : 0,
      homeLoanInterest24b: i.secDedRest ? i.homeLoanInterest24b : 0,
      professionalTax: i.secDedRest ? i.professionalTax : 0,
    }),
    [
      i,
      primaryEmployment,
      mealVoucherAnnualExemption,
      derived,
      running80C,
      parentsSeniorEffective,
    ],
  );

  const salaryAnnualPreview = useMemo(
    () => salaryAnnualFromMonthly(comparisonInputs),
    [comparisonInputs],
  );

  const { old: oldR, new: newR } = useMemo(
    () => compareRegimes(comparisonInputs),
    [comparisonInputs],
  );

  const winner: "old" | "new" | "tie" =
    oldR.totalTax < newR.totalTax
      ? "old"
      : newR.totalTax < oldR.totalTax
        ? "new"
        : "tie";

  const missedAlerts = useMemo(
    () =>
      buildMissedDeductionAlerts(comparisonInputs, {
        // Keep recommendations genuine: avoid "invest in deductions" nudges when new regime already wins.
        encourageDeductionInvestment: winner !== "new",
      }),
    [comparisonInputs, winner],
  );

  const ggPreview = useMemo(
    () => getDeduction80GGComputed(comparisonInputs),
    [comparisonInputs],
  );

  const salaryForHraPreview =
    i.hraSalaryBaseAnnualOverride > 0
      ? i.hraSalaryBaseAnnualOverride
      : Math.max(0, i.basicMonthly) * 12;
  const hraReceivedAnnualPreview = i.secHRA ? Math.round(i.hraMonthly * 12) : 0;
  const rentPaidAnnualPreview = i.secHRA ? Math.round(i.rentPaidMonthly * 12) : 0;
  const hraExemptAnnualPreview =
    i.secHRA && comparisonInputs.hasHRA
      ? calculateHRAExemption({
          hasHRA: true,
          salaryForHra: salaryForHraPreview,
          hraReceivedAnnual: hraReceivedAnnualPreview,
          rentPaidAnnual: rentPaidAnnualPreview,
          isMetro: i.isMetro,
        })
      : 0;
  const hraTaxableAnnualPreview = Math.max(
    0,
    hraReceivedAnnualPreview - hraExemptAnnualPreview,
  );

  const totalLtCgForExemption = sumEquityLtcg(comparisonInputs);
  const ltcgExemptionUsed = Math.min(totalLtCgForExemption, 125_000);

  const equityCgTaxOnly = useMemo(
    () =>
      computeIllustrativeEquityCgTax(
        sumEquityStcg(comparisonInputs),
        sumEquityLtcg(comparisonInputs),
      ),
    [comparisonInputs],
  );

  const saveAmount = Math.abs(oldR.totalTax - newR.totalTax);
  const oldMonthly = (oldR.grossForSurcharge - oldR.totalTax) / 12;
  const newMonthly = (newR.grossForSurcharge - newR.totalTax) / 12;

  const tips = useMemo(() => {
    const out: string[] = [];
    if (winner === "old") {
      out.push(
        "Old regime likely wins because deductions (80C stack, 80D split, HRA/80GG, loan interest) compress taxable income more than new slabs offset.",
      );
      out.push(
        "Share Form 16 drafts with payroll early — regime switches affect TDS cash-flow.",
      );
    } else if (winner === "new") {
      out.push(
        "New regime can win when deductions are thin — fewer proofs and ₹75k standard deduction (modelled here) help simplicity.",
      );
      out.push(
        `Approx annual advantage vs old at these inputs: ${rupees(saveAmount)}.`,
      );
    } else {
      out.push(
        "Nearly tied — choose based on proof workload and expected income trajectory.",
      );
    }
    if (i.nri)
      out.push(
        "NRIs: validate residency and DTAA — this model is domestic illustrative.",
      );
    if (i.secJobSwitch) {
      out.push(
        "Mid-year switch: sum both Form 16s (salary + F&F taxable bits) and claim all TDS — AIS/26AS should match before you file.",
      );
    }
    return out.slice(0, 4);
  }, [winner, saveAmount, i.nri, i.secJobSwitch]);

  const itrSuggestion = useMemo(() => {
    const equityGains =
      sumEquityStcg(comparisonInputs) + sumEquityLtcg(comparisonInputs);
    const hasCapitalGains =
      equityGains > 0 ||
      i.cgDebtStcg > 0 ||
      i.cgDebtLtcg > 0 ||
      i.cgPropStcg > 0 ||
      i.cgPropLtcg > 0;
    const hasBusinessOrProfession =
      i.secBusiness ||
      derived.businessProfit > 0 ||
      i.freelanceIncome > 0 ||
      i.employments.includes("business_owner") ||
      i.employments.includes("freelancer");
    const hasForeignComplexity = i.nri || i.divForeign > 0;
    const hasLottery = i.lotteryIncome > 0;
    const hasAgriComplexity = i.agriculturalIncome > 5_000;
    const midYearSwitch =
      i.secJobSwitch &&
      (i.prevEmployerSalaryAnnual > 0 ||
        i.ffOtherTaxable > 0 ||
        i.prevEmployerTds > 0 ||
        i.currentEmployerTds > 0);

    const guide = [
      {
        form: "ITR-1 (Sahaj)",
        when: "Resident individual with salary/pension, one house property, and other income (interest etc.) — no business, no capital gains (except exempt), no foreign assets.",
      },
      {
        form: "ITR-2",
        when: "Capital gains, more than one house property, foreign income/assets, or director/unlisted equity — still no business/profession income.",
      },
      {
        form: "ITR-3",
        when: "Income from business or profession (including partnership) that is not filed under presumptive schemes.",
      },
      {
        form: "ITR-4 (Sugam)",
        when: "Presumptive business/profession under 44AD / 44ADA / 44AE within turnover limits, plus salary/house/other income allowed in Sugam.",
      },
    ] as const;

    if (hasBusinessOrProfession) {
      const presumptiveLikely =
        i.secBusiness &&
        (i.bizMode === "44ad" || i.bizMode === "44ada") &&
        derived.businessProfit > 0;
      return {
        form: presumptiveLikely ? "ITR-4 (Sugam) likely" : "ITR-3 likely",
        why: presumptiveLikely
          ? "Business/profession entered with presumptive mode (44AD/44ADA)."
          : "Business/professional income entered.",
        note: midYearSwitch
          ? "Job switch does not change this — still report all salary Form 16s inside the business ITR."
          : "Confirm turnover/eligibility conditions before filing.",
        guide,
      };
    }

    if (
      !hasCapitalGains &&
      !hasForeignComplexity &&
      !hasLottery &&
      !hasAgriComplexity
    ) {
      return {
        form: "ITR-1 (Sahaj) likely",
        why: midYearSwitch
          ? "Salary-only profile with a mid-year job switch — still usually ITR-1 if you only have salary (+ allowed other income). Report both employers’ Form 16s."
          : "No business/profession and no complex income flags detected.",
        note: midYearSwitch
          ? "Carry forward TDS from both employers in the return so AIS/26AS matches. Leave/gratuity taxable portions stay under salary."
          : "Use ITR-1 only if all statutory conditions are satisfied.",
        guide,
      };
    }

    return {
      form: "ITR-2 likely",
      why: midYearSwitch
        ? "Complex income flags (e.g. capital gains / foreign) — job switch alone does not force ITR-2, but your other incomes do."
        : "Capital gains / foreign-linked / other non-business complexities detected.",
      note: "Recheck with your CA if any business-profession income exists.",
      guide,
    };
  }, [comparisonInputs, i, derived.businessProfit]);

  const tdsPrepaid = i.secJobSwitch
    ? i.prevEmployerTds + i.currentEmployerTds
    : i.currentEmployerTds;
  const taxBalanceVsTds = (regimeTotal: number) =>
    Math.round(regimeTotal - tdsPrepaid);

  const learnedToday = useMemo(() => {
    const rows: LearnedRow[] = [];
    if (i.secHRA) {
      rows.push({
        emoji: "🏠",
        title: "HRA",
        body: `Approx exempt ₹${Math.round(hraExemptAnnualPreview).toLocaleString("en-IN")}/yr · taxable HRA slice ₹${Math.round(hraTaxableAnnualPreview).toLocaleString("en-IN")}/yr (illustrative three-part test).`,
      });
    }
    if (!i.secHRA && i.sec80GG && i.rentPaidNoHra > 0) {
      rows.push({
        emoji: "🏠",
        title: "80GG rent (no HRA)",
        body: `Illustrative deduction ₹${Math.round(ggPreview).toLocaleString("en-IN")} — keep rent proofs.`,
      });
    }
    if (i.secLTA && (derived.ltaExemptRec > 0 || derived.ltaTaxable > 0)) {
      rows.push({
        emoji: "✈️",
        title: "LTA",
        body: `Exempt ₹${derived.ltaExemptRec.toLocaleString("en-IN")} · taxable ₹${derived.ltaTaxable.toLocaleString("en-IN")}. Blocks apply — verify with payroll.`,
      });
    }
    if (i.secRSU && derived.rsuVestingAnnual > 0) {
      rows.push({
        emoji: "📈",
        title: "RSU / ESOP",
        body: `Perquisite-style salary income ₹${derived.rsuVestingAnnual.toLocaleString("en-IN")}; sale modeled ₹${(derived.rsuSaleStcg + derived.rsuSaleLtcg).toLocaleString("en-IN")} gains under equity CG rates.`,
      });
    }
    if (i.secGratuity && i.gratReceived > 0) {
      rows.push({
        emoji: "🎁",
        title: "Gratuity",
        body: `Exempt ₹${derived.gratuityExemptRec.toLocaleString("en-IN")} · taxable ₹${derived.gratuityTaxable.toLocaleString("en-IN")}.`,
      });
    }
    if (i.secLeave && i.leaveReceived > 0) {
      rows.push({
        emoji: "🌴",
        title: "Leave encashment",
        body: `Exempt ₹${derived.leaveExemptRec.toLocaleString("en-IN")} · taxable ₹${derived.leaveTaxable.toLocaleString("en-IN")}. Section 10(10AA) nuances apply.`,
      });
    }
    if (i.secBusiness && derived.businessProfit > 0) {
      rows.push({
        emoji: "💼",
        title: "Business income",
        body: `Modeled profit ₹${derived.businessProfit.toLocaleString("en-IN")} (${i.bizMode.toUpperCase()} illustration).`,
      });
    }
    if (i.secRental && derived.rentalBreakdown) {
      const r = derived.rentalBreakdown;
      rows.push({
        emoji: "🏢",
        title: "Rental income",
        body: `NAV ₹${Math.round(r.nav).toLocaleString("en-IN")} · after 30% standard & loan interest → taxable ₹${derived.rentalTaxable.toLocaleString("en-IN")}.`,
      });
    }
    if (
      i.secPension &&
      (derived.pensionForEngine > 0 || derived.familyPensionForEngine > 0)
    ) {
      rows.push({
        emoji: "🏖️",
        title: "Pension",
        body: `Taxable pension slices entering ordinary income total ₹${(derived.pensionForEngine + derived.familyPensionForEngine).toLocaleString("en-IN")} (exemptions applied in-tool).`,
      });
    }
    if (i.secInterest && derived.interestIncome > 0) {
      rows.push({
        emoji: "🏦",
        title: "Interest",
        body: `Total interest ₹${derived.interestIncome.toLocaleString("en-IN")}; align 80TTA/80TTB entries with savings vs FD buckets.`,
      });
    }
    if (i.secDividend && derived.dividendIncome > 0) {
      rows.push({
        emoji: "💰",
        title: "Dividends",
        body: `₹${derived.dividendIncome.toLocaleString("en-IN")} taxed at slab in your hands (DDT removed).`,
      });
    }
    if (i.secCG) {
      rows.push({
        emoji: "📊",
        title: "Capital gains",
        body: `Equity CG tax (illustrative) ₹${equityCgTaxOnly.toLocaleString("en-IN")}; LTCG exemption used ₹${Math.round(ltcgExemptionUsed).toLocaleString("en-IN")} of ₹1,25,000.`,
      });
    }
    if (i.secAgri && i.agriculturalIncome > 0) {
      rows.push({
        emoji: "🌾",
        title: "Agricultural income",
        body: i.excludeAgriculturalFromTax
          ? "Excluded from ordinary gross in this run — partial integration not modeled."
          : "Included in ordinary gross — confirm exemption vs integration with a CA.",
      });
    }
    if (
      i.secOther &&
      (i.lotteryIncome > 0 ||
        i.giftsTaxable > 0 ||
        i.commissionIncome > 0 ||
        i.otherMiscIncome > 0)
    ) {
      rows.push({
        emoji: "💫",
        title: "Other income",
        body: `Lottery modeled at 30% flat on ₹${i.lotteryIncome.toLocaleString("en-IN")}; other slab items ₹${(i.giftsTaxable + i.commissionIncome + i.otherMiscIncome).toLocaleString("en-IN")}.`,
      });
    }
    return rows;
  }, [
    i,
    ggPreview,
    derived,
    equityCgTaxOnly,
    ltcgExemptionUsed,
    hraExemptAnnualPreview,
    hraTaxableAnnualPreview,
  ]);

  const syncWizardToggles = useCallback(
    () =>
      update((p) => ({
        secHRA: p.hraMonthly > 0 || p.rentPaidMonthly > 0,
        sec80GG:
          !(p.hraMonthly > 0 || p.rentPaidMonthly > 0) && p.rentPaidNoHra > 0,
        secInterest:
          p.savingsInterest > 0 ||
          p.fdInterest > 0 ||
          p.postOfficeInterest > 0 ||
          p.bondsInterest > 0,
        secDividend: p.divIndian > 0 || p.divForeign > 0,
        secLTA: p.ltaAnnualRecv > 0 || p.ltaTravelCost > 0,
        secRSU: p.rsuUnits > 0 || p.rsuUnitsSold > 0,
        secLeave: p.leaveReceived > 0 || p.leaveDays > 0,
        secRental:
          p.rentAnnualGross > 0 || p.rentMunicipal > 0 || p.rentLoanInterest > 0,
        secCG:
          p.cgEquityStcgExtra > 0 ||
          p.cgEquityLtcgExtra > 0 ||
          p.cgDebtStcg > 0 ||
          p.cgDebtLtcg > 0 ||
          p.cgPropStcg > 0 ||
          p.cgPropLtcg > 0,
        secOther:
          p.lotteryIncome > 0 ||
          p.giftsTaxable > 0 ||
          p.commissionIncome > 0 ||
          p.otherMiscIncome > 0,
        secAgri: p.agriculturalIncome > 0,
        secDed80c:
          p.c80Elss +
            p.c80Ppf +
            p.c80Lic +
            p.c80Epf +
            p.c80Tuition +
            p.c80Principal +
            p.nps80CCD1B >
          0,
        secDed80d: p.deductions80DSelf + p.deductions80DParents > 0,
        secDedRest:
          p.deduction80DD +
            p.deduction80DDB +
            p.deduction80E +
            p.deduction80EEA +
            p.deduction80G +
            p.deduction80TTA +
            p.deduction80TTB +
            p.deduction80U +
            p.deduction80RRB +
            p.homeLoanInterest24b +
            p.professionalTax >
          0,
      })),
    [update],
  );

  return {
    i,
    update,
    storageReady,
    savedAtDisplay,
    primaryEmployment,
    toggleEmployment,
    parentsSeniorEffective,
    parents80DCap,
    self80DCap,
    setParentsSeniorChecked,
    setParentsAgeValue,
    derived,
    running80C,
    mealVoucherAnnualExemption,
    comparisonInputs,
    salaryAnnualPreview,
    oldR,
    newR,
    winner,
    missedAlerts,
    ggPreview,
    hraExemptAnnualPreview,
    hraTaxableAnnualPreview,
    ltcgExemptionUsed,
    equityCgTaxOnly,
    saveAmount,
    oldMonthly,
    newMonthly,
    tips,
    itrSuggestion,
    tdsPrepaid,
    taxBalanceVsTds,
    learnedToday,
    syncWizardToggles,
  };
}

export type TaxCalcState = ReturnType<typeof useTaxCalculatorState>;
