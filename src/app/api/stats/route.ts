import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
  const [subjectsRes, notesRes, papersRes, yearCountsRes] = await Promise.all([
    supabaseAdmin.from('subjects').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabaseAdmin.from('notes').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabaseAdmin.from('papers').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabaseAdmin.from('subjects').select('year').eq('is_active', true),
  ])

  const yearCounts: Record<string, number> = {}
  ;(yearCountsRes.data || []).forEach((s: any) => {
    yearCounts[s.year] = (yearCounts[s.year] || 0) + 1
  })

  return NextResponse.json({
    subjects: subjectsRes.count ?? 0,
    notes: notesRes.count ?? 0,
    papers: papersRes.count ?? 0,
    yearCounts,
  })
}
