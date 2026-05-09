import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/supabase-server'

async function isAdmin(): Promise<boolean> {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL
  return adminEmail ? user.email === adminEmail : true
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { action, id, value } = await req.json()

    switch (action) {
      case 'toggle_paper':
        await supabaseAdmin.from('papers').update({ is_active: value }).eq('id', id)
        break
      case 'toggle_note':
        await supabaseAdmin.from('notes').update({ is_active: value }).eq('id', id)
        break
      case 'toggle_subject':
        await supabaseAdmin.from('subjects').update({ is_active: value }).eq('id', id)
        break
      case 'update_paper_price':
        await supabaseAdmin.from('papers').update({ price: value }).eq('id', id)
        break
      case 'update_note_price':
        await supabaseAdmin.from('notes').update({ price: value }).eq('id', id)
        break
      case 'add_subject':
        await supabaseAdmin.from('subjects').insert({ ...value })
        break
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Admin action error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
