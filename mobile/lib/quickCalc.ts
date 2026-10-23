/**
 * The floating quick calculator: a phone-style keypad over any screen. Pure
 * key handling and maths, shared by web and mobile, so both give the same
 * answer. No `eval`: the expression is parsed by hand.
 *
 * Percent works like a phone calculator: `200 + 10%` is 220 (10% of 200),
 * while `200 × 10%` is 20.
 */

export type QuickCalcKey =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "."
  | "+"
  | "−"
  | "×"
  | "÷"
  | "%"
  | "C"
  | "⌫"
  | "=";

export type QuickCalcState = {
  /** What the user has typed, raw (no commas). */
  expr: string;
  /** The sum that produced `expr`, shown small above it after "=". */
  last: string | null;
  justEvaluated: boolean;
};

export const QUICK_CALC_KEYS: QuickCalcKey[][] = [
  ["C", "⌫", "%", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "−"],
  ["1", "2", "3", "+"],
  ["0", ".", "="],
];

export const emptyQuickCalc: QuickCalcState = {
  expr: "",
  last: null,
  justEvaluated: false,
};

const OPS = new Set(["+", "−", "×", "÷"]);
const MAX_LEN = 32;
/** Past 15 digits a JS number stops being exact. */
const MAX_DIGITS = 15;

const isOp = (c: string | undefined) => c !== undefined && OPS.has(c);
const isDigit = (c: string | undefined) => c !== undefined && /[0-9]/.test(c);

/** The number being typed at the end of `expr`, if any. */
function currentNumber(expr: string): string {
  return expr.match(/[0-9.]*$/)?.[0] ?? "";
}

/** Trim float noise (0.1 + 0.2) and keep it short enough to type on. */
function clean(n: number): number {
  return Number.parseFloat(n.toPrecision(12));
}

type Tok =
  | { kind: "num"; value: number; pct: boolean }
  | { kind: "op"; op: string };

function tokenize(expr: string): Tok[] | null {
  const toks: Tok[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (isDigit(c) || c === ".") {
      let j = i;
      while (j < expr.length && (isDigit(expr[j]) || expr[j] === ".")) j++;
      const text = expr.slice(i, j);
      if (text === ".") return null;
      let pct = false;
      if (expr[j] === "%") {
        pct = true;
        j++;
      }
      toks.push({ kind: "num", value: Number(text), pct });
      i = j;
    } else if (isOp(c)) {
      toks.push({ kind: "op", op: c });
      i++;
    } else {
      return null;
    }
  }
  return toks;
}

/**
 * Value of `expr`, or null when it isn't a finished sum (empty, or a divide
 * by zero). A trailing operator is ignored so the live preview works mid-sum.
 */
export function evaluateQuickCalc(expr: string): number | null {
  const trimmed = expr.replace(/[+−×÷]+$/, "");
  if (!trimmed) return null;
  const toks = tokenize(trimmed);
  if (!toks) return null;
  let pos = 0;

  // factor := ["−"] number ["%"]
  const factor = (): { value: number; pct: boolean } | null => {
    let sign = 1;
    const t = toks[pos];
    if (t?.kind === "op" && t.op === "−") {
      sign = -1;
      pos++;
    }
    const n = toks[pos];
    if (n?.kind !== "num") return null;
    pos++;
    return { value: sign * n.value, pct: n.pct };
  };

  // term := factor (("×" | "÷") factor)*
  const term = (): { value: number; pct: boolean } | null => {
    const first = factor();
    if (!first) return null;
    let value = first.pct ? first.value / 100 : first.value;
    let single = true;
    while (toks[pos]?.kind === "op") {
      const op = (toks[pos] as { op: string }).op;
      if (op !== "×" && op !== "÷") break;
      pos++;
      const rhs = factor();
      if (!rhs) return null;
      const r = rhs.pct ? rhs.value / 100 : rhs.value;
      if (op === "÷" && r === 0) return null;
      value = op === "×" ? value * r : value / r;
      single = false;
    }
    // A lone "10%" after + or − means 10% of the running total.
    return single && first.pct
      ? { value: first.value, pct: true }
      : { value, pct: false };
  };

  const head = term();
  if (!head) return null;
  let total = head.pct ? head.value / 100 : head.value;
  while (pos < toks.length) {
    const t = toks[pos];
    if (t.kind !== "op") return null;
    pos++;
    const rhs = term();
    if (!rhs) return null;
    const r = rhs.pct ? (total * rhs.value) / 100 : rhs.value;
    total = t.op === "+" ? total + r : total - r;
  }
  return Number.isFinite(total) ? clean(total) : null;
}

