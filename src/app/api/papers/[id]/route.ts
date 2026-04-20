import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin, getSignedUrl, checkSubscription } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Login zaroori hai' }, { status: 401 })
    }

    const paperId = params.id

    // Paper fetch karo
    const { data: paper } = await supabaseAdmin
      .from('papers')
      .select('*, subjects(name)')
      .eq('id', paperId)
      .eq('is_active', true)
      .single()

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found' }, { status: 404 })
    }

    if (!paper.file_path) {
      return NextResponse.json({ error: 'PDF abhi upload nahi hua' }, { status: 404 })
    }

    // Free preview check
    if (paper.is_free_preview) {
      const signedUrl = await getSignedUrl(paper.file_path, 300)
      return NextResponse.json({ url: signedUrl, type: 'free_preview' })
    }

    // Subscription check karo
    const subscription = await checkSubscription(user.id)
    if (subscription) {
      const signedUrl = await getSignedUrl(paper.file_path, 300)
      return NextResponse.json({ url: signedUrl, type: 'subscription' })
    }

    // Individual purchase check karo
    const { data: purchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_id', paperId)
      .single()

    if (!purchase) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Yeh PDF khareedna hoga',
        price: paper.price
      }, { status: 403 })
    }

    // Signed URL generate karo (5 min valid)
    const signedUrl = await getSignedUrl(paper.file_path, 300)

    return NextResponse.json({ url: signedUrl, type: 'purchased' })

  } catch (error: any) {
    console.error('Download error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
