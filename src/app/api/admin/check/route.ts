import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ isAdmin: false })

    const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL
    const isAdmin = adminEmail ? user.email === adminEmail : true

    return NextResponse.json({ isAdmin, email: user.email })
  } catch {
    return NextResponse.json({ isAdmin: false })
  }
}