/** Digits with Indian grouping (1,00,000), keeping what was typed after a dot. */
function groupNumber(text: string): string {
  const [int, dec] = text.split(".");
  const grouped = int
    ? Number(int).toLocaleString("en-IN", { maximumFractionDigits: 0 })
    : "";
  return dec !== undefined ? `${grouped || "0"}.${dec}` : grouped;
}

/** `expr` as shown on the display: grouped numbers, spaced operators. */
export function formatQuickCalcExpr(expr: string): string {
  return expr
    .replace(/[0-9.]+/g, (m) => groupNumber(m))
    .replace(/([+−×÷])/g, " $1 ")
    .replace(/^ − /, "−")
    .trim();
}

/** A result as shown: Indian grouping, up to 8 decimals. */
export function formatQuickCalcNumber(n: number): string {
  if (Math.abs(n) >= 1e15) return n.toExponential(6);
  return n.toLocaleString("en-IN", { maximumFractionDigits: 8 });
}

/** Raw text for a result, so the next sum can carry on from it. */
function rawNumber(n: number): string {
  const s = String(n);
  return s.includes("e") ? n.toFixed(8).replace(/\.?0+$/, "") : s;
}

export function pressQuickCalcKey(
  state: QuickCalcState,
  key: QuickCalcKey,
): QuickCalcState {
  const { expr, justEvaluated } = state;
  const last = expr.at(-1);

  if (key === "C") return emptyQuickCalc;

  if (key === "⌫") {
    if (justEvaluated) return emptyQuickCalc;
    return { ...state, expr: expr.slice(0, -1) };
  }

  if (key === "=") {
    const value = evaluateQuickCalc(expr);
    if (value === null || !/[+−×÷%]/.test(expr.replace(/^−/, ""))) {
      return state;
    }
    return { expr: rawNumber(value), last: expr, justEvaluated: true };
  }

  if (isDigit(key)) {
    if (justEvaluated) return { expr: key, last: null, justEvaluated: false };
    if (expr.length >= MAX_LEN || last === "%") return state;
    const num = currentNumber(expr);
    if (num.replace(".", "").length >= MAX_DIGITS) return state;
    // "0" then "5" is 5, not 05.
    const base = num === "0" ? expr.slice(0, -1) : expr;
    return { ...state, expr: base + key };
  }

  if (key === ".") {
    if (justEvaluated) return { expr: "0.", last: null, justEvaluated: false };
    if (expr.length >= MAX_LEN || last === "%") return state;
    const num = currentNumber(expr);
    if (num.includes(".")) return state;
    return { ...state, expr: expr + (num ? "." : "0.") };
  }

  if (key === "%") {
    if (justEvaluated || !(isDigit(last) || last === ".")) return state;
    return { ...state, expr: expr + "%" };
  }

  // Operators: a new operator replaces one just typed, and after "=" the
  // sum carries on from the answer.
  if (!expr) return key === "−" ? { ...state, expr: "−" } : state;
  if (expr === "−" || expr.length >= MAX_LEN) return state;
  let tail = isOp(last) ? expr.slice(0, -1) : expr;
  if (tail.endsWith(".")) tail = tail.slice(0, -1);
  return { expr: tail + key, last: null, justEvaluated: false };
}
