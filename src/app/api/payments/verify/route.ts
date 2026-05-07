import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/supabase-server'
import { verifyPayment } from '@/lib/razorpay'

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 })
    }

    const body = await req.json()
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body

    // Verify HMAC signature
    if (!verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
    }

    // Fetch order
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('user_id', user.id)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Mark order as successful
    await supabaseAdmin
      .from('orders')
      .update({ razorpay_payment_id, status: 'success' })
      .eq('id', order.id)

    if (order.item_type === 'subscription') {
      // Save to subscriptions table, not purchases
      const expiresAt = new Date()
      if (order.item_id === 'pro_monthly') {
        expiresAt.setMonth(expiresAt.getMonth() + 1)
      } else {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      }
      await supabaseAdmin.from('subscriptions').insert({
        user_id: user.id,
        plan: order.item_id,
        status: 'active',
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
    } else {
      // Save individual purchase (paper or note)
      await supabaseAdmin.from('purchases').insert({
        user_id: user.id,
        order_id: order.id,
        item_type: order.item_type,
        item_id: order.item_id,
      })

      // Increment download counter (non-critical)
      if (order.item_type === 'paper') {
        await supabaseAdmin.rpc('increment_downloads', { paper_id: order.item_id }).catch(() => {})
      }
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Verify error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
