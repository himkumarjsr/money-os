/**
 * What a post office scheme the user holds is worth today and at maturity,
 * from the scheme type, the year it was started and the rate notified then.
 * Without a start year the amount entered is taken as today's value.
 * Shared by web and the app (mobile keeps a byte-identical copy at
 * mobile/lib/postOfficeHoldings.ts).
 */
import type { PostOfficeSchemeId } from "@/lib/analyse-form-schema";
import { formatIndian } from "@/lib/formatters";
import {
  PO_RATES,
  poRdMaturity,
  poTdRate,
  type PoTdYears,
} from "@/lib/postOfficeSchemes";

export type PostOfficeHolding = {
  scheme: PostOfficeSchemeId;
  /** Amount invested (balance so far for RD / savings account). */
  amount?: number;
  startYear?: number;
  maturityYear?: number;
  /** Recurring deposit only. */
  monthlyDeposit?: number;
};

export type PostOfficeProjection = {
  /** Worth today, interest included. */
  currentValue: number;
  maturityYear?: number;
  /** Lump sum paid out at maturity. */
  maturityValue?: number;
  /** Interest paid out along the way (MIS / SCSS). */
  payout?: { amount: number; every: "month" | "quarter" };
  ratePct?: number;
  matured: boolean;
  /** One plain-words line for the form. */
  note: string;
};

/** Fixed tenure in years for schemes that have one. */
const TENURE_YEARS: Partial<Record<PostOfficeSchemeId, number>> = {
  nsc: 5,
  mis: 5,
  scss: 5,
  mssc: 2,
  recurring_deposit: 5,
};

/**
 * Rate locked in when the scheme was opened (calendar-year approximation of
 * the quarterly notifications). The latest band uses today's PO_RATES.
 */
function lockedRate(scheme: PostOfficeSchemeId, startYear: number): number {
  switch (scheme) {
    case "nsc":
      return startYear >= 2023 ? PO_RATES.nsc : startYear >= 2020 ? 6.8 : 7.9;
    case "kvp":
      return startYear >= 2023 ? PO_RATES.kvp : startYear >= 2020 ? 6.9 : 7.6;
    case "mis":
      return startYear >= 2024
        ? PO_RATES.mis
        : startYear >= 2023
          ? 7.1
          : startYear >= 2020
            ? 6.6
            : 7.6;
    case "scss":
      return startYear >= 2024
        ? PO_RATES.scss
        : startYear >= 2023
          ? 8.0
          : startYear >= 2020
            ? 7.4
            : 8.6;
    case "mssc":
      return 7.5;
    case "recurring_deposit":
      return startYear >= 2024 ? PO_RATES.rd : startYear >= 2020 ? 5.8 : 7.2;
    case "savings_account":
      return PO_RATES.savings;
    default:
      return 0;
  }
}

/** Months a KVP takes to double, by the year it was bought. */
function kvpMonths(startYear: number): number {
  return startYear >= 2023 ? PO_RATES.kvpMonths : startYear >= 2020 ? 124 : 113;
}

const pos = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : 0;
};
const rs = (v: number) => `₹${formatIndian(Math.round(Math.max(0, v)))}`;
const pct = (r: number) => `${Math.round(r * 10) / 10}%`;

