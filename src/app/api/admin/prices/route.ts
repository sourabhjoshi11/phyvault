import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/supabase-server'

async function isAdmin(): Promise<boolean> {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL
  if (adminEmail) return user.email === adminEmail
  return true
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { key, value } = await req.json()
    if (!key || value === undefined || value < 0) {
      return NextResponse.json({ error: 'Invalid key or value' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('prices')
      .upsert({ key, value }, { onConflict: 'key' })

    if (error) throw error

    return NextResponse.json({ success: true, key, value })
  } catch (error: any) {
    console.error('Price update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
