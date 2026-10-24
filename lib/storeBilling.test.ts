import { createVerify, generateKeyPairSync, verify } from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkAppleTransaction,
  checkGooglePurchase,
  normalisePem,
  parseServiceAccount,
  verifyAppStoreTransaction,
  verifyGooglePlayPurchase,
} from "./storeBilling";

const USER = "6f1c2a7e-1111-4222-8333-444455556666";

describe("checkGooglePurchase", () => {
  const opts = {
    userId: USER,
    productId: "fix_plan_1y",
    purchaseToken: "tok-1",
  };

  it("accepts a completed purchase for this account", () => {
    const r = checkGooglePurchase(
      {
        purchaseState: 0,
        orderId: "GPA.1234",
        purchaseTimeMillis: "1767225600000",
        obfuscatedExternalAccountId: USER,
      },
      opts,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.purchase.transactionId).toBe("GPA.1234");
    expect(r.purchase.purchasedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(r.purchase.environment).toBe("production");
  });

  it("uses the token when a test purchase has no order id", () => {
    const r = checkGooglePurchase({ purchaseState: 0, purchaseType: 0 }, opts);
    expect(r.ok && r.purchase.transactionId).toBe("tok-1");
    expect(r.ok && r.purchase.environment).toBe("sandbox");
  });

  it("refuses pending, cancelled and other-account purchases", () => {
    expect(checkGooglePurchase({ purchaseState: 2 }, opts)).toMatchObject({
      ok: false,
      status: 409,
    });
    expect(checkGooglePurchase({ purchaseState: 1 }, opts)).toMatchObject({
      ok: false,
      status: 402,
    });
    expect(
      checkGooglePurchase(
        { purchaseState: 0, obfuscatedExternalAccountId: "someone-else" },
        opts,
      ),
    ).toMatchObject({ ok: false, status: 403 });
  });
});

describe("checkAppleTransaction", () => {
  const opts = {
    userId: USER,
    productId: "fix_plan_1y",
    bundleId: "com.finkoin.app",
  };
  const base = {
    transactionId: "2000000123",
    bundleId: "com.finkoin.app",
    productId: "fix_plan_1y",
    purchaseDate: 1767225600000,
    appAccountToken: USER.toUpperCase(),
    environment: "Production",
  };

  it("accepts a matching transaction", () => {
    const r = checkAppleTransaction(base, opts);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.purchase.platform).toBe("ios");
    expect(r.purchase.transactionId).toBe("2000000123");
  });

  it("marks sandbox purchases", () => {
    const r = checkAppleTransaction({ ...base, environment: "Sandbox" }, opts);
    expect(r.ok && r.purchase.environment).toBe("sandbox");
  });

  it("refuses wrong app/product, refunds and other accounts", () => {
    expect(
      checkAppleTransaction({ ...base, bundleId: "com.other" }, opts),
    ).toMatchObject({ ok: false, status: 400 });
    expect(
      checkAppleTransaction({ ...base, productId: "coins" }, opts),
    ).toMatchObject({ ok: false, status: 400 });
    expect(
      checkAppleTransaction({ ...base, revocationDate: 1 }, opts),
    ).toMatchObject({ ok: false, status: 402 });
    expect(
      checkAppleTransaction(
        { ...base, appAccountToken: "00000000-0000-4000-8000-000000000000" },
        opts,
      ),
    ).toMatchObject({ ok: false, status: 403 });
  });
});

describe("credentials parsing", () => {
  it("reads a service account and restores escaped newlines", () => {
    const sa = parseServiceAccount(
      JSON.stringify({
        client_email: "x@y.iam.gserviceaccount.com",
        private_key:
          "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----",
      }),
    );
    expect(sa?.private_key).toContain("\nabc\n");
    expect(parseServiceAccount("not json")).toBeNull();
    expect(parseServiceAccount(undefined)).toBeNull();
    expect(normalisePem("a\nb")).toBe("a\nb");
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("store API calls (signed requests)", () => {
  it("signs the App Store request and falls back to sandbox", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", {
      namedCurve: "P-256",
    });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const payload = Buffer.from(
      JSON.stringify({
        transactionId: "9",
        bundleId: "com.finkoin.app",
        productId: "fix_plan_1y",
        purchaseDate: 1,
      }),
    ).toString("base64url");
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init: any) => {
      calls.push(url);
      const [h, c, s] = init.headers.Authorization.slice(7).split(".");
      expect(
        verify(
          "sha256",
          Buffer.from(`${h}.${c}`),
          { key: publicKey, dsaEncoding: "ieee-p1363" },
          Buffer.from(s, "base64url"),
        ),
      ).toBe(true);
      if (url.includes("sandbox"))
        return new Response(
          JSON.stringify({ signedTransactionInfo: `x.${payload}.y` }),
          { status: 200 },
        );
      return new Response("", { status: 404 });
    });
    const r = await verifyAppStoreTransaction({
      key: { issuerId: "i", keyId: "k", privateKey: pem.replace(/\n/g, "\\n") },
      bundleId: "com.finkoin.app",
      productId: "fix_plan_1y",
      transactionId: "9",
      userId: USER,
    });
    expect(r.ok).toBe(true);
    expect(calls.length).toBe(2);
  });
  it("signs the Google token request and acknowledges", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const calls: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init: any) => {
      calls.push(url);
      if (url.includes("oauth2")) {
        const a = new URLSearchParams(init.body.toString()).get("assertion")!;
        const [h, c, s] = a.split(".");
        const v = createVerify("RSA-SHA256");
        v.update(`${h}.${c}`);
        expect(v.verify(publicKey, Buffer.from(s, "base64url"))).toBe(true);
        return new Response(JSON.stringify({ access_token: "AT" }), {
          status: 200,
        });
      }
      if (url.endsWith(":acknowledge"))
        return new Response("{}", { status: 200 });
      return new Response(
        JSON.stringify({
          purchaseState: 0,
          acknowledgementState: 0,
          orderId: "GPA.1",
          obfuscatedExternalAccountId: USER,
        }),
        { status: 200 },
      );
    });
    const r = await verifyGooglePlayPurchase({
      serviceAccount: { client_email: "a@b", private_key: pem },
      packageName: "com.finkoin.app",
      productId: "fix_plan_1y",
      purchaseToken: "t",
      userId: USER,
    });
    expect(r.ok).toBe(true);
    expect(calls.some((c) => c.endsWith(":acknowledge"))).toBe(true);
  });
});
