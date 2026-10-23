import { describe, expect, it } from "vitest";
import {
  emptyQuickCalc,
  evaluateQuickCalc,
  formatQuickCalcExpr,
  formatQuickCalcNumber,
  pressQuickCalcKey,
  type QuickCalcKey,
  type QuickCalcState,
} from "./quickCalc";

const press = (keys: string, from: QuickCalcState = emptyQuickCalc) =>
  [...keys].reduce((s, k) => pressQuickCalcKey(s, k as QuickCalcKey), from);

describe("quick calculator", () => {
  it("does the sums with × and ÷ before + and −", () => {
    expect(evaluateQuickCalc("2+3×4")).toBe(14);
    expect(evaluateQuickCalc("10−4÷2")).toBe(8);
    expect(evaluateQuickCalc("0.1+0.2")).toBe(0.3);
    expect(evaluateQuickCalc("−5+2")).toBe(-3);
  });

  it("treats % like a phone calculator", () => {
    expect(evaluateQuickCalc("200+10%")).toBe(220);
    expect(evaluateQuickCalc("200−10%")).toBe(180);
    expect(evaluateQuickCalc("200×10%")).toBe(20);
    expect(evaluateQuickCalc("50%")).toBe(0.5);
  });

  it("ignores a trailing operator and refuses ÷ 0", () => {
    expect(evaluateQuickCalc("12+")).toBe(12);
    expect(evaluateQuickCalc("5÷0")).toBeNull();
    expect(evaluateQuickCalc("")).toBeNull();
  });

  it("types like a phone keypad", () => {
    expect(press("007").expr).toBe("7");
    expect(press("1..5").expr).toBe("1.5");
    expect(press("5+×2").expr).toBe("5×2");
    expect(press(".5").expr).toBe("0.5");
    expect(press("+").expr).toBe("");
    expect(press("−3").expr).toBe("−3");
    expect(press("12⌫").expr).toBe("1");
  });

  it("shows the answer after = and carries on from it", () => {
    const done = press("1500×12=");
    expect(done).toMatchObject({ expr: "18000", last: "1500×12" });
    expect(press("+500=", done).expr).toBe("18500");
    // A digit after = starts a new sum.
    expect(press("9", done).expr).toBe("9");
    // = on a bare number does nothing.
    expect(press("42=").justEvaluated).toBe(false);
  });

  it("groups numbers the Indian way", () => {
    expect(formatQuickCalcExpr("150000×12.5")).toBe("1,50,000 × 12.5");
    expect(formatQuickCalcExpr("1000.")).toBe("1,000.");
    expect(formatQuickCalcExpr("−2+3")).toBe("−2 + 3");
    expect(formatQuickCalcNumber(1234567.891)).toBe("12,34,567.891");
  });
});
