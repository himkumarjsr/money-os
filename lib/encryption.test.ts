import { afterEach, describe, expect, it } from "vitest";
import {
  decrypt,
  encrypt,
  encryptSensitiveFields,
  hashData,
} from "./encryption";

const TEST_KEY = "a".repeat(64);

describe("encryption", () => {
  afterEach(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  it("round-trips encrypt/decrypt", () => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
    const payload = { monthlySalary: 150000, spouseBalance: 200000 };
    const enc = encrypt(payload);
    expect(enc.version).toBe(1);
    expect(enc.encryptedData).toBeTruthy();
    expect(enc.iv).toHaveLength(32);
    expect(enc.authTag).toHaveLength(32);
    expect(decrypt(enc.encryptedData, enc.iv, enc.authTag)).toEqual(payload);
  });

  it("encryptSensitiveFields only packs money fields", () => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
    const enc = encryptSensitiveFields({
      monthlySalary: 100000,
      lifeStage: "married",
      cityTier: "metro",
      monthlySIP: 10000,
      savingsAccountBalance: 50000,
    });
    const out = decrypt(enc.encryptedData, enc.iv, enc.authTag);
    expect(out.monthlySalary).toBe(100000);
    expect(out.monthlySIP).toBe(10000);
    expect(out.savingsAccountBalance).toBe(50000);
    expect(out.lifeStage).toBeUndefined();
  });

  it("hashData returns 16 hex chars", () => {
    expect(hashData({ a: 1 })).toMatch(/^[0-9a-f]{16}$/);
  });

  it("throws when ENCRYPTION_KEY missing", () => {
    expect(() => encrypt({ x: 1 })).toThrow(/ENCRYPTION_KEY/);
  });
});
