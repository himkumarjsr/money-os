import { createSign, sign as cryptoSign } from "crypto";

/**
 * Server-side checks for Fix Plan purchases made in the mobile app through
 * Google Play Billing or Apple In-App Purchase. Every purchase is confirmed
 * with Google or Apple directly before it unlocks anything; what the app
 * sends is only a pointer (purchase token / transaction id).
 *
 * Credentials are passed in by the API route (server secrets are only read
 * under app/api, see scripts/check-server-secrets-scope.mjs).
 */

/** Store product id for the one-year Fix Plan pass, same on both stores. */
export const FIX_PLAN_PRODUCT_ID = "fix_plan_1y";
export const FIX_PLAN_PRICE_INR = 199;
export const NATIVE_BUNDLE_ID = "com.finkoin.app";

export type VerifiedStorePurchase = {
  platform: "android" | "ios";
  productId: string;
  transactionId: string;
  purchaseToken: string | null;
  purchasedAt: string;
  environment: "production" | "sandbox";
  raw: Record<string, unknown>;
};

export type StoreCheck =
  | { ok: true; purchase: VerifiedStorePurchase }
  | { ok: false; status: number; error: string };

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function decodeJwsPayload(jws: string): Record<string, unknown> | null {
  const part = jws.split(".")[1];
  if (!part) return null;
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

/** PEM keys pasted into env vars often arrive with literal "\n". */
export function normalisePem(key: string): string {
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

// ── Google Play ─────────────────────────────────────────────────────────

export type GoogleServiceAccount = {
  client_email: string;
  private_key: string;
};

export function parseServiceAccount(
  json: string | undefined,
): GoogleServiceAccount | null {
  if (!json?.trim()) return null;
  try {
    const parsed = JSON.parse(json) as Partial<GoogleServiceAccount>;
    if (!parsed.client_email || !parsed.private_key) return null;
    return {
      client_email: parsed.client_email,
      private_key: normalisePem(parsed.private_key),
    };
  } catch {
    return null;
  }
}

async function googleAccessToken(sa: GoogleServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/androidpublisher",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 600,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${b64url(signer.sign(sa.private_key))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
  };
  if (!res.ok || !data.access_token)
    throw new Error(`Google token request failed (${res.status})`);
  return data.access_token;
}

/** Fields we use from Play's purchases.products.get response. */
export type GoogleProductPurchase = {
  purchaseState?: number;
  acknowledgementState?: number;
  orderId?: string;
  purchaseTimeMillis?: string;
  obfuscatedExternalAccountId?: string;
  purchaseType?: number;
};

/** Pure checks on a Play purchase record, kept separate for tests. */
export function checkGooglePurchase(
  p: GoogleProductPurchase,
  opts: { userId: string; productId: string; purchaseToken: string },
): StoreCheck {
  if (p.purchaseState === 2) {
    return {
      ok: false,
      status: 409,
      error:
        "Payment is still pending. We'll unlock the plan once Google confirms it.",
    };
  }
  if (p.purchaseState !== 0) {
    return {
      ok: false,
      status: 402,
      error: "This purchase was cancelled or refunded.",
    };
  }
  if (
    p.obfuscatedExternalAccountId &&
    p.obfuscatedExternalAccountId !== opts.userId
  ) {
    return {
      ok: false,
      status: 403,
      error: "This purchase belongs to a different account.",
    };
  }
  const millis = Number(p.purchaseTimeMillis);
  return {
    ok: true,
    purchase: {
      platform: "android",
      productId: opts.productId,
      // Test purchases have no order id; the token is unique per purchase.
      transactionId: p.orderId || opts.purchaseToken,
      purchaseToken: opts.purchaseToken,
      purchasedAt: new Date(
        Number.isFinite(millis) && millis > 0 ? millis : Date.now(),
      ).toISOString(),
      environment: p.purchaseType === 0 ? "sandbox" : "production",
      raw: { ...p },
    },
  };
}

export async function verifyGooglePlayPurchase(opts: {
  serviceAccount: GoogleServiceAccount;
  packageName: string;
  productId: string;
  purchaseToken: string;
  userId: string;
}): Promise<StoreCheck> {
  const token = await googleAccessToken(opts.serviceAccount);
  const base =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${encodeURIComponent(opts.packageName)}/purchases/products/` +
    `${encodeURIComponent(opts.productId)}/tokens/${encodeURIComponent(opts.purchaseToken)}`;

  const res = await fetch(base, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404 || res.status === 400) {
    return {
      ok: false,
      status: 400,
      error: "Google doesn't recognise this purchase.",
    };
  }
  if (!res.ok) throw new Error(`Google purchase lookup failed (${res.status})`);
  const purchase = (await res.json()) as GoogleProductPurchase;

  const checked = checkGooglePurchase(purchase, opts);
  if (!checked.ok) return checked;

  // Acknowledge on the server too, so Google never auto-refunds a purchase
  // we've granted even if the app closes before it consumes it.
  if (purchase.acknowledgementState === 0) {
    const ack = await fetch(`${base}:acknowledge`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (!ack.ok && ack.status !== 400) {
      console.error("Play acknowledge failed:", ack.status);
    }
  }
  return checked;
}

// ── Apple App Store ─────────────────────────────────────────────────────

export type AppleApiKey = {
  issuerId: string;
  keyId: string;
  privateKey: string;
};

function appleApiToken(key: AppleApiKey, bundleId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(
    JSON.stringify({ alg: "ES256", kid: key.keyId, typ: "JWT" }),
  );
  const claims = b64url(
    JSON.stringify({
      iss: key.issuerId,
      iat: now,
      exp: now + 900,
      aud: "appstoreconnect-v1",
      bid: bundleId,
    }),
  );
  const signature = cryptoSign("sha256", Buffer.from(`${header}.${claims}`), {
    key: normalisePem(key.privateKey),
    dsaEncoding: "ieee-p1363",
  });
  return `${header}.${claims}.${b64url(signature)}`;
}

/** Fields we use from Apple's JWSTransactionDecodedPayload. */
export type AppleTransaction = {
  transactionId?: string;
  bundleId?: string;
  productId?: string;
  purchaseDate?: number;
  appAccountToken?: string;
  revocationDate?: number;
  environment?: string;
  type?: string;
};

export function checkAppleTransaction(
  t: AppleTransaction,
  opts: { userId: string; productId: string; bundleId: string },
): StoreCheck {
  if (
    t.bundleId !== opts.bundleId ||
    t.productId !== opts.productId ||
    !t.transactionId
  ) {
    return {
      ok: false,
      status: 400,
      error: "This purchase isn't for the Finkoin Fix Plan.",
    };
  }
  if (t.revocationDate) {
    return { ok: false, status: 402, error: "This purchase was refunded." };
  }
  if (
    t.appAccountToken &&
    t.appAccountToken.toLowerCase() !== opts.userId.toLowerCase()
  ) {
    return {
      ok: false,
      status: 403,
      error: "This purchase belongs to a different account.",
    };
  }
  return {
    ok: true,
    purchase: {
      platform: "ios",
      productId: t.productId,
      transactionId: t.transactionId,
      purchaseToken: null,
      purchasedAt: new Date(
        t.purchaseDate && t.purchaseDate > 0 ? t.purchaseDate : Date.now(),
      ).toISOString(),
      environment:
        t.environment === "Sandbox" || t.environment === "Xcode"
          ? "sandbox"
          : "production",
      raw: { ...t },
    },
  };
}

/**
 * Looks the transaction up with the App Store Server API (production, then
 * sandbox for TestFlight / review purchases). The JWS comes straight from
 * Apple over TLS with our own API key, so its payload is trusted as is.
 */
export async function verifyAppStoreTransaction(opts: {
  key: AppleApiKey;
  bundleId: string;
  productId: string;
  transactionId: string;
  userId: string;
}): Promise<StoreCheck> {
  const token = appleApiToken(opts.key, opts.bundleId);
  const hosts = [
    "https://api.storekit.itunes.apple.com",
    "https://api.storekit-sandbox.itunes.apple.com",
  ];
  for (const host of hosts) {
    const res = await fetch(
      `${host}/inApps/v1/transactions/${encodeURIComponent(opts.transactionId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (res.status === 404) continue;
    if (!res.ok) throw new Error(`App Store lookup failed (${res.status})`);
    const data = (await res.json()) as { signedTransactionInfo?: string };
    const payload = data.signedTransactionInfo
      ? decodeJwsPayload(data.signedTransactionInfo)
      : null;
    if (!payload) throw new Error("App Store returned no transaction");
    return checkAppleTransaction(payload as AppleTransaction, opts);
  }
  return {
    ok: false,
    status: 400,
    error: "Apple doesn't recognise this purchase.",
  };
}
