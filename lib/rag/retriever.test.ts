import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabaseServer", () => ({
  supabaseAdmin: { rpc },
}));

import { buildKeywords, formatForPrompt, retrieveKnowledge } from "./retriever";

describe("RAG retriever", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("builds distinct contextual keywords from profile, goal, and balances", () => {
    const keywords = buildKeywords(
      {
        lifeStage: "kids",
        educationLoanEMI: 1,
        personalLoanEMI: 1,
        homeLoanEMI: 1,
        parentsSupport: 1,
        planningBaby: true,
        primaryGoal: "Buy a home and build wealth",
        savingsAccountBalance: 50_000,
      },
      { needsActual: 10_000 },
    );
    expect(keywords).toEqual(
      expect.arrayContaining([
        "married",
        "kids",
        "education loan",
        "personal loan",
        "home purchase",
        "bereavement",
        "maternity",
        "fire",
        "mis",
      ]),
    );
    expect(new Set(keywords).size).toBe(keywords.length);
  });

  it("maps RPC rows to chunks and passes keywords and limit", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          id: "1",
          category: "tax",
          title: "Title",
          content: "Body",
          keywords: null,
          applies_when: null,
          priority_context: null,
        },
      ],
      error: null,
    });
    await expect(
      retrieveKnowledge({ lifeStage: "married" }, {}, 3),
    ).resolves.toEqual([
      {
        id: "1",
        category: "tax",
        title: "Title",
        content: "Body",
        keywords: [],
        appliesWhen: "",
        priorityContext: [],
      },
    ]);
    expect(rpc).toHaveBeenCalledWith(
      "search_by_keywords",
      expect.objectContaining({ match_count: 3 }),
    );
  });

  it("returns no chunks for RPC errors, empty data, and thrown requests", async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(retrieveKnowledge({}, {})).resolves.toEqual([]);
    rpc.mockResolvedValueOnce({ data: null, error: new Error("bad") });
    await expect(retrieveKnowledge({}, {})).resolves.toEqual([]);
    rpc.mockRejectedValueOnce(new Error("network"));
    await expect(retrieveKnowledge({}, {})).resolves.toEqual([]);
  });

  it("formats only supplied chunks into strict prompt context", () => {
    expect(formatForPrompt([])).toBe("");
    expect(
      formatForPrompt([
        {
          id: "1",
          category: "tax",
          title: "Section 80C",
          content: "Use current limits.",
          keywords: [],
          appliesWhen: "",
          priorityContext: [],
        },
      ]),
    ).toContain("[RULE 1] Section 80C");
  });
});
