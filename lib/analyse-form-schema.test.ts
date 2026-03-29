import {
  parseMoneyInput,
  step2Schema,
} from "@/lib/analyse-form-schema";
import { describe, expect, it } from "vitest";

describe("parseMoneyInput", () => {
  it("normalizes rupee symbols, commas, and spaces", () => {
    expect(parseMoneyInput("₹ 50,000")).toBe(50_000);
    expect(parseMoneyInput(" 75 000 ")).toBe(75_000);
  });

  it("returns undefined for blank or invalid values", () => {
    expect(parseMoneyInput("")).toBeUndefined();
    expect(parseMoneyInput("abc")).toBeUndefined();
    expect(parseMoneyInput(NaN)).toBeUndefined();
  });
});

describe("step2Schema", () => {
  it("accepts formatted monthly salary input", () => {
    const parsed = step2Schema.safeParse({
      monthlySalary: "₹ 50,000",
      spouseIncome: "",
      otherIncome: undefined,
      city: "Mumbai",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.monthlySalary).toBe(50_000);
    }
  });

  it("rejects zero salary values", () => {
    const parsed = step2Schema.safeParse({
      monthlySalary: "0",
      city: "Mumbai",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.monthlySalary).toContain(
        "Enter a valid salary amount",
      );
    }
  });
});
