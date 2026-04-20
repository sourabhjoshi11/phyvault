import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const { searchParams, origin } = new URL(req.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    if (code) {
      const supabase = createServerClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        console.error('Auth callback error:', error.message)
        return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
      }
    }

    return NextResponse.redirect(`${origin}${next}`)
  } catch (err) {
    console.error('Callback route error:', err)
    return NextResponse.json({ error: 'Auth callback failed' }, { status: 500 })
  }
}
