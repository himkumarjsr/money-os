import { NextResponse } from 'next/server'

export async function GET() {
  const keyId = (
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    process.env.RAZORPAY_KEY_ID
  )?.trim()

  if (!keyId) {
    console.error('Razorpay key missing:', {
      hasNextPublic: !!process.env
        .NEXT_PUBLIC_RAZORPAY_KEY_ID,
      hasKeyId: !!process.env.RAZORPAY_KEY_ID
    })
    return NextResponse.json(
      { error: 'Payments are not configured.' },
      { status: 503 }
    )
  }

  console.log('checkout-config OK:', 
    keyId.substring(0, 15))
    
  return NextResponse.json({ keyId })
}
