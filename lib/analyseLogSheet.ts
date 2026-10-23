/**
 * Turns one `analyse_logs` payload into a readable calculation sheet for the
 * admin console: what the user entered, then each number the report built
 * from it, with the formula next to it, so a wrong result can be spotted
 * without reading JSON.
 */

export type SheetRow = {
  label: string;
  value: string;
  /** How the value was worked out, or where it came from. */
  note?: string;
  /** Set when this number disagrees with another one. */
  flag?: string;
  /** A total line (drawn in bold). */
  total?: boolean;
};

export type SheetTable = {
  head: string[];
  rows: string[][];
  /** Row indexes to highlight. */
  flagged?: number[];
};

export type SheetSection = {
  title: string;
  rows?: SheetRow[];
  table?: SheetTable;
  groups?: Array<{ title: string; rows: SheetRow[] }>;
};

type Obj = Record<string, unknown>;

const obj = (v: unknown): Obj =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {};
const num = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export function inr(v: unknown): string {
  const x = Math.round(num(v));
  return `${x < 0 ? "-" : ""}₹${Math.abs(x).toLocaleString("en-IN")}`;
}

const humanise = (key: string) => {
  const words = key
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\bepf\b/g, "EPF")
    .replace(/\bppf\b/g, "PPF")
    .replace(/\bnps\b/g, "NPS")
    .replace(/\bsip\b/g, "SIP")
    .replace(/\brd\b/g, "RD")
    .replace(/\bfd\b/g, "FD")
    .replace(/\bemi\b/g, "EMI")
    .replace(/\blic\b/g, "LIC")
    .replace(/\bmf\b/g, "MF")
    .replace(/\bssy\b/g, "SSY")
    .replace(/\bnsc\b/g, "NSC");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const INPUT_GROUPS: Array<[string, RegExp]> = [
  ["Income", /salary|income|bonus|rental|freelance/i],
  ["Loans", /loan|emi|outstanding|creditcard/i],
  ["Insurance", /insurance|premium|cover|sumassured/i],
  ["Investing each month", /sip|monthlyrd|contribution|ssy|lic|custominvest/i],
  [
    "Savings and assets",
    /balance|value|fd|gold|stock|mutual|property|land|deposit|postoffice|medicalemergency|emergencyfund/i,
  ],
  [
    "Monthly spending",
    /rent|food|grocer|transport|fuel|lifestyle|travel|parents|utilit|bill|school|fee|household|maid|shopping|entertain|subscription|spend|total|domestic|medical|kids|child/i,
  ],
];

const MONEY_KEY =
  /amount|salary|income|rent|total|emi|outstanding|premium|sip|rd|contribution|balance|value|fd|gold|support|monthly|corpus|cover|assured|insured|ssy|spend|fee|cost|price|target/i;

function formatInput(key: string, v: unknown): string | null {
  if (v == null || v === "" || v === false) return null;
  if (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v.trim())) v = Number(v);
  if (typeof v === "number") {
    if (v === 0) return null;
    return MONEY_KEY.test(key) &&
      !/age|year|months|rate|percent|pct|count/i.test(key)
      ? inr(v)
      : String(v);
  }
  if (typeof v === "boolean") return "Yes";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    if (v.length === 0) return null;
    return v
      .map((item) => {
        if (item == null || typeof item !== "object") return String(item);
        return Object.entries(item as Obj)
          .filter(([, x]) => x != null && x !== "" && x !== 0 && x !== false)
          .map(([k, x]) =>
            typeof x === "number"
              ? `${humanise(k)} ${formatInput(k, x)}`
              : `${humanise(k)} ${typeof x === "object" ? JSON.stringify(x) : String(x)}`,
          )
          .join(", ");
      })
      .join(" | ");
  }
  return JSON.stringify(v);
}

function inputSection(profile: Obj): SheetSection {
  const groups = new Map<string, SheetRow[]>();
  for (const [key, v] of Object.entries(profile)) {
    const value = formatInput(key, v);
    if (value == null) continue;
    const group =
      INPUT_GROUPS.find(([, re]) => re.test(key))?.[0] ??
      "About them and their goals";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push({ label: humanise(key), value });
  }
  const order = [
    "About them and their goals",
    "Income",
    "Monthly spending",
    "Loans",
    "Insurance",
    "Investing each month",
    "Savings and assets",
  ];
  return {
    title: "1. What the user entered",
    groups: order
      .filter((g) => groups.has(g))
      .map((g) => ({ title: g, rows: groups.get(g)! })),
  };
}

