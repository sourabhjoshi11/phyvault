import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin, uploadFile } from '@/lib/supabase-server'

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

    const formData = await req.formData()
    const file = formData.get('file') as File
    const category = (formData.get('category') as string) || 'paper'
    const subject_id = formData.get('subject_id') as string

    if (!file || !subject_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!file.name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
    }

    const { data: subject } = await supabaseAdmin
      .from('subjects')
      .select('code')
      .eq('id', subject_id)
      .single()

    const subjectCode = subject?.code?.toLowerCase().replace(/[^a-z0-9]/g, '') || subject_id
    const fileBuffer = await file.arrayBuffer()

    // ── PAPER UPLOAD ──
    if (category === 'paper') {
      const exam_year = parseInt(formData.get('exam_year') as string)
      const type = formData.get('type') as 'question' | 'solution'
      const price = parseInt(formData.get("price") as string); const safePrice = isNaN(price) ? 29 : price
      const is_free_preview = formData.get('is_free_preview') === 'true'

      if (!exam_year || !type) {
        return NextResponse.json({ error: 'exam_year and type are required for papers' }, { status: 400 })
      }

      const filePath = `papers/${subjectCode}/${exam_year}_${type}.pdf`
      await uploadFile(filePath, Buffer.from(fileBuffer), 'application/pdf')

      const { data, error } = await supabaseAdmin
        .from('papers')
        .upsert(
          { subject_id, exam_year, type, file_path: filePath, file_size: file.size, price: safePrice, is_free_preview, is_active: true },
          { onConflict: 'subject_id,exam_year,type' }
        )
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({ success: true, paper: data, file_path: filePath, message: `${exam_year} ${type} uploaded!` })
    }

    // ── NOTE UPLOAD ──
    if (category === 'note') {
      const note_type = formData.get('note_type') as string
      const title = formData.get('title') as string
      const price = parseInt(formData.get("price") as string); const safePrice = isNaN(price) ? 29 : price

      if (!note_type || !title) {
        return NextResponse.json({ error: 'note_type and title are required for notes' }, { status: 400 })
      }

      const slug = title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 40)
      const filePath = `notes/${subjectCode}/${note_type}_${slug}.pdf`
      await uploadFile(filePath, Buffer.from(fileBuffer), 'application/pdf')

      const { data, error } = await supabaseAdmin
        .from('notes')
        .insert({ subject_id, title, type: note_type, file_path: filePath, file_size: file.size, price: safePrice, is_active: true })
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({ success: true, note: data, file_path: filePath, message: `${title} uploaded!` })
    }

    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })

  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
