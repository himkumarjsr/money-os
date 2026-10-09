"use client";

import { PaywallModal } from "@/components/analyse/paywall-modal";
import MoneyInput from "@/components/ui/MoneyInput";
import NumberInput from "@/components/ui/NumberInput";
import PrivateAmount from "@/components/ui/PrivateAmount";
import { AppIcon } from "@/components/ui/AppIcon";
import { Analytics } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { parseMoneyInput } from "@/lib/analyse-form-schema";
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
import { formatIndian } from "@/lib/formatters";
import { TEACH } from "@/lib/taxTeachContent";
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
  type RegimeBreakdown,
} from "@/lib/taxRegimeComparisonFY2026";
import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { Insight } from "./calculator-ui";
import type { TaxTeachContent } from "@/lib/taxTeachContent";
import { TaxTeachTooltip } from "./TaxTeachTooltip";
import { ToggleSection } from "./ToggleSection";

export const TAX_CALCULATOR_STORAGE_KEY = "finkoin_tax_calculator";
const TAX_CALC_SCHEMA_VERSION = 3;

/** Step 1 (checklist): only screen with voice. Spaced for clearer TTS. */
const PERSONAL_CA_STEP1_WELCOME_TTS =
  "Welcome to Finkoin — your Personal CA. Please have your documents ready before we start.";

function pickPersonalCAFemaleVoice(
  synth: SpeechSynthesis,
): SpeechSynthesisVoice | null {
  const voices = synth.getVoices();
  if (voices.length === 0) return null;
  const rank = (v: SpeechSynthesisVoice): number => {
    const blob = `${v.name} ${v.voiceURI}`.toLowerCase();
    if (/female|woman|\bf\s|\(f\)/.test(blob)) return 5;
    if (
      /\b(zira|samantha|karen|victoria|veena|tessa|fiona|serena|martha|moira|paayal|sangeeta|lekha)\b/.test(
        blob,
      )
    )
      return 4;
    if (/google.+(english|us|uk).+female|microsoft.+female/.test(blob))
      return 4;
    return 0;
  };
  const en = voices.filter((v) => /^en/i.test(v.lang || ""));
  const pool = en.length > 0 ? en : voices;
  const byRank = [...pool].sort((a, b) => rank(b) - rank(a));
  const best = byRank.find((v) => rank(v) > 0);
  if (best) return best;
  return (
    pool.find((v) => /en[-_]IN/i.test(v.lang)) ||
    pool.find((v) => /en[-_]US/i.test(v.lang)) ||
    pool[0] ||
    null
  );
}

function Mt(
  props: Omit<ComponentProps<typeof MoneyInput>, "labelAction"> & {
    teach: TaxTeachContent;
  },
) {
  const { teach, ...rest } = props;
  return (
    <MoneyInput {...rest} labelAction={<TaxTeachTooltip content={teach} />} />
  );
}

