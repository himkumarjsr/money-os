/**
 * Detect recurring expense patterns for the obligations calendar.
 * Auto-add when the same kind of payment appeared in a prior month;
 * otherwise suggest a one-tap confirm.
 */

export type LearnDecision = "auto" | "suggest" | "skip";

export type LearnCandidate = {
  title: string;
  category: string;
  amount: number;
};

function normalizeDesc(d: string | null | undefined): string {
  return (d || "")
    .toLowerCase()
    .replace(/\[#[^\]]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function decideObligationLearn(opts: {
  description: string | null | undefined;
  amount: number;
  category: string;
  existing: Array<{ category: string; amount: number; title?: string }>;
  /** Prior months' expenses (not including the just-saved one). */
  priorTransactions: Array<{
    description?: string | null;
    amount: number;
    date?: string | null;
  }>;
}): LearnDecision {
  const amount = Number(opts.amount);
  if (!Number.isFinite(amount) || amount <= 0) return "skip";

  const already = opts.existing.some(
    (o) =>
      o.category === opts.category && Math.abs(Number(o.amount) - amount) < 100,
  );
  if (already) return "skip";

  const desc = normalizeDesc(opts.description);
  const priorHit = opts.priorTransactions.some((t) => {
    if (Math.abs(Number(t.amount) - amount) > Math.max(100, amount * 0.15)) {
      return false;
    }
    const prev = normalizeDesc(t.description);
    if (!desc || !prev) return false;
    return prev.includes(desc.slice(0, 12)) || desc.includes(prev.slice(0, 12));
  });

  return priorHit ? "auto" : "suggest";
}

export function candidateFromExpense(
  description: string | null | undefined,
  amount: number,
  category: string,
): LearnCandidate {
  return {
    title: (description || "").trim() || category.replace(/_/g, " "),
    category,
    amount,
  };
}
