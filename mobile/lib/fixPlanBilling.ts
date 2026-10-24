/**
 * Fix Plan purchase through Google Play Billing / Apple In-App Purchase.
 *
 * Flow: the store takes the ₹199 payment, we send the purchase to the web
 * server (/api/billing/store-purchase) which confirms it with Google or Apple
 * and stores one year of access on the account, and only then do we finish
 * the transaction. The same login then also unlocks the Fix Plan on the
 * website. A purchase the app didn't get to report (killed mid-way) is picked
 * up again by `resumePendingFixPlanPurchases` on the next launch.
 *
 * Needs a development / store build: expo-iap is a native module, so in Expo
 * Go `isStoreBillingAvailable()` is false and the paywall says so.
 */
import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";
import { splitApi } from "@/lib/splitApi";
import { FIX_PLAN_PRODUCT_ID } from "@/lib/analyseEntitlement";

type ExpoIap = typeof import("expo-iap");
type Purchase = import("expo-iap").Purchase;

let iapModule: ExpoIap | null | undefined;

function iap(): ExpoIap | null {
  if (iapModule !== undefined) return iapModule;
  // Expo Go / web don't ship the native module; don't crash the app there.
  if (Platform.OS === "web" || !requireOptionalNativeModule("ExpoIap")) {
    iapModule = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    iapModule = require("expo-iap") as ExpoIap;
  } catch {
    iapModule = null;
  }
  return iapModule;
}

export function isStoreBillingAvailable(): boolean {
  return iap() !== null;
}

let connected: Promise<boolean> | null = null;

async function ensureConnection(): Promise<boolean> {
  const mod = iap();
  if (!mod) return false;
  if (!connected) {
    connected = mod.initConnection().then(
      (ok) => ok !== false,
      (e) => {
        connected = null;
        throw e;
      },
    );
  }
  return connected;
}

/** Store-localised price, e.g. "₹199.00"; null when unavailable. */
export async function fetchFixPlanPrice(): Promise<string | null> {
  const mod = iap();
  if (!mod) return null;
  try {
    await ensureConnection();
    const products = await mod.fetchProducts({
      skus: [FIX_PLAN_PRODUCT_ID],
      type: "in-app",
    });
    const product = (products ?? []).find(
      (p) => "id" in p && p.id === FIX_PLAN_PRODUCT_ID,
    ) as { displayPrice?: string } | undefined;
    return product?.displayPrice ?? null;
  } catch {
    return null;
  }
}

export type VerifyResult =
  | { ok: true; expiresAt: string | null }
  | { ok: false; error: string; pending?: boolean };

/** Report a store purchase to our server, then finish it with the store. */
export async function verifyAndFinish(
  purchase: Purchase,
): Promise<VerifyResult> {
  const mod = iap();
  if (!mod) return { ok: false, error: "In-app purchases aren't available." };
  if (purchase.productId !== FIX_PLAN_PRODUCT_ID) {
    return { ok: false, error: "Unknown product." };
  }
  if (purchase.purchaseState === "pending") {
    return {
      ok: false,
      pending: true,
      error:
        "Your payment is pending. We'll unlock the plan as soon as the store confirms it.",
    };
  }

  const body =
    Platform.OS === "android"
      ? {
          platform: "android",
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken,
        }
      : {
          platform: "ios",
          productId: purchase.productId,
          transactionId: purchase.id,
        };

  const res = await splitApi<{ ok?: boolean; expiresAt?: string | null }>(
    "/api/billing/store-purchase",
    { method: "POST", body },
  );
  if (!res.ok) {
    // Don't finish: the store keeps the purchase and we retry next launch.
    return { ok: false, error: res.error, pending: res.status === 409 };
  }

  try {
    // Consumable on Android so the pass can be bought again next year; on
    // iOS this just finishes the (non-renewing) transaction.
    await mod.finishTransaction({ purchase, isConsumable: true });
  } catch (e) {
    console.warn("finishTransaction failed:", e);
  }
  return { ok: true, expiresAt: res.data.expiresAt ?? null };
}

/**
 * Opens the store's payment sheet and resolves once the purchase is
 * confirmed by our server (or failed / was cancelled).
 */
export async function buyFixPlan(userId: string): Promise<VerifyResult> {
  const mod = iap();
  if (!mod) {
    return {
      ok: false,
      error:
        "In-app purchases need the Play Store or App Store version of Finkoin.",
    };
  }
  try {
    await ensureConnection();
  } catch {
    return { ok: false, error: "Couldn't reach the store. Please try again." };
  }

  return new Promise<VerifyResult>((resolve) => {
    let settled = false;
    const done = (r: VerifyResult) => {
      if (settled) return;
      settled = true;
      updated.remove();
      failed.remove();
      resolve(r);
    };

    const updated = mod.purchaseUpdatedListener((purchase) => {
      if (purchase.productId !== FIX_PLAN_PRODUCT_ID) return;
      void verifyAndFinish(purchase).then(done);
    });
    const failed = mod.purchaseErrorListener((error) => {
      done({
        ok: false,
        error: mod.isUserCancelledError(error)
          ? ""
          : error.message || "Payment failed. Please try again.",
      });
    });

    mod
      .requestPurchase({
        type: "in-app",
        request: {
          // Ties the payment to this Finkoin account; the server checks it.
          apple: { sku: FIX_PLAN_PRODUCT_ID, appAccountToken: userId },
          google: { skus: [FIX_PLAN_PRODUCT_ID], obfuscatedAccountId: userId },
        },
      })
      .catch((e: unknown) => {
        done({
          ok: false,
          error: e instanceof Error ? e.message : "Couldn't start the payment.",
        });
      });
  });
}

/**
 * Re-sends purchases the store still holds unfinished (app closed before we
 * reported it, or a pending payment that has since gone through). Returns
 * true when at least one unlocked the plan.
 */
export async function resumePendingFixPlanPurchases(): Promise<boolean> {
  const mod = iap();
  if (!mod) return false;
  try {
    await ensureConnection();
    const purchases = await mod.getAvailablePurchases();
    let unlocked = false;
    for (const p of purchases ?? []) {
      if (p.productId !== FIX_PLAN_PRODUCT_ID) continue;
      const r = await verifyAndFinish(p);
      if (r.ok) unlocked = true;
    }
    return unlocked;
  } catch {
    return false;
  }
}