function flowSection(surplus: Obj, profile: Obj): SheetSection | null {
  if (!("totalIncome" in surplus)) return null;
  const epf = num(profile.monthlyEPFContribution);
  const invest = num(surplus.investmentActual);
  const investFromHand = Math.max(0, invest - epf);
  const left =
    num(surplus.totalIncome) -
    num(surplus.needsActual) -
    num(surplus.loansActual) -
    num(surplus.wantsActual) -
    investFromHand -
    num(surplus.existingInsurancePremiums);
  const shown = num(surplus.netSurplus);
  const agrees = Math.abs(Math.max(0, left) - shown) <= 1;
  return {
    title: "2. Monthly money flow",
    rows: [
      { label: "Take-home income", value: inr(surplus.totalIncome) },
      {
        label: "− Needs",
        value: inr(surplus.needsActual),
        note: "rent, food, transport, bills, parents' support",
      },
      { label: "− Loan EMIs", value: inr(surplus.loansActual) },
      {
        label: "− Wants",
        value: inr(surplus.wantsActual),
        note: "lifestyle, travel, shopping",
      },
      {
        label: "− Investing from in-hand pay",
        value: inr(investFromHand),
        note:
          epf > 0
            ? `${inr(invest)} invested, minus EPF ${inr(epf)} (deducted from salary before it reaches the bank)`
            : `${inr(invest)} invested`,
      },
      {
        label: "− Insurance premiums",
        value: inr(surplus.existingInsurancePremiums),
      },
      {
        label: "= Left each month",
        value: inr(left),
        total: true,
        note: left < 0 ? "Spending more than they earn" : undefined,
      },
      {
        label: "Surplus the plan uses",
        value: inr(shown),
        note: "never below ₹0",
        flag: agrees ? undefined : `Should be ${inr(Math.max(0, left))}`,
      },
      {
        label: "Left after every plan step",
        value: inr(surplus.afterAllPriorities),
      },
    ],
  };
}

function safetySection(sf: Obj): SheetSection | null {
  if (!("emergencyTarget" in sf)) return null;
  const fund = obj(sf.emergencyFund);
  const months = num(sf.emergencyMonthsNeeded);
  const monthly = num(fund.monthlyExpenses);
  const targetCheck = Math.abs(monthly * months - num(sf.emergencyTarget)) <= 1;
  return {
    title: "3. Safety funds",
    groups: [
      {
        title: "Emergency fund",
        rows: [
          {
            label: "Essential outgo per month",
            value: inr(monthly),
            note: "needs + every EMI + insurance premiums",
          },
          {
            label: "Months it must cover",
            value: String(months),
            note: "set by life stage, dependants and job type",
          },
          {
            label: "Target",
            value: inr(sf.emergencyTarget),
            note: `${inr(monthly)} × ${months}`,
            flag: targetCheck
              ? undefined
              : `${inr(monthly)} × ${months} = ${inr(monthly * months)}`,
            total: true,
          },
          {
            label: "Counted as held now",
            value: inr(fund.realTotal),
            note: `savings ${inr(fund.savingsCounted)} + liquid funds ${inr(fund.liquidCounted)} + FDs ${inr(fund.fdCounted)} (70%) + other ${inr(num(fund.otherCounted) + num(fund.legacyCounted))}`,
          },
          { label: "Gap", value: inr(sf.emergencyGap) },
          {
            label: "Filled by moving FDs to liquid",
            value: inr(sf.emergencyFdToLiquid),
          },
          {
            label: "Filled from mutual funds / stocks",
            value: inr(sf.emergencyFromEquity),
          },
          { label: "Filled from gold", value: inr(sf.emergencyFromGold) },
          {
            label: "Still to build from monthly savings",
            value: inr(sf.emergencyGapLeft),
            total: true,
          },
        ],
      },
      {
        title: "Medical fund",
        rows: [
          { label: "Target", value: inr(sf.medicalTarget) },
          {
            label: "Held now",
            value: inr(sf.medicalCurrent),
            note:
              num(sf.enteredMedical) > 0
                ? "as entered"
                : "estimated as half the liquid funds",
          },
          { label: "Gap", value: inr(sf.medicalGap) },
          { label: "From spare savings", value: inr(sf.medicalFromCash) },
          { label: "From FDs", value: inr(sf.medicalFromFd) },
          {
            label: "From mutual funds / stocks",
            value: inr(sf.medicalFromEquity),
          },
          { label: "From gold", value: inr(sf.medicalFromGold) },
          {
            label: "Still to build from monthly savings",
            value: inr(sf.medicalGapLeft),
            total: true,
          },
        ],
      },
    ],
  };
}

