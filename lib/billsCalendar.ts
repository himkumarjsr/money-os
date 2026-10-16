/**
 * Bills & renewals calendar: pure date logic for /bills (web) and the app's
 * Bills screen. Merges obligations, credit card due days and policy renewals
 * into one dated list per month.
 *
 * Mobile keeps a byte-identical copy at mobile/lib/billsCalendar.ts
 * (enforced by lib/calculatorMobileParity.test.ts). No imports on purpose.
 */

export type BillCategoryGroup =
  | "Loans"
  | "Insurance"
  | "Investments"
  | "Home & utilities"
  | "Family"
  | "Tax & government"
  | "Renewals & expiry"
  | "Other";

export type BillCategory = {
  value: string;
  label: string;
  emoji: string;
  group: BillCategoryGroup;
  /** Renewals and expiries often have no fixed amount. */
  amountOptional?: boolean;
  /** Days before the due date to remind, when the user doesn't pick one. */
  defaultRemindDays?: number;
};

export const BILL_CATEGORY_GROUPS: readonly BillCategoryGroup[] = [
  "Loans",
  "Insurance",
  "Investments",
  "Home & utilities",
  "Family",
  "Tax & government",
  "Renewals & expiry",
  "Other",
];

/** Every category an obligation can have. Existing values keep their ids. */
export const BILL_CATEGORIES: readonly BillCategory[] = [
  { value: "loan_emi", label: "Loan EMI", emoji: "🏦", group: "Loans" },
  {
    value: "insurance_life",
    label: "Life insurance",
    emoji: "🛡️",
    group: "Insurance",
  },
  {
    value: "insurance_health",
    label: "Health insurance",
    emoji: "🏥",
    group: "Insurance",
  },
  {
    value: "insurance_vehicle",
    label: "Vehicle insurance",
    emoji: "🚗",
    group: "Insurance",
    defaultRemindDays: 15,
  },
  {
    value: "insurance_rd",
    label: "RD for premiums",
    emoji: "🗓️",
    group: "Insurance",
  },
  { value: "investment_sip", label: "SIP", emoji: "📈", group: "Investments" },
  { value: "investment_ppf", label: "PPF", emoji: "💰", group: "Investments" },
  {
    value: "investment_fd",
    label: "FD / RD deposit",
    emoji: "🏛️",
    group: "Investments",
  },
  {
    value: "fd_maturity",
    label: "FD maturity",
    emoji: "🎯",
    group: "Investments",
    amountOptional: true,
    defaultRemindDays: 7,
  },
  { value: "rent", label: "Rent", emoji: "🏠", group: "Home & utilities" },
  {
    value: "maintenance",
    label: "Society maintenance",
    emoji: "🏢",
    group: "Home & utilities",
  },
  {
    value: "bill_electricity",
    label: "Electricity",
    emoji: "⚡",
    group: "Home & utilities",
  },
  {
    value: "bill_water",
    label: "Water",
    emoji: "💧",
    group: "Home & utilities",
  },
  {
    value: "bill_gas",
    label: "Gas / LPG",
    emoji: "🔥",
    group: "Home & utilities",
  },
  {
    value: "bill_internet",
    label: "Broadband",
    emoji: "🌐",
    group: "Home & utilities",
  },
  {
    value: "bill_mobile",
    label: "Mobile recharge",
    emoji: "📶",
    group: "Home & utilities",
  },
  {
    value: "bill_dth",
    label: "DTH / cable",
    emoji: "📺",
    group: "Home & utilities",
  },
  {
    value: "subscription",
    label: "Subscription",
    emoji: "📱",
    group: "Home & utilities",
  },
  {
    value: "school_fees",
    label: "School / college fees",
    emoji: "🎓",
    group: "Family",
    defaultRemindDays: 15,
  },
  {
    value: "tax",
    label: "Advance tax",
    emoji: "📋",
    group: "Tax & government",
    defaultRemindDays: 7,
  },
  {
    value: "property_tax",
    label: "Property tax",
    emoji: "🏘️",
    group: "Tax & government",
    defaultRemindDays: 15,
  },
  {
    value: "vehicle_puc",
    label: "Vehicle PUC",
    emoji: "🌿",
    group: "Renewals & expiry",
    amountOptional: true,
    defaultRemindDays: 7,
  },
  {
    value: "document_expiry",
    label: "Document expiry",
    emoji: "🪪",
    group: "Renewals & expiry",
    amountOptional: true,
    defaultRemindDays: 30,
  },
  { value: "other", label: "Other", emoji: "📌", group: "Other" },
];

