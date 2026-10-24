/**
 * Plain-words lines on how a goal is already funded: which existing money is
 * set against it and what is still needed each month. Shared by web and the
 * app (mobile keeps a byte-identical copy at mobile/lib/goalSavingsText.ts).
 */
import { formatIndian } from "@/lib/formatters";
import type { GoalFundingItem } from "@/lib/goalFunding";

const rs = (v: number) => `₹${formatIndian(Math.round(Math.max(0, v)))}`;

/** " on top of them (₹X/month in all)" when running SIPs already go to it. */
function moreContext(item: GoalFundingItem): string {
  const running = item.existingMonthly ?? 0;
  return running > 0
    ? ` on top of them (${rs(running + item.monthlyRequired)}/month in all)`
    : "";
}

/**
 * `statusOnly`: where the goal stands today, without what to do about it
 * (the report; the fixes are in the wealth builder plan).
 */
export function goalSavingsLines(
  item: GoalFundingItem,
  opts: { statusOnly?: boolean } = {},
): string[] {
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
  if (opts.statusOnly) {
    lines.push(
      item.monthlyRequired <= 0
        ? "On track with what you already hold."
        : `Short by ${rs(item.monthlyRequired)}/month at what goes to it today.`,
    );
    return lines;
  }
  const planned = Math.max(0, item.monthlyAllocated ?? 0);
  // Say plainly when the goal needs more than the plan can give it.
  lines.push(
    item.monthlyRequired <= 0
      ? "On track with what you already hold."
      : planned + 100 >= item.monthlyRequired
        ? `Still needed: ${rs(item.monthlyRequired)}/month in a new SIP.`
        : planned > 0
          ? `To reach it by ${item.targetYear} you'd need ${rs(item.monthlyRequired)}/month more${moreContext(item)}. From what's left each month, your plan can give it ${rs(planned)}/month - see below for what that reaches.`
          : `To reach it by ${item.targetYear} you'd need ${rs(item.monthlyRequired)}/month more${moreContext(item)}. Nothing is left over for it yet.`,
  );
  return lines;
}
