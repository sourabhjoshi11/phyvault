import { NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/supabase-server'

async function isAdmin(): Promise<boolean> {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL
  return adminEmail ? user.email === adminEmail : true
}

export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const [
      { data: subjects }, { data: papers }, { data: notes },
      { data: orders }, { data: profiles }, { data: prices },
    ] = await Promise.all([
      supabaseAdmin.from('subjects').select('*').order('year').order('sort_order'),
      supabaseAdmin.from('papers').select('*').order('exam_year', { ascending: false }),
      supabaseAdmin.from('notes').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('orders').select('*').order('created_at', { ascending: false }).limit(100),
      supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('prices').select('*'),
    ])

    return NextResponse.json({ subjects, papers, notes, orders, profiles, prices })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
