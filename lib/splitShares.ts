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
    const per = round2(total / members.length);
    const shares = members.map((m, idx) => ({
      user_id: m.user_id ?? null,
      email: m.email.toLowerCase(),
      display_name: m.display_name,
      share_amount:
        idx === members.length - 1
          ? round2(total - per * (members.length - 1))
          : per,
      share_percentage: null as number | null,
      is_settled: false,
    }));
    return { shares, error: null };
  }

  if (input.splitType === "exact") {
    const exact = input.exactAmounts ?? {};
    const shares = members.map((m) => {
      const v = Number(exact[m.email.toLowerCase()] ?? exact[m.email] ?? 0);
      return {
        user_id: m.user_id ?? null,
        email: m.email.toLowerCase(),
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
    const shares = members.map((m, idx) => {
      const pct = Number(pcts[idx] ?? 0);
      const amt =
        idx === members.length - 1
          ? round2(
              total -
                members
                  .slice(0, -1)
                  .reduce(
                    (s, _mm, ii) =>
                      s + round2(total * (Number(pcts[ii] ?? 0) / 100)),
                    0,
                  ),
            )
          : round2(total * (pct / 100));
      return {
        user_id: m.user_id ?? null,
        email: m.email.toLowerCase(),
        display_name: m.display_name,
        share_amount: amt,
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

    let assigned = 0;
    const shares = members.map((m, idx) => {
      const shareCount = counts[idx] ?? 0;
      const pct = (shareCount / totalShares) * 100;
      let amt: number;
      if (idx === members.length - 1) {
        amt = round2(total - assigned);
      } else {
        amt = round2(total * (shareCount / totalShares));
        assigned = round2(assigned + amt);
      }
      return {
        user_id: m.user_id ?? null,
        email: m.email.toLowerCase(),
        display_name: m.display_name,
        share_amount: amt,
        share_percentage: round2(pct),
        is_settled: false,
      };
    });
    return { shares, error: null };
  }

  return { shares: [], error: "Unsupported split type." };
}
