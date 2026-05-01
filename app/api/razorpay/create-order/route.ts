import { NextResponse } from 'next/server'
import Razorpay from 'razorpay'

export async function POST() {
  const keyId = process.env
    .RAZORPAY_KEY_ID?.trim()
  const keySecret = process.env
    .RAZORPAY_KEY_SECRET?.trim()

  console.log('create-order called:', {
    hasKeyId: !!keyId,
    hasSecret: !!keySecret,
    keyPrefix: keyId?.substring(0, 15) 
      || 'MISSING'
  })

  if (!keyId || !keySecret) {
    return NextResponse.json(
      { error: 'Razorpay keys not configured.' },
      { status: 503 }
    )
  }

  try {
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    })

    const order = await razorpay.orders.create({
      amount: 9900,
      currency: 'INR',
      receipt: `finkoin_${Date.now()}`,
      notes: { plan: 'pro' }
    })

    console.log('Order created:', order.id)

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency ?? 'INR'
    })

  } catch (err: any) {
    console.error('Razorpay order error:', 
      JSON.stringify(err))
    
    const message = err?.error?.description 
      || err?.message 
      || 'Unknown error'
      
    return NextResponse.json(
      { 
        error: 'Failed to create order',
        detail: message
      },
      { status: 502 }
    )
  }
}
