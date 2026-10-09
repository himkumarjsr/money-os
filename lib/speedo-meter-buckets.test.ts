import { describe, expect, it } from "vitest";
import {
  buildSpeedoMeterProps,
  investStatus,
  investmentTargetPct,
} from "./speedo-meter-buckets";

describe("buildSpeedoMeterProps", () => {
  it("returns zeros and default caps for empty profile", () => {
    const props = buildSpeedoMeterProps({});
    expect(props.income).toBe(0);
    expect(props.needs).toBe(0);
    expect(props.wants).toBe(0);
    expect(props.security).toBe(0);
    expect(props.loans).toBe(0);
    expect(props.investment).toBe(0);
    expect(props.hasHomeLoan).toBe(false);
    expect(props.caps).toEqual({
      needs: 0.3,
      wants: 0.05,
      security: 0.1,
      loans: 0.3,
      investment: 0.25,
    });
  });

  it("feeds monthly insurance premiums into the Security gauge", () => {
    const props = buildSpeedoMeterProps({
      monthlySalary: 100000,
      hasHealthInsurance: true,
      healthInsurancePremiumMonthly: 1500,
      hasTermInsurance: true,
      termInsurancePremiumMonthly: 1000,
    } as never);
    expect(props.security).toBe(2500);
  });

  it("maps income and bucket actuals from profile fields", () => {
    const props = buildSpeedoMeterProps({
      monthlySalary: 100000,
      lifeStage: "bachelor",
      rentAmount: 20000,
      grocery: 5000,
      shopping: 3000,
      entertainment: 1000,
      personalCare: 500,
      carLoanEMI: 8000,
      monthlySIP: 10000,
      monthlyRD: 2000,
    } as never);

    expect(props.income).toBe(100000);
    expect(props.needs).toBeGreaterThan(0);
    expect(props.wants).toBe(4500);
    expect(props.loans).toBe(8000);
    expect(props.investment).toBe(12000);
    expect(props.hasHomeLoan).toBe(false);
  });

  it("sets hasHomeLoan when home or second property EMI present", () => {
    expect(
      buildSpeedoMeterProps({ homeLoanEMI: 25000 } as never).hasHomeLoan,
    ).toBe(true);
    expect(
      buildSpeedoMeterProps({ secondPropertyEMI: 15000 } as never).hasHomeLoan,
    ).toBe(true);
    expect(
      buildSpeedoMeterProps({ homeLoanEMI: 0, secondPropertyEMI: 0 } as never)
        .hasHomeLoan,
    ).toBe(false);
  });

  it("ignores spouse income for bachelor life stage", () => {
    const props = buildSpeedoMeterProps({
      monthlySalary: 50000,
      spouseIncome: 40000,
      lifeStage: "bachelor",
    } as never);
    expect(props.income).toBe(50000);
  });

  it("includes spouse income for non-bachelor stages", () => {
    const props = buildSpeedoMeterProps({
      monthlySalary: 50000,
      spouseIncome: 40000,
      otherIncome: 5000,
      lifeStage: "married",
    } as never);
    expect(props.income).toBe(95000);
  });
});

describe("investment target", () => {
  it("uses the user's investment cap, never below the 15% floor", () => {
    expect(investmentTargetPct(0.25)).toBe(25);
    expect(investmentTargetPct(0.28)).toBe(28);
    expect(investmentTargetPct(0.1)).toBe(15);
  });

  it("follows the profile split from getUniversalCaps", () => {
    const props = buildSpeedoMeterProps({
      monthlySalary: 100000,
      lifeStage: "bachelor",
      selfAge: 25,
    } as never);
    expect(investmentTargetPct(props.caps!.investment)).toBe(28);
  });

  it("is good at or above the target, not at a fixed 20%", () => {
    expect(investStatus(15, 15)).toBe("good");
    expect(investStatus(18, 15)).toBe("good");
    expect(investStatus(20, 25)).toBe("warning");
    expect(investStatus(25, 25)).toBe("good");
  });

  it("is low only below the 15% floor", () => {
    expect(investStatus(15, 25)).toBe("warning");
    expect(investStatus(14, 25)).toBe("critical");
    expect(investStatus(13, 15)).toBe("warning");
    expect(investStatus(12, 15)).toBe("critical");
  });
});