function goalsSection(goals: unknown, earmarks: Obj): SheetSection | null {
  if (!Array.isArray(goals) || goals.length === 0) return null;
  return {
    title: "4. Goals",
    table: {
      head: [
        "Goal",
        "Year",
        "Price today",
        "Cost by then",
        "Savings set aside",
        "Running SIPs",
        "New SIP needed",
      ],
      rows: goals.map((g) => {
        const goal = obj(g);
        const m = obj(earmarks[String(goal.id)]);
        const accounts = num(m.retirementAccounts);
        return [
          `${String(goal.label)}${goal.isDefaultTarget ? " (our default)" : ""}`,
          String(goal.targetYear ?? ""),
          inr(goal.targetAmount),
          inr(goal.futureCost),
          `${inr(m.lumpsum)}${accounts > 0 ? ` + EPF/PPF/NPS ${inr(accounts)}` : ""}`,
          `${inr(m.existingMonthly)}/mo`,
          `${inr(m.monthlyRequired)}/mo`,
        ];
      }),
    },
  };
}

function stepsSection(priorities: unknown): SheetSection | null {
  if (!Array.isArray(priorities) || priorities.length === 0) return null;
  const flagged: number[] = [];
  const rows = priorities.map((p, i) => {
    const s = obj(p);
    const text = String(s.actionThisWeek ?? "");
    if (/₹0\/month/.test(text)) flagged.push(i);
    return [
      String(s.rank ?? i + 1),
      String(s.title ?? ""),
      `${inr(s.monthlyContribution)}/mo${
        num(s.monthlyRequired) !== num(s.monthlyContribution)
          ? ` (needs ${inr(s.monthlyRequired)})`
          : ""
      }`,
      num(s.startMonth) > 1 ? `Month ${num(s.startMonth)}` : "Now",
      `${inr(s.surplusBefore)} → ${inr(s.surplusAfterThis)}`,
      text,
    ];
  });
  return {
    title: "5. Plan steps, in order",
    table: {
      head: [
        "#",
        "Step",
        "Gets",
        "Starts",
        "Surplus before → after",
        "What we tell them",
      ],
      rows,
      flagged,
    },
  };
}

function scoreSection(score: Obj, result: Obj): SheetSection | null {
  if (!Array.isArray(score.pillars)) return null;
  return {
    title: "6. Money score and headline numbers",
    rows: [
      { label: "Money score", value: `${num(score.total)} / 100`, total: true },
      ...(score.pillars as unknown[]).map((p) => {
        const pl = obj(p);
        return {
          label: String(pl.label),
          value: `${num(pl.points)} / ${num(pl.max)}`,
          note: String(pl.line ?? ""),
        };
      }),
      {
        label: "Net worth",
        value: inr(result.netWorth),
        note: `assets ${inr(result.totalAssets)} − loans ${inr(result.totalLiabilities)}`,
      },
      { label: "Term cover needed", value: inr(result.termInsuranceNeeded) },
    ],
  };
}

export function buildAnalyseLogSheet(payload: Obj): SheetSection[] {
  const steps = obj(payload.steps);
  const profile = obj(payload.profile);
  const checks = Array.isArray(payload.checks)
    ? (payload.checks as string[])
    : [];
  const sections: Array<SheetSection | null> = [
    checks.length
      ? {
          title: "Numbers that disagree",
          rows: checks.map((c) => ({ label: "Check", value: "", flag: c })),
        }
      : null,
    inputSection(profile),
    flowSection(obj(steps.surplus), profile),
    safetySection(obj(steps.safetyFund)),
    goalsSection(steps.goals, obj(steps.earmarks)),
    stepsSection(steps.priorities),
    scoreSection(obj(steps.moneyScore), obj(payload.result)),
  ];
  return sections.filter((s): s is SheetSection => s !== null);
}
