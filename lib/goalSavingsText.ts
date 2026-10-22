/**
 * Plain-words lines on how a goal is already funded: which existing money is
 * set against it and what is still needed each month. Shared by web and the
 * app (mobile keeps a byte-identical copy at mobile/lib/goalSavingsText.ts).
 */
import { formatIndian } from "@/lib/formatters";
import type { GoalFundingItem } from "@/lib/goalFunding";

const rs = (v: number) => `₹${formatIndian(Math.round(Math.max(0, v)))}`;

export function goalSavingsLines(item: GoalFundingItem): string[] {
  const lines: string[] = [];
  const src = item.sources;
  if (src) {
    const parts = [
      src.debt > 0 ? `${rs(src.debt)} from FDs / post office` : null,
      src.equity > 0 ? `${rs(src.equity)} from funds, stocks and RSUs` : null,
      src.gold > 0 ? `${rs(src.gold)} from gold` : null,
    ].filter((p): p is string => !!p);
    if (parts.length > 0) {
      lines.push(`Already set aside: ${parts.join(", ")}.`);
    }
    if (src.retirementAccounts > 0) {
      lines.push(
        `EPF + PPF + NPS grow to about ${rs(src.retirementAccounts)} by then (in today's money).`,
      );
    }
  }
  if ((item.existingMonthly ?? 0) > 0) {
    lines.push(
      `Your running SIPs / RD cover ${rs(item.existingMonthly ?? 0)}/month of it.`,
    );
  }
  lines.push(
    item.monthlyRequired > 0
      ? `Still needed: ${rs(item.monthlyRequired)}/month in a new SIP.`
      : "On track with what you already hold.",
  );
  return lines;
}