function rupees(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function fmtSideRow(label: string, value: string) {
  return (
    <div className="flex gap-2 py-0.5 text-xs sm:py-0 sm:text-sm">
      <span className="min-w-0 flex-1 break-words text-[#5F5E5A]">{label}</span>
      <span className="max-w-[52%] shrink-0 text-right font-semibold tabular-nums text-[#111110] sm:max-w-none">
        {value}
      </span>
    </div>
  );
}

function unlockPageScroll() {
  if (typeof document === "undefined") return;
  document.body.style.overflow = "";
}

function regimeColumn(
  row: RegimeBreakdown,
  deductionLabel: string,
  showLines: boolean,
) {
  const preCess = row.taxBeforeSurcharge + row.surcharge;
  return (
    <div className="space-y-1.5 rounded-xl border border-[#E8E6F0] bg-[#FAFAFE]/60 p-3 sm:space-y-2 sm:p-4">
      {fmtSideRow("Ordinary gross income", rupees(row.ordinaryGrossIncome))}
      {row.equityStcgGains > 0
        ? fmtSideRow("Equity STCG gains (entered)", rupees(row.equityStcgGains))
        : null}
      {row.equityLtcgGains > 0
        ? fmtSideRow("Equity LTCG gains (entered)", rupees(row.equityLtcgGains))
        : null}
      {fmtSideRow(
        "Gross for surcharge (ord. + gains)",
        rupees(row.grossForSurcharge),
      )}
      {fmtSideRow(deductionLabel, rupees(row.deductionAmount))}
      {showLines && row.deductionLines.length > 0 ? (
        <details className="rounded-lg border border-[#E8E6F0] bg-white/80 px-3 py-2 text-xs">
          <summary className="cursor-pointer font-medium text-[#534AB7]">
            Deduction detail
          </summary>
          <ul className="mt-2 space-y-1 border-t border-[#F0EFF8] pt-2">
            {row.deductionLines.map((d) => (
              <li key={d.label} className="flex justify-between gap-2">
                <span className="text-[#7A7871]">{d.label}</span>
                <span className="tabular-nums">{rupees(d.amount)}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {fmtSideRow("Taxable income (slab base)", rupees(row.taxableIncome))}
      {fmtSideRow("Slab tax (before 87A)", rupees(row.slabTaxBeforeRebate))}
      {row.rebate87A
        ? fmtSideRow("87A rebate", "Applied on slab income")
        : null}
      {fmtSideRow("Slab tax after 87A", rupees(row.slabTaxNetOfRebate))}
      {fmtSideRow(
        "Illustrative CG / specific-rate tax",
        rupees(row.equityCgTax),
      )}
      {fmtSideRow("Tax + surcharge (before cess)", rupees(preCess))}
      {fmtSideRow("Cess (4%)", rupees(row.cess))}
      <div className="border-t border-[#E8E6F0] pt-2 font-bold">
        {fmtSideRow("TOTAL TAX", rupees(row.totalTax))}
      </div>
    </div>
  );
}

function mobileComparisonTable(oldR: RegimeBreakdown, newR: RegimeBreakdown) {
  const oldPreCess = oldR.taxBeforeSurcharge + oldR.surcharge;
  const newPreCess = newR.taxBeforeSurcharge + newR.surcharge;
  const rows = [
    {
      label: "Ordinary gross",
      old: rupees(oldR.ordinaryGrossIncome),
      next: rupees(newR.ordinaryGrossIncome),
    },
    {
      label: "Gross for surcharge",
      old: rupees(oldR.grossForSurcharge),
      next: rupees(newR.grossForSurcharge),
    },
    {
      label: "Deductions",
      old: rupees(oldR.deductionAmount),
      next: rupees(newR.deductionAmount),
    },
    {
      label: "Taxable income",
      old: rupees(oldR.taxableIncome),
      next: rupees(newR.taxableIncome),
    },
    {
      label: "Slab tax (pre 87A)",
      old: rupees(oldR.slabTaxBeforeRebate),
      next: rupees(newR.slabTaxBeforeRebate),
    },
    {
      label: "87A rebate",
      old: oldR.rebate87A ? "Applied" : "No",
      next: newR.rebate87A ? "Applied" : "No",
    },
    {
      label: "Slab tax (post 87A)",
      old: rupees(oldR.slabTaxNetOfRebate),
      next: rupees(newR.slabTaxNetOfRebate),
    },
    {
      label: "CG / specific-rate tax",
      old: rupees(oldR.equityCgTax),
      next: rupees(newR.equityCgTax),
    },
    {
      label: "Tax + surcharge",
      old: rupees(oldPreCess),
      next: rupees(newPreCess),
    },
    { label: "Cess (4%)", old: rupees(oldR.cess), next: rupees(newR.cess) },
    {
      label: "TOTAL TAX",
      old: rupees(oldR.totalTax),
      next: rupees(newR.totalTax),
      total: true,
    },
  ];

  return (
    <div className="md:hidden">
      <div className="overflow-hidden rounded-lg bg-white">
        <div className="grid grid-cols-[1.2fr_1fr_1fr] border-b border-[#F0EFF8] bg-[#FCFCFF] px-3 py-2 text-[11px] font-semibold text-[#534AB7]">
          <span>Category</span>
          <span className="text-right">Old</span>
          <span className="text-right">New</span>
        </div>
        <div className="divide-y divide-[#F4F3FA] bg-white">
          {rows.map((row) => (
            <div
              key={row.label}
              className={cn(
                "grid grid-cols-[1.2fr_1fr_1fr] gap-2 px-3 py-2 text-xs",
                row.total ? "bg-[#FCFCFF] font-bold text-[#111110]" : "",
              )}
            >
              <span className="text-[#5F5E5A]">{row.label}</span>
              <span className="text-right tabular-nums text-[#111110]">
                {row.old}
              </span>
              <span className="text-right tabular-nums text-[#111110]">
                {row.next}
              </span>
            </div>
          ))}
        </div>
      </div>
      {oldR.deductionLines.length > 0 || newR.deductionLines.length > 0 ? (
        <details className="mt-2 rounded-lg bg-[#FCFCFF] px-3 py-2 text-xs">
          <summary className="cursor-pointer font-medium text-[#534AB7]">
            Deduction detail
          </summary>
          {oldR.deductionLines.length > 0 ? (
            <div className="mt-2 border-t border-[#F2F1F8] pt-2">
              <p className="mb-1 font-semibold text-[#111110]">Old regime</p>
              <ul className="space-y-1">
                {oldR.deductionLines.map((d) => (
                  <li
                    key={`old-${d.label}`}
                    className="flex justify-between gap-2"
                  >
                    <span className="text-[#7A7871]">{d.label}</span>
                    <span className="tabular-nums">{rupees(d.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {newR.deductionLines.length > 0 ? (
            <div className="mt-2 border-t border-[#F2F1F8] pt-2">
              <p className="mb-1 font-semibold text-[#111110]">New regime</p>
              <ul className="space-y-1">
                {newR.deductionLines.map((d) => (
                  <li
                    key={`new-${d.label}`}
                    className="flex justify-between gap-2"
                  >
                    <span className="text-[#7A7871]">{d.label}</span>
                    <span className="tabular-nums">{rupees(d.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </details>
      ) : null}
    </div>
  );
}

const EMPLOYMENT_OPTIONS: { id: EmploymentKind; label: string }[] = [
  { id: "salaried", label: "Salaried" },
  { id: "business_owner", label: "Business owner" },
  { id: "freelancer", label: "Freelancer" },
  { id: "retired", label: "Retired" },
  { id: "pensioner", label: "Pensioner" },
];

// The engine only needs a single primary classification (it drives ITR hints /
// missed-deduction alerts, not the tax math). When a user picks several sources
// we surface the one that unlocks the most guidance, in this priority order.
const EMPLOYMENT_PRIORITY: EmploymentKind[] = [
  "salaried",
  "freelancer",
  "business_owner",
  "pensioner",
  "retired",
];

function sectionBlurb(text: string) {
  return (
    <p className="mt-2 line-clamp-3 text-[11px] leading-snug text-[#7A7871] sm:line-clamp-none sm:text-xs sm:leading-relaxed">
      {text}
    </p>
  );
}

function chip(active: boolean, label: string, onClick: () => void) {
  const pill =
    "rounded-full px-3 py-2 text-sm font-semibold transition sm:px-4";
  return (
    <button
      type="button"
      className={cn(
        pill,
        active ? "bg-[#534AB7] text-white" : "bg-slate-100 text-slate-700",
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function TaxRegimeCalculator() {
  const [storageReady, setStorageReady] = useState(false);
  const [inputEpoch, setInputEpoch] = useState(0);
  const [savedAtDisplay, setSavedAtDisplay] = useState<string | null>(null);

  const [employments, setEmployments] = useState<EmploymentKind[]>([
    "salaried",
  ]);
  const primaryEmployment: EmploymentKind =
    EMPLOYMENT_PRIORITY.find((k) => employments.includes(k)) ?? "salaried";
  const toggleEmployment = (id: EmploymentKind) =>
    setEmployments((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        return next.length > 0 ? next : prev; // keep at least one selected
      }
      return [...prev, id];
    });
  const [widowed, setWidowed] = useState(false);
  const [disabledSelf, setDisabledSelf] = useState(false);
  const [nri, setNri] = useState(false);
  /** Oldest parent’s age (for 80D parents cap). 0 = not entered yet. */
  const [parentsAge, setParentsAge] = useState(0);
  const [parentsSenior, setParentsSenior] = useState(false);
  const [age, setAge] = useState(18);

  /** Section 80D parents premium cap: ₹50k if either parent is 60+, else ₹25k. */
  const parentsSeniorEffective =
    parentsAge > 0 ? parentsAge >= 60 : parentsSenior;
  const parents80DCap = parentsSeniorEffective ? 50_000 : 25_000;
  const self80DCap = age >= 60 ? 50_000 : 25_000;

  const [basicMonthly, setBasicMonthly] = useState(0);
  const [specialAllowanceMonthly, setSpecialAllowanceMonthly] = useState(0);
  const [mealVoucherMonthly, setMealVoucherMonthly] = useState(0);
  const [mealVoucherWorkDaysPerMonth, setMealVoucherWorkDaysPerMonth] =
    useState(22);
  const [mealVoucherUse200Cap, setMealVoucherUse200Cap] = useState(true);

  const [secHRA, setSecHRA] = useState(false);
  const [hraMonthly, setHraMonthly] = useState(0);
  const [rentPaidMonthly, setRentPaidMonthly] = useState(0);
  const [isMetro, setIsMetro] = useState(true);

  const [sec80GG, setSec80GG] = useState(false);
  const [rentPaidNoHra, setRentPaidNoHra] = useState(0);

  const [secLTA, setSecLTA] = useState(false);
  const [ltaAnnualRecv, setLtaAnnualRecv] = useState(0);
  const [ltaClaiming, setLtaClaiming] = useState(false);
  const [ltaTravelCost, setLtaTravelCost] = useState(0);

  const [secRSU, setSecRSU] = useState(false);
  const [_rsuListing, setRsuListing] = useState<RsuListing>("india");
  const [rsuUnits, setRsuUnits] = useState(0);
  const [rsuFmvPerUnit, setRsuFmvPerUnit] = useState(0);
  const [rsuPlanSell, setRsuPlanSell] = useState(false);
  const [rsuUnitsSold, setRsuUnitsSold] = useState(0);
  const [rsuSalePrice, setRsuSalePrice] = useState(0);
  const [rsuCostPrice, setRsuCostPrice] = useState(0);
  const [rsuShortTerm, setRsuShortTerm] = useState(true);

  const [secGratuity, setSecGratuity] = useState(false);
  const [gratEmployer, setGratEmployer] = useState<GratuityEmployer>("private");
  const [gratReceived, setGratReceived] = useState(0);
  const [gratYears, setGratYears] = useState(0);
  const [gratLastSalaryAnnual, setGratLastSalaryAnnual] = useState(0);

  const [secLeave, setSecLeave] = useState(false);
  const [leaveTiming, setLeaveTiming] =
    useState<LeaveEncashTiming>("during_service");
  const [leaveEmployer, setLeaveEmployer] =
    useState<LeaveEncashEmployer>("private");
  const [leaveReceived, setLeaveReceived] = useState(0);
  const [leaveAvgMonthly, setLeaveAvgMonthly] = useState(0);
  const [leaveYears, setLeaveYears] = useState(0);
  const [leaveDays, setLeaveDays] = useState(0);

  const [secBusiness, setSecBusiness] = useState(false);
  const [bizMode, setBizMode] = useState<BusinessMode>("regular");
  const [bizGrossReceipts, setBizGrossReceipts] = useState(0);
  const [bizExpenses, setBizExpenses] = useState(0);
  const [bizTurnover44AD, setBizTurnover44AD] = useState(0);
  const [bizDigital44AD, setBizDigital44AD] = useState(false);
  const [bizReceipts44ADA, setBizReceipts44ADA] = useState(0);

  const [secRental, setSecRental] = useState(false);
  const [rentAnnualGross, setRentAnnualGross] = useState(0);
  const [rentMunicipal, setRentMunicipal] = useState(0);
  const [rentLoanInterest, setRentLoanInterest] = useState(0);

  const [secPension, setSecPension] = useState(false);
  const [pensionKind, setPensionKind] = useState<PensionKind>("private");
  const [pensionMonthly, setPensionMonthly] = useState(0);
  const [familyPensionMonthly, setFamilyPensionMonthly] = useState(0);
  const [commutedPension, setCommutedPension] = useState(0);

  const [secInterest, setSecInterest] = useState(false);
  const [savingsInterest, setSavingsInterest] = useState(0);
  const [fdInterest, setFdInterest] = useState(0);
  const [postOfficeInterest, setPostOfficeInterest] = useState(0);
  const [bondsInterest, setBondsInterest] = useState(0);

  const [secDividend, setSecDividend] = useState(false);
  const [divIndian, setDivIndian] = useState(0);
  const [divForeign, setDivForeign] = useState(0);

  const [secCG, setSecCG] = useState(false);
  const [cgEquityStcgExtra, setCgEquityStcgExtra] = useState(0);
  const [cgEquityLtcgExtra, setCgEquityLtcgExtra] = useState(0);
  const [cgDebtStcg, setCgDebtStcg] = useState(0);
  const [cgDebtLtcg, setCgDebtLtcg] = useState(0);
  const [cgPropStcg, setCgPropStcg] = useState(0);
  const [cgPropLtcg, setCgPropLtcg] = useState(0);

  const [secAgri, setSecAgri] = useState(false);
  const [agriculturalIncome, setAgriculturalIncome] = useState(0);
  const [excludeAgriculturalFromTax, setExcludeAgriculturalFromTax] =
    useState(true);

  const [secOther, setSecOther] = useState(false);
  const [lotteryIncome, setLotteryIncome] = useState(0);
  const [giftsTaxable, setGiftsTaxable] = useState(0);
  const [commissionIncome, setCommissionIncome] = useState(0);
  const [otherMiscIncome, setOtherMiscIncome] = useState(0);

  const [freelanceIncome, setFreelanceIncome] = useState(0);

  /** Mid-year job switch / Full & Final settlement */
  const [secJobSwitch, setSecJobSwitch] = useState(false);
  const [prevEmployerSalaryAnnual, setPrevEmployerSalaryAnnual] = useState(0);
  const [prevEmployerTds, setPrevEmployerTds] = useState(0);
  const [currentEmployerTds, setCurrentEmployerTds] = useState(0);
  const [ffOtherTaxable, setFfOtherTaxable] = useState(0);

  const [secDed80c, setSecDed80c] = useState(false);
  const [secDed80d, setSecDed80d] = useState(false);
  const [secDedRest, setSecDedRest] = useState(false);

  const [c80Elss, setC80Elss] = useState(0);
  const [c80Ppf, setC80Ppf] = useState(0);
  const [c80Lic, setC80Lic] = useState(0);
  const [c80Epf, setC80Epf] = useState(0);
  const [c80Tuition, setC80Tuition] = useState(0);
  const [c80Principal, setC80Principal] = useState(0);
  const [nps80CCD1B, setNps80CCD1B] = useState(0);
  const [deductions80DSelf, setDeductions80DSelf] = useState(0);
  const [deductions80DParents, setDeductions80DParents] = useState(0);
  const [deduction80DD, setDeduction80DD] = useState(0);
  const [deduction80DDB, setDeduction80DDB] = useState(0);
  const [deduction80E, setDeduction80E] = useState(0);
  const [deduction80EEA, setDeduction80EEA] = useState(0);
  const [deduction80G, setDeduction80G] = useState(0);
  const [deduction80TTA, setDeduction80TTA] = useState(0);
  const [deduction80TTB, setDeduction80TTB] = useState(0);
  const [deduction80U, setDeduction80U] = useState(0);
  const [deduction80RRB, setDeduction80RRB] = useState(0);
  const [homeLoanInterest24b, setHomeLoanInterest24b] = useState(0);
  const [professionalTax, setProfessionalTax] = useState(0);

  const [hraSalaryBaseAnnualOverride, setHraSalaryBaseAnnualOverride] =
    useState(0);

  const [paywallOpen, setPaywallOpen] = useState(false);
  const [personalCAOpen, setPersonalCAOpen] = useState(true);
  const [hasTrackedUsage, setHasTrackedUsage] = useState(false);
  const [personalCAStep, setPersonalCAStep] = useState(0);
  const [speechMuted, setSpeechMuted] = useState(false);
  const [caChecklist, setCaChecklist] = useState({
    salary: false,
    form16: false,
    interest: false,
    dividends: false,
    investments: false,
    rentLoan: false,
    gains: false,
  });

  useEffect(() => {
    if (hasTrackedUsage) return;
    Analytics.taxCalculatorUsed();
    setHasTrackedUsage(true);
  }, [hasTrackedUsage]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(TAX_CALCULATOR_STORAGE_KEY);
      if (!saved) {
        setStorageReady(true);
        setInputEpoch((e) => e + 1);
        return;
      }
      const d = JSON.parse(saved) as Record<string, unknown>;
      if (
        typeof d !== "object" ||
        d === null ||
        (d as { schemaVersion?: number }).schemaVersion !==
          TAX_CALC_SCHEMA_VERSION
      ) {
        localStorage.removeItem(TAX_CALCULATOR_STORAGE_KEY);
        setStorageReady(true);
        setInputEpoch((e) => e + 1);
        return;
      }

      const g = <T,>(key: string, fallback: T): T =>
        d[key] !== undefined && d[key] !== null ? (d[key] as T) : fallback;

      const storedEmployments = g<EmploymentKind[] | null>("employments", null);
      const legacyEmployment = g<EmploymentKind | null>("employment", null);
      setEmployments(
        Array.isArray(storedEmployments) && storedEmployments.length > 0
          ? storedEmployments
          : legacyEmployment
            ? [legacyEmployment]
            : ["salaried"],
      );
      setWidowed(g("widowed", false));
      setDisabledSelf(g("disabledSelf", false));
      setNri(g("nri", false));
      const legacySenior = g("parentsSenior", false);
      setParentsSenior(legacySenior);
      setParentsAge(g("parentsAge", legacySenior ? 60 : 0));
      setAge(g("age", 18));
      setBasicMonthly(g("basicMonthly", 0));
      setSpecialAllowanceMonthly(
        g("specialAllowanceMonthly", g("allowancesMonthly", 0)),
      );
      setMealVoucherMonthly(g("mealVoucherMonthly", 0));
      setMealVoucherWorkDaysPerMonth(g("mealVoucherWorkDaysPerMonth", 22));
      setMealVoucherUse200Cap(g("mealVoucherUse200Cap", true));
      setSecHRA(g("secHRA", g("hasHRA", false)));
      setHraMonthly(g("hraMonthly", 0));
      setRentPaidMonthly(g("rentPaidMonthly", 0));
      setIsMetro(g("isMetro", true));
      setSec80GG(g("sec80GG", false));
      setRentPaidNoHra(g("rentPaidNoHra", 0));
      setSecLTA(g("secLTA", false));
      setLtaAnnualRecv(g("ltaAnnualRecv", 0));
      setLtaClaiming(g("ltaClaiming", false));
      setLtaTravelCost(g("ltaTravelCost", 0));
      setSecRSU(g("secRSU", false));
      setRsuListing(g("rsuListing", "india"));
      setRsuUnits(g("rsuUnits", 0));
      setRsuFmvPerUnit(g("rsuFmvPerUnit", 0));
      setRsuPlanSell(g("rsuPlanSell", false));
      setRsuUnitsSold(g("rsuUnitsSold", 0));
      setRsuSalePrice(g("rsuSalePrice", 0));
      setRsuCostPrice(g("rsuCostPrice", 0));
      setRsuShortTerm(g("rsuShortTerm", true));
      setSecGratuity(g("secGratuity", false));
      setGratEmployer(g("gratEmployer", "private"));
      setGratReceived(g("gratReceived", 0));
      setGratYears(g("gratYears", 0));
      setGratLastSalaryAnnual(g("gratLastSalaryAnnual", 0));
      setSecLeave(g("secLeave", false));
      setLeaveTiming(g("leaveTiming", "during_service"));
      setLeaveEmployer(g("leaveEmployer", "private"));
      setLeaveReceived(g("leaveReceived", 0));
      setLeaveAvgMonthly(g("leaveAvgMonthly", 0));
      setLeaveYears(g("leaveYears", 0));
      setLeaveDays(g("leaveDays", 0));
      setSecBusiness(g("secBusiness", false));
      setBizMode(g("bizMode", "regular"));
      setBizGrossReceipts(g("bizGrossReceipts", 0));
      setBizExpenses(g("bizExpenses", 0));
      setBizTurnover44AD(g("bizTurnover44AD", 0));
      setBizDigital44AD(g("bizDigital44AD", false));
      setBizReceipts44ADA(g("bizReceipts44ADA", 0));
      setSecRental(g("secRental", false));
      setRentAnnualGross(g("rentAnnualGross", 0));
      setRentMunicipal(g("rentMunicipal", 0));
      setRentLoanInterest(g("rentLoanInterest", 0));
      setSecPension(g("secPension", false));
      setPensionKind(g("pensionKind", "private"));
      setPensionMonthly(g("pensionMonthly", 0));
      setFamilyPensionMonthly(g("familyPensionMonthly", 0));
      setCommutedPension(g("commutedPension", 0));
      setSecInterest(g("secInterest", false));
      setSavingsInterest(g("savingsInterest", 0));
      setFdInterest(g("fdInterest", 0));
      setPostOfficeInterest(g("postOfficeInterest", 0));
      setBondsInterest(g("bondsInterest", 0));
      setSecDividend(g("secDividend", false));
      setDivIndian(g("divIndian", 0));
      setDivForeign(g("divForeign", 0));
      setSecCG(g("secCG", false));
      setCgEquityStcgExtra(g("cgEquityStcgExtra", g("otherStcg", 0)));
      setCgEquityLtcgExtra(g("cgEquityLtcgExtra", g("otherLtcg", 0)));
      setCgDebtStcg(g("cgDebtStcg", 0));
      setCgDebtLtcg(g("cgDebtLtcg", 0));
      setCgPropStcg(g("cgPropStcg", 0));
      setCgPropLtcg(g("cgPropLtcg", 0));
      setSecAgri(g("secAgri", false));
      setAgriculturalIncome(g("agriculturalIncome", 0));
      setExcludeAgriculturalFromTax(g("excludeAgriculturalFromTax", true));
      setSecOther(g("secOther", false));
      setLotteryIncome(g("lotteryIncome", 0));
      setGiftsTaxable(g("giftsTaxable", 0));
      setCommissionIncome(g("commissionIncome", 0));
      setOtherMiscIncome(g("otherMiscIncome", 0));
      setFreelanceIncome(g("freelanceIncome", 0));
      setSecJobSwitch(g("secJobSwitch", false));
      setPrevEmployerSalaryAnnual(g("prevEmployerSalaryAnnual", 0));
      setPrevEmployerTds(g("prevEmployerTds", 0));
      setCurrentEmployerTds(g("currentEmployerTds", 0));
      setFfOtherTaxable(g("ffOtherTaxable", 0));
      setSecDed80c(g("secDed80c", false));
      setSecDed80d(g("secDed80d", false));
      setSecDedRest(g("secDedRest", false));
      setC80Elss(g("c80Elss", 0));
      setC80Ppf(g("c80Ppf", 0));
      setC80Lic(g("c80Lic", 0));
      setC80Epf(g("c80Epf", 0));
      setC80Tuition(g("c80Tuition", 0));
      setC80Principal(g("c80Principal", 0));
      setNps80CCD1B(g("nps80CCD1B", 0));
      setDeductions80DSelf(g("deductions80DSelf", 0));
      setDeductions80DParents(g("deductions80DParents", 0));
      setDeduction80DD(g("deduction80DD", 0));
      setDeduction80DDB(g("deduction80DDB", 0));
      setDeduction80E(g("deduction80E", 0));
      setDeduction80EEA(g("deduction80EEA", 0));
      setDeduction80G(g("deduction80G", 0));
      setDeduction80TTA(g("deduction80TTA", 0));
      setDeduction80TTB(g("deduction80TTB", 0));
      setDeduction80U(g("deduction80U", 0));
      setDeduction80RRB(g("deduction80RRB", 0));
      setHomeLoanInterest24b(g("homeLoanInterest24b", 0));
      setProfessionalTax(g("professionalTax", 0));
      setHraSalaryBaseAnnualOverride(g("hraSalaryBaseAnnualOverride", 0));

      if (typeof d.savedAt === "string") setSavedAtDisplay(d.savedAt);
    } catch {
      /* ignore */
    }
    setStorageReady(true);
    setInputEpoch((e) => e + 1);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      const dataToSave = {
        schemaVersion: TAX_CALC_SCHEMA_VERSION,
        employments,
        employment: primaryEmployment,
        widowed,
        disabledSelf,
        nri,
        parentsAge,
        parentsSenior: parentsAge > 0 ? parentsAge >= 60 : parentsSenior,
        age,
        basicMonthly,
        specialAllowanceMonthly,
        mealVoucherMonthly,
        mealVoucherWorkDaysPerMonth,
        mealVoucherUse200Cap,
        secHRA,
        hraMonthly,
        rentPaidMonthly,
        isMetro,
        sec80GG,
        rentPaidNoHra,
        secLTA,
        ltaAnnualRecv,
        ltaClaiming,
        ltaTravelCost,
        secRSU,
        rsuListing: _rsuListing,
        rsuUnits,
        rsuFmvPerUnit,
        rsuPlanSell,
        rsuUnitsSold,
        rsuSalePrice,
        rsuCostPrice,
        rsuShortTerm,
        secGratuity,
        gratEmployer,
        gratReceived,
        gratYears,
        gratLastSalaryAnnual,
        secLeave,
        leaveTiming,
        leaveEmployer,
        leaveReceived,
        leaveAvgMonthly,
        leaveYears,
        leaveDays,
        secBusiness,
        bizMode,
        bizGrossReceipts,
        bizExpenses,
        bizTurnover44AD,
        bizDigital44AD,
        bizReceipts44ADA,
        secRental,
        rentAnnualGross,
        rentMunicipal,
        rentLoanInterest,
        secPension,
        pensionKind,
        pensionMonthly,
        familyPensionMonthly,
        commutedPension,
        secInterest,
        savingsInterest,
        fdInterest,
        postOfficeInterest,
        bondsInterest,
        secDividend,
        divIndian,
        divForeign,
        secCG,
        cgEquityStcgExtra,
        cgEquityLtcgExtra,
        cgDebtStcg,
        cgDebtLtcg,
        cgPropStcg,
        cgPropLtcg,
        secAgri,
        agriculturalIncome,
        excludeAgriculturalFromTax,
        secOther,
        lotteryIncome,
        giftsTaxable,
        commissionIncome,
        otherMiscIncome,
        freelanceIncome,
        secJobSwitch,
        prevEmployerSalaryAnnual,
        prevEmployerTds,
        currentEmployerTds,
        ffOtherTaxable,
        secDed80c,
        secDed80d,
        secDedRest,
        c80Elss,
        c80Ppf,
        c80Lic,
        c80Epf,
        c80Tuition,
        c80Principal,
        nps80CCD1B,
        deductions80DSelf,
        deductions80DParents,
        deduction80DD,
        deduction80DDB,
        deduction80E,
        deduction80EEA,
        deduction80G,
        deduction80TTA,
        deduction80TTB,
        deduction80U,
        deduction80RRB,
        homeLoanInterest24b,
        professionalTax,
        hraSalaryBaseAnnualOverride,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(
        TAX_CALCULATOR_STORAGE_KEY,
        JSON.stringify(dataToSave),
      );
      setSavedAtDisplay(dataToSave.savedAt);
    } catch {
      /* ignore */
    }
  }, [
    storageReady,
    employments,
    primaryEmployment,
    widowed,
    disabledSelf,
    nri,
    parentsAge,
    parentsSenior,
    age,
    basicMonthly,
    specialAllowanceMonthly,
    mealVoucherMonthly,
    mealVoucherWorkDaysPerMonth,
    mealVoucherUse200Cap,
    secHRA,
    hraMonthly,
    rentPaidMonthly,
    isMetro,
    sec80GG,
    rentPaidNoHra,
    secLTA,
    ltaAnnualRecv,
    ltaClaiming,
    ltaTravelCost,
    secRSU,
    _rsuListing,
    rsuUnits,
    rsuFmvPerUnit,
    rsuPlanSell,
    rsuUnitsSold,
    rsuSalePrice,
    rsuCostPrice,
    rsuShortTerm,
    secGratuity,
    gratEmployer,
    gratReceived,
    gratYears,
    gratLastSalaryAnnual,
    secLeave,
    leaveTiming,
    leaveEmployer,
    leaveReceived,
    leaveAvgMonthly,
    leaveYears,
    leaveDays,
    secBusiness,
    bizMode,
    bizGrossReceipts,
    bizExpenses,
    bizTurnover44AD,
    bizDigital44AD,
    bizReceipts44ADA,
    secRental,
    rentAnnualGross,
    rentMunicipal,
    rentLoanInterest,
    secPension,
    pensionKind,
    pensionMonthly,
    familyPensionMonthly,
    commutedPension,
    secInterest,
    savingsInterest,
    fdInterest,
    postOfficeInterest,
    bondsInterest,
    secDividend,
    divIndian,
    divForeign,
    secCG,
    cgEquityStcgExtra,
    cgEquityLtcgExtra,
    cgDebtStcg,
    cgDebtLtcg,
    cgPropStcg,
    cgPropLtcg,
    secAgri,
    agriculturalIncome,
    excludeAgriculturalFromTax,
    secOther,
    lotteryIncome,
    giftsTaxable,
    commissionIncome,
    otherMiscIncome,
    freelanceIncome,
    secJobSwitch,
    prevEmployerSalaryAnnual,
    prevEmployerTds,
    currentEmployerTds,
    ffOtherTaxable,
    secDed80c,
    secDed80d,
    secDedRest,
    c80Elss,
    c80Ppf,
    c80Lic,
    c80Epf,
    c80Tuition,
    c80Principal,
    nps80CCD1B,
    deductions80DSelf,
    deductions80DParents,
    deduction80DD,
    deduction80DDB,
    deduction80E,
    deduction80EEA,
    deduction80G,
    deduction80TTA,
    deduction80TTB,
    deduction80U,
    deduction80RRB,
    homeLoanInterest24b,
    professionalTax,
    hraSalaryBaseAnnualOverride,
  ]);

  useEffect(() => {
    if (age >= 60) setDeduction80TTA(0);
  }, [age]);

  const derived = useMemo(() => {
    const rsuVestingAnnual = secRSU
      ? rsuVestingIncomeAnnual(rsuUnits, rsuFmvPerUnit)
      : 0;
    let rsuSaleStcg = 0;
    let rsuSaleLtcg = 0;
    if (secRSU && rsuPlanSell) {
      const g = rsuSaleGain(
        rsuUnitsSold,
        rsuSalePrice,
        rsuCostPrice > 0 ? rsuCostPrice : rsuFmvPerUnit,
      );
      if (g > 0) {
        if (rsuShortTerm) rsuSaleStcg = g;
        else rsuSaleLtcg = g;
      }
    }

    const grat = secGratuity
      ? gratuityTaxableExempt(
          gratReceived,
          gratEmployer,
          gratLastSalaryAnnual,
          gratYears,
        )
      : { exempt: 0, taxable: 0 };

    const leave = secLeave
      ? leaveEncashmentTaxableExemptIllustrative(
          leaveReceived,
          leaveTiming,
          leaveEmployer,
          leaveAvgMonthly,
          leaveYears,
          leaveDays,
        )
      : { exempt: 0, taxable: 0 };

    const lta = secLTA
      ? ltaSplit(ltaAnnualRecv, ltaClaiming, ltaTravelCost)
      : { exempt: 0, taxable: 0 };

    const bizProfit = secBusiness
      ? businessIncomeIllustrative(
          bizMode,
          bizGrossReceipts,
          bizExpenses,
          bizTurnover44AD,
          bizDigital44AD,
          bizReceipts44ADA,
        )
      : 0;

    const rental = secRental
      ? rentalTaxableIncomeIllustrative(
          rentAnnualGross,
          rentMunicipal,
          rentLoanInterest,
        )
      : null;

    let pensionForEngine = 0;
    let familyPensionForEngine = 0;
    if (secPension) {
      if (pensionKind === "family") {
        const fam = pensionAnnualFromMonthly(familyPensionMonthly);
        const ex = familyPensionExemptAnnual(familyPensionMonthly);
        familyPensionForEngine = Math.max(0, fam - ex);
      } else {
        const reg = pensionAnnualFromMonthly(pensionMonthly);
        const commEx = commutedPensionExemptIllustrative(
          commutedPension,
          pensionKind,
        );
        const commTaxable = Math.max(0, commutedPension - commEx);
        pensionForEngine = reg + commTaxable;
      }
    }

    const interestTotal = secInterest
      ? savingsInterest + fdInterest + postOfficeInterest + bondsInterest
      : 0;

    const dividendTotal = secDividend ? divIndian + divForeign : 0;

    const slabExtrasOther =
      (secCG ? cgDebtStcg + cgDebtLtcg + cgPropStcg : 0) +
      (secOther ? giftsTaxable + commissionIncome + otherMiscIncome : 0);

    const equityStcgTotal = (secCG ? cgEquityStcgExtra : 0) + rsuSaleStcg;
    const equityLtcgTotal = (secCG ? cgEquityLtcgExtra : 0) + rsuSaleLtcg;

    const hraSalaryAnnualForEngine = secHRA ? hraMonthly : 0;
    const hasHRAFlag = secHRA;
    const rentAnnualEngine = secHRA ? Math.round(rentPaidMonthly * 12) : 0;
    const rentNoHraEngine = !secHRA && sec80GG ? rentPaidNoHra : 0;

    const salaryAnnualCore =
      (Math.max(0, basicMonthly) +
        Math.max(0, hraSalaryAnnualForEngine) +
        Math.max(0, specialAllowanceMonthly)) *
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
      propertyLtcgGains: secCG ? cgPropLtcg : 0,
      lotteryGamblingIncome: secOther ? lotteryIncome : 0,
      equityStcgTotal,
      equityLtcgTotal,
      hasHRAFlag,
      rentAnnualEngine,
      rentNoHraEngine,
      salaryAnnualCore,
      interestFor80TTAHint: secInterest ? savingsInterest : 0,
    };
  }, [
    secRSU,
    rsuUnits,
    rsuFmvPerUnit,
    rsuPlanSell,
    rsuUnitsSold,
    rsuSalePrice,
    rsuCostPrice,
    rsuShortTerm,
    secGratuity,
    gratReceived,
    gratEmployer,
    gratLastSalaryAnnual,
    gratYears,
    secLeave,
    leaveReceived,
    leaveTiming,
    leaveEmployer,
    leaveAvgMonthly,
    leaveYears,
    leaveDays,
    secLTA,
    ltaAnnualRecv,
    ltaClaiming,
    ltaTravelCost,
    secBusiness,
    bizMode,
    bizGrossReceipts,
    bizExpenses,
    bizTurnover44AD,
    bizDigital44AD,
    bizReceipts44ADA,
    secRental,
    rentAnnualGross,
    rentMunicipal,
    rentLoanInterest,
    secPension,
    pensionKind,
    pensionMonthly,
    familyPensionMonthly,
    commutedPension,
    secInterest,
    savingsInterest,
    fdInterest,
    postOfficeInterest,
    bondsInterest,
    secDividend,
    divIndian,
    divForeign,
    secCG,
    cgEquityStcgExtra,
    cgEquityLtcgExtra,
    cgDebtStcg,
    cgDebtLtcg,
    cgPropStcg,
    cgPropLtcg,
    secOther,
    lotteryIncome,
    giftsTaxable,
    commissionIncome,
    otherMiscIncome,
    secHRA,
    hraMonthly,
    basicMonthly,
    specialAllowanceMonthly,
    rentPaidMonthly,
    sec80GG,
    rentPaidNoHra,
  ]);

  const running80C = Math.min(
    150_000,
    c80Elss + c80Ppf + c80Lic + c80Epf + c80Tuition + c80Principal,
  );

  const mealVoucherAnnualExemption = useMemo(() => {
    const monthly = Math.max(0, mealVoucherMonthly);
    if (monthly <= 0) return 0;
    const days = Math.max(0, mealVoucherWorkDaysPerMonth);
    const capPerMeal = mealVoucherUse200Cap ? 200 : 50;
    const monthlyCap = capPerMeal * days;
    return Math.max(0, Math.min(monthly, monthlyCap) * 12);
  }, [mealVoucherMonthly, mealVoucherWorkDaysPerMonth, mealVoucherUse200Cap]);

  const comparisonInputs = useMemo<ComparisonInputs>(() => {
    const inputs: ComparisonInputs = {
      age,
      employment: primaryEmployment,
      flags: { widowed, disabledSelf, nri },
      basicMonthly,
      hraMonthly: secHRA ? hraMonthly : 0,
      allowancesMonthly: specialAllowanceMonthly,
      mealVoucherExemptionAnnual: mealVoucherAnnualExemption,
      hraSalaryBaseAnnualOverride,
      rsuVestingAnnual: derived.rsuVestingAnnual,
      rsuSaleStcg: derived.rsuSaleStcg,
      rsuSaleLtcg: derived.rsuSaleLtcg,
      otherStcg: secCG ? cgEquityStcgExtra : 0,
      otherLtcg: secCG ? cgEquityLtcgExtra : 0,
      leaveEncashmentTaxable: derived.leaveTaxable,
      gratuityTaxable: derived.gratuityTaxable,
      ltaTaxable: derived.ltaTaxable,
      previousEmployerSalaryAnnual: secJobSwitch ? prevEmployerSalaryAnnual : 0,
      ffSettlementOtherTaxable: secJobSwitch ? ffOtherTaxable : 0,
      businessProfit: derived.businessProfit,
      freelanceIncome,
      pension: derived.pensionForEngine,
      familyPension: derived.familyPensionForEngine,
      rentalIncome: derived.rentalTaxable,
      interestIncome: derived.interestIncome,
      interestSavingsPortion: derived.interestFor80TTAHint,
      dividendIncome: derived.dividendIncome,
      slabTaxedOtherGains: derived.slabTaxedOtherGains,
      propertyLtcgGains: derived.propertyLtcgGains,
      lotteryGamblingIncome: derived.lotteryGamblingIncome,
      agriculturalIncome: secAgri ? agriculturalIncome : 0,
      excludeAgriculturalFromTax,
      hasHRA: derived.hasHRAFlag,
      hraReceivedAnnual: secHRA ? Math.round(hraMonthly * 12) : 0,
      rentPaidAnnual: derived.rentAnnualEngine,
      isMetro,
      rentPaidNoHra: derived.rentNoHraEngine,
      deductions80C: secDed80c ? running80C : 0,
      nps80CCD1B: secDed80c ? nps80CCD1B : 0,
      deductions80DSelf: secDed80d ? deductions80DSelf : 0,
      deductions80DParents: secDed80d ? deductions80DParents : 0,
      parentsSenior: parentsSeniorEffective,
      deduction80DD: secDedRest ? deduction80DD : 0,
      deduction80DDB: secDedRest ? deduction80DDB : 0,
      deduction80E: secDedRest ? deduction80E : 0,
      deduction80EEA: secDedRest ? deduction80EEA : 0,
      deduction80G: secDedRest ? deduction80G : 0,
      deduction80TTA: secDedRest ? deduction80TTA : 0,
      deduction80TTB: secDedRest ? deduction80TTB : 0,
      deduction80U: secDedRest ? deduction80U : 0,
      deduction80RRB: secDedRest ? deduction80RRB : 0,
      homeLoanInterest24b: secDedRest ? homeLoanInterest24b : 0,
      professionalTax: secDedRest ? professionalTax : 0,
    };
    return inputs;
  }, [
    age,
    primaryEmployment,
    widowed,
    disabledSelf,
    nri,
    basicMonthly,
    secHRA,
    hraMonthly,
    specialAllowanceMonthly,
    mealVoucherAnnualExemption,
    hraSalaryBaseAnnualOverride,
    derived,
    freelanceIncome,
    secJobSwitch,
    prevEmployerSalaryAnnual,
    ffOtherTaxable,
    secPension,
    pensionKind,
    pensionMonthly,
    familyPensionMonthly,
    secAgri,
    agriculturalIncome,
    excludeAgriculturalFromTax,
    isMetro,
    secDed80c,
    running80C,
    nps80CCD1B,
    secDed80d,
    deductions80DSelf,
    deductions80DParents,
    parentsSeniorEffective,
    parentsAge,
    parentsSenior,
    secDedRest,
    deduction80DD,
    deduction80DDB,
    deduction80E,
    deduction80EEA,
    deduction80G,
    deduction80TTA,
    deduction80TTB,
    deduction80U,
    deduction80RRB,
    homeLoanInterest24b,
    professionalTax,
    secCG,
    cgEquityStcgExtra,
    cgEquityLtcgExtra,
  ]);

  const salaryAnnualPreview = useMemo(
    () => salaryAnnualFromMonthly(comparisonInputs),
    [comparisonInputs],
  );

  const { old: oldR, new: newR } = useMemo(
    () => compareRegimes(comparisonInputs),
    [comparisonInputs],
  );

  const winner =
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
    hraSalaryBaseAnnualOverride > 0
      ? hraSalaryBaseAnnualOverride
      : Math.max(0, basicMonthly) * 12;
  const hraReceivedAnnualPreview = secHRA ? Math.round(hraMonthly * 12) : 0;
  const rentPaidAnnualPreview = secHRA ? Math.round(rentPaidMonthly * 12) : 0;
  const hraExemptAnnualPreview =
    secHRA && comparisonInputs.hasHRA
      ? calculateHRAExemption({
          hasHRA: true,
          salaryForHra: salaryForHraPreview,
          hraReceivedAnnual: hraReceivedAnnualPreview,
          rentPaidAnnual: rentPaidAnnualPreview,
          isMetro,
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
    if (nri)
      out.push(
        "NRIs: validate residency and DTAA — this model is domestic illustrative.",
      );
    if (secJobSwitch) {
      out.push(
        "Mid-year switch: sum both Form 16s (salary + F&F taxable bits) and claim all TDS — AIS/26AS should match before you file.",
      );
    }
    return out.slice(0, 4);
  }, [winner, saveAmount, nri, secJobSwitch]);

  const itrSuggestion = useMemo(() => {
    const equityGains =
      sumEquityStcg(comparisonInputs) + sumEquityLtcg(comparisonInputs);
    const hasCapitalGains =
      equityGains > 0 ||
      cgDebtStcg > 0 ||
      cgDebtLtcg > 0 ||
      cgPropStcg > 0 ||
      cgPropLtcg > 0;
    const hasBusinessOrProfession =
      secBusiness ||
      derived.businessProfit > 0 ||
      freelanceIncome > 0 ||
      employments.includes("business_owner") ||
      employments.includes("freelancer");
    const hasForeignComplexity = nri || divForeign > 0;
    const hasLottery = lotteryIncome > 0;
    const hasAgriComplexity = agriculturalIncome > 5_000;
    const midYearSwitch =
      secJobSwitch &&
      (prevEmployerSalaryAnnual > 0 ||
        ffOtherTaxable > 0 ||
        prevEmployerTds > 0 ||
        currentEmployerTds > 0);

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
        secBusiness &&
        (bizMode === "44ad" || bizMode === "44ada") &&
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
  }, [
    comparisonInputs,
    cgDebtStcg,
    cgDebtLtcg,
    cgPropStcg,
    cgPropLtcg,
    secBusiness,
    derived.businessProfit,
    freelanceIncome,
    employments,
    nri,
    divForeign,
    lotteryIncome,
    agriculturalIncome,
    bizMode,
    secJobSwitch,
    prevEmployerSalaryAnnual,
    ffOtherTaxable,
    prevEmployerTds,
    currentEmployerTds,
  ]);

  const tdsPrepaid = secJobSwitch
    ? prevEmployerTds + currentEmployerTds
    : currentEmployerTds;
  const taxBalanceVsTds = (regimeTotal: number) =>
    Math.round(regimeTotal - tdsPrepaid);

  const pill =
    "rounded-full px-3 py-2 text-sm font-semibold transition sm:px-4";

  const resetCalculator = () => {
    try {
      localStorage.removeItem(TAX_CALCULATOR_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  const personalCATotalSteps = 19;
  const personalCAProgress = Math.round(
    (Math.min(personalCAStep + 1, personalCATotalSteps) /
      personalCATotalSteps) *
      100,
  );
  const checklistReady = Object.values(caChecklist).every(Boolean);

  const personalCASection = (() => {
    if (personalCAStep === 0) return "Get ready";
    if (personalCAStep <= 2) return "Profile & income";
    if (personalCAStep <= 10) return "Income details";
    if (personalCAStep <= 16) return "Deductions";
    return "Review";
  })();

  const syncWizardToggles = () => {
    setSecHRA(hraMonthly > 0 || rentPaidMonthly > 0);
    setSec80GG(!(hraMonthly > 0 || rentPaidMonthly > 0) && rentPaidNoHra > 0);
    setSecInterest(
      savingsInterest > 0 ||
        fdInterest > 0 ||
        postOfficeInterest > 0 ||
        bondsInterest > 0,
    );
    setSecDividend(divIndian > 0 || divForeign > 0);
    setSecLTA(ltaAnnualRecv > 0 || ltaTravelCost > 0);
    setSecRSU(rsuUnits > 0 || rsuUnitsSold > 0);
    setSecLeave(leaveReceived > 0 || leaveDays > 0);
    setSecRental(
      rentAnnualGross > 0 || rentMunicipal > 0 || rentLoanInterest > 0,
    );
    setSecCG(
      cgEquityStcgExtra > 0 ||
        cgEquityLtcgExtra > 0 ||
        cgDebtStcg > 0 ||
        cgDebtLtcg > 0 ||
        cgPropStcg > 0 ||
        cgPropLtcg > 0,
    );
    setSecOther(
      lotteryIncome > 0 ||
        giftsTaxable > 0 ||
        commissionIncome > 0 ||
        otherMiscIncome > 0,
    );
    setSecAgri(agriculturalIncome > 0);
    setSecDed80c(
      c80Elss +
        c80Ppf +
        c80Lic +
        c80Epf +
        c80Tuition +
        c80Principal +
        nps80CCD1B >
        0,
    );
    setSecDed80d(deductions80DSelf + deductions80DParents > 0);
    setSecDedRest(
      deduction80DD +
        deduction80DDB +
        deduction80E +
        deduction80EEA +
        deduction80G +
        deduction80TTA +
        deduction80TTB +
        deduction80U +
        deduction80RRB +
        homeLoanInterest24b +
        professionalTax >
        0,
    );
  };

  const nextPersonalCAStep = () => {
    if (personalCAStep === 0 && !checklistReady) return;
    setPersonalCAStep((s) => Math.min(personalCATotalSteps - 1, s + 1));
  };

  const prevPersonalCAStep = () => {
    setPersonalCAStep((s) => Math.max(0, s - 1));
  };

  const closePersonalCA = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    unlockPageScroll();
    setPersonalCAOpen(false);
    setPersonalCAStep(0);
  };

  useEffect(() => {
    if (personalCAOpen) return;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [personalCAOpen]);

  useEffect(() => {
    if (!personalCAOpen || speechMuted || personalCAStep !== 0) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const synth = window.speechSynthesis;
    let cancelled = false;
    let fallbackTimer: number | undefined;
    let spoke = false;

    const speakWelcome = () => {
      if (cancelled || spoke) return;
      spoke = true;
      if (fallbackTimer !== undefined) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = undefined;
      }
      synth.resume?.();
      synth.cancel();

      const utter = new SpeechSynthesisUtterance(PERSONAL_CA_STEP1_WELCOME_TTS);
      utter.rate = 0.94;
      utter.pitch = 1.06;
      const voice = pickPersonalCAFemaleVoice(synth);
      if (voice) {
        utter.voice = voice;
        utter.lang = voice.lang || "en-IN";
      } else {
        utter.lang = "en-IN";
        utter.pitch = 1.12;
      }
      synth.speak(utter);
    };

    // Chrome/Chromium often returns getVoices() = [] until voiceschanged fires once.
    // Speaking immediately then produces no audio; toggling mute re-runs after voices load.
    void synth.getVoices();
    const handleVoicesChanged = () => {
      if (cancelled) return;
      synth.removeEventListener("voiceschanged", handleVoicesChanged);
      speakWelcome();
    };

    if (synth.getVoices().length > 0) {
      speakWelcome();
    } else {
      synth.addEventListener("voiceschanged", handleVoicesChanged);
      fallbackTimer = window.setTimeout(() => {
        synth.removeEventListener("voiceschanged", handleVoicesChanged);
        speakWelcome();
      }, 700);
    }

    return () => {
      cancelled = true;
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      synth.removeEventListener("voiceschanged", handleVoicesChanged);
      synth.cancel();
    };
  }, [personalCAOpen, personalCAStep, speechMuted]);

  useEffect(() => {
    if (!personalCAOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      // Safety unlock in case any close path skipped restore.
      if (!personalCAOpen) unlockPageScroll();
    };
  }, [personalCAOpen]);

  useEffect(() => {
    if (personalCAOpen) return;
    unlockPageScroll();
    return () => unlockPageScroll();
  }, [personalCAOpen]);

  const learnTaxLinks = [
    {
      href: "/learn/old-vs-new-tax-regime-which-saves-you-more-money",
      label: "Old vs new regime — complete guide",
    },
    {
      href: "/learn/80c-complete-guide-tax-saving-india",
      label: "80C complete guide",
    },
    {
      href: "/learn/hra-exemption-complete-guide-india",
      label: "HRA exemption guide",
    },
    { href: "/learn/nps-tax-deductions-guide-india", label: "NPS tax guide" },
    {
      href: "/learn/rsu-esop-tax-india-explained",
      label: "RSU / ESOP tax guide",
    },
    {
      href: "/learn/hidden-tax-savings-salary-india",
      label: "Hidden tax savings",
    },
    {
      href: "/learn/tax-planning-calendar-india-fy",
      label: "Tax planning calendar",
    },
  ];

  const learnedToday = useMemo(() => {
    const rows: { emoji: string; title: string; body: string }[] = [];
    if (secHRA) {
      rows.push({
        emoji: "🏠",
        title: "HRA",
        body: `Approx exempt ₹${Math.round(hraExemptAnnualPreview).toLocaleString("en-IN")}/yr · taxable HRA slice ₹${Math.round(hraTaxableAnnualPreview).toLocaleString("en-IN")}/yr (illustrative three-part test).`,
      });
    }
    if (!secHRA && sec80GG && rentPaidNoHra > 0) {
      rows.push({
        emoji: "🏠",
        title: "80GG rent (no HRA)",
        body: `Illustrative deduction ₹${Math.round(ggPreview).toLocaleString("en-IN")} — keep rent proofs.`,
      });
    }
    if (secLTA && (derived.ltaExemptRec > 0 || derived.ltaTaxable > 0)) {
      rows.push({
        emoji: "✈️",
        title: "LTA",
        body: `Exempt ₹${derived.ltaExemptRec.toLocaleString("en-IN")} · taxable ₹${derived.ltaTaxable.toLocaleString("en-IN")}. Blocks apply — verify with payroll.`,
      });
    }
    if (secRSU && derived.rsuVestingAnnual > 0) {
      rows.push({
        emoji: "📈",
        title: "RSU / ESOP",
        body: `Perquisite-style salary income ₹${derived.rsuVestingAnnual.toLocaleString("en-IN")}; sale modeled ₹${(derived.rsuSaleStcg + derived.rsuSaleLtcg).toLocaleString("en-IN")} gains under equity CG rates.`,
      });
    }
    if (secGratuity && gratReceived > 0) {
      rows.push({
        emoji: "🎁",
        title: "Gratuity",
        body: `Exempt ₹${derived.gratuityExemptRec.toLocaleString("en-IN")} · taxable ₹${derived.gratuityTaxable.toLocaleString("en-IN")}.`,
      });
    }
    if (secLeave && leaveReceived > 0) {
      rows.push({
        emoji: "🌴",
        title: "Leave encashment",
        body: `Exempt ₹${derived.leaveExemptRec.toLocaleString("en-IN")} · taxable ₹${derived.leaveTaxable.toLocaleString("en-IN")}. Section 10(10AA) nuances apply.`,
      });
    }
    if (secBusiness && derived.businessProfit > 0) {
      rows.push({
        emoji: "💼",
        title: "Business income",
        body: `Modeled profit ₹${derived.businessProfit.toLocaleString("en-IN")} (${bizMode.toUpperCase()} illustration).`,
      });
    }
    if (secRental && derived.rentalBreakdown) {
      const r = derived.rentalBreakdown;
      rows.push({
        emoji: "🏢",
        title: "Rental income",
        body: `NAV ₹${Math.round(r.nav).toLocaleString("en-IN")} · after 30% standard & loan interest → taxable ₹${derived.rentalTaxable.toLocaleString("en-IN")}.`,
      });
    }
    if (
      secPension &&
      (derived.pensionForEngine > 0 || derived.familyPensionForEngine > 0)
    ) {
      rows.push({
        emoji: "🏖️",
        title: "Pension",
        body: `Taxable pension slices entering ordinary income total ₹${(derived.pensionForEngine + derived.familyPensionForEngine).toLocaleString("en-IN")} (exemptions applied in-tool).`,
      });
    }
    if (secInterest && derived.interestIncome > 0) {
      rows.push({
        emoji: "🏦",
        title: "Interest",
        body: `Total interest ₹${derived.interestIncome.toLocaleString("en-IN")}; align 80TTA/80TTB entries with savings vs FD buckets.`,
      });
    }
    if (secDividend && derived.dividendIncome > 0) {
      rows.push({
        emoji: "💰",
        title: "Dividends",
        body: `₹${derived.dividendIncome.toLocaleString("en-IN")} taxed at slab in your hands (DDT removed).`,
      });
    }
    if (secCG) {
      rows.push({
        emoji: "📊",
        title: "Capital gains",
        body: `Equity CG tax (illustrative) ₹${equityCgTaxOnly.toLocaleString("en-IN")}; LTCG exemption used ₹${Math.round(ltcgExemptionUsed).toLocaleString("en-IN")} of ₹1,25,000.`,
      });
    }
    if (secAgri && agriculturalIncome > 0) {
      rows.push({
        emoji: "🌾",
        title: "Agricultural income",
        body: excludeAgriculturalFromTax
          ? "Excluded from ordinary gross in this run — partial integration not modeled."
          : "Included in ordinary gross — confirm exemption vs integration with a CA.",
      });
    }
    if (
      secOther &&
      (lotteryIncome > 0 ||
        giftsTaxable > 0 ||
        commissionIncome > 0 ||
        otherMiscIncome > 0)
    ) {
      rows.push({
        emoji: "💫",
        title: "Other income",
        body: `Lottery modeled at 30% flat on ₹${lotteryIncome.toLocaleString("en-IN")}; other slab items ₹${(giftsTaxable + commissionIncome + otherMiscIncome).toLocaleString("en-IN")}.`,
      });
    }
    return rows;
  }, [
    secHRA,
    sec80GG,
    rentPaidNoHra,
    ggPreview,
    secLTA,
    derived,
    secRSU,
    secGratuity,
    gratReceived,
    secLeave,
    leaveReceived,
    secBusiness,
    bizMode,
    secRental,
    secPension,
    secInterest,
    secDividend,
    secCG,
    equityCgTaxOnly,
    ltcgExemptionUsed,
    secAgri,
    agriculturalIncome,
    excludeAgriculturalFromTax,
    secOther,
    lotteryIncome,
    giftsTaxable,
    commissionIncome,
    otherMiscIncome,
    hraExemptAnnualPreview,
    hraTaxableAnnualPreview,
  ]);

  function sectionSummary(title: string, teach: TaxTeachContent) {
    return (
      <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
        <span className="text-xs font-semibold uppercase tracking-wide text-[#534AB7]">
          {title}
        </span>
        <TaxTeachTooltip content={teach} ariaLabel={`About ${title}`} />
        <span className="ml-auto text-sm text-[#7A7871] transition-transform group-open:rotate-180">
          ⌄
        </span>
      </summary>
    );
  }

  return (
    <div className="space-y-6 print:bg-white">
      {!personalCAOpen ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[#9B9A94]">
              {storageReady ? "✓ Progress auto-saved locally" : null}
              {savedAtDisplay ? (
                <span className="ml-2 block text-[10px] text-[#C5C4BD] sm:inline">
                  Last saved {new Date(savedAtDisplay).toLocaleString("en-IN")}
                </span>
              ) : null}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPersonalCAOpen(true);
                  setPersonalCAStep(0);
                }}
                className="rounded-lg border border-[#DCD9F7] bg-[#F7F6FE] px-3 py-2 text-xs font-semibold text-[#534AB7] transition hover:bg-[#EEEDFE]"
              >
                Personal CA (guided)
              </button>
              <button
                type="button"
                onClick={resetCalculator}
                style={{
                  background: "none",
                  border: "1px solid #E8E6F0",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  color: "#9B9A94",
                  cursor: "pointer",
                }}
              >
                Reset calculator
              </button>
            </div>
          </div>

          <p className="text-xs text-[#7A7871]">
            FY 2025-26 (AY 2026-27) planner. Tap{" "}
            <span className="font-semibold text-[#534AB7]">?</span> on any row
            for context. Equity CG uses illustrative 20% STCG / 12.5% LTCG after
            ₹1.25L — verify with a CA.
          </p>

          <div className="min-w-0 space-y-6">
            <details className="group rounded-xl border border-[#F0EFF8] bg-white p-4">
              {sectionSummary(
                "Step 1 · Profile & person type",
                TEACH.sections.profile,
              )}
              {sectionBlurb(
                "Age and employment shape slab brackets; flags tune deduction caps (80D, 80TTB) and hints.",
              )}
              <div className="mt-4 space-y-4">
                <div>
                  <p className="mb-1 text-sm font-medium text-[#5F5E5A]">
                    Work / income style
                  </p>
                  <p className="mb-2 text-xs text-[#9B9A94]">
                    Pick all that apply — you can have more than one source of
                    income.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {EMPLOYMENT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        aria-pressed={employments.includes(opt.id)}
                        className={cn(
                          pill,
                          employments.includes(opt.id)
                            ? "bg-[#534AB7] text-white"
                            : "bg-slate-100 text-slate-700",
                        )}
                        onClick={() => toggleEmployment(opt.id)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[#5F5E5A]">
                    <input
                      type="checkbox"
                      checked={widowed}
                      onChange={(e) => setWidowed(e.target.checked)}
                      className="accent-[#534AB7]"
                    />
                    Widowed
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[#5F5E5A]">
                    <input
                      type="checkbox"
                      checked={disabledSelf}
                      onChange={(e) => setDisabledSelf(e.target.checked)}
                      className="accent-[#534AB7]"
                    />
                    Self disability
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[#5F5E5A]">
                    <input
                      type="checkbox"
                      checked={nri}
                      onChange={(e) => setNri(e.target.checked)}
                      className="accent-[#534AB7]"
                    />
                    NRI / overseas tie
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[#5F5E5A]">
                    <input
                      type="checkbox"
                      checked={parentsSeniorEffective}
                      onChange={(e) => {
                        const on = e.target.checked;
                        setParentsSenior(on);
                        setParentsAge((a) =>
                          on ? (a >= 60 ? a : 60) : a > 0 && a < 60 ? a : 0,
                        );
                      }}
                      className="accent-[#534AB7]"
                    />
                    Parents 60+ (80D parents cap ₹{formatIndian(parents80DCap)})
                  </label>
                </div>
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#5F5E5A]">
                    Age
                    <TaxTeachTooltip
                      content={TEACH.sections.profile}
                      ariaLabel="Age bands"
                    />
                  </label>
                  <input
                    type="range"
                    min={18}
                    max={100}
                    step={1}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer accent-[#534AB7]"
                  />
                  <p className="mt-1 text-right text-xs text-[#9B9A94]">
                    {age} yrs —{" "}
                    {age >= 80
                      ? "super senior"
                      : age >= 60
                        ? "senior citizen"
                        : "regular"}
                  </p>
                </div>
              </div>
            </details>

            <details className="group rounded-xl border border-[#F0EFF8] bg-white p-4">
              {sectionSummary(
                "Step 2 · Core salary income",
                TEACH.sections.income,
              )}
              {sectionBlurb(
                "Enter current employer recurring payslip salary here — turn on Step 3 for HRA, job-switch / F&F, or side income.",
              )}
              <div className="mt-4 space-y-1">
                <p className="mb-2 text-xs text-[#7A7871]">
                  Annualised core salary (Basic + Special below; add Step 3 for
                  HRA in salary) ≈ {rupees(salaryAnnualPreview)} before toggled
                  buckets
                  {secJobSwitch && prevEmployerSalaryAnnual > 0
                    ? ` · + previous employer ${rupees(prevEmployerSalaryAnnual)}`
                    : ""}
                  .
                </p>
                <Mt
                  key={`${inputEpoch}-basic`}
                  id="tax-basic-m"
                  label={
                    secJobSwitch
                      ? "Current employer — basic salary (monthly)"
                      : "Basic salary (monthly)"
                  }
                  teach={TEACH.income.basicMonthly}
                  defaultValue={basicMonthly ? formatIndian(basicMonthly) : ""}
                  max={10_000_000}
                  onChange={(e) =>
                    setBasicMonthly(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-special`}
                  id="tax-special-m"
                  label={
                    secJobSwitch
                      ? "Current employer — special allowance (monthly)"
                      : "Special allowance (monthly)"
                  }
                  teach={TEACH.income.allowancesMonthly}
                  optional
                  defaultValue={
                    specialAllowanceMonthly
                      ? formatIndian(specialAllowanceMonthly)
                      : ""
                  }
                  max={10_000_000}
                  onChange={(e) =>
                    setSpecialAllowanceMonthly(
                      parseMoneyInput(e.target.value) ?? 0,
                    )
                  }
                />
                <Mt
                  key={`${inputEpoch}-freelance`}
                  id="tax-free"
                  label="Freelance / professional income (annual)"
                  teach={TEACH.income.freelanceIncome}
                  optional
                  defaultValue={
                    freelanceIncome ? formatIndian(freelanceIncome) : ""
                  }
                  max={500000000}
                  onChange={(e) =>
                    setFreelanceIncome(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-meal-voucher`}
                  id="tax-meal-voucher-m"
                  label="Meal card / coupon received (monthly)"
                  teach={TEACH.income.allowancesMonthly}
                  optional
                  defaultValue={
                    mealVoucherMonthly ? formatIndian(mealVoucherMonthly) : ""
                  }
                  max={200000}
                  onChange={(e) =>
                    setMealVoucherMonthly(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <NumberInput
                  label="Eligible meal days per month"
                  value={mealVoucherWorkDaysPerMonth}
                  onChange={setMealVoucherWorkDaysPerMonth}
                  min={0}
                  max={31}
                  step={1}
                />
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#5F5E5A]">
                  <input
                    type="checkbox"
                    checked={mealVoucherUse200Cap}
                    onChange={(e) => setMealVoucherUse200Cap(e.target.checked)}
                    className="accent-[#534AB7]"
                  />
                  Use revised cap ₹200/meal (turn off for older ₹50/meal rule)
                </label>
                <div className="rounded-lg border border-[#EEEDFE] bg-[#FAFAFE] px-3 py-2 text-xs text-[#5F5E5A]">
                  Meal voucher exemption modelled yearly ≈ ₹
                  {Math.round(mealVoucherAnnualExemption).toLocaleString(
                    "en-IN",
                  )}
                </div>
                <div className="rounded-lg border border-[#EEEDFE] bg-[#FAFAFE] px-3 py-2 text-xs text-[#5F5E5A]">
                  Core annual (Basic + Special only) ≈ ₹
                  {Math.round(
                    (basicMonthly + specialAllowanceMonthly) * 12,
                  ).toLocaleString("en-IN")}
                </div>
              </div>
            </details>

            <details className="group rounded-xl border border-[#F0EFF8] bg-white p-4">
              {sectionSummary(
                "Step 3 · Additional income",
                TEACH.sections.income,
              )}
              {sectionBlurb(
                "Enable each strip only when it applies — unused toggles stay closed so the worksheet stays readable.",
              )}

              <ToggleSection
                id="job-switch"
                emoji="🔁"
                title="Job switch / Full & Final (mid-year)"
                subtitle="Changed employers this FY — Form 16 from both"
                oneLiner="Add previous employer taxable salary, F&F extras, and TDS already deducted so total tax and balance due stay accurate."
                isOn={secJobSwitch}
                onToggle={setSecJobSwitch}
              >
                <p className="mb-2 text-xs leading-relaxed text-[#7A7871]">
                  Enter current employer monthly salary in Step 2 (for months
                  worked there). Pull previous employer figures from their Form
                  16 Part B / F&amp;F sheet. Turn on Leave encashment and
                  Gratuity below if those appeared in your settlement.
                </p>
                <Mt
                  key={`${inputEpoch}-prev-sal`}
                  id="tax-prev-employer-salary"
                  label="Previous employer taxable salary (annual)"
                  teach={TEACH.income.basicMonthly}
                  optional
                  defaultValue={
                    prevEmployerSalaryAnnual
                      ? formatIndian(prevEmployerSalaryAnnual)
                      : ""
                  }
                  max={500000000}
                  onChange={(e) =>
                    setPrevEmployerSalaryAnnual(
                      parseMoneyInput(e.target.value) ?? 0,
                    )
                  }
                />
                <Mt
                  key={`${inputEpoch}-ff-other`}
                  id="tax-ff-other"
                  label="Other taxable F&F amounts (notice pay, taxable bonus, etc.)"
                  teach={TEACH.income.leaveEncashmentTaxable}
                  optional
                  defaultValue={
                    ffOtherTaxable ? formatIndian(ffOtherTaxable) : ""
                  }
                  max={500000000}
                  onChange={(e) =>
                    setFfOtherTaxable(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-prev-tds`}
                  id="tax-prev-tds"
                  label="TDS deducted by previous employer"
                  teach={TEACH.income.basicMonthly}
                  optional
                  defaultValue={
                    prevEmployerTds ? formatIndian(prevEmployerTds) : ""
                  }
                  max={500000000}
                  onChange={(e) =>
                    setPrevEmployerTds(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-curr-tds`}
                  id="tax-curr-tds"
                  label="TDS deducted by current employer"
                  teach={TEACH.income.basicMonthly}
                  optional
                  defaultValue={
                    currentEmployerTds ? formatIndian(currentEmployerTds) : ""
                  }
                  max={500000000}
                  onChange={(e) =>
                    setCurrentEmployerTds(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <div className="rounded-lg border border-[#EEEDFE] bg-[#FAFAFE] px-3 py-2 text-xs text-[#5F5E5A]">
                  Tip: Leave encashment / gratuity in F&amp;F → enable those
                  toggles in this step. Dual Form 16s alone do not force ITR-2
                  if you only have salary (+ ITR-1 eligible income).
                </div>
              </ToggleSection>

              <ToggleSection
                id="hra"
                emoji="🏠"
                title="HRA — House Rent Allowance"
                subtitle="I receive HRA and pay rent"
                oneLiner="Uses rent paid, metro vs non-metro, and salary base for the 10% test — opens old-regime exemption math."
                isOn={secHRA}
                onToggle={(v) => {
                  setSecHRA(v);
                  if (v) setSec80GG(false);
                }}
              >
                <Mt
                  key={`${inputEpoch}-hra`}
                  id="tax-hra-m"
                  label="Monthly HRA received"
                  teach={TEACH.income.hraMonthly}
                  defaultValue={hraMonthly ? formatIndian(hraMonthly) : ""}
                  max={10_000_000}
                  onChange={(e) =>
                    setHraMonthly(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-rent`}
                  id="tax-rent-m"
                  label="Monthly rent paid"
                  teach={TEACH.deductions.eightyGG}
                  defaultValue={
                    rentPaidMonthly ? formatIndian(rentPaidMonthly) : ""
                  }
                  max={10_000_000}
                  onChange={(e) =>
                    setRentPaidMonthly(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <p className="text-sm font-medium text-[#5F5E5A]">City type</p>
                <div className="mb-3 flex flex-wrap gap-2">
                  {chip(isMetro, "Metro", () => setIsMetro(true))}
                  {chip(!isMetro, "Non-metro", () => setIsMetro(false))}
                </div>
                <Mt
                  key={`${inputEpoch}-hra-base`}
                  id="tax-hra-base-annual"
                  label="Annual salary base for HRA 10% rule (optional)"
                  helper="Leave ₹0 to use Basic×12."
                  teach={TEACH.income.hraBaseAnnual}
                  optional
                  defaultValue={
                    hraSalaryBaseAnnualOverride
                      ? formatIndian(hraSalaryBaseAnnualOverride)
                      : ""
                  }
                  max={500000000}
                  onChange={(e) =>
                    setHraSalaryBaseAnnualOverride(
                      parseMoneyInput(e.target.value) ?? 0,
                    )
                  }
                />
                {secHRA ? (
                  <div className="rounded-lg border border-[#E8E6F0] bg-[#FAFAFE] px-3 py-2 text-sm text-[#5F5E5A]">
                    <div>
                      HRA exempt (illustrative):{" "}
                      {rupees(hraExemptAnnualPreview / 12)}/mo
                    </div>
                    <div>
                      Taxable HRA remainder:{" "}
                      {rupees(hraTaxableAnnualPreview / 12)}/mo
                    </div>
                  </div>
                ) : null}
              </ToggleSection>

              <ToggleSection
                id="80gg"
                emoji="🏠"
                title="Rent without HRA (80GG)"
                subtitle="I pay rent but don’t get HRA"
                oneLiner="Illustrative ₹60k / rent−10% income cap — only matters when old regime wins on deductions."
                isOn={sec80GG}
                onToggle={(v) => {
                  setSec80GG(v);
                  if (v) setSecHRA(false);
                }}
              >
                <Mt
                  key={`${inputEpoch}-80gg`}
                  id="tax-rent-nohra"
                  label="Annual rent paid"
                  helper={`Illustrative 80GG ≈ ${rupees(ggPreview)}`}
                  teach={TEACH.deductions.eightyGG}
                  defaultValue={
                    rentPaidNoHra ? formatIndian(rentPaidNoHra) : ""
                  }
                  max={500000000}
                  onChange={(e) =>
                    setRentPaidNoHra(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
              </ToggleSection>

              <ToggleSection
                id="lta"
                emoji="✈️"
                title="LTA — Leave Travel Allowance"
                subtitle="I receive LTA from employer"
                oneLiner="Exemption tracks eligible domestic travel spend up to the allowance — payroll blocks still apply."
                isOn={secLTA}
                onToggle={setSecLTA}
              >
                <Mt
                  key={`${inputEpoch}-lta`}
                  id="tax-lta-recv"
                  label="Annual LTA received"
                  teach={TEACH.income.ltaTaxable}
                  optional
                  defaultValue={
                    ltaAnnualRecv ? formatIndian(ltaAnnualRecv) : ""
                  }
                  max={500000000}
                  onChange={(e) =>
                    setLtaAnnualRecv(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <label className="flex cursor-pointer items-center gap-2 py-2 text-sm text-[#5F5E5A]">
                  <input
                    type="checkbox"
                    checked={ltaClaiming}
                    onChange={(e) => setLtaClaiming(e.target.checked)}
                    className="accent-[#534AB7]"
                  />
                  Claiming eligible travel this year?
                </label>
                {ltaClaiming ? (
                  <Mt
                    key={`${inputEpoch}-lta-travel`}
                    id="tax-lta-cost"
                    label="Actual travel cost"
                    teach={TEACH.income.ltaExempt}
                    optional
                    defaultValue={
                      ltaTravelCost ? formatIndian(ltaTravelCost) : ""
                    }
                    max={500000000}
                    onChange={(e) =>
                      setLtaTravelCost(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                ) : null}
                <p className="text-xs text-[#7A7871]">
                  LTA exemption needs domestic travel proofs; blocks are
                  claim-limited — verify with payroll.
                </p>
                <div className="mt-2 text-sm text-[#5F5E5A]">
                  Exempt ₹{derived.ltaExemptRec.toLocaleString("en-IN")} ·
                  Taxable ₹{derived.ltaTaxable.toLocaleString("en-IN")}
                </div>
              </ToggleSection>

              <ToggleSection
                id="rsu"
                emoji="📈"
                title="RSU / ESOP — Company shares"
                subtitle="RSUs or ESOPs vesting this year"
                oneLiner="FMV at vest flows like salary; later sales map into equity STCG/LTCG buckets in this model."
                isOn={secRSU}
                onToggle={setSecRSU}
              >
                <p className="mb-2 text-sm font-medium text-[#5F5E5A]">
                  Listing (for your notes)
                </p>
                <div className="mb-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={cn(
                      pill,
                      _rsuListing === "india"
                        ? "bg-[#534AB7] text-white"
                        : "bg-slate-100",
                    )}
                    onClick={() => setRsuListing("india")}
                  >
                    India listed
                  </button>
                  <button
                    type="button"
                    className={cn(
                      pill,
                      _rsuListing === "us"
                        ? "bg-[#534AB7] text-white"
                        : "bg-slate-100",
                    )}
                    onClick={() => setRsuListing("us")}
                  >
                    US listed
                  </button>
                  <button
                    type="button"
                    className={cn(
                      pill,
                      _rsuListing === "other"
                        ? "bg-[#534AB7] text-white"
                        : "bg-slate-100",
                    )}
                    onClick={() => setRsuListing("other")}
                  >
                    Other
                  </button>
                </div>
                <NumberInput
                  label="Units vesting this FY"
                  value={rsuUnits}
                  onChange={setRsuUnits}
                  min={0}
                  step={1}
                />
                <Mt
                  key={`${inputEpoch}-rsu-fmv`}
                  id="tax-rsu-fmv"
                  label="FMV per unit on vest"
                  teach={TEACH.income.rsuVesting}
                  optional
                  defaultValue={
                    rsuFmvPerUnit ? formatIndian(rsuFmvPerUnit) : ""
                  }
                  max={500000000}
                  onChange={(e) =>
                    setRsuFmvPerUnit(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <div className="text-sm font-semibold text-[#111110]">
                  RSU salary income ≈{" "}
                  {rupees(rsuVestingIncomeAnnual(rsuUnits, rsuFmvPerUnit))}
                </div>
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-[#5F5E5A]">
                  <input
                    type="checkbox"
                    checked={rsuPlanSell}
                    onChange={(e) => setRsuPlanSell(e.target.checked)}
                    className="accent-[#534AB7]"
                  />
                  Planning to sell vested units?
                </label>
                {rsuPlanSell ? (
                  <div className="mt-2 space-y-2">
                    <NumberInput
                      label="Units sold"
                      value={rsuUnitsSold}
                      onChange={setRsuUnitsSold}
                      min={0}
                      step={1}
                    />
                    <Mt
                      key={`${inputEpoch}-rsu-sale`}
                      id="tax-rsu-sale"
                      label="Sale price per unit"
                      teach={TEACH.income.rsuSaleStcg}
                      optional
                      defaultValue={
                        rsuSalePrice ? formatIndian(rsuSalePrice) : ""
                      }
                      max={500000000}
                      onChange={(e) =>
                        setRsuSalePrice(parseMoneyInput(e.target.value) ?? 0)
                      }
                    />
                    <Mt
                      key={`${inputEpoch}-rsu-cost`}
                      id="tax-rsu-cost"
                      label="Cost / FMV per unit at vest"
                      teach={TEACH.income.rsuSaleLtcg}
                      optional
                      defaultValue={
                        rsuCostPrice
                          ? formatIndian(rsuCostPrice)
                          : rsuFmvPerUnit
                            ? formatIndian(rsuFmvPerUnit)
                            : ""
                      }
                      max={500000000}
                      onChange={(e) =>
                        setRsuCostPrice(parseMoneyInput(e.target.value) ?? 0)
                      }
                    />
                    <p className="text-sm font-medium text-[#5F5E5A]">
                      Holding bucket
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {chip(rsuShortTerm, "Short-term (equity)", () =>
                        setRsuShortTerm(true),
                      )}
                      {chip(!rsuShortTerm, "Long-term (equity)", () =>
                        setRsuShortTerm(false),
                      )}
                    </div>
                    <div className="text-sm text-[#5F5E5A]">
                      Gain ₹
                      {Math.max(
                        0,
                        rsuSaleGain(
                          rsuUnitsSold,
                          rsuSalePrice,
                          rsuCostPrice > 0 ? rsuCostPrice : rsuFmvPerUnit,
                        ),
                      ).toLocaleString("en-IN")}{" "}
                      → {rsuShortTerm ? "STCG bucket" : "LTCG bucket"}
                    </div>
                  </div>
                ) : null}
              </ToggleSection>

              <ToggleSection
                id="gratuity"
                emoji="🎁"
                title="Gratuity"
                subtitle="Received gratuity this year"
                oneLiner="Government payouts modeled fully exempt; private sector uses ₹20L-aware illustrative formula."
                isOn={secGratuity}
                onToggle={setSecGratuity}
              >
                <div className="mb-2 flex flex-wrap gap-2">
                  {chip(gratEmployer === "government", "Government", () =>
                    setGratEmployer("government"),
                  )}
                  {chip(gratEmployer === "private", "Private sector", () =>
                    setGratEmployer("private"),
                  )}
                </div>
                <Mt
                  key={`${inputEpoch}-grat`}
                  id="tax-grat-amt"
                  label="Gratuity received"
                  teach={TEACH.income.gratuityTaxable}
                  optional
                  defaultValue={gratReceived ? formatIndian(gratReceived) : ""}
                  max={500000000}
                  onChange={(e) =>
                    setGratReceived(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <NumberInput
                  label="Years of service"
                  value={gratYears}
                  onChange={setGratYears}
                  min={0}
                  step={1}
                />
                <Mt
                  key={`${inputEpoch}-grat-sal`}
                  id="tax-grat-salary"
                  label="Last drawn salary (annual, for formula)"
                  teach={TEACH.income.gratuityExempt}
                  optional
                  defaultValue={
                    gratLastSalaryAnnual
                      ? formatIndian(gratLastSalaryAnnual)
                      : ""
                  }
                  max={500000000}
                  onChange={(e) =>
                    setGratLastSalaryAnnual(
                      parseMoneyInput(e.target.value) ?? 0,
                    )
                  }
                />
                <div className="text-sm text-[#5F5E5A]">
                  Exempt ₹{derived.gratuityExemptRec.toLocaleString("en-IN")} ·
                  Taxable ₹{derived.gratuityTaxable.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-[#7A7871]">
                  Private employees: ₹20L cumulative exemption ceiling applies —
                  confirm notifications with payroll.
                </p>
              </ToggleSection>

              <ToggleSection
                id="leave"
                emoji="🌴"
                title="Leave encashment"
                subtitle="Encashed leave this year"
                oneLiner="Retirement vs in-service paths change exemption sketches — confirm HR worksheets."
                isOn={secLeave}
                onToggle={setSecLeave}
              >
                <div className="mb-2 flex flex-wrap gap-2">
                  {chip(leaveTiming === "retirement", "At retirement", () =>
                    setLeaveTiming("retirement"),
                  )}
                  {chip(
                    leaveTiming === "during_service",
                    "During service",
                    () => setLeaveTiming("during_service"),
                  )}
                </div>
                <div className="mb-2 flex flex-wrap gap-2">
                  {chip(
                    leaveEmployer === "government",
                    "Government employer",
                    () => setLeaveEmployer("government"),
                  )}
                  {chip(leaveEmployer === "private", "Private employer", () =>
                    setLeaveEmployer("private"),
                  )}
                </div>
                <Mt
                  key={`${inputEpoch}-leave-amt`}
                  id="tax-leave-amt"
                  label="Amount received"
                  teach={TEACH.income.leaveEncashmentTaxable}
                  optional
                  defaultValue={
                    leaveReceived ? formatIndian(leaveReceived) : ""
                  }
                  max={500000000}
                  onChange={(e) =>
                    setLeaveReceived(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-leave-avg`}
                  id="tax-leave-avg"
                  label="Avg monthly salary (last 10 months)"
                  teach={TEACH.income.leaveEncashmentTaxable}
                  optional
                  defaultValue={
                    leaveAvgMonthly ? formatIndian(leaveAvgMonthly) : ""
                  }
                  max={500000000}
                  onChange={(e) =>
                    setLeaveAvgMonthly(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <NumberInput
                  label="Years of service"
                  value={leaveYears}
                  onChange={setLeaveYears}
                  min={0}
                  step={1}
                />
                <NumberInput
                  label="Accumulated leave days"
                  value={leaveDays}
                  onChange={setLeaveDays}
                  min={0}
                  step={1}
                />
                <div className="text-sm text-[#5F5E5A]">
                  Exempt ₹{derived.leaveExemptRec.toLocaleString("en-IN")} ·
                  Taxable ₹{derived.leaveTaxable.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-[#7A7871]">
                  Section 10(10AA) — illustrative split only.
                </p>
              </ToggleSection>

              <ToggleSection
                id="biz"
                emoji="💼"
                title="Business income"
                subtitle="Business / profession"
                oneLiner="Pick actual books or presumptive (44AD/44ADA) — you generally shouldn’t mix expense claims with presumptive."
                isOn={secBusiness}
                onToggle={setSecBusiness}
              >
                <div className="mb-2 flex flex-wrap gap-2">
                  {chip(bizMode === "regular", "Regular (actuals)", () =>
                    setBizMode("regular"),
                  )}
                  {chip(bizMode === "44ad", "44AD presumptive", () =>
                    setBizMode("44ad"),
                  )}
                  {chip(bizMode === "44ada", "44ADA presumptive", () =>
                    setBizMode("44ada"),
                  )}
                </div>
                {bizMode === "regular" ? (
                  <>
                    <Mt
                      key={`${inputEpoch}-biz-gross`}
                      id="tax-biz-gross"
                      label="Gross receipts"
                      teach={TEACH.income.businessProfit}
                      optional
                      defaultValue={
                        bizGrossReceipts ? formatIndian(bizGrossReceipts) : ""
                      }
                      max={500000000}
                      onChange={(e) =>
                        setBizGrossReceipts(
                          parseMoneyInput(e.target.value) ?? 0,
                        )
                      }
                    />
                    <Mt
                      key={`${inputEpoch}-biz-exp`}
                      id="tax-biz-exp"
                      label="Expenses"
                      teach={TEACH.income.businessProfit}
                      optional
                      defaultValue={
                        bizExpenses ? formatIndian(bizExpenses) : ""
                      }
                      max={500000000}
                      onChange={(e) =>
                        setBizExpenses(parseMoneyInput(e.target.value) ?? 0)
                      }
                    />
                  </>
                ) : null}
                {bizMode === "44ad" ? (
                  <>
                    <Mt
                      key={`${inputEpoch}-biz-to`}
                      id="tax-biz-to"
                      label="Annual turnover"
                      teach={TEACH.income.businessProfit}
                      optional
                      defaultValue={
                        bizTurnover44AD ? formatIndian(bizTurnover44AD) : ""
                      }
                      max={500000000}
                      onChange={(e) =>
                        setBizTurnover44AD(parseMoneyInput(e.target.value) ?? 0)
                      }
                    />
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-[#5F5E5A]">
                      <input
                        type="checkbox"
                        checked={bizDigital44AD}
                        onChange={(e) => setBizDigital44AD(e.target.checked)}
                        className="accent-[#534AB7]"
                      />
                      Mostly digital receipts (use 6% presumptive)
                    </label>
                  </>
                ) : null}
                {bizMode === "44ada" ? (
                  <Mt
                    key={`${inputEpoch}-biz-ada`}
                    id="tax-biz-ada"
                    label="Professional receipts"
                    teach={TEACH.income.businessProfit}
                    optional
                    defaultValue={
                      bizReceipts44ADA ? formatIndian(bizReceipts44ADA) : ""
                    }
                    max={500000000}
                    onChange={(e) =>
                      setBizReceipts44ADA(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                ) : null}
                <div className="text-sm font-semibold text-[#111110]">
                  Net / presumptive income ≈ {rupees(derived.businessProfit)}
                </div>
                <p className="text-xs text-[#7A7871]">
                  Presumptive schemes limit expense claims — confirm
                  eligibility.
                </p>
              </ToggleSection>

              <ToggleSection
                id="rental"
                emoji="🏢"
                title="Rental income"
                subtitle="Rent from property"
                oneLiner="Let-out workflow: NAV minus statutory 30% and interest on rental loan before slab tax."
                isOn={secRental}
                onToggle={setSecRental}
              >
                <Mt
                  key={`${inputEpoch}-rent-g`}
                  id="tax-rent-gross"
                  label="Annual rent received"
                  teach={TEACH.income.rentalIncome}
                  optional
                  defaultValue={
                    rentAnnualGross ? formatIndian(rentAnnualGross) : ""
                  }
                  max={500000000}
                  onChange={(e) =>
                    setRentAnnualGross(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-rent-mun`}
                  id="tax-rent-mun"
                  label="Municipal taxes paid"
                  teach={TEACH.income.rentalIncome}
                  optional
                  defaultValue={
                    rentMunicipal ? formatIndian(rentMunicipal) : ""
                  }
                  max={500000000}
                  onChange={(e) =>
                    setRentMunicipal(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-rent-loan`}
                  id="tax-rent-loan"
                  label="Home loan interest (let-out)"
                  teach={TEACH.income.rentalIncome}
                  optional
                  defaultValue={
                    rentLoanInterest ? formatIndian(rentLoanInterest) : ""
                  }
                  max={500000000}
                  onChange={(e) =>
                    setRentLoanInterest(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                {derived.rentalBreakdown ? (
                  <div className="space-y-1 text-xs text-[#5F5E5A]">
                    <div>
                      Gross ₹
                      {derived.rentalBreakdown.grossRent.toLocaleString(
                        "en-IN",
                      )}
                    </div>
                    <div>
                      Less municipal ₹
                      {derived.rentalBreakdown.lessMunicipal.toLocaleString(
                        "en-IN",
                      )}
                    </div>
                    <div>
                      NAV ₹
                      {Math.round(derived.rentalBreakdown.nav).toLocaleString(
                        "en-IN",
                      )}
                    </div>
                    <div>
                      Less 30% ₹
                      {Math.round(
                        derived.rentalBreakdown.less30,
                      ).toLocaleString("en-IN")}
                    </div>
                    <div>
                      Less interest ₹
                      {derived.rentalBreakdown.lessInterest.toLocaleString(
                        "en-IN",
                      )}
                    </div>
                    <div className="font-semibold text-[#111110]">
                      Taxable rental ₹
                      {derived.rentalTaxable.toLocaleString("en-IN")}
                    </div>
                  </div>
                ) : null}
              </ToggleSection>

              <ToggleSection
                id="pension"
                emoji="🏖️"
                title="Pension income"
                subtitle="Pension or family pension"
                oneLiner="Monthly pension is ordinary income; commuted / family pension apply simplified exemption math here."
                isOn={secPension}
                onToggle={setSecPension}
              >
                <div className="mb-2 flex flex-wrap gap-2">
                  {chip(
                    pensionKind === "government",
                    "Government service",
                    () => setPensionKind("government"),
                  )}
                  {chip(pensionKind === "private", "Private pension", () =>
                    setPensionKind("private"),
                  )}
                  {chip(pensionKind === "family", "Family pension", () =>
                    setPensionKind("family"),
                  )}
                </div>
                {pensionKind === "family" ? (
                  <Mt
                    key={`${inputEpoch}-fam-pen`}
                    id="tax-fam-pen"
                    label="Monthly family pension"
                    teach={TEACH.income.familyPension}
                    optional
                    defaultValue={
                      familyPensionMonthly
                        ? formatIndian(familyPensionMonthly)
                        : ""
                    }
                    max={500000000}
                    onChange={(e) =>
                      setFamilyPensionMonthly(
                        parseMoneyInput(e.target.value) ?? 0,
                      )
                    }
                  />
                ) : (
                  <>
                    <Mt
                      key={`${inputEpoch}-pen`}
                      id="tax-pen"
                      label="Monthly pension"
                      teach={TEACH.income.pension}
                      optional
                      defaultValue={
                        pensionMonthly ? formatIndian(pensionMonthly) : ""
                      }
                      max={500000000}
                      onChange={(e) =>
                        setPensionMonthly(parseMoneyInput(e.target.value) ?? 0)
                      }
                    />
                    <Mt
                      key={`${inputEpoch}-comm`}
                      id="tax-comm"
                      label="Commuted pension received (lump sum)"
                      teach={TEACH.income.pension}
                      optional
                      defaultValue={
                        commutedPension ? formatIndian(commutedPension) : ""
                      }
                      max={500000000}
                      onChange={(e) =>
                        setCommutedPension(parseMoneyInput(e.target.value) ?? 0)
                      }
                    />
                  </>
                )}
                <p className="text-xs text-[#7A7871]">
                  Tool applies simple exemption sketches on commuted / family
                  pension — confirm Form 16 treatment.
                </p>
              </ToggleSection>

              <ToggleSection
                id="interest"
                emoji="🏦"
                title="Interest income"
                subtitle="Savings, FD, bonds"
                oneLiner="Splitting savings vs FD interest helps the planner nudge 80TTA vs manual slab inclusion."
                isOn={secInterest}
                onToggle={setSecInterest}
              >
                <Mt
                  key={`${inputEpoch}-int-sav`}
                  id="tax-int-sav"
                  label="Savings account interest"
                  helper="80TTA / 80TTB may offset small slices."
                  teach={TEACH.income.interestIncome}
                  optional
                  defaultValue={
                    savingsInterest ? formatIndian(savingsInterest) : ""
                  }
                  max={500000000}
                  onChange={(e) =>
                    setSavingsInterest(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-int-fd`}
                  id="tax-int-fd"
                  label="FD / RD interest"
                  teach={TEACH.income.interestIncome}
                  optional
                  defaultValue={fdInterest ? formatIndian(fdInterest) : ""}
                  max={500000000}
                  onChange={(e) =>
                    setFdInterest(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-int-po`}
                  id="tax-int-po"
                  label="Post office interest"
                  teach={TEACH.income.interestIncome}
                  optional
                  defaultValue={
                    postOfficeInterest ? formatIndian(postOfficeInterest) : ""
                  }
                  max={500000000}
                  onChange={(e) =>
                    setPostOfficeInterest(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-int-bond`}
                  id="tax-int-bond"
                  label="Bond / debenture interest"
                  teach={TEACH.income.interestIncome}
                  optional
                  defaultValue={
                    bondsInterest ? formatIndian(bondsInterest) : ""
                  }
                  max={500000000}
                  onChange={(e) =>
                    setBondsInterest(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <div className="text-sm font-semibold text-[#111110]">
                  Total interest ₹
                  {derived.interestIncome.toLocaleString("en-IN")}
                </div>
              </ToggleSection>

              <ToggleSection
                id="div"
                emoji="💰"
                title="Dividend income"
                subtitle="Stocks / MF / foreign"
                oneLiner="Post-2020 dividends sit in your slab; tag foreign flows if DTAA withholding applies."
                isOn={secDividend}
                onToggle={setSecDividend}
              >
                <Mt
                  key={`${inputEpoch}-div-in`}
                  id="tax-div-in"
                  label="Indian companies"
                  teach={TEACH.income.dividendIncome}
                  optional
                  defaultValue={divIndian ? formatIndian(divIndian) : ""}
                  max={500000000}
                  onChange={(e) =>
                    setDivIndian(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-div-fr`}
                  id="tax-div-fr"
                  label="Foreign companies"
                  teach={TEACH.income.dividendIncome}
                  optional
                  defaultValue={divForeign ? formatIndian(divForeign) : ""}
                  max={500000000}
                  onChange={(e) =>
                    setDivForeign(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <p className="text-xs text-[#7A7871]">
                  Dividends taxable at slab; TDS may apply over thresholds.
                </p>
              </ToggleSection>

              <ToggleSection
                id="cg"
                emoji="📊"
                title="Capital gains"
                subtitle="Equity, debt MF, property"
                oneLiner="Equity follows illustrative schedule rates; debt/property STCG slices here ride ordinary slab totals."
                isOn={secCG}
                onToggle={setSecCG}
              >
                <Mt
                  key={`${inputEpoch}-cg-eq-st`}
                  id="tax-cg-eq-st"
                  label="Equity STCG gains"
                  helper="Illustrative 20% in engine."
                  teach={TEACH.income.otherStcg}
                  optional
                  defaultValue={
                    cgEquityStcgExtra ? formatIndian(cgEquityStcgExtra) : ""
                  }
                  max={500000000}
                  onChange={(e) =>
                    setCgEquityStcgExtra(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-cg-eq-lt`}
                  id="tax-cg-eq-lt"
                  label="Equity LTCG gains"
                  helper="₹1.25L exemption then 12.5% illustrative."
                  teach={TEACH.income.otherLtcg}
                  optional
                  defaultValue={
                    cgEquityLtcgExtra ? formatIndian(cgEquityLtcgExtra) : ""
                  }
                  max={500000000}
                  onChange={(e) =>
                    setCgEquityLtcgExtra(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-cg-debt-st`}
                  id="tax-cg-debt-st"
                  label="Debt MF / similar STCG (slab)"
                  teach={TEACH.income.otherStcg}
                  optional
                  defaultValue={cgDebtStcg ? formatIndian(cgDebtStcg) : ""}
                  max={500000000}
                  onChange={(e) =>
                    setCgDebtStcg(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-cg-debt-lt`}
                  id="tax-cg-debt-lt"
                  label="Debt MF LTCG (slab illustration)"
                  teach={TEACH.income.otherLtcg}
                  optional
                  defaultValue={cgDebtLtcg ? formatIndian(cgDebtLtcg) : ""}
                  max={500000000}
                  onChange={(e) =>
                    setCgDebtLtcg(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-cg-prop-st`}
                  id="tax-cg-prop-st"
                  label="Property STCG (slab illustration)"
                  teach={TEACH.income.otherStcg}
                  optional
                  defaultValue={cgPropStcg ? formatIndian(cgPropStcg) : ""}
                  max={500000000}
                  onChange={(e) =>
                    setCgPropStcg(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-cg-prop-lt`}
                  id="tax-cg-prop-lt"
                  label="Property LTCG (12.5% illustrative)"
                  teach={TEACH.income.otherLtcg}
                  optional
                  defaultValue={cgPropLtcg ? formatIndian(cgPropLtcg) : ""}
                  max={500000000}
                  onChange={(e) =>
                    setCgPropLtcg(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <div className="text-xs text-[#5F5E5A]">
                  Equity schedule tax ₹{equityCgTaxOnly.toLocaleString("en-IN")}{" "}
                  · LTCG exemption band used ₹
                  {Math.round(ltcgExemptionUsed).toLocaleString("en-IN")} /
                  ₹1,25,000
                </div>
              </ToggleSection>

              <ToggleSection
                id="agri"
                emoji="🌾"
                title="Agricultural income"
                subtitle="Farming / agri (planning toggle)"
                oneLiner="Section 10(1) exempt in principle — we optionally exclude it from ordinary gross; integration not modeled."
                isOn={secAgri}
                onToggle={setSecAgri}
              >
                <Mt
                  key={`${inputEpoch}-agri`}
                  id="tax-agri"
                  label="Annual agricultural income"
                  teach={TEACH.income.agriculturalIncome}
                  optional
                  defaultValue={
                    agriculturalIncome ? formatIndian(agriculturalIncome) : ""
                  }
                  max={500000000}
                  onChange={(e) =>
                    setAgriculturalIncome(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <label className="flex cursor-pointer items-center gap-2 py-2 text-sm text-[#5F5E5A]">
                  <input
                    type="checkbox"
                    checked={excludeAgriculturalFromTax}
                    onChange={(e) =>
                      setExcludeAgriculturalFromTax(e.target.checked)
                    }
                    className="accent-[#534AB7]"
                  />
                  Exclude from ordinary gross in this planner (partial
                  integration not modeled)
                </label>
              </ToggleSection>

              <ToggleSection
                id="other"
                emoji="💫"
                title="Other income"
                subtitle="Lottery, gifts, commission…"
                oneLiner="Lottery taxed at flat illustrative 30%; gifts/commission only if you mark them taxable."
                isOn={secOther}
                onToggle={setSecOther}
              >
                <Mt
                  key={`${inputEpoch}-lot`}
                  id="tax-lot"
                  label="Lottery / gambling winnings"
                  helper="30% flat illustrative tax."
                  teach={TEACH.sections.income}
                  optional
                  defaultValue={
                    lotteryIncome ? formatIndian(lotteryIncome) : ""
                  }
                  max={500000000}
                  onChange={(e) =>
                    setLotteryIncome(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-gift`}
                  id="tax-gift"
                  label="Taxable gifts (net)"
                  teach={TEACH.sections.income}
                  optional
                  defaultValue={giftsTaxable ? formatIndian(giftsTaxable) : ""}
                  max={500000000}
                  onChange={(e) =>
                    setGiftsTaxable(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-comm-inc`}
                  id="tax-comm-inc"
                  label="Commission"
                  teach={TEACH.income.freelanceIncome}
                  optional
                  defaultValue={
                    commissionIncome ? formatIndian(commissionIncome) : ""
                  }
                  max={500000000}
                  onChange={(e) =>
                    setCommissionIncome(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-oth`}
                  id="tax-oth-misc"
                  label="Other taxable income"
                  teach={TEACH.sections.income}
                  optional
                  defaultValue={
                    otherMiscIncome ? formatIndian(otherMiscIncome) : ""
                  }
                  max={500000000}
                  onChange={(e) =>
                    setOtherMiscIncome(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
              </ToggleSection>
            </details>

            <details className="group rounded-xl border border-[#F0EFF8] bg-white p-4">
              {sectionSummary(
                "Step 4 · Deductions (old regime)",
                TEACH.sections.deductions,
              )}
              {sectionBlurb(
                "Turn these on only when comparing old regime savings — Chapter VI-A (except employer NPS) largely disappears under new.",
              )}

              <ToggleSection
                id="ded-c"
                emoji="📒"
                title="80C basket & NPS 80CCD(1B)"
                subtitle="Tax-saving investments"
                oneLiner="Shared ₹1.5L 80C bucket plus optional ₹50k extra NPS — relevant only when old regime wins."
                isOn={secDed80c}
                onToggle={setSecDed80c}
              >
                <div className="mb-3 rounded-lg border border-[#EEEDFE] bg-[#FAFAFE] p-3 text-xs text-[#5F5E5A]">
                  <span className="font-semibold text-[#534AB7]">
                    80C running total{" "}
                    {rupees(
                      c80Elss +
                        c80Ppf +
                        c80Lic +
                        c80Epf +
                        c80Tuition +
                        c80Principal,
                    )}{" "}
                    · Applied {rupees(running80C)} / ₹1,50,000
                  </span>
                  <TaxTeachTooltip content={TEACH.deductions.eightyCRunning} />
                </div>
                <Mt
                  key={`${inputEpoch}-elss`}
                  id="tax-c-elss"
                  label="ELSS / 80C equity"
                  teach={TEACH.deductions.eightyCElss}
                  optional
                  defaultValue={c80Elss ? formatIndian(c80Elss) : ""}
                  max={150000}
                  onChange={(e) =>
                    setC80Elss(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-ppf`}
                  id="tax-c-ppf"
                  label="PPF"
                  teach={TEACH.deductions.eightyCPpf}
                  optional
                  defaultValue={c80Ppf ? formatIndian(c80Ppf) : ""}
                  max={150000}
                  onChange={(e) =>
                    setC80Ppf(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-lic`}
                  id="tax-c-lic"
                  label="LIC / insurance (80C basket)"
                  teach={TEACH.deductions.eightyCLic}
                  optional
                  defaultValue={c80Lic ? formatIndian(c80Lic) : ""}
                  max={150000}
                  onChange={(e) =>
                    setC80Lic(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-epf`}
                  id="tax-c-epf"
                  label="EPF / employee PF"
                  teach={TEACH.deductions.eightyCEpf}
                  optional
                  defaultValue={c80Epf ? formatIndian(c80Epf) : ""}
                  max={150000}
                  onChange={(e) =>
                    setC80Epf(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-tuition`}
                  id="tax-c-tuition"
                  label="Tuition fees"
                  teach={TEACH.deductions.eightyCTuition}
                  optional
                  defaultValue={c80Tuition ? formatIndian(c80Tuition) : ""}
                  max={150000}
                  onChange={(e) =>
                    setC80Tuition(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-principal`}
                  id="tax-c-principal"
                  label="Home loan principal"
                  teach={TEACH.deductions.eightyCHomePrincipal}
                  optional
                  defaultValue={c80Principal ? formatIndian(c80Principal) : ""}
                  max={150000}
                  onChange={(e) =>
                    setC80Principal(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  key={`${inputEpoch}-nps`}
                  id="tax-nps"
                  label="80CCD(1B) NPS additional"
                  teach={TEACH.deductions.eightyCCD}
                  max={50000}
                  defaultValue={nps80CCD1B ? formatIndian(nps80CCD1B) : ""}
                  onChange={(e) =>
                    setNps80CCD1B(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
              </ToggleSection>

              <ToggleSection
                id="ded-d"
                emoji="🩺"
                title="80D medical insurance"
                subtitle="Self & parents premiums"
                oneLiner="Self cap follows your age (₹25k / ₹50k). Parents cap needs parents’ age — ₹50k if 60+."
                isOn={secDed80d}
                onToggle={setSecDed80d}
              >
                <Mt
                  id="tax-80d-self"
                  label={`80D — self / spouse / kids (cap ₹${formatIndian(self80DCap)})`}
                  teach={TEACH.deductions.eightyDSelf}
                  max={self80DCap}
                  defaultValue={
                    deductions80DSelf ? formatIndian(deductions80DSelf) : ""
                  }
                  onChange={(e) =>
                    setDeductions80DSelf(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <NumberInput
                  label="Age of oldest parent"
                  value={parentsAge}
                  onChange={(v) => {
                    const next = Math.round(v);
                    setParentsAge(next);
                    setParentsSenior(next >= 60);
                  }}
                  min={0}
                  max={120}
                  step={1}
                  placeholder="e.g. 62"
                  helper="As of FY end (31 Mar). Under 60 → parents 80D cap ₹25,000; 60+ → ₹50,000."
                />
                <p className="text-xs text-[#7A7871]">
                  Parents 80D cap applied: ₹{formatIndian(parents80DCap)}
                  {parentsAge > 0
                    ? parentsSeniorEffective
                      ? " (senior parents)"
                      : " (parents under 60)"
                    : " — enter parent age above for the right cap"}
                </p>
                <Mt
                  id="tax-80d-par"
                  label={`80D — parents (cap ₹${formatIndian(parents80DCap)})`}
                  teach={TEACH.deductions.eightyDParents}
                  max={parents80DCap}
                  optional
                  defaultValue={
                    deductions80DParents
                      ? formatIndian(deductions80DParents)
                      : ""
                  }
                  onChange={(e) =>
                    setDeductions80DParents(
                      parseMoneyInput(e.target.value) ?? 0,
                    )
                  }
                />
              </ToggleSection>

              <ToggleSection
                id="ded-rest"
                emoji="📑"
                title="Other Chapter VI-A & 24(b)"
                subtitle="Remaining deductions"
                oneLiner="Donations, disability, education-loan interest, first-home boosts, and ₹2L housing-loan interest slices."
                isOn={secDedRest}
                onToggle={setSecDedRest}
              >
                <Mt
                  id="tax-80dd"
                  label="80DD"
                  teach={TEACH.deductions.eightyDD}
                  max={125000}
                  optional
                  defaultValue={
                    deduction80DD ? formatIndian(deduction80DD) : ""
                  }
                  onChange={(e) =>
                    setDeduction80DD(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  id="tax-80ddb"
                  label="80DDB"
                  teach={TEACH.deductions.eightyDDB}
                  max={age >= 60 ? 100000 : 40000}
                  optional
                  defaultValue={
                    deduction80DDB ? formatIndian(deduction80DDB) : ""
                  }
                  onChange={(e) =>
                    setDeduction80DDB(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  id="tax-80e"
                  label="80E education loan interest"
                  teach={TEACH.deductions.eightyE}
                  optional
                  defaultValue={deduction80E ? formatIndian(deduction80E) : ""}
                  max={500000000}
                  onChange={(e) =>
                    setDeduction80E(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  id="tax-80eea"
                  label="80EEA"
                  teach={TEACH.deductions.eightyEEA}
                  max={150000}
                  optional
                  defaultValue={
                    deduction80EEA ? formatIndian(deduction80EEA) : ""
                  }
                  onChange={(e) =>
                    setDeduction80EEA(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  id="tax-80g"
                  label="80G donations"
                  teach={TEACH.deductions.eightyG}
                  optional
                  defaultValue={deduction80G ? formatIndian(deduction80G) : ""}
                  max={500000000}
                  onChange={(e) =>
                    setDeduction80G(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  id="tax-80tta"
                  label="80TTA"
                  teach={TEACH.deductions.eightyTTA}
                  max={10000}
                  optional
                  disabled={age >= 60}
                  defaultValue={
                    deduction80TTA ? formatIndian(deduction80TTA) : ""
                  }
                  onChange={(e) =>
                    setDeduction80TTA(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  id="tax-80ttb"
                  label="80TTB"
                  teach={TEACH.deductions.eightyTTB}
                  max={50000}
                  optional
                  defaultValue={
                    deduction80TTB ? formatIndian(deduction80TTB) : ""
                  }
                  onChange={(e) =>
                    setDeduction80TTB(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  id="tax-80u"
                  label="80U"
                  teach={TEACH.deductions.eightyU}
                  max={125000}
                  optional
                  defaultValue={deduction80U ? formatIndian(deduction80U) : ""}
                  onChange={(e) =>
                    setDeduction80U(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  id="tax-80rrb"
                  label="80RRB royalty"
                  teach={TEACH.deductions.eightyRRB}
                  max={300000}
                  optional
                  defaultValue={
                    deduction80RRB ? formatIndian(deduction80RRB) : ""
                  }
                  onChange={(e) =>
                    setDeduction80RRB(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  id="tax-24b"
                  label="24(b) home loan interest"
                  teach={TEACH.deductions.twentyFourB}
                  max={200000}
                  optional
                  defaultValue={
                    homeLoanInterest24b ? formatIndian(homeLoanInterest24b) : ""
                  }
                  onChange={(e) =>
                    setHomeLoanInterest24b(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <Mt
                  id="tax-pt"
                  label="Professional tax"
                  teach={TEACH.deductions.professionalTax}
                  max={5000}
                  optional
                  defaultValue={
                    professionalTax ? formatIndian(professionalTax) : ""
                  }
                  onChange={(e) =>
                    setProfessionalTax(parseMoneyInput(e.target.value) ?? 0)
                  }
                />
                <div className="flex items-start gap-2 rounded-lg border border-dashed border-[#E8E6F0] px-3 py-2 text-xs text-[#7A7871]">
                  <TaxTeachTooltip
                    content={TEACH.deductions.standardOld}
                    ariaLabel="Standard deduction old"
                  />
                  <span>
                    Old regime ₹50k standard deduction; new regime ₹75k in this
                    tool (
                    <TaxTeachTooltip
                      content={TEACH.deductions.standardNew}
                      ariaLabel="Standard deduction new"
                    />
                    ).
                  </span>
                </div>
              </ToggleSection>
            </details>

            {derived.leaveExemptRec > 0 ||
            derived.gratuityExemptRec > 0 ||
            derived.ltaExemptRec > 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-[#5F5E5A]">
                <span className="font-semibold text-slate-800">
                  Recorded exempt amounts (memo):{" "}
                </span>
                {[
                  derived.leaveExemptRec > 0
                    ? `Leave ₹${derived.leaveExemptRec.toLocaleString("en-IN")}`
                    : null,
                  derived.gratuityExemptRec > 0
                    ? `Gratuity ₹${derived.gratuityExemptRec.toLocaleString("en-IN")}`
                    : null,
                  derived.ltaExemptRec > 0
                    ? `LTA ₹${derived.ltaExemptRec.toLocaleString("en-IN")}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            ) : null}

            <details
              open
              className="group rounded-xl border border-[#F0EFF8] bg-white p-4"
            >
              {sectionSummary("Step 5 · Results", TEACH.sections.deductions)}
              {sectionBlurb(
                "Side-by-side slab math with surcharge & cess flags — exportable PDF mirrors these rounded totals.",
              )}
              <div className="overflow-hidden bg-white md:rounded-xl md:border md:border-[#E8E6F0]">
                {mobileComparisonTable(oldR, newR)}
                <div className="hidden border-b border-[#E8E6F0] bg-[#F7F6FE] px-4 py-3 text-sm font-semibold text-[#111110] md:grid md:grid-cols-2">
                  <div className="border-r border-[#E8E6F0] pr-4">
                    Old regime
                  </div>
                  <div className="pl-4">New regime</div>
                </div>
                <div className="hidden snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-3 pb-3 pt-2 [-webkit-overflow-scrolling:touch] md:grid md:snap-none md:grid-cols-2 md:gap-4 md:overflow-visible md:p-4 md:pb-4 md:pt-4">
                  <div className="w-[min(88vw,340px)] shrink-0 snap-center md:w-auto md:min-w-0 md:shrink">
                    <p className="mb-2 hidden text-xs font-semibold text-[#534AB7] md:block">
                      Old regime — detail
                    </p>
                    {regimeColumn(oldR, "Total deductions", true)}
                  </div>
                  <div className="w-[min(88vw,340px)] shrink-0 snap-center md:w-auto md:min-w-0 md:shrink">
                    <p className="mb-2 hidden text-xs font-semibold text-[#534AB7] md:block">
                      New regime — detail
                    </p>
                    {regimeColumn(newR, "Standard deduction (₹75k)", true)}
                  </div>
                </div>
              </div>

              {winner === "new" ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-950">
                  <p className="text-lg font-bold">
                    Winner: New regime — about {rupees(saveAmount)} / year
                  </p>
                </div>
              ) : winner === "old" ? (
                <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-4 text-sky-950">
                  <p className="text-lg font-bold">
                    Winner: Old regime — about {rupees(saveAmount)} / year
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-900">
                  <p className="text-lg font-bold">Rough tie between regimes</p>
                </div>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Old — monthly take-home
                  </p>
                  <PrivateAmount
                    value={oldMonthly}
                    label="old regime take-home"
                    valueClassName="mt-1 text-lg font-semibold tabular-nums"
                  >
                    {rupees(oldMonthly)}
                  </PrivateAmount>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    New — monthly take-home
                  </p>
                  <PrivateAmount
                    value={newMonthly}
                    label="new regime take-home"
                    valueClassName="mt-1 text-lg font-semibold tabular-nums"
                  >
                    {rupees(newMonthly)}
                  </PrivateAmount>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Monthly difference
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {rupees(Math.abs(oldMonthly - newMonthly))}
                  </p>
                </div>
              </div>

              {missedAlerts.length > 0 ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-950">
                  <p className="font-semibold">
                    Possible missed deductions / checks
                  </p>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
                    {missedAlerts.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <Insight tone="good">
                <span className="font-semibold">Plain-language next steps</span>
                <ul className="mt-2 list-disc space-y-1 pl-5 font-normal">
                  {tips.map((t, idx) => (
                    <li key={`tip-${idx}`}>{t}</li>
                  ))}
                </ul>
              </Insight>

              <div className="mt-4 rounded-xl border border-[#E8E6F0] bg-[#FAFAFE] px-4 py-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#534AB7]">
                  Suggested ITR form
                </p>
                <p className="mt-1 font-semibold text-[#111110]">
                  {itrSuggestion.form}
                </p>
                <p className="mt-1 text-[#5F5E5A]">{itrSuggestion.why}</p>
                <p className="mt-1 text-xs text-[#7A7871]">
                  {itrSuggestion.note}
                </p>
                <details className="mt-3 rounded-lg border border-[#EEEDFE] bg-white px-3 py-2">
                  <summary className="cursor-pointer text-xs font-semibold text-[#534AB7]">
                    Which ITR should I choose? (ITR-1 to ITR-4)
                  </summary>
                  <ul className="mt-2 space-y-2 text-xs leading-relaxed text-[#5F5E5A]">
                    {itrSuggestion.guide.map((row) => (
                      <li key={row.form}>
                        <span className="font-semibold text-[#111110]">
                          {row.form}:{" "}
                        </span>
                        {row.when}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-[#9B9A94]">
                    Educational guide only — eligibility rules change; confirm
                    on the Income Tax portal / with a CA before filing.
                  </p>
                </details>
                {tdsPrepaid > 0 ? (
                  <div className="mt-3 rounded-lg border border-[#EEEDFE] bg-white px-3 py-2 text-xs text-[#5F5E5A]">
                    <p className="font-semibold text-[#111110]">
                      TDS already deducted: {rupees(tdsPrepaid)}
                    </p>
                    <p className="mt-1">
                      vs winning regime tax ≈{" "}
                      {rupees(winner === "old" ? oldR.totalTax : newR.totalTax)}{" "}
                      →{" "}
                      {(() => {
                        const bal = taxBalanceVsTds(
                          winner === "old" ? oldR.totalTax : newR.totalTax,
                        );
                        if (bal > 0) return `approx payable ${rupees(bal)}`;
                        if (bal < 0)
                          return `approx refund ${rupees(Math.abs(bal))}`;
                        return "roughly matched";
                      })()}
                      . Match figures to Form 16 / 26AS.
                    </p>
                  </div>
                ) : null}
              </div>

              {learnedToday.length > 0 ? (
                <div className="mt-4 rounded-xl border border-[#EEEDFE] bg-[#FAFAFE] px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#534AB7]">
                    What you learned today
                  </p>
                  <ul className="mt-3 space-y-3">
                    {learnedToday.map((row) => (
                      <li key={row.title} className="text-sm text-[#5F5E5A]">
                        <span className="font-semibold text-[#111110]">
                          {row.emoji} {row.title}
                        </span>
                        <div className="mt-0.5 leading-relaxed">{row.body}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <section className="mt-4 rounded-xl border border-[#E8E6F0] bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#534AB7]">
                    FAQ
                  </p>
                  <TaxTeachTooltip
                    content={TEACH.sections.deductions}
                    ariaLabel="Tax glossary context"
                  />
                </div>
                {sectionBlurb(
                  "Quick clarifiers only — use deeper guides or your CA for filing-grade nuance.",
                )}
                <div className="mt-3 space-y-2">
                  <details className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
                    <summary className="cursor-pointer text-sm font-medium text-slate-900">
                      How are RSU vest and sale taxed differently?
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-[#5F5E5A]">
                      Vesting is generally salary perquisite; sales later pick
                      up capital gains — verify broker statements.
                    </p>
                  </details>
                  <details className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
                    <summary className="cursor-pointer text-sm font-medium text-slate-900">
                      Where can I read deeper guides?
                    </summary>
                    <ul className="mt-2 list-none space-y-1.5 text-sm text-[#534AB7]">
                      {learnTaxLinks.map((l) => (
                        <li key={l.href}>
                          <Link href={l.href} className="hover:underline">
                            {l.label} →
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              </section>
            </details>
          </div>
        </>
      ) : null}

      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        priceLabel="Pay ₹99"
        title="Unlock tax regime deep report"
        subtitle="Full narrative and printable layout."
        checkoutDescription="Unlock tax regime comparison deep report"
        bulletPoints={[
          "Slab + equity CG narrative",
          "What-if scenarios",
          "Print / PDF via browser",
          "Checklist for CA review",
        ]}
        navigateAfterUnlock="/calculators?calc=tax-regime"
      />

      {personalCAOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto overscroll-contain bg-slate-900/60 p-4 py-8 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="personal-ca-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closePersonalCA();
          }}
        >
          <div className="my-auto w-full max-w-2xl max-h-[min(88dvh,52rem)] overflow-hidden rounded-3xl bg-white shadow-xl flex flex-col p-4 sm:p-6">
            <div className="flex shrink-0 items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#534AB7]">
                  Personal CA
                </p>
                <h2
                  id="personal-ca-title"
                  className="text-lg font-semibold text-slate-900 sm:text-xl"
                >
                  Your guided tax Q&A
                </h2>
                <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                  Step {Math.min(personalCAStep + 1, personalCATotalSteps)} of{" "}
                  {personalCATotalSteps} · {personalCASection}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSpeechMuted((v) => {
                      const next = !v;
                      if (
                        next &&
                        typeof window !== "undefined" &&
                        "speechSynthesis" in window
                      ) {
                        window.speechSynthesis.cancel();
                      }
                      return next;
                    })
                  }
                  className="inline-flex items-center justify-center rounded-lg border border-[#E8E6F0] px-2.5 py-1.5 text-[#534AB7] hover:bg-slate-50"
                  aria-label={speechMuted ? "Unmute voice" : "Mute voice"}
                  title={speechMuted ? "Unmute voice" : "Mute voice"}
                >
                  <AppIcon
                    name={speechMuted ? "mute" : "speaker"}
                    size={16}
                    color="#534AB7"
                  />
                </button>
                <button
                  type="button"
                  onClick={closePersonalCA}
                  className="inline-flex items-center justify-center rounded-lg p-2 text-[#534AB7] hover:bg-slate-100"
                  aria-label="Close"
                >
                  <AppIcon name="close" size={16} color="#534AB7" />
                </button>
              </div>
            </div>

            <div className="mt-3 h-2 w-full shrink-0 overflow-hidden rounded-full bg-[#EEEDFE]">
              <div
                className="h-full rounded-full bg-[#534AB7] transition-all duration-300"
                style={{ width: `${personalCAProgress}%` }}
              />
            </div>
            <p className="mt-1 shrink-0 text-right text-[11px] text-[#7A7871]">
              {personalCAProgress}% complete
            </p>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
              {personalCAStep === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-[#111110]">
                    Before we start, keep these details ready so your Personal
                    CA flow is accurate.
                  </p>
                  {[
                    ["salary", "Latest salary slips + Form 16 (if available)"],
                    [
                      "interest",
                      "Savings, FD/RD, post office and bond interest totals",
                    ],
                    [
                      "dividends",
                      "Dividend totals (Indian and foreign companies)",
                    ],
                    [
                      "investments",
                      "Tax-saving proof: PF, PPF, ELSS, LIC, tuition, home principal, NPS",
                    ],
                    [
                      "rentLoan",
                      "Rent paid, HRA details, and home-loan interest/principal details",
                    ],
                    [
                      "gains",
                      "Capital gains summary (equity/debt/property, STCG/LTCG)",
                    ],
                    [
                      "form16",
                      "Any deduction proofs: medical, donation, education loan, disability, royalty, etc.",
                    ],
                  ].map(([k, label]) => (
                    <label
                      key={k}
                      className="flex cursor-pointer items-start gap-2 rounded-lg border border-[#ECEAF8] px-3 py-2 text-sm text-[#5F5E5A]"
                    >
                      <input
                        type="checkbox"
                        checked={caChecklist[k as keyof typeof caChecklist]}
                        onChange={(e) =>
                          setCaChecklist((prev) => ({
                            ...prev,
                            [k]: e.target.checked,
                          }))
                        }
                        className="mt-0.5 accent-[#534AB7]"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                  {!checklistReady ? (
                    <p className="text-xs text-amber-700">
                      Please tick all items to continue.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {personalCAStep === 1 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-[#111110]">
                    What best describes you?
                  </p>
                  <p className="-mt-2 text-xs text-[#9B9A94]">
                    Select one or more — many people have multiple sources of
                    income.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {EMPLOYMENT_OPTIONS.map((opt) => (
                      <button
                        key={`ca-${opt.id}`}
                        type="button"
                        aria-pressed={employments.includes(opt.id)}
                        className={cn(
                          pill,
                          employments.includes(opt.id)
                            ? "bg-[#534AB7] text-white"
                            : "bg-slate-100 text-slate-700",
                        )}
                        onClick={() => toggleEmployment(opt.id)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <NumberInput
                    label="Your age"
                    value={age}
                    onChange={setAge}
                    min={18}
                    max={100}
                    step={1}
                  />
                  <div className="flex flex-wrap gap-3 pt-1">
                    <label className="flex items-center gap-2 text-sm text-[#5F5E5A]">
                      <input
                        type="checkbox"
                        checked={parentsSeniorEffective}
                        onChange={(e) => {
                          const on = e.target.checked;
                          setParentsSenior(on);
                          setParentsAge((a) =>
                            on ? (a >= 60 ? a : 60) : a > 0 && a < 60 ? a : 0,
                          );
                        }}
                        className="accent-[#534AB7]"
                      />
                      Parents 60+ (higher 80D parents cap)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-[#5F5E5A]">
                      <input
                        type="checkbox"
                        checked={nri}
                        onChange={(e) => setNri(e.target.checked)}
                        className="accent-[#534AB7]"
                      />
                      NRI / overseas tie
                    </label>
                  </div>
                </div>
              ) : null}

              {personalCAStep === 2 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#111110]">
                    Let us capture your core income first.
                  </p>
                  <Mt
                    id="ca-basic"
                    label="Monthly basic salary"
                    teach={TEACH.income.basicMonthly}
                    defaultValue={
                      basicMonthly ? formatIndian(basicMonthly) : ""
                    }
                    onChange={(e) =>
                      setBasicMonthly(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                  <Mt
                    id="ca-special"
                    label="Monthly special allowance"
                    teach={TEACH.income.allowancesMonthly}
                    optional
                    defaultValue={
                      specialAllowanceMonthly
                        ? formatIndian(specialAllowanceMonthly)
                        : ""
                    }
                    onChange={(e) =>
                      setSpecialAllowanceMonthly(
                        parseMoneyInput(e.target.value) ?? 0,
                      )
                    }
                  />
                  <Mt
                    id="ca-meal-voucher"
                    label="Meal card/coupon (monthly)"
                    teach={TEACH.income.allowancesMonthly}
                    optional
                    defaultValue={
                      mealVoucherMonthly ? formatIndian(mealVoucherMonthly) : ""
                    }
                    onChange={(e) =>
                      setMealVoucherMonthly(
                        parseMoneyInput(e.target.value) ?? 0,
                      )
                    }
                  />
                  <NumberInput
                    label="Eligible meal days/month"
                    value={mealVoucherWorkDaysPerMonth}
                    onChange={setMealVoucherWorkDaysPerMonth}
                    min={0}
                    max={31}
                    step={1}
                  />
                  <label className="flex items-center gap-2 text-sm text-[#5F5E5A]">
                    <input
                      type="checkbox"
                      checked={mealVoucherUse200Cap}
                      onChange={(e) =>
                        setMealVoucherUse200Cap(e.target.checked)
                      }
                      className="accent-[#534AB7]"
                    />
                    Use revised cap ₹200/meal (off = ₹50/meal)
                  </label>
                  <Mt
                    id="ca-free"
                    label="Freelance/professional income (annual)"
                    teach={TEACH.income.freelanceIncome}
                    optional
                    defaultValue={
                      freelanceIncome ? formatIndian(freelanceIncome) : ""
                    }
                    onChange={(e) =>
                      setFreelanceIncome(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                </div>
              ) : null}

              {personalCAStep === 3 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-[#111110]">
                    Do you receive HRA from employer?{" "}
                    <span className="text-[#7A7871]">(Sec 10(13A))</span>
                  </p>
                  <div className="flex gap-2">
                    {chip(secHRA, "Yes", () => {
                      setSecHRA(true);
                      setSec80GG(false);
                    })}
                    {chip(!secHRA, "No", () => setSecHRA(false))}
                  </div>
                  {secHRA ? (
                    <>
                      <Mt
                        id="ca-hra"
                        label="Monthly HRA received"
                        teach={TEACH.income.hraMonthly}
                        defaultValue={
                          hraMonthly ? formatIndian(hraMonthly) : ""
                        }
                        onChange={(e) =>
                          setHraMonthly(parseMoneyInput(e.target.value) ?? 0)
                        }
                      />
                      <Mt
                        id="ca-rent"
                        label="Monthly rent paid"
                        teach={TEACH.deductions.eightyGG}
                        defaultValue={
                          rentPaidMonthly ? formatIndian(rentPaidMonthly) : ""
                        }
                        onChange={(e) =>
                          setRentPaidMonthly(
                            parseMoneyInput(e.target.value) ?? 0,
                          )
                        }
                      />
                      <div className="flex gap-2">
                        {chip(isMetro, "Metro city", () => setIsMetro(true))}
                        {chip(!isMetro, "Non-metro city", () =>
                          setIsMetro(false),
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-[#7A7871]">
                        If you pay rent without HRA, this goes under Sec 80GG
                        (illustrative cap up to ₹60,000).
                      </p>
                      <Mt
                        id="ca-rent-no-hra"
                        label="Annual rent paid without HRA (Sec 80GG)"
                        teach={TEACH.deductions.eightyGG}
                        optional
                        defaultValue={
                          rentPaidNoHra ? formatIndian(rentPaidNoHra) : ""
                        }
                        onChange={(e) =>
                          setRentPaidNoHra(parseMoneyInput(e.target.value) ?? 0)
                        }
                      />
                    </>
                  )}
                </div>
              ) : null}

              {personalCAStep === 4 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#111110]">
                    Now income from bank/investments.
                  </p>
                  <Mt
                    id="ca-sav-int"
                    label="Savings account interest (Sec 80TTA/80TTB link)"
                    teach={TEACH.income.interestIncome}
                    optional
                    defaultValue={
                      savingsInterest ? formatIndian(savingsInterest) : ""
                    }
                    onChange={(e) =>
                      setSavingsInterest(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                  <Mt
                    id="ca-fd-int"
                    label="FD/RD interest"
                    teach={TEACH.income.interestIncome}
                    optional
                    defaultValue={fdInterest ? formatIndian(fdInterest) : ""}
                    onChange={(e) =>
                      setFdInterest(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                  <Mt
                    id="ca-po-int"
                    label="Post office interest"
                    teach={TEACH.income.interestIncome}
                    optional
                    defaultValue={
                      postOfficeInterest ? formatIndian(postOfficeInterest) : ""
                    }
                    onChange={(e) =>
                      setPostOfficeInterest(
                        parseMoneyInput(e.target.value) ?? 0,
                      )
                    }
                  />
                  <Mt
                    id="ca-bond-int"
                    label="Bond/debenture interest"
                    teach={TEACH.income.interestIncome}
                    optional
                    defaultValue={
                      bondsInterest ? formatIndian(bondsInterest) : ""
                    }
                    onChange={(e) =>
                      setBondsInterest(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                  <Mt
                    id="ca-div-ind"
                    label="Dividend from Indian companies"
                    teach={TEACH.income.dividendIncome}
                    optional
                    defaultValue={divIndian ? formatIndian(divIndian) : ""}
                    onChange={(e) =>
                      setDivIndian(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                  <Mt
                    id="ca-div-foreign"
                    label="Dividend from foreign companies"
                    teach={TEACH.income.dividendIncome}
                    optional
                    defaultValue={divForeign ? formatIndian(divForeign) : ""}
                    onChange={(e) =>
                      setDivForeign(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                </div>
              ) : null}

              {personalCAStep === 5 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#111110]">
                    Did you receive Leave Travel Allowance?{" "}
                    <span className="text-[#7A7871]">(LTA / Sec 10(5))</span>
                  </p>
                  <div className="flex gap-2">
                    {chip(secLTA, "Yes", () => setSecLTA(true))}
                    {chip(!secLTA, "No", () => setSecLTA(false))}
                  </div>
                  {secLTA ? (
                    <>
                      <Mt
                        id="ca-lta-recv"
                        label="Annual LTA received"
                        teach={TEACH.income.ltaTaxable}
                        optional
                        defaultValue={
                          ltaAnnualRecv ? formatIndian(ltaAnnualRecv) : ""
                        }
                        onChange={(e) =>
                          setLtaAnnualRecv(parseMoneyInput(e.target.value) ?? 0)
                        }
                      />
                      <label className="flex items-center gap-2 text-sm text-[#5F5E5A]">
                        <input
                          type="checkbox"
                          checked={ltaClaiming}
                          onChange={(e) => setLtaClaiming(e.target.checked)}
                          className="accent-[#534AB7]"
                        />
                        Claiming travel this year?
                      </label>
                      {ltaClaiming ? (
                        <Mt
                          id="ca-lta-cost"
                          label="Actual travel cost used for claim"
                          teach={TEACH.income.ltaExempt}
                          optional
                          defaultValue={
                            ltaTravelCost ? formatIndian(ltaTravelCost) : ""
                          }
                          onChange={(e) =>
                            setLtaTravelCost(
                              parseMoneyInput(e.target.value) ?? 0,
                            )
                          }
                        />
                      ) : null}
                    </>
                  ) : null}
                </div>
              ) : null}

              {personalCAStep === 6 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#111110]">
                    Any RSU / ESOP vesting or sale this year?
                  </p>
                  <div className="flex gap-2">
                    {chip(secRSU, "Yes", () => setSecRSU(true))}
                    {chip(!secRSU, "No", () => setSecRSU(false))}
                  </div>
                  {secRSU ? (
                    <>
                      <NumberInput
                        label="Units vested this FY"
                        value={rsuUnits}
                        onChange={setRsuUnits}
                        min={0}
                        step={1}
                      />
                      <Mt
                        id="ca-rsu-fmv"
                        label="FMV per vested unit"
                        teach={TEACH.income.rsuVesting}
                        optional
                        defaultValue={
                          rsuFmvPerUnit ? formatIndian(rsuFmvPerUnit) : ""
                        }
                        onChange={(e) =>
                          setRsuFmvPerUnit(parseMoneyInput(e.target.value) ?? 0)
                        }
                      />
                      <label className="flex items-center gap-2 text-sm text-[#5F5E5A]">
                        <input
                          type="checkbox"
                          checked={rsuPlanSell}
                          onChange={(e) => setRsuPlanSell(e.target.checked)}
                          className="accent-[#534AB7]"
                        />
                        Sold vested units?
                      </label>
                      {rsuPlanSell ? (
                        <>
                          <NumberInput
                            label="Units sold"
                            value={rsuUnitsSold}
                            onChange={setRsuUnitsSold}
                            min={0}
                            step={1}
                          />
                          <Mt
                            id="ca-rsu-sale-px"
                            label="Sale price per unit"
                            teach={TEACH.income.rsuSaleStcg}
                            optional
                            defaultValue={
                              rsuSalePrice ? formatIndian(rsuSalePrice) : ""
                            }
                            onChange={(e) =>
                              setRsuSalePrice(
                                parseMoneyInput(e.target.value) ?? 0,
                              )
                            }
                          />
                          <Mt
                            id="ca-rsu-cost-px"
                            label="Cost/FMV per unit at vest"
                            teach={TEACH.income.rsuSaleLtcg}
                            optional
                            defaultValue={
                              rsuCostPrice ? formatIndian(rsuCostPrice) : ""
                            }
                            onChange={(e) =>
                              setRsuCostPrice(
                                parseMoneyInput(e.target.value) ?? 0,
                              )
                            }
                          />
                          <div className="flex gap-2">
                            {chip(rsuShortTerm, "Short-term", () =>
                              setRsuShortTerm(true),
                            )}
                            {chip(!rsuShortTerm, "Long-term", () =>
                              setRsuShortTerm(false),
                            )}
                          </div>
                        </>
                      ) : null}
                    </>
                  ) : null}
                </div>
              ) : null}

              {personalCAStep === 7 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#111110]">
                    Any leave encashment received this year?{" "}
                    <span className="text-[#7A7871]">(Sec 10(10AA))</span>
                  </p>
                  <div className="flex gap-2">
                    {chip(secLeave, "Yes", () => setSecLeave(true))}
                    {chip(!secLeave, "No", () => setSecLeave(false))}
                  </div>
                  {secLeave ? (
                    <>
                      <div className="flex gap-2">
                        {chip(
                          leaveTiming === "retirement",
                          "At retirement",
                          () => setLeaveTiming("retirement"),
                        )}
                        {chip(
                          leaveTiming === "during_service",
                          "During service",
                          () => setLeaveTiming("during_service"),
                        )}
                      </div>
                      <div className="flex gap-2">
                        {chip(
                          leaveEmployer === "government",
                          "Government employer",
                          () => setLeaveEmployer("government"),
                        )}
                        {chip(
                          leaveEmployer === "private",
                          "Private employer",
                          () => setLeaveEmployer("private"),
                        )}
                      </div>
                      <Mt
                        id="ca-leave-amt"
                        label="Leave encashment amount received"
                        teach={TEACH.income.leaveEncashmentTaxable}
                        optional
                        defaultValue={
                          leaveReceived ? formatIndian(leaveReceived) : ""
                        }
                        onChange={(e) =>
                          setLeaveReceived(parseMoneyInput(e.target.value) ?? 0)
                        }
                      />
                      <Mt
                        id="ca-leave-avg"
                        label="Average monthly salary for calc"
                        teach={TEACH.income.leaveEncashmentTaxable}
                        optional
                        defaultValue={
                          leaveAvgMonthly ? formatIndian(leaveAvgMonthly) : ""
                        }
                        onChange={(e) =>
                          setLeaveAvgMonthly(
                            parseMoneyInput(e.target.value) ?? 0,
                          )
                        }
                      />
                      <NumberInput
                        label="Accumulated leave days"
                        value={leaveDays}
                        onChange={setLeaveDays}
                        min={0}
                        step={1}
                      />
                    </>
                  ) : null}
                </div>
              ) : null}

              {personalCAStep === 8 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#111110]">
                    Any rental income from property?
                  </p>
                  <div className="flex gap-2">
                    {chip(secRental, "Yes", () => setSecRental(true))}
                    {chip(!secRental, "No", () => setSecRental(false))}
                  </div>
                  {secRental ? (
                    <>
                      <Mt
                        id="ca-rent-gross"
                        label="Annual rent received"
                        teach={TEACH.income.rentalIncome}
                        optional
                        defaultValue={
                          rentAnnualGross ? formatIndian(rentAnnualGross) : ""
                        }
                        onChange={(e) =>
                          setRentAnnualGross(
                            parseMoneyInput(e.target.value) ?? 0,
                          )
                        }
                      />
                      <Mt
                        id="ca-rent-muni"
                        label="Municipal taxes paid"
                        teach={TEACH.income.rentalIncome}
                        optional
                        defaultValue={
                          rentMunicipal ? formatIndian(rentMunicipal) : ""
                        }
                        onChange={(e) =>
                          setRentMunicipal(parseMoneyInput(e.target.value) ?? 0)
                        }
                      />
                      <Mt
                        id="ca-rent-int"
                        label="Home loan interest (let-out)"
                        teach={TEACH.income.rentalIncome}
                        optional
                        defaultValue={
                          rentLoanInterest ? formatIndian(rentLoanInterest) : ""
                        }
                        onChange={(e) =>
                          setRentLoanInterest(
                            parseMoneyInput(e.target.value) ?? 0,
                          )
                        }
                      />
                    </>
                  ) : null}
                </div>
              ) : null}

              {personalCAStep === 9 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#111110]">
                    Any capital gains this year? If yes, fill all applicable
                    buckets.
                  </p>
                  <div className="flex gap-2">
                    {chip(secCG, "Yes", () => setSecCG(true))}
                    {chip(!secCG, "No", () => setSecCG(false))}
                  </div>
                  {secCG ? (
                    <>
                      <Mt
                        id="ca-cg-eq-st"
                        label="Equity STCG gains (illustrative 20%)"
                        teach={TEACH.income.otherStcg}
                        optional
                        defaultValue={
                          cgEquityStcgExtra
                            ? formatIndian(cgEquityStcgExtra)
                            : ""
                        }
                        onChange={(e) =>
                          setCgEquityStcgExtra(
                            parseMoneyInput(e.target.value) ?? 0,
                          )
                        }
                      />
                      <Mt
                        id="ca-cg-eq-lt"
                        label="Equity LTCG gains (₹1.25L exemption then 12.5%)"
                        teach={TEACH.income.otherLtcg}
                        optional
                        defaultValue={
                          cgEquityLtcgExtra
                            ? formatIndian(cgEquityLtcgExtra)
                            : ""
                        }
                        onChange={(e) =>
                          setCgEquityLtcgExtra(
                            parseMoneyInput(e.target.value) ?? 0,
                          )
                        }
                      />
                      <Mt
                        id="ca-cg-debt-st"
                        label="Debt STCG (slab)"
                        teach={TEACH.income.otherStcg}
                        optional
                        defaultValue={
                          cgDebtStcg ? formatIndian(cgDebtStcg) : ""
                        }
                        onChange={(e) =>
                          setCgDebtStcg(parseMoneyInput(e.target.value) ?? 0)
                        }
                      />
                      <Mt
                        id="ca-cg-debt-lt"
                        label="Debt LTCG (slab in this planner)"
                        teach={TEACH.income.otherLtcg}
                        optional
                        defaultValue={
                          cgDebtLtcg ? formatIndian(cgDebtLtcg) : ""
                        }
                        onChange={(e) =>
                          setCgDebtLtcg(parseMoneyInput(e.target.value) ?? 0)
                        }
                      />
                      <Mt
                        id="ca-cg-prop-st"
                        label="Property STCG (slab)"
                        teach={TEACH.income.otherStcg}
                        optional
                        defaultValue={
                          cgPropStcg ? formatIndian(cgPropStcg) : ""
                        }
                        onChange={(e) =>
                          setCgPropStcg(parseMoneyInput(e.target.value) ?? 0)
                        }
                      />
                      <Mt
                        id="ca-cg-prop-lt"
                        label="Property LTCG (illustrative 12.5%)"
                        teach={TEACH.income.otherLtcg}
                        optional
                        defaultValue={
                          cgPropLtcg ? formatIndian(cgPropLtcg) : ""
                        }
                        onChange={(e) =>
                          setCgPropLtcg(parseMoneyInput(e.target.value) ?? 0)
                        }
                      />
                    </>
                  ) : null}
                </div>
              ) : null}

              {personalCAStep === 10 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#111110]">
                    Any other taxable income or agricultural income to include?
                  </p>
                  <div className="flex gap-2">
                    {chip(secOther, "Other income: Yes", () =>
                      setSecOther(true),
                    )}
                    {chip(!secOther, "Other income: No", () =>
                      setSecOther(false),
                    )}
                  </div>
                  {secOther ? (
                    <>
                      <Mt
                        id="ca-lottery"
                        label="Lottery/gambling winnings (flat 30% illustrative)"
                        teach={TEACH.sections.income}
                        optional
                        defaultValue={
                          lotteryIncome ? formatIndian(lotteryIncome) : ""
                        }
                        onChange={(e) =>
                          setLotteryIncome(parseMoneyInput(e.target.value) ?? 0)
                        }
                      />
                      <Mt
                        id="ca-gift"
                        label="Taxable gifts"
                        teach={TEACH.sections.income}
                        optional
                        defaultValue={
                          giftsTaxable ? formatIndian(giftsTaxable) : ""
                        }
                        onChange={(e) =>
                          setGiftsTaxable(parseMoneyInput(e.target.value) ?? 0)
                        }
                      />
                      <Mt
                        id="ca-comm"
                        label="Commission income"
                        teach={TEACH.income.freelanceIncome}
                        optional
                        defaultValue={
                          commissionIncome ? formatIndian(commissionIncome) : ""
                        }
                        onChange={(e) =>
                          setCommissionIncome(
                            parseMoneyInput(e.target.value) ?? 0,
                          )
                        }
                      />
                      <Mt
                        id="ca-omisc"
                        label="Other taxable income"
                        teach={TEACH.sections.income}
                        optional
                        defaultValue={
                          otherMiscIncome ? formatIndian(otherMiscIncome) : ""
                        }
                        onChange={(e) =>
                          setOtherMiscIncome(
                            parseMoneyInput(e.target.value) ?? 0,
                          )
                        }
                      />
                    </>
                  ) : null}
                  <div className="flex gap-2 pt-1">
                    {chip(secAgri, "Agricultural income: Yes", () =>
                      setSecAgri(true),
                    )}
                    {chip(!secAgri, "Agricultural income: No", () =>
                      setSecAgri(false),
                    )}
                  </div>
                  {secAgri ? (
                    <>
                      <Mt
                        id="ca-agri"
                        label="Annual agricultural income"
                        teach={TEACH.income.agriculturalIncome}
                        optional
                        defaultValue={
                          agriculturalIncome
                            ? formatIndian(agriculturalIncome)
                            : ""
                        }
                        onChange={(e) =>
                          setAgriculturalIncome(
                            parseMoneyInput(e.target.value) ?? 0,
                          )
                        }
                      />
                      <label className="flex items-center gap-2 text-sm text-[#5F5E5A]">
                        <input
                          type="checkbox"
                          checked={excludeAgriculturalFromTax}
                          onChange={(e) =>
                            setExcludeAgriculturalFromTax(e.target.checked)
                          }
                          className="accent-[#534AB7]"
                        />
                        Exclude from ordinary taxable gross in this planner
                      </label>
                    </>
                  ) : null}
                </div>
              ) : null}

              {personalCAStep === 11 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#111110]">
                    80C means tax-saving investments like PF, PPF, ELSS, LIC,
                    tuition fee, home-loan principal. Cap: ₹1,50,000. Extra NPS
                    80CCD(1B) cap: ₹50,000.
                    <span className="text-[#7A7871]">
                      {" "}
                      (Sec 80C / 80CCD(1B))
                    </span>
                  </p>
                  <Mt
                    id="ca-epf"
                    label="EPF / PF contribution"
                    teach={TEACH.deductions.eightyCEpf}
                    optional
                    defaultValue={c80Epf ? formatIndian(c80Epf) : ""}
                    onChange={(e) =>
                      setC80Epf(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                  <Mt
                    id="ca-ppf"
                    label="PPF contribution"
                    teach={TEACH.deductions.eightyCPpf}
                    optional
                    defaultValue={c80Ppf ? formatIndian(c80Ppf) : ""}
                    onChange={(e) =>
                      setC80Ppf(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                  <Mt
                    id="ca-elss"
                    label="ELSS investment"
                    teach={TEACH.deductions.eightyCElss}
                    optional
                    defaultValue={c80Elss ? formatIndian(c80Elss) : ""}
                    onChange={(e) =>
                      setC80Elss(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                  <Mt
                    id="ca-lic"
                    label="LIC premium"
                    teach={TEACH.deductions.eightyCLic}
                    optional
                    defaultValue={c80Lic ? formatIndian(c80Lic) : ""}
                    onChange={(e) =>
                      setC80Lic(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                  <Mt
                    id="ca-tuition"
                    label="Eligible tuition fee"
                    teach={TEACH.deductions.eightyCTuition}
                    optional
                    defaultValue={c80Tuition ? formatIndian(c80Tuition) : ""}
                    onChange={(e) =>
                      setC80Tuition(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                  <Mt
                    id="ca-principal"
                    label="Home-loan principal repaid"
                    teach={TEACH.deductions.eightyCHomePrincipal}
                    optional
                    defaultValue={
                      c80Principal ? formatIndian(c80Principal) : ""
                    }
                    onChange={(e) =>
                      setC80Principal(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                  <Mt
                    id="ca-nps"
                    label="Extra NPS (Sec 80CCD(1B))"
                    teach={TEACH.deductions.eightyCCD}
                    optional
                    defaultValue={nps80CCD1B ? formatIndian(nps80CCD1B) : ""}
                    onChange={(e) =>
                      setNps80CCD1B(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                </div>
              ) : null}

              {personalCAStep === 12 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#111110]">
                    Health insurance premiums (Sec 80D). Self/family cap ₹
                    {formatIndian(self80DCap)} from your age. Parents cap
                    depends on parent age: ₹25,000 under 60, ₹50,000 if 60+.
                  </p>
                  <Mt
                    id="ca-80d-self"
                    label={`Self/spouse/kids premium (cap ₹${formatIndian(self80DCap)})`}
                    teach={TEACH.deductions.eightyDSelf}
                    max={self80DCap}
                    optional
                    defaultValue={
                      deductions80DSelf ? formatIndian(deductions80DSelf) : ""
                    }
                    onChange={(e) =>
                      setDeductions80DSelf(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                  <NumberInput
                    label="Age of oldest parent"
                    value={parentsAge}
                    onChange={(v) => {
                      const next = Math.round(v);
                      setParentsAge(next);
                      setParentsSenior(next >= 60);
                    }}
                    min={0}
                    max={120}
                    step={1}
                    placeholder="e.g. 62"
                    helper="As of FY end (31 Mar). 60+ unlocks ₹50,000 parents premium cap."
                  />
                  <p className="text-xs text-[#7A7871]">
                    Parents 80D cap applied: ₹{formatIndian(parents80DCap)}
                    {parentsAge > 0
                      ? parentsSeniorEffective
                        ? " (senior parents)"
                        : " (parents under 60)"
                      : " — enter age for the correct cap"}
                  </p>
                  <Mt
                    id="ca-80d-parent"
                    label={`Parents premium (cap ₹${formatIndian(parents80DCap)})`}
                    teach={TEACH.deductions.eightyDParents}
                    max={parents80DCap}
                    optional
                    defaultValue={
                      deductions80DParents
                        ? formatIndian(deductions80DParents)
                        : ""
                    }
                    onChange={(e) =>
                      setDeductions80DParents(
                        parseMoneyInput(e.target.value) ?? 0,
                      )
                    }
                  />
                </div>
              ) : null}

              {personalCAStep === 13 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#111110]">
                    Housing loan deductions. Sec 24(b) cap: ₹2,00,000. Sec 80EEA
                    cap: ₹1,50,000.
                  </p>
                  <Mt
                    id="ca-24b"
                    label="Home loan interest on self-occupied house (Sec 24(b))"
                    teach={TEACH.deductions.twentyFourB}
                    optional
                    defaultValue={
                      homeLoanInterest24b
                        ? formatIndian(homeLoanInterest24b)
                        : ""
                    }
                    onChange={(e) =>
                      setHomeLoanInterest24b(
                        parseMoneyInput(e.target.value) ?? 0,
                      )
                    }
                  />
                  <Mt
                    id="ca-80eea"
                    label="Additional affordable housing interest (Sec 80EEA)"
                    teach={TEACH.deductions.eightyEEA}
                    optional
                    defaultValue={
                      deduction80EEA ? formatIndian(deduction80EEA) : ""
                    }
                    onChange={(e) =>
                      setDeduction80EEA(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                </div>
              ) : null}

              {personalCAStep === 14 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#111110]">
                    Education loan and donations.
                  </p>
                  <Mt
                    id="ca-80e"
                    label="Education loan interest paid (Sec 80E)"
                    teach={TEACH.deductions.eightyE}
                    optional
                    defaultValue={
                      deduction80E ? formatIndian(deduction80E) : ""
                    }
                    onChange={(e) =>
                      setDeduction80E(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                  <Mt
                    id="ca-80g"
                    label="Eligible donations (Sec 80G)"
                    teach={TEACH.deductions.eightyG}
                    optional
                    defaultValue={
                      deduction80G ? formatIndian(deduction80G) : ""
                    }
                    onChange={(e) =>
                      setDeduction80G(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                </div>
              ) : null}

              {personalCAStep === 15 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#111110]">
                    Disability and medical-condition deductions. 80DD cap:
                    ₹1,25,000. 80DDB cap: ₹40,000 or ₹1,00,000 (senior). 80U
                    cap: ₹1,25,000.
                  </p>
                  <Mt
                    id="ca-80dd"
                    label="Dependent disability (Sec 80DD)"
                    teach={TEACH.deductions.eightyDD}
                    optional
                    defaultValue={
                      deduction80DD ? formatIndian(deduction80DD) : ""
                    }
                    onChange={(e) =>
                      setDeduction80DD(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                  <Mt
                    id="ca-80ddb"
                    label="Specified disease treatment (Sec 80DDB)"
                    teach={TEACH.deductions.eightyDDB}
                    optional
                    defaultValue={
                      deduction80DDB ? formatIndian(deduction80DDB) : ""
                    }
                    onChange={(e) =>
                      setDeduction80DDB(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                  <Mt
                    id="ca-80u"
                    label="Self disability deduction (Sec 80U)"
                    teach={TEACH.deductions.eightyU}
                    optional
                    defaultValue={
                      deduction80U ? formatIndian(deduction80U) : ""
                    }
                    onChange={(e) =>
                      setDeduction80U(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                </div>
              ) : null}

              {personalCAStep === 16 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#111110]">
                    Interest/royalty/prof-tax deductions. 80TTA cap ₹10k
                    (non-senior), 80TTB cap ₹50k, 80RRB cap ₹3,00,000,
                    professional tax cap ₹5,000.
                  </p>
                  <Mt
                    id="ca-80tta"
                    label="Savings account interest deduction (Sec 80TTA)"
                    teach={TEACH.deductions.eightyTTA}
                    optional
                    disabled={age >= 60}
                    defaultValue={
                      deduction80TTA ? formatIndian(deduction80TTA) : ""
                    }
                    onChange={(e) =>
                      setDeduction80TTA(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                  <Mt
                    id="ca-80ttb"
                    label="Senior citizen interest deduction (Sec 80TTB)"
                    teach={TEACH.deductions.eightyTTB}
                    optional
                    defaultValue={
                      deduction80TTB ? formatIndian(deduction80TTB) : ""
                    }
                    onChange={(e) =>
                      setDeduction80TTB(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                  <Mt
                    id="ca-80rrb"
                    label="Royalty income deduction (Sec 80RRB)"
                    teach={TEACH.deductions.eightyRRB}
                    optional
                    defaultValue={
                      deduction80RRB ? formatIndian(deduction80RRB) : ""
                    }
                    onChange={(e) =>
                      setDeduction80RRB(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                  <Mt
                    id="ca-prof-tax"
                    label="Professional tax paid"
                    teach={TEACH.deductions.professionalTax}
                    optional
                    defaultValue={
                      professionalTax ? formatIndian(professionalTax) : ""
                    }
                    onChange={(e) =>
                      setProfessionalTax(parseMoneyInput(e.target.value) ?? 0)
                    }
                  />
                </div>
              ) : null}

              {personalCAStep === 17 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-[#111110]">
                    Quick review before calculation
                  </p>
                  <div className="rounded-lg border border-[#ECEAF8] bg-[#FAFAFE] p-3 text-sm text-[#5F5E5A]">
                    <p>
                      Salary captured: ₹
                      {Math.round(
                        (basicMonthly + specialAllowanceMonthly) * 12,
                      ).toLocaleString("en-IN")}{" "}
                      yearly base
                    </p>
                    <p>
                      80C+NPS total entered: ₹
                      {(
                        c80Elss +
                        c80Ppf +
                        c80Lic +
                        c80Epf +
                        c80Tuition +
                        c80Principal +
                        nps80CCD1B
                      ).toLocaleString("en-IN")}
                    </p>
                    <p>
                      80D total entered: ₹
                      {(
                        deductions80DSelf + deductions80DParents
                      ).toLocaleString("en-IN")}
                    </p>
                    <p>
                      Other deductions entered: ₹
                      {(
                        deduction80DD +
                        deduction80DDB +
                        deduction80E +
                        deduction80EEA +
                        deduction80G +
                        deduction80TTA +
                        deduction80TTB +
                        deduction80U +
                        deduction80RRB +
                        homeLoanInterest24b
                      ).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <p className="text-xs text-[#7A7871]">
                    You can go back and edit any answer. We will not change tax
                    logic, only fill fields.
                  </p>
                </div>
              ) : null}

              {personalCAStep === 18 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-[#111110]">
                    Done. I have filled your tax form fields from this Personal
                    CA flow.
                  </p>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                    Next step: tap{" "}
                    <span className="font-semibold">Calculate</span> in Step 5
                    results to compare old vs new regime.
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex shrink-0 items-center justify-between gap-2">
              <button
                type="button"
                onClick={prevPersonalCAStep}
                disabled={personalCAStep === 0}
                className="rounded-lg border border-[#E8E6F0] px-3 py-2 text-sm text-[#5F5E5A] disabled:opacity-50"
              >
                Back
              </button>

              <div className="flex items-center gap-2">
                {personalCAStep >= 1 &&
                personalCAStep < personalCATotalSteps - 1 ? (
                  <button
                    type="button"
                    onClick={nextPersonalCAStep}
                    className="rounded-lg border border-[#E8E6F0] px-3 py-2 text-sm text-[#5F5E5A]"
                  >
                    Skip
                  </button>
                ) : null}
                {personalCAStep < personalCATotalSteps - 1 ? (
                  <button
                    type="button"
                    onClick={nextPersonalCAStep}
                    className="rounded-lg bg-[#534AB7] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    disabled={personalCAStep === 0 && !checklistReady}
                  >
                    Save & Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      syncWizardToggles();
                      closePersonalCA();
                    }}
                    className="rounded-lg bg-[#534AB7] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Use these answers
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!personalCAOpen ? (
        <p className="text-xs text-[#9B9A94]">
          Educational only — verify against notified law and Form 16.
        </p>
      ) : null}
    </div>
  );
}
