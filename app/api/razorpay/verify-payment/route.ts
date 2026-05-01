import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

type VerifyBody = {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret) {
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

  const { error: dbError } = await supabaseAdmin
    .from("users")
    .update({
      subscription_tier: "pro",
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
