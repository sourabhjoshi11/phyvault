import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/supabase-server'
import { createOrder } from '@/lib/razorpay'

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 })
    }

    const body = await req.json()
    const { item_type, item_id, amount } = body

    if (!item_type || !item_id || amount === undefined || amount === null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify amount from DB — use supabaseAdmin to bypass RLS
    let dbAmount: number | null = null
    if (item_type === 'paper') {
      const { data: paper } = await supabaseAdmin
        .from('papers').select('price').eq('id', item_id).single()
      if (paper) dbAmount = Number(paper.price)
    } else if (item_type === 'note') {
      const { data: note } = await supabaseAdmin
        .from('notes').select('price').eq('id', item_id).single()
      if (note) dbAmount = Number(note.price)
    } else if (item_type === 'subscription') {
      const { data: priceRow } = await supabaseAdmin
        .from('prices').select('value').eq('key', item_id).single()
      if (priceRow) dbAmount = Number(priceRow.value)
    }

    if (dbAmount === null) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (dbAmount !== Number(amount)) {
      return NextResponse.json({ error: `Amount mismatch: expected ₹${dbAmount}` }, { status: 400 })
    }

    // Free item — record purchase directly, no Razorpay needed
    if (dbAmount === 0) {
      await supabaseAdmin.from('purchases').insert({
        user_id: user.id,
        item_type,
        item_id,
        amount: 0,
        razorpay_order_id: null,
        razorpay_payment_id: null,
      })
      return NextResponse.json({ free: true })
    }

    // Razorpay order create karo
    const receipt = `medico_${Date.now()}_${user.id.slice(0, 8)}`
    const order = await createOrder(amount, receipt)

    // Order save karo — supabaseAdmin use karo
    await supabaseAdmin.from('orders').insert({
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

