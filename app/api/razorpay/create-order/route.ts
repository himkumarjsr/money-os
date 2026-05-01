import { NextResponse } from "next/server";
import Razorpay from "razorpay";

/** Fix-plan unlock — ₹99 (9900 paise). FK tokens are not applied here (used for insurance coupons). */
const AMOUNT_PAISE = 9900;

/** Razorpay-node throws `{ statusCode, error }` where `error` is often `{ code, description, ... }`. */
function formatRazorpayFailure(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "error" in err) {
    const inner = (err as { error?: unknown }).error;
    if (typeof inner === "string") return inner;
    if (typeof inner === "object" && inner !== null && "description" in inner) {
      const d = (inner as { description?: string }).description;
      if (d) return d;
    }
    try {
      return JSON.stringify(inner);
    } catch {
      return String(inner);
    }
  }
  return typeof err === "string" ? err : "Unknown Razorpay error";
}

export async function POST() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!keyId || !keySecret) {
    return NextResponse.json(
      {
        error:
          "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (test keys from dashboard).",
      },
      { status: 503 },
    );
  }

  try {
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await razorpay.orders.create({
      amount: AMOUNT_PAISE,
      currency: "INR",
      receipt: `finkoin_pro_${Date.now()}`,
      notes: { plan: "pro" },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency ?? "INR",
    });
  } catch (err: unknown) {
    const message = formatRazorpayFailure(err);
    return NextResponse.json({ error: "Failed to create Razorpay order", detail: message }, { status: 502 });
  }
}