export function projectPostOfficeHolding(
  row: PostOfficeHolding,
  now: Date = new Date(),
): PostOfficeProjection {
  const amount = pos(row.amount);
  const start = pos(row.startYear);
  const thisYear = now.getFullYear();
  // Only the year is known, so assume the scheme was opened mid-year.
  const elapsed =
    start > 0 ? Math.max(0, thisYear + now.getMonth() / 12 - (start + 0.5)) : 0;
  const asToday: PostOfficeProjection = {
    currentValue: amount,
    maturityYear: pos(row.maturityYear) || undefined,
    matured: false,
    note:
      start > 0
        ? ""
        : "Add the year you started to see what it's worth at maturity.",
  };
  if (row.scheme === "savings_account") {
    return {
      ...asToday,
      ratePct: PO_RATES.savings,
      note: `Earns ${pct(PO_RATES.savings)} a year - keep only day-to-day money here.`,
    };
  }
  if (start <= 0 || row.scheme === "other") return asToday;

  const rate = lockedRate(row.scheme, start);
  const r = rate / 100;

  if (row.scheme === "kvp") {
    const years = kvpMonths(start) / 12;
    const maturityYear = Math.round(start + 0.5 + years);
    const maturityValue = amount * 2;
    const t = Math.min(elapsed, years);
    const matured = elapsed >= years;
    return {
      currentValue: amount * Math.pow(2, t / years),
      maturityYear,
      maturityValue,
      ratePct: rate,
      matured,
      note: matured
        ? `Doubled to about ${rs(maturityValue)} in ${maturityYear} - if it's still lying there, reinvest it.`
        : `Doubles to ${rs(maturityValue)} in ${maturityYear} (${kvpMonths(start)} months at ${pct(rate)}).`,
    };
  }

  if (row.scheme === "mis" || row.scheme === "scss") {
    const years = TENURE_YEARS[row.scheme]!;
    const maturityYear = start + years;
    const matured = elapsed >= years;
    const every = row.scheme === "mis" ? "month" : "quarter";
    const payoutAmount = amount * (row.scheme === "mis" ? r / 12 : r / 4);
    return {
      currentValue: amount,
      maturityYear,
      maturityValue: amount,
      payout: { amount: payoutAmount, every },
      ratePct: rate,
      matured,
      note: matured
        ? `Ended in ${maturityYear}: your ${rs(amount)} came back${row.scheme === "scss" ? " (unless you extended it by 3 years)" : ""}.`
        : `Pays about ${rs(payoutAmount)} a ${every} at ${pct(rate)}; your ${rs(amount)} comes back in ${maturityYear}.`,
    };
  }

  if (row.scheme === "recurring_deposit") {
    const years = 5;
    const maturityYear = start + years;
    const monthly = pos(row.monthlyDeposit);
    const t = Math.min(elapsed, years);
    const matured = elapsed >= years;
    const maturityValue =
      monthly > 0
        ? poRdMaturity(monthly, years, rate)
        : amount * Math.pow(1 + r / 4, 4 * (years - t));
    const currentValue =
      monthly > 0 ? (t > 0 ? poRdMaturity(monthly, t, rate) : 0) : amount;
    return {
      currentValue: matured ? maturityValue : Math.max(currentValue, amount),
      maturityYear,
      maturityValue,
      ratePct: rate,
      matured,
      note: matured
        ? `Matured in ${maturityYear} at about ${rs(maturityValue)} - if it's still lying there, reinvest it.`
        : monthly > 0
          ? `${rs(monthly)}/month at ${pct(rate)} grows to about ${rs(maturityValue)} in ${maturityYear}.`
          : `Add your monthly deposit to see the maturity amount (${maturityYear}).`,
    };
  }

  // Lump-sum certificates and deposits that compound until maturity.
  let years: number;
  let compoundsPerYear: number;
  let r2 = r;
  let rate2 = rate;
  if (row.scheme === "time_deposit") {
    const given = pos(row.maturityYear) - start;
    const tenure: PoTdYears =
      given <= 1 ? 1 : given <= 2 ? 2 : given <= 3 ? 3 : 5;
    years = given > 0 ? tenure : 5;
    rate2 = poTdRate(years as PoTdYears);
    r2 = rate2 / 100;
    compoundsPerYear = 4;
  } else {
    years = TENURE_YEARS[row.scheme] ?? 5;
    compoundsPerYear = row.scheme === "mssc" ? 4 : 1;
  }
  const grow = (y: number) =>
    amount * Math.pow(1 + r2 / compoundsPerYear, compoundsPerYear * y);
  const maturityYear = start + years;
  const maturityValue = grow(years);
  const matured = elapsed >= years;
  return {
    currentValue: grow(Math.min(elapsed, years)),
    maturityYear,
    maturityValue,
    ratePct: rate2,
    matured,
    note: matured
      ? `Matured in ${maturityYear} at about ${rs(maturityValue)} - if it's still lying there, reinvest it.`
      : `${rs(amount)} at ${pct(rate2)} is worth about ${rs(grow(Math.min(elapsed, years)))} today and ${rs(maturityValue)} on maturity in ${maturityYear}.`,
  };
}

/** Today's value of all post office holdings. */
export function postOfficeHoldingsValue(
  rows: ReadonlyArray<PostOfficeHolding> | undefined,
  now: Date = new Date(),
): number {
  return (rows ?? []).reduce(
    (s, row) => s + projectPostOfficeHolding(row, now).currentValue,
    0,
  );
}
