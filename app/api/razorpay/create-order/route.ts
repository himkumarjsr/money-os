import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import {
  getAuthedUser,
  rateLimit,
  tooManyRequests,
  unauthorized,
} from "@/lib/apiGuard";

export async function POST() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!keyId || !keySecret) {
    return NextResponse.json(
      { error: "Razorpay keys not configured." },
      { status: 503 },
    );
  }

  // Only authenticated users can create payment orders (prevents order-spam
  // against the Razorpay account).
  const user = await getAuthedUser();
  if (!user) {
    return unauthorized();
  }
  const limit = rateLimit(`razorpay-order:${user.id}`, 15, 60 * 60 * 1000);
  if (!limit.ok) {
    return tooManyRequests(limit.retryAfter);
  }

  try {
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const order = await razorpay.orders.create({
      amount: 9900,
      currency: "INR",
      receipt: `finkoin_${Date.now()}`,
      notes: { plan: "pro", user_id: user.id },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency ?? "INR",
    });
  } catch (err: unknown) {
    const message =
      (err as { error?: { description?: string } })?.error?.description ||
      (err instanceof Error ? err.message : "Unknown error");
    console.error("Razorpay order error:", message);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 502 },
    );
  }
}
