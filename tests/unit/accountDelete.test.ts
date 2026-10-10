import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../..");
const route = readFileSync(join(root, "app/api/account/delete/route.ts"), "utf8");
const migration = readFileSync(
  join(root, "supabase/migrations/046_split_fks_allow_account_deletion.sql"),
  "utf8",
);

describe("account deletion", () => {
  it("deletes the auth user before clearing any data", () => {
    const authAt = route.indexOf("auth.admin.deleteUser(userId)");
    const firstTableDelete = route.indexOf(".from(table).delete()");
    expect(authAt).toBeGreaterThan(-1);
    expect(firstTableDelete).toBeGreaterThan(authAt);
  });

  it("keeps shared Split history instead of deleting share rows", () => {
    expect(route).not.toContain('from("split_expense_shares").delete()');
  });

  it("lets Split rows outlive the auth user", () => {
    for (const fk of [
      "split_expenses_paid_by_user_id_fkey",
      "split_expenses_created_by_fkey",
      "split_expense_shares_user_id_fkey",
      "split_settlements_from_user_id_fkey",
      "split_settlements_to_user_id_fkey",
      "split_invitations_invited_by_fkey",
      "split_group_members_invited_by_fkey",
    ]) {
      expect(migration).toMatch(new RegExp(`ADD CONSTRAINT ${fk}[\\s\\S]*?ON DELETE SET NULL`));
    }
  });
});