const CATEGORY_BY_VALUE: Record<string, BillCategory> = Object.fromEntries(
  BILL_CATEGORIES.map((c) => [c.value, c]),
);

export function billCategory(value: string | null | undefined): BillCategory {
  const key = (value || "").trim();
  if (key === "credit_card") {
    return {
      value: "credit_card",
      label: "Credit card bill",
      emoji: "💳",
      group: "Loans",
    };
  }
  return CATEGORY_BY_VALUE[key] ?? CATEGORY_BY_VALUE.other;
}

export function billCategoryEmoji(value: string | null | undefined): string {
  return billCategory(value).emoji;
}

export function isAmountOptionalCategory(
  value: string | null | undefined,
): boolean {
  return Boolean(billCategory(value).amountOptional);
}

export function defaultRemindDaysFor(value: string | null | undefined): number {
  return billCategory(value).defaultRemindDays ?? 7;
}

export const REMIND_DAY_CHOICES = [1, 3, 7, 15, 30, 60] as const;

export const BILL_FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Every 3 months" },
  { value: "half_yearly", label: "Every 6 months" },
  { value: "yearly", label: "Yearly" },
  { value: "one_time", label: "One time" },
] as const;

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

// ── Inputs ─────────────────────────────────────────────────────────────────

export type BillObligation = {
  id: string;
  title: string;
  category: string;
  amount: number;
  frequency: string;
  due_day?: number | null;
  /** Yearly: the month (1–12). Quarterly / half-yearly: the first due month. */
  due_month?: number | null;
  /** One-time: YYYY-MM-DD. */
  due_date?: string | null;
  /** Last month it falls due (YYYY-MM-01), e.g. an RD's final instalment. Null = no end. */
  end_month?: string | null;
  is_active?: boolean;
};

export type BillChecklistRow = {
  id: string;
  obligation_id: string;
  /** YYYY-MM-01 */
  checklist_month: string;
  status: "pending" | "paid" | "skipped" | "auto_debit";
  expected_amount?: number | null;
  paid_amount?: number | null;
};

export type BillCard = {
  id: string;
  nickname: string;
  last4?: string;
  dueDay?: number;
};

export type BillPolicy = {
  id: string;
  insurerName: string;
  planName?: string | null;
  premiumAmount: number;
  /** YYYY-MM-DD */
  renewalDate: string | null;
  status: string;
};

// ── Date helpers ───────────────────────────────────────────────────────────

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function clampDay(year: number, monthIndex: number, day: number): number {
  const d = Math.round(Number(day)) || 1;
  return Math.min(daysInMonth(year, monthIndex), Math.max(1, d));
}

export function toYmd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseYmd(ymd: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd || "");
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
}

function validMonth(m: number | null | undefined): number | null {
  const n = Math.round(Number(m));
  return Number.isFinite(n) && n >= 1 && n <= 12 ? n : null;
}

// ── Occurrences ────────────────────────────────────────────────────────────

/**
 * The date an obligation falls due in a given month, or null when it isn't
 * due that month. Mirrors `generate_monthly_checklist` (migration 054):
 * quarterly / half-yearly repeat from `due_month` when set, else fall in
 * Mar/Jun/Sep/Dec and Jun/Dec.
 */
