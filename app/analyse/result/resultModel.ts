import type { ScoreBand } from "@/lib/financialEngine";

export * from "@/lib/analyseResultModel";

export const SCORE_BAND_UI: Record<
  ScoreBand,
  { label: string; badgeTone: string; gaugeTone: "red" | "amber" | "green" }
> = {
  critical: {
    label: "Critical",
    badgeTone: "bg-[#FDEDED] text-[#991B1B]",
    gaugeTone: "red",
  },
  warning: {
    label: "Warning",
    badgeTone: "bg-[#FFF4E5] text-[#92400E]",
    gaugeTone: "amber",
  },
  good: {
    label: "Good",
    badgeTone: "bg-[#DCFCE7] text-[#166534]",
    gaugeTone: "green",
  },
};
