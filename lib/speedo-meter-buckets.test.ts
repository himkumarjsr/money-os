import { describe, expect, it } from "vitest";
import { buildSpeedoMeterProps } from "./speedo-meter-buckets";

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
      security: 0.05,
      loans: 0.4,
      investment: 0.2,
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
