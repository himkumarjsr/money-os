/** Mobile-only result helpers; shared derivations live in @/lib/analyseResultModel. */
import { scoreBand, type ScoreBand } from "@/lib/financialEngine";
import type { FinancialProfile } from "@/lib/analyse-form-schema";
import {
  getUniversalCaps,
  type UniversalBucketKey,
} from "@/lib/universal-buckets";
import type { BandLabel } from "./bandLabel";

export * from "@/lib/analyseResultModel";

const BAND_LABEL: Record<ScoreBand, BandLabel> = {
  critical: "Critical",
  warning: "Warning",
  good: "Good",
};

const BAND_GAUGE_TONE: Record<ScoreBand, "red" | "amber" | "green"> = {
  critical: "red",
  warning: "amber",
  good: "green",
};

export function scoreBandLabel(score: number): BandLabel {
  return BAND_LABEL[scoreBand(score)];
}

export function scoreGaugeTone(score: number): "red" | "amber" | "green" {
  return BAND_GAUGE_TONE[scoreBand(score)];
}

export type BucketCapRow = {
  key: UniversalBucketKey;
  label: string;
  capPercent: number;
  capAmount: number;
  details: string;
};

const BUCKET_COPY: {
  key: UniversalBucketKey;
  label: string;
  details: string;
}[] = [
  {
    key: "needs",
    label: "Needs",
    details: "Housing + essentials + family support",
  },
  {
    key: "wants",
    label: "Wants",
    details: "Shopping, entertainment and lifestyle spends",
  },
  {
    key: "security",
    label: "Insurance premiums",
    details: "Term, health, motor and other insurance premiums (monthly)",
  },
  { key: "loans", label: "Loans", details: "All monthly debt obligations" },
  {
    key: "investment",
    label: "Investment",
    details: "SIP, RD, NPS, PPF, EPF, SSY and other monthly contributions",
  },
];

/** Caps come from `getUniversalCaps` — the same source as the SpeedoMeter gauges. */
export function bucketCapRows(
  profile: Partial<FinancialProfile>,
  income: number,
): BucketCapRow[] {
  const caps = getUniversalCaps(profile);
  return BUCKET_COPY.map((b) => ({
    ...b,
    capPercent: Math.round(caps[b.key] * 100),
    capAmount: income * caps[b.key],
  }));
}

export function safetyNetHeading(itemCount: number): string {
  return `Your financial safety net — ${itemCount} ${itemCount === 1 ? "check" : "checks"}`;
}
