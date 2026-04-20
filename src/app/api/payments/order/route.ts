import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { createOrder } from '@/lib/razorpay'

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Login zaroori hai' }, { status: 401 })
    }

    const body = await req.json()
    const { item_type, item_id, amount } = body

    if (!item_type || !item_id || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Amount verify karo database se (tamper-proof)
    let dbAmount = 0
    if (item_type === 'paper') {
      const { data: paper } = await supabase
        .from('papers')
        .select('price')
        .eq('id', item_id)
        .single()
      dbAmount = paper?.price || 0
    } else if (item_type === 'note') {
      const { data: note } = await supabase
        .from('notes')
        .select('price')
        .eq('id', item_id)
        .single()
      dbAmount = note?.price || 0
    }

    if (dbAmount !== amount) {
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
    }

    // Razorpay order create karo
    const receipt = `pvault_${Date.now()}_${user.id.slice(0,8)}`
    const order = await createOrder(amount, receipt)

    // Order save karo database mein
    await supabase.from('orders').insert({
      user_id: user.id,
      razorpay_order_id: order.id,
      item_type,
      item_id,
      amount,
      status: 'pending',
    })

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    })

  } catch (error: any) {
    console.error('Order create error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
