/**
 * Deterministic split-balance + debt-simplification engine.
 *
 * All balances are derived in-app from expenses, their shares, and recorded
 * settlements so the math is auditable and unit-testable (independent of any
 * opaque database RPC). "net > 0" means the group owes that member money
 * (they are a creditor); "net < 0" means the member owes the group.
 */

const EPSILON = 0.01;

export type BalanceMember = {
  email: string;
  display_name: string;
};

export type BalanceExpenseShare = {
  email: string;
  display_name?: string | null;
  share_amount: number;
};

export type BalanceExpense = {
  amount: number;
  paid_by_email: string;
  paid_by_name?: string | null;
  shares?: BalanceExpenseShare[] | null;
};

export type BalanceSettlement = {
  from_email: string;
  from_name?: string | null;
  to_email: string;
  to_name?: string | null;
  amount: number;
};

export type NetBalance = {
  email: string;
  name: string;
  /** > 0 => others owe this member; < 0 => this member owes others. */
  net: number;
};

export type SimplifiedEdge = {
  from_email: string;
  from_name: string;
  to_email: string;
  to_name: string;
  amount: number;
};

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function normEmail(email: string | null | undefined): string {
  return (email ?? "").toLowerCase().trim();
}

/**
 * Compute each member's net balance from expenses (who paid vs who consumed)
 * and settlements (cash already exchanged). Settlements are amount-accurate:
 * a settlement of ₹X from A to B reduces A's debt and B's credit by exactly X.
 */
export function computeNetBalances(
  members: BalanceMember[],
  expenses: BalanceExpense[],
  settlements: BalanceSettlement[] = [],
): NetBalance[] {
  const names = new Map<string, string>();
  const net = new Map<string, number>();

  const ensure = (email: string, name?: string | null) => {
    const key = normEmail(email);
    if (!key) return "";
    if (!net.has(key)) net.set(key, 0);
    const existing = names.get(key);
    const candidate = (name ?? "").trim();
    if (candidate && (!existing || existing === key.split("@")[0])) {
      names.set(key, candidate);
    } else if (!existing) {
      names.set(key, key.split("@")[0] || key);
    }
    return key;
  };

  for (const m of members) ensure(m.email, m.display_name);

  for (const exp of expenses) {
    const amount = round2(exp.amount);
    if (!Number.isFinite(amount) || amount === 0) continue;
    const payer = ensure(exp.paid_by_email, exp.paid_by_name);
    if (payer) net.set(payer, (net.get(payer) ?? 0) + amount);
    for (const share of exp.shares ?? []) {
      const key = ensure(share.email, share.display_name);
      if (!key) continue;
      net.set(key, (net.get(key) ?? 0) - round2(share.share_amount));
    }
  }

  for (const s of settlements) {
    const amount = round2(s.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const from = ensure(s.from_email, s.from_name);
    const to = ensure(s.to_email, s.to_name);
    // A pays B: A's debt shrinks (net goes up), B's credit shrinks (net goes down).
    if (from) net.set(from, (net.get(from) ?? 0) + amount);
    if (to) net.set(to, (net.get(to) ?? 0) - amount);
  }

  return Array.from(net.entries())
    .map(([email, value]) => ({
      email,
      name: names.get(email) ?? email,
      net: round2(value),
    }))
    .sort((a, b) => b.net - a.net);
}

/**
 * Minimum cash-flow debt simplification. Greedily matches the largest creditor
 * with the largest debtor each step, producing at most (n-1) transfers — the
 * fewest transactions needed to settle the whole group.
 */
export function simplifyDebts(balances: NetBalance[]): SimplifiedEdge[] {
  const creditors = balances
    .filter((b) => b.net > EPSILON)
    .map((b) => ({ ...b, net: round2(b.net) }))
    .sort((a, b) => b.net - a.net);
  const debtors = balances
    .filter((b) => b.net < -EPSILON)
    .map((b) => ({ ...b, net: round2(b.net) }))
    .sort((a, b) => a.net - b.net);

  const edges: SimplifiedEdge[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const transfer = round2(Math.min(creditor.net, -debtor.net));

    if (transfer > EPSILON) {
      edges.push({
        from_email: debtor.email,
        from_name: debtor.name,
        to_email: creditor.email,
        to_name: creditor.name,
        amount: transfer,
      });
      creditor.net = round2(creditor.net - transfer);
      debtor.net = round2(debtor.net + transfer);
    }

    if (creditor.net <= EPSILON) ci += 1;
    if (debtor.net >= -EPSILON) di += 1;
  }

  return edges;
}

/** Convenience: net balances + minimal settle-up edges in one call. */
export function computeGroupBalances(
  members: BalanceMember[],
  expenses: BalanceExpense[],
  settlements: BalanceSettlement[] = [],
): { net: NetBalance[]; edges: SimplifiedEdge[] } {
  const net = computeNetBalances(members, expenses, settlements);
  return { net, edges: simplifyDebts(net) };
}

export function netFor(email: string, balances: NetBalance[]): number {
  const key = normEmail(email);
  const found = balances.find((b) => b.email === key);
  return found ? found.net : 0;
}
