import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyWebhook } from '@/lib/razorpay'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-razorpay-signature') || ''

    // Webhook signature verify karo
    if (!verifyWebhook(body, signature)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
    }

    const event = JSON.parse(body)
    const { event: eventType, payload } = event

    console.log('Razorpay webhook:', eventType)

    switch (eventType) {

      case 'payment.captured': {
        const payment = payload.payment.entity
        // Order update karo
        await supabaseAdmin
          .from('orders')
          .update({ status: 'success', razorpay_payment_id: payment.id })
          .eq('razorpay_order_id', payment.order_id)
        break
      }

      case 'payment.failed': {
        const payment = payload.payment.entity
        await supabaseAdmin
          .from('orders')
          .update({ status: 'failed' })
          .eq('razorpay_order_id', payment.order_id)
        break
      }

      case 'subscription.activated': {
        const sub = payload.subscription.entity
        // Subscription ko active mark karo
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('razorpay_subscription_id', sub.id)
        break
      }

      case 'subscription.cancelled': {
        const sub = payload.subscription.entity
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('razorpay_subscription_id', sub.id)
        break
      }

    }

    return NextResponse.json({ received: true })

  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
