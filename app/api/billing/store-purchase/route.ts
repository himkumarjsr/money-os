import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import {
  FIX_PLAN_PRODUCT_ID,
  NATIVE_BUNDLE_ID,
  parseServiceAccount,
  verifyAppStoreTransaction,
  verifyGooglePlayPurchase,
  type StoreCheck,
} from "@/lib/storeBilling";

/**
 * POST /api/billing/store-purchase - the mobile app calls this after Google
 * Play or the App Store reports a Fix Plan purchase. We confirm it with the
 * store, record it (one year of access), and only then does the app finish
 * the transaction. Calling it again with the same purchase is harmless.
 *
 * Body: { platform: "android", productId, purchaseToken }
 *    or { platform: "ios", productId, transactionId }
 */
type Body = {
  platform?: string;
  productId?: string;
  purchaseToken?: string;
  transactionId?: string;
};

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const {
    data: { user },
    error: userErr,
  } = await admin.auth.getUser(token);
  if (userErr || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const productId = body.productId?.trim() || FIX_PLAN_PRODUCT_ID;
  if (
    productId !==
    (process.env.FIX_PLAN_PRODUCT_ID?.trim() || FIX_PLAN_PRODUCT_ID)
  ) {
    return NextResponse.json({ error: "Unknown product." }, { status: 400 });
  }

  let checked: StoreCheck;
  try {
    if (body.platform === "android") {
      const purchaseToken = body.purchaseToken?.trim();
      if (!purchaseToken) {
        return NextResponse.json(
          { error: "Missing purchase token." },
          { status: 400 },
        );
      }
      const serviceAccount = parseServiceAccount(
        process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON,
      );
      if (!serviceAccount) {
        return NextResponse.json(
          { error: "Google Play billing is not configured on the server." },
          { status: 503 },
        );
      }
      checked = await verifyGooglePlayPurchase({
        serviceAccount,
        packageName:
          process.env.GOOGLE_PLAY_PACKAGE_NAME?.trim() || NATIVE_BUNDLE_ID,
        productId,
        purchaseToken,
        userId: user.id,
      });
    } else if (body.platform === "ios") {
      const transactionId = body.transactionId?.trim();
      if (!transactionId) {
        return NextResponse.json(
          { error: "Missing transaction id." },
          { status: 400 },
        );
      }
      const issuerId = process.env.APPLE_IAP_ISSUER_ID?.trim();
      const keyId = process.env.APPLE_IAP_KEY_ID?.trim();
      const privateKey = process.env.APPLE_IAP_PRIVATE_KEY?.trim();
      if (!issuerId || !keyId || !privateKey) {
        return NextResponse.json(
          { error: "App Store billing is not configured on the server." },
          { status: 503 },
        );
      }
      checked = await verifyAppStoreTransaction({
        key: { issuerId, keyId, privateKey },
        bundleId: process.env.APPLE_BUNDLE_ID?.trim() || NATIVE_BUNDLE_ID,
        productId,
        transactionId,
        userId: user.id,
      });
    } else {
      return NextResponse.json({ error: "Unknown platform." }, { status: 400 });
    }
  } catch (err) {
    console.error("Store purchase check failed:", err);
    return NextResponse.json(
      { error: "Could not confirm the purchase. Please try again." },
      { status: 502 },
    );
  }

  if (!checked.ok) {
    return NextResponse.json(
      { error: checked.error },
      { status: checked.status },
    );
  }

  const p = checked.purchase;
  const { data: expiresAt, error: recordErr } = await admin.rpc(
    "fix_plan_record_purchase",
    {
      p_user: user.id,
      p_platform: p.platform,
      p_product_id: p.productId,
      p_transaction_id: p.transactionId,
      p_purchase_token: p.purchaseToken,
      p_purchased_at: p.purchasedAt,
      p_environment: p.environment,
      p_raw: p.raw,
    },
  );
  if (recordErr) {
    if (recordErr.code === "42501") {
      return NextResponse.json(
        { error: "This purchase belongs to a different account." },
        { status: 403 },
      );
    }
    console.error("Fix plan purchase record failed:", recordErr.message);
    return NextResponse.json(
      { error: "Could not save the purchase. Please contact support." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, expiresAt });
}
