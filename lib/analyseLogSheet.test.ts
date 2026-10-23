import { describe, expect, it } from "vitest";
import type { FinancialProfile } from "./analyse-form-schema";
import { ADVISOR_PERSONAS } from "./advisorPersonasFixture";
import { buildAnalyseLogPayload } from "./analyseLogPayload";
import { buildAnalyseLogSheet, inr } from "./analyseLogSheet";
import { analyseFinances } from "./financialEngine";

const NOW = new Date("2026-10-23T00:00:00Z");

describe("analyse log sheet", () => {
  it("formats rupees", () => {
    expect(inr(250000)).toBe("₹2,50,000");
    expect(inr(-39583.6)).toBe("-₹39,584");
  });

  it.each(ADVISOR_PERSONAS.map((p) => [p.name, p.profile]))(
    "%s: shows inputs, money flow, safety, goals, steps and score",
    (_name, raw) => {
      const profile = raw as FinancialProfile;
      const payload = buildAnalyseLogPayload({
        source: "form_submit",
        profile,
        result: analyseFinances(profile),
        now: NOW,
      });
      const sheet = buildAnalyseLogSheet(
        JSON.parse(JSON.stringify(payload)) as Record<string, unknown>,
      );
      const titles = sheet.map((s) => s.title);
      expect(titles).toEqual(
        expect.arrayContaining([
          "1. What the user entered",
          "2. Monthly money flow",
          "3. Safety funds",
          "5. Plan steps, in order",
          "6. Money score and headline numbers",
        ]),
      );
      const flow = sheet.find((s) => s.title === "2. Monthly money flow");
      expect(flow?.rows?.some((r) => r.flag)).toBe(false);
      const safety = sheet.find((s) => s.title === "3. Safety funds");
      expect(
        safety?.groups?.flatMap((g) => g.rows).some((r) => r.flag),
      ).toBe(false);
    },
  );
});
