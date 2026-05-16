import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/supabase-server'

const BUCKET = 'medicosebuddy-files'

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
    const { category, subject_id, exam_year, type, note_type, title } = body

    if (!subject_id || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: subject } = await supabaseAdmin
      .from('subjects')
      .select('code')
      .eq('id', subject_id)
      .single()

    const subjectCode = subject?.code?.toLowerCase().replace(/[^a-z0-9]/g, '') || subject_id

    let filePath: string
    if (category === 'paper') {
      if (!exam_year || !type) {
        return NextResponse.json({ error: 'exam_year and type required for papers' }, { status: 400 })
      }
      filePath = `papers/${subjectCode}/${exam_year}_${type}.pdf`
    } else if (category === 'note') {
      if (!note_type || !title) {
        return NextResponse.json({ error: 'note_type and title required for notes' }, { status: 400 })
      }
      const slug = title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 40)
      filePath = `notes/${subjectCode}/${note_type}_${slug}.pdf`
    } else {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(filePath, { upsert: true })

    if (error) throw error

    return NextResponse.json({ signedUrl: data.signedUrl, filePath })

  } catch (error: any) {
    console.error('Upload URL error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