export function obligationDueDateInMonth(
  ob: Pick<BillObligation, "frequency" | "due_day" | "due_month" | "due_date"> &
    Pick<Partial<BillObligation>, "end_month">,
  year: number,
  monthIndex: number,
): Date | null {
  if (isPastEndMonth(ob.end_month, year, monthIndex)) return null;
  const month = monthIndex + 1;
  const anchor = validMonth(ob.due_month);
  const day = (d: number | null | undefined) =>
    new Date(year, monthIndex, clampDay(year, monthIndex, d ?? 1));

  switch (ob.frequency) {
    case "monthly":
      return day(ob.due_day);
    case "quarterly": {
      const hit =
        anchor == null ? month % 3 === 0 : (month - anchor + 12) % 3 === 0;
      return hit ? day(ob.due_day) : null;
    }
    case "half_yearly": {
      const hit =
        anchor == null ? month % 6 === 0 : (month - anchor + 12) % 6 === 0;
      return hit ? day(ob.due_day) : null;
    }
    case "yearly":
      return anchor === month ? day(ob.due_day) : null;
    case "one_time": {
      const due = ob.due_date ? parseYmd(ob.due_date) : null;
      if (!due) return null;
      return due.getFullYear() === year && due.getMonth() === monthIndex
        ? due
        : null;
    }
    default:
      return null;
  }
}

/** True when `end_month` (YYYY-MM-01) is set and the given month is after it. */
export function isPastEndMonth(
  endMonth: string | null | undefined,
  year: number,
  monthIndex: number,
): boolean {
  const end = endMonth ? parseYmd(endMonth) : null;
  if (!end) return false;
  return year * 12 + monthIndex > end.getFullYear() * 12 + end.getMonth();
}

/**
 * End month (YYYY-MM-01) for something with `monthsLeft` more monthly
 * payments, counting the month of `from`. Null when there is no end.
 */
export function endMonthAfter(
  monthsLeft: number | null | undefined,
  from: Date = new Date(),
): string | null {
  const n = Math.round(Number(monthsLeft));
  if (!Number.isFinite(n) || n < 1) return null;
  const idx = from.getFullYear() * 12 + from.getMonth() + n - 1;
  return monthKey(Math.floor(idx / 12), idx % 12);
}

/** Months left until `end_month`, counting the month of `asOf` (0 once it has ended). */
export function monthsLeftUntil(
  endMonth: string | null | undefined,
  asOf: Date = new Date(),
): number | null {
  const end = endMonth ? parseYmd(endMonth) : null;
  if (!end) return null;
  const n =
    end.getFullYear() * 12 +
    end.getMonth() -
    (asOf.getFullYear() * 12 + asOf.getMonth()) +
    1;
  return Math.max(0, n);
}

/** True when the obligation can never land on the calendar until it gets a date. */
export function obligationNeedsDate(
  ob: Pick<BillObligation, "frequency" | "due_month" | "due_date">,
): boolean {
  if (ob.frequency === "yearly") return validMonth(ob.due_month) == null;
  if (ob.frequency === "one_time")
    return !ob.due_date || !parseYmd(ob.due_date);
  return false;
}

/** Next due date on or after `asOf` (looks up to 13 months ahead). */
export function nextObligationDueDate(
  ob: Pick<BillObligation, "frequency" | "due_day" | "due_month" | "due_date"> &
    Pick<Partial<BillObligation>, "end_month">,
  asOf: Date = new Date(),
): Date | null {
  const today = startOfDay(asOf);
  for (let i = 0; i <= 13; i += 1) {
    const y = today.getFullYear() + Math.floor((today.getMonth() + i) / 12);
    const m = (today.getMonth() + i) % 12;
    const due = obligationDueDateInMonth(ob, y, m);
    if (due && due >= today) return due;
  }
  return null;
}

/** Policy renewal falls on the same day every year. */
export function policyRenewalInMonth(
  policy: Pick<BillPolicy, "renewalDate">,
  year: number,
  monthIndex: number,
): Date | null {
  const renewal = policy.renewalDate ? parseYmd(policy.renewalDate) : null;
  if (!renewal || renewal.getMonth() !== monthIndex) return null;
  return new Date(
    year,
    monthIndex,
    clampDay(year, monthIndex, renewal.getDate()),
  );
}

// ── Month view ─────────────────────────────────────────────────────────────

