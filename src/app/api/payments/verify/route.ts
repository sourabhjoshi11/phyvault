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
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body

    // HMAC signature verify karo
    const isValid = verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
    }

    // Order fetch karo
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('user_id', user.id)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Order update karo — success
    await supabaseAdmin.from('orders').update({
      razorpay_payment_id,
      status: 'success',
    }).eq('id', order.id)

    // Purchase save karo (content unlock)
    await supabaseAdmin.from('purchases').insert({
      user_id: user.id,
      order_id: order.id,
      item_type: order.item_type,
      item_id: order.item_id,
    })

    // Downloads count badhaao
    if (order.item_type === 'paper') {
      await supabaseAdmin.rpc('increment_downloads', { paper_id: order.item_id })
    }

    return NextResponse.json({ success: true, message: 'Payment verified. Content unlocked.' })

  } catch (error: any) {
    console.error('Verify error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
