import { NextResponse } from 'next/server'

export async function GET() {
  const keyId = (
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    process.env.RAZORPAY_KEY_ID
  )?.trim()

  if (!keyId) {
    return NextResponse.json(
      { 
        error: 'Payments are not configured. ' +
          'Missing NEXT_PUBLIC_RAZORPAY_KEY_ID.' 
      },
      { status: 503 }
    )
  }

  return NextResponse.json({ keyId })
}