export type BillStatus =
  /** Paid, auto-debited. */
  | "paid"
  | "skipped"
  /** Date passed and nothing recorded. */
  | "overdue"
  /** Today or later. */
  | "due"
  /** Reminder only: we can't tell whether it was paid (card bills, renewals in the past). */
  | "info";

export type BillKind = "obligation" | "card" | "policy";

export type BillItem = {
  key: string;
  kind: BillKind;
  /** YYYY-MM-DD */
  date: string;
  day: number;
  title: string;
  category: string;
  emoji: string;
  /** null when the amount isn't known (card bills, expiries). */
  amount: number | null;
  status: BillStatus;
  frequency?: string;
  obligationId?: string;
  checklistId?: string;
  cardId?: string;
  policyId?: string;
};

export type BillsMonth = {
  year: number;
  monthIndex: number;
  items: BillItem[];
  /** Obligations that need a month or date before they can show. */
  undated: BillObligation[];
  totals: {
    /** Everything with a known amount this month, skipped excluded. */
    total: number;
    paid: number;
    /** Still to pay (due + overdue). */
    pending: number;
    overdue: number;
    overdueCount: number;
    dueCount: number;
  };
};

const SETTLED = new Set(["paid", "auto_debit"]);

function knownAmount(n: number | null | undefined): number | null {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? v : null;
}

export function buildBillsMonth(opts: {
  year: number;
  monthIndex: number;
  today?: Date;
  obligations: readonly BillObligation[];
  checklist?: readonly BillChecklistRow[];
  cards?: readonly BillCard[];
  policies?: readonly BillPolicy[];
}): BillsMonth {
  const { year, monthIndex } = opts;
  const today = startOfDay(opts.today ?? new Date());
  const key = monthKey(year, monthIndex);
  const rows = new Map<string, BillChecklistRow>();
  for (const r of opts.checklist ?? []) {
    if (String(r.checklist_month).slice(0, 10) === key) {
      rows.set(r.obligation_id, r);
    }
  }
  const isCurrentOrFuture =
    year > today.getFullYear() ||
    (year === today.getFullYear() && monthIndex >= today.getMonth());

  const items: BillItem[] = [];
  const undated: BillObligation[] = [];

  for (const ob of opts.obligations) {
    if (ob.is_active === false) continue;
    if ((ob.category || "") === "credit_card") continue;
    if (obligationNeedsDate(ob)) {
      undated.push(ob);
      continue;
    }
    const due = obligationDueDateInMonth(ob, year, monthIndex);
    if (!due) continue;
    const row = rows.get(ob.id);
    let status: BillStatus;
    if (row && SETTLED.has(row.status)) status = "paid";
    else if (row?.status === "skipped") status = "skipped";
    else if (due >= today) status = "due";
    // A past date counts as overdue when there is a pending row for it, or
    // it is this month. Older months with no row predate the reminder.
    else if (row || isCurrentOrFuture) status = "overdue";
    else status = "info";

    const amount =
      status === "paid"
        ? (knownAmount(row?.paid_amount) ?? knownAmount(ob.amount))
        : (knownAmount(ob.amount) ?? knownAmount(row?.expected_amount));
    items.push({
      key: `ob:${ob.id}`,
      kind: "obligation",
      date: toYmd(due),
      day: due.getDate(),
      title: ob.title,
      category: ob.category,
      emoji: billCategoryEmoji(ob.category),
      amount,
      status,
      frequency: ob.frequency,
      obligationId: ob.id,
      checklistId: row?.id,
    });
  }

  for (const card of opts.cards ?? []) {
    if (!card.dueDay) continue;
    const due = new Date(
      year,
      monthIndex,
      clampDay(year, monthIndex, card.dueDay),
    );
    const label = card.last4
      ? `${card.nickname} ••${card.last4}`
      : card.nickname;
    items.push({
      key: `card:${card.id}`,
      kind: "card",
      date: toYmd(due),
      day: due.getDate(),
      title: `${label} bill`,
      category: "credit_card",
      emoji: "💳",
      amount: null,
      status: due >= today ? "due" : "info",
      cardId: card.id,
    });
  }

  for (const policy of opts.policies ?? []) {
    if (policy.status !== "active") continue;
    const due = policyRenewalInMonth(policy, year, monthIndex);
    if (!due) continue;
    const premium = knownAmount(policy.premiumAmount);
    const insurer = (policy.insurerName || "").toLowerCase().trim();
    // The same premium is often also an insurance obligation: show it once.
    const duplicate = items.some(
      (i) =>
        i.kind === "obligation" &&
        i.category.startsWith("insurance") &&
        ((premium != null &&
          i.amount != null &&
          Math.abs(i.amount - premium) < 1) ||
          (insurer.length >= 3 && i.title.toLowerCase().includes(insurer))),
    );
    if (duplicate) continue;
    const name = [policy.insurerName, policy.planName]
      .filter(Boolean)
      .join(" ");
    items.push({
      key: `policy:${policy.id}`,
      kind: "policy",
      date: toYmd(due),
      day: due.getDate(),
      title: `${name || "Policy"} renewal`,
      category: "insurance_renewal",
      emoji: "🛡️",
      amount: premium,
      status: due >= today ? "due" : "info",
      policyId: policy.id,
    });
  }

  items.sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "en-IN"),
  );

  let total = 0;
  let paid = 0;
  let overdue = 0;
  let overdueCount = 0;
  let dueCount = 0;
  for (const i of items) {
    if (i.status === "overdue") {
      overdueCount += 1;
    }
    if (i.status === "due") dueCount += 1;
    if (i.amount == null || i.status === "skipped" || i.status === "info") {
      continue;
    }
    total += i.amount;
    if (i.status === "paid") paid += i.amount;
    if (i.status === "overdue") overdue += i.amount;
  }
  const pending = items
    .filter((i) => (i.status === "due" || i.status === "overdue") && i.amount)
    .reduce((s, i) => s + (i.amount ?? 0), 0);

  return {
    year,
    monthIndex,
    items,
    undated,
    totals: { total, paid, pending, overdue, overdueCount, dueCount },
  };
}

