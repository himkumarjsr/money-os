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

export function generateAmortisationTable(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  emi: number,
): AmortisationRow[] {
  const n = Math.max(0, Math.round(tenureMonths));
  if (n === 0) return [];

  const monthlyRate = annualRate / 12 / 100;
  const start = new Date();
  start.setDate(1);
  start.setMonth(start.getMonth() + 1); // current month + 1 (spec)

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

