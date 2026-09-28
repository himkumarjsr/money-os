export type SplitShareMember = {
  email: string;
  display_name: string;
  user_id?: string | null;
};

export type ComputeSplitSharesInput = {
  amount: number;
  splitType: "equal" | "exact" | "percentage" | "shares";
  includedMembers: SplitShareMember[];
  exactAmounts?: Record<string, number>;
  percentages?: Record<string, number>;
  /** Share counts per email for `shares` split type (defaults to 1). */
  shareCounts?: Record<string, number>;
};

export type SplitShareRow = {
  user_id: string | null;
  email: string;
  display_name: string;
  share_amount: number;
  share_percentage: number | null;
  is_settled: boolean;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Equal split in paise so every share differs by at most ₹0.01 and
 * amounts always sum exactly to the expense total.
 */
function equalShares(
  total: number,
  members: SplitShareMember[],
): SplitShareRow[] {
  const n = members.length;
  const centsTotal = Math.round(total * 100);
  const base = Math.floor(centsTotal / n);
  let remainder = centsTotal - base * n;

  return members.map((m) => {
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;
    const shareCents = base + extra;
    const shareAmount = shareCents / 100;
    return {
      user_id: m.user_id ?? null,
      email: m.email.toLowerCase().trim(),
      display_name: m.display_name,
      share_amount: shareAmount,
      share_percentage: round2((shareCents / centsTotal) * 100),
      is_settled: false,
    };
  });
}

export function computeSplitShares(input: ComputeSplitSharesInput): {
  shares: SplitShareRow[];
  error: string | null;
} {
  const members = input.includedMembers;
  if (!members.length) {
    return { shares: [], error: "Select at least 1 member to split among." };
  }

  const total = round2(Math.max(0, input.amount));
  if (!Number.isFinite(total) || total <= 0) {
    return { shares: [], error: "Enter a valid amount." };
  }

  if (input.splitType === "equal") {
    const shares = equalShares(total, members);
    const sum = round2(shares.reduce((s, x) => s + x.share_amount, 0));
    if (sum !== total) {
      return { shares: [], error: "Equal split failed to balance." };
    }
    // Max-min difference must be ≤ 1 paise for a fair equal split.
    const amounts = shares.map((s) => s.share_amount);
    const spread = round2(Math.max(...amounts) - Math.min(...amounts));
    if (spread > 0.01) {
      return { shares: [], error: "Equal split is not even." };
    }
    return { shares, error: null };
  }

  if (input.splitType === "exact") {
    const exact = input.exactAmounts ?? {};
    const shares = members.map((m) => {
      const v = Number(exact[m.email.toLowerCase()] ?? exact[m.email] ?? 0);
      return {
        user_id: m.user_id ?? null,
        email: m.email.toLowerCase().trim(),
        display_name: m.display_name,
        share_amount: round2(Math.max(0, v)),
        share_percentage: null as number | null,
        is_settled: false,
      };
    });
    const sum = round2(shares.reduce((s, x) => s + x.share_amount, 0));
    if (sum !== total) {
      return {
        shares: [],
        error: `Exact split must total ₹${total.toFixed(2)} (currently ₹${sum.toFixed(2)}).`,
      };
    }
    return { shares, error: null };
  }

  if (input.splitType === "percentage") {
    const pctMap = input.percentages ?? {};
    const pcts = members.map((m) =>
      Number(pctMap[m.email.toLowerCase()] ?? pctMap[m.email] ?? 0),
    );
    const pctSum = round2(pcts.reduce((s, x) => s + x, 0));
    if (pctSum !== 100) {
      return {
        shares: [],
        error: `Percentages must add to 100 (currently ${pctSum}).`,
      };
    }

    // Allocate in paise from percentages for exact total.
    const centsTotal = Math.round(total * 100);
    let assigned = 0;
    const shares = members.map((m, idx) => {
      const pct = Number(pcts[idx] ?? 0);
      let shareCents: number;
      if (idx === members.length - 1) {
        shareCents = centsTotal - assigned;
      } else {
        shareCents = Math.round((centsTotal * pct) / 100);
        assigned += shareCents;
      }
      return {
        user_id: m.user_id ?? null,
        email: m.email.toLowerCase().trim(),
        display_name: m.display_name,
        share_amount: shareCents / 100,
        share_percentage: pct,
        is_settled: false,
      };
    });
    return { shares, error: null };
  }

  if (input.splitType === "shares") {
    const countMap = input.shareCounts ?? {};
    const counts = members.map((m) => {
      const raw = Number(
        countMap[m.email.toLowerCase()] ?? countMap[m.email] ?? 1,
      );
      return Number.isFinite(raw) && raw > 0 ? raw : 0;
    });
    const totalShares = counts.reduce((s, x) => s + x, 0);
    if (totalShares <= 0) {
      return {
        shares: [],
        error: "Enter a positive share count for at least one member.",
      };
    }

    const centsTotal = Math.round(total * 100);
    let assigned = 0;
    const shares = members.map((m, idx) => {
      const shareCount = counts[idx] ?? 0;
      const pct = (shareCount / totalShares) * 100;
      let shareCents: number;
      if (idx === members.length - 1) {
        shareCents = centsTotal - assigned;
      } else {
        shareCents = Math.round((centsTotal * shareCount) / totalShares);
        assigned += shareCents;
      }
      return {
        user_id: m.user_id ?? null,
        email: m.email.toLowerCase().trim(),
        display_name: m.display_name,
        share_amount: shareCents / 100,
        share_percentage: round2(pct),
        is_settled: false,
      };
    });
    return { shares, error: null };
  }

  return { shares: [], error: "Unsupported split type." };
}
