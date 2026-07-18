import { describe, expect, it } from "vitest";
import { KNOWLEDGE_BASE } from "./entries";
import {
  formatKnowledgeForPrompt,
  retrieveRelevantKnowledge,
} from "./retriever";

function profile(overrides: Record<string, unknown> = {}) {
  return {
    lifeStage: "kids",
    selfAge: 55,
    numberOfKids: 1,
    kidsAges: [7],
    kidsGenders: ["girl"],
    educationLoanEMI: 2_000,
    planningBaby: true,
    fdValue: 100_000,
    hasTermInsurance: false,
    termInsuranceSumAssured: 0,
    hasHealthInsurance: false,
    healthInsuranceSumInsured: 0,
    parentsSupport: 1_000,
    additionalObligations: [],
    ...overrides,
  } as any;
}

describe("knowledge base retrieval", () => {
  it("exports a populated, uniquely identified static knowledge base", () => {
    expect(KNOWLEDGE_BASE.length).toBeGreaterThan(10);
    expect(new Set(KNOWLEDGE_BASE.map((entry) => entry.id)).size).toBe(
      KNOWLEDGE_BASE.length,
    );
  });

  it("selects relevant family, debt, insurance, and retirement guidance", () => {
    const entries = retrieveRelevantKnowledge(profile(), {} as any);
    expect(entries).toHaveLength(8);
    expect(entries.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([
        "ssy-2024",
        "education-loan-rules",
        "term-insurance-rules",
        "health-insurance-rules",
      ]),
    );
  });

  it("detects education loans from obligation rows and formats prompt context", () => {
    const entries = retrieveRelevantKnowledge(
      profile({
        lifeStage: "bachelor",
        selfAge: 28,
        numberOfKids: 0,
        kidsAges: [],
        kidsGenders: [],
        educationLoanEMI: 0,
        planningBaby: false,
        fdValue: 0,
        hasTermInsurance: true,
        termInsuranceSumAssured: 1,
        hasHealthInsurance: true,
        healthInsuranceSumInsured: 1_000_000,
        parentsSupport: 0,
        additionalObligations: [
          { type: "Student education loan", monthlyAmount: 500 },
        ],
      }),
      {} as any,
    );
    expect(entries.some((entry) => entry.id === "education-loan-rules")).toBe(
      true,
    );
    expect(formatKnowledgeForPrompt(entries)).toContain(
      "RELEVANT FINANCIAL KNOWLEDGE",
    );
    expect(formatKnowledgeForPrompt([])).toBe("");
  });
});
