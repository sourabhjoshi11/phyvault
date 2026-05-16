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

    const body = await req.json()
    const { category, filePath, fileSize, subject_id, exam_year, type, note_type, title, price, is_free_preview } = body

    if (category === 'paper') {
      const { data, error } = await supabaseAdmin
        .from('papers')
        .upsert(
          { subject_id, exam_year: parseInt(exam_year), type, file_path: filePath, file_size: fileSize, price: parseInt(price) || 29, is_free_preview: !!is_free_preview, is_active: true },
          { onConflict: 'subject_id,exam_year,type' }
        )
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, paper: data, message: `${exam_year} ${type} uploaded!` })
    }

    if (category === 'note') {
      const { data, error } = await supabaseAdmin
        .from('notes')
        .insert({ subject_id, title, type: note_type, file_path: filePath, file_size: fileSize, price: parseInt(price) || 29, is_active: true })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, note: data, message: `${title} uploaded!` })
    }

    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })

  } catch (error: any) {
    console.error('Upload record error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
