import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Subjects are public data — anon key is sufficient and avoids SUPABASE_SERVICE_ROLE_KEY dependency
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const year = req.nextUrl.searchParams.get('year')

    let query = supabase
      .from('subjects')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (year) {
      query = query.eq('year', year)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ subjects: data ?? [] })
  } catch (error: any) {
    console.error('Subjects API error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to load subjects' },
      { status: 500 }
    )
  }
}
