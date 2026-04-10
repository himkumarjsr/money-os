import { NextResponse } from "next/server";

const PLANS = {
  pro: { amountPaise: 49_00, label: "Finkoin Pro" },
  promax: { amountPaise: 99_00, label: "Finkoin Pro Max" },
} as const;

type PlanKey = keyof typeof PLANS;

export async function POST(req: Request) {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return NextResponse.json(
      {
        error:
          "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET (test keys from dashboard).",
      },
      { status: 503 },
    );
  }

  let body: { plan?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body.plan;
  const planKey: PlanKey =
    raw === "promax" ? "promax" : raw === "pro" ? "pro" : "pro";
  const plan = PLANS[planKey];

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount: plan.amountPaise,
      currency: "INR",
      receipt: `finkoin_${planKey}_${Date.now()}`,
      notes: { plan: planKey },
    }),
  });

  if (!orderRes.ok) {
    const errText = await orderRes.text();
    return NextResponse.json(
      { error: "Failed to create Razorpay order", detail: errText },
      { status: 502 },
    );
  }

  const order = (await orderRes.json()) as {
    id: string;
    amount: number;
    currency: string;
  };

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency ?? "INR",
    label: plan.label,
  });
}
