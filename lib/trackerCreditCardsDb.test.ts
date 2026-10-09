import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  upserts: [] as Array<Record<string, unknown>>,
  missingLimitColumn: true,
  rows: [] as Array<Record<string, unknown>>,
  selected: "",
}));

vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({
    from: () => ({
      select: (cols: string) => {
        db.selected = cols;
        return {
          eq: () => ({
            order: () => Promise.resolve({ data: db.rows, error: null }),
          }),
        };
      },
      upsert: (row: Record<string, unknown>) => {
        db.upserts.push({ ...row });
        if (db.missingLimitColumn && "credit_limit" in row) {
          return Promise.resolve({
            error: {
              message:
                "Could not find the 'credit_limit' column of 'user_credit_cards'",
            },
          });
        }
        return Promise.resolve({ error: null });
      },
    }),
  }),
}));

import {
  loadCreditCardsMerged,
  loadSavedCreditCards,
  persistCreditCardToDb,
  upsertSavedCreditCard,
} from "./trackerCreditCards";

describe("credit limit before / after migration 041", () => {
  beforeEach(() => {
    localStorage.clear();
    db.upserts = [];
    db.rows = [];
    db.missingLimitColumn = true;
  });

  it("retries the save without credit_limit when the column is missing", async () => {
    await persistCreditCardToDb("u1", {
      id: "c1",
      nickname: "HDFC",
      creditLimit: 100000,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(db.upserts).toHaveLength(2);
    expect(db.upserts[0].credit_limit).toBe(100000);
    expect("credit_limit" in db.upserts[1]).toBe(false);
    expect(db.upserts[1].nickname).toBe("HDFC");
  });

  it("saves once when the column exists", async () => {
    db.missingLimitColumn = false;
    await persistCreditCardToDb("u1", {
      id: "c1",
      nickname: "HDFC",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(db.upserts).toHaveLength(1);
  });

  it("keeps the local limit when the DB row has none, and selects *", async () => {
    upsertSavedCreditCard("u1", {
      id: "c1",
      nickname: "HDFC",
      billingDay: 15,
      creditLimit: 90000,
    });
    db.rows = [
      {
        id: upsertSavedCreditCard("u1", { nickname: "HDFC" }).id,
        nickname: "HDFC",
        billing_day: 20,
        due_day: 10,
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ];
    const cards = await loadCreditCardsMerged("u1");
    expect(db.selected).toBe("*");
    expect(cards[0]).toMatchObject({
      nickname: "HDFC",
      billingDay: 20,
      dueDay: 10,
      creditLimit: 90000,
    });
  });

  it("edits every card field by id and can clear the limit", () => {
    const card = upsertSavedCreditCard("u1", {
      nickname: "HDFC",
      billingDay: 15,
      creditLimit: 50000,
    });
    const edited = upsertSavedCreditCard("u1", {
      id: card.id,
      nickname: "HDFC Regalia",
      last4: "1234",
      billingDay: 20,
      dueDay: 8,
      creditLimit: 200000,
    });
    expect(edited).toMatchObject({
      id: card.id,
      nickname: "HDFC Regalia",
      last4: "1234",
      billingDay: 20,
      dueDay: 8,
      creditLimit: 200000,
    });
    // Omitting the limit keeps it; null clears it.
    upsertSavedCreditCard("u1", { id: card.id, nickname: "HDFC Regalia" });
    expect(loadSavedCreditCards("u1")[0].creditLimit).toBe(200000);
    upsertSavedCreditCard("u1", {
      id: card.id,
      nickname: "HDFC Regalia",
      creditLimit: null,
    });
    expect(loadSavedCreditCards("u1")[0].creditLimit).toBeUndefined();
  });
});
