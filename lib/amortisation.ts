export type AmortisationRow = {
  month: number;
  date: string; // "Jan 2025"
  openingBalance: number;
  emi: number;
  principal: number;
  interest: number;
  closingBalance: number;
};

function formatMonthYear(d: Date) {
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function parseLoanStartDate(loanStartDate?: Date | string): Date {
  if (!loanStartDate) return new Date();
  if (typeof loanStartDate === "string") {
    return new Date(`${loanStartDate}T12:00:00`);
  }
  return new Date(loanStartDate);
}

export function generateAmortisationTable(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  emi: number,
  loanStartDate?: Date | string,
): AmortisationRow[] {
  const n = Math.max(0, Math.round(tenureMonths));
  if (n === 0) return [];

  const monthlyRate = annualRate / 12 / 100;
  const start = parseLoanStartDate(loanStartDate);
  start.setDate(1);
  start.setMonth(start.getMonth() + 1); // first EMI is the month after loan start

  const rows: AmortisationRow[] = [];
  let openingBalance = principal;

  for (let month = 1; month <= n; month += 1) {
    const date = new Date(start);
    date.setMonth(start.getMonth() + (month - 1));

    const interest = openingBalance * monthlyRate;
    const principalPaid = emi - interest;
    const closingBalance = openingBalance - principalPaid;

    rows.push({
      month,
      date: formatMonthYear(date),
      openingBalance,
      emi,
      principal: principalPaid,
      interest,
      closingBalance: Math.max(0, closingBalance),
    });

    openingBalance = closingBalance;
  }

  return rows;
}

export function calculateOutstanding(
  emi: number,
  annualRate: number,
  remainingMonths: number,
): number {
  const e = Math.max(0, emi || 0);
  const r = Math.max(0, annualRate || 0) / 12 / 100;
  const n = Math.max(0, Math.round(remainingMonths || 0));
  if (e <= 0 || n <= 0) return 0;
  if (r <= 0) return e * n;
  const discountFactor = 1 - Math.pow(1 + r, -n);
  if (discountFactor <= 0) return e * n;
  return (e * discountFactor) / r;
}