/** Items per day of month, for the calendar grid. */
export function billsByDay(
  items: readonly BillItem[],
): Map<number, BillItem[]> {
  const map = new Map<number, BillItem[]>();
  for (const i of items) {
    const list = map.get(i.day) ?? [];
    list.push(i);
    map.set(i.day, list);
  }
  return map;
}

/**
 * Calendar grid cells for a month, weeks starting Monday. `null` pads the
 * first and last week.
 */
export function monthGrid(year: number, monthIndex: number): (number | null)[] {
  const first = new Date(year, monthIndex, 1).getDay(); // 0 = Sunday
  const lead = (first + 6) % 7;
  const cells: (number | null)[] = Array.from({ length: lead }, () => null);
  const n = daysInMonth(year, monthIndex);
  for (let d = 1; d <= n; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Short "Due 5 Nov" style label. */
export function formatBillDate(ymd: string): string {
  const d = parseYmd(ymd);
  if (!d) return "";
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`;
}

/** "Every month on the 5th", "Every 3 months from Jan", ... */
export function describeSchedule(
  ob: Pick<BillObligation, "frequency" | "due_day" | "due_month" | "due_date">,
): string {
  const day = ob.due_day ? ordinal(ob.due_day) : null;
  const month = validMonth(ob.due_month);
  const monthName = month ? MONTH_NAMES[month - 1].slice(0, 3) : null;
  switch (ob.frequency) {
    case "monthly":
      return day ? `Every month on the ${day}` : "Every month";
    case "quarterly":
      return `Every 3 months${monthName ? ` from ${monthName}` : ""}${day ? `, on the ${day}` : ""}`;
    case "half_yearly":
      return `Every 6 months${monthName ? ` from ${monthName}` : ""}${day ? `, on the ${day}` : ""}`;
    case "yearly":
      return monthName
        ? `Every year on ${ob.due_day ?? 1} ${monthName}`
        : "Yearly, month not set";
    case "one_time":
      return ob.due_date
        ? `Once, on ${formatBillDate(ob.due_date)}`
        : "Once, date not set";
    default:
      return ob.frequency;
  }
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
