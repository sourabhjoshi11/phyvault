import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin, getSignedUrl, checkSubscription } from '@/lib/supabase-server'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 })
    }

    const noteId = params.id

    const { data: note } = await supabaseAdmin
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .eq('is_active', true)
      .single()

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    if (!note.file_path) {
      return NextResponse.json({ error: 'PDF has not been uploaded yet' }, { status: 404 })
    }

    // Subscription check
    const subscription = await checkSubscription(user.id)
    if (subscription) {
      const signedUrl = await getSignedUrl(note.file_path, 300)
      return NextResponse.json({ url: signedUrl, type: 'subscription' })
    }

    // Individual purchase check
    const { data: purchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_id', noteId)
      .single()

    if (!purchase) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'This PDF must be purchased to access it',
        price: note.price,
      }, { status: 403 })
    }

    const signedUrl = await getSignedUrl(note.file_path, 300)
    return NextResponse.json({ url: signedUrl, type: 'purchased' })

  } catch (error: any) {
    console.error('Note download error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
