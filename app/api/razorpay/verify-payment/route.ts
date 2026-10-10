import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { supabaseAdmin } from "@/lib/supabaseServer";

type VerifyBody = {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

export async function POST(req: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !secret) {
    return NextResponse.json({ error: "Razorpay is not configured on the server." }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    data: { user },
    error: userErr,
  } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: VerifyBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = body.razorpay_order_id?.trim();
  const paymentId = body.razorpay_payment_id?.trim();
  const signature = body.razorpay_signature?.trim();

  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "Missing payment verification fields." }, { status: 400 });
  }

  const payload = `${orderId}|${paymentId}`;
  const expectedHex = createHmac("sha256", secret).update(payload).digest("hex");

  const a = Buffer.from(expectedHex, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Invalid payment signature." }, { status: 400 });
  }

  // The signature proves the payment is real, not whose it is: only the
  // account that created the order (create-order puts its id in the notes)
  // may be upgraded by it.
  let order: { amount?: number | string; currency?: string; notes?: unknown };
  try {
    const razorpay = new Razorpay({ key_id: keyId, key_secret: secret });
    order = await razorpay.orders.fetch(orderId);
  } catch (err) {
    console.error("Razorpay order fetch failed:", err);
    return NextResponse.json({ error: "Could not confirm the payment. Please try again." }, { status: 502 });
  }
  const notes = (order.notes ?? {}) as Record<string, unknown>;
  if (notes.user_id !== user.id) {
    return NextResponse.json({ error: "This payment belongs to a different account." }, { status: 403 });
  }

  // Proof of purchase (GST / refunds); the unique payment id makes a replay
  // of the same payment a no-op.
  const { error: payErr } = await supabaseAdmin.from("payments").insert({
    user_id: user.id,
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    amount_paise: Number(order.amount) || 0,
    currency: order.currency ?? "INR",
    plan: typeof notes.plan === "string" ? notes.plan : "pro",
  });
  if (payErr && payErr.code !== "23505") {
    // 42P01: payments table not migrated yet — the owner check above still
    // holds, so don't block a paying user over the missing record.
    console.error("Payment record insert failed:", payErr.message);
    if (payErr.code !== "42P01") {
      return NextResponse.json({ error: "Could not save the payment. Please contact support." }, { status: 500 });
    }
  }

  const { error: dbError } = await supabaseAdmin
    .from("users")
    .update({
      subscription_tier: "pro",
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (dbError) {
    console.error("Pro upgrade failed:", dbError.message);
    return NextResponse.json({ error: "Could not activate Pro. Please contact support." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
