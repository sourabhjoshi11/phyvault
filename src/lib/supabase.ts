import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ── Client side (browser mein use karo) ──
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Client Component ke liye ──
export const createBrowserClient = () => createClientComponentClient()

// ── Server Component ke liye ──
export const createServerClient = () =>
  createServerComponentClient({ cookies })

// ── Admin operations ke liye (Service Role) ──
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STORAGE HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const BUCKET = 'physiovault-files'

// Signed URL generate karo (5 min valid)
export async function getSignedUrl(filePath: string, expiresIn = 300) {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresIn)

  if (error) throw error
  return data.signedUrl
}

// File upload karo (admin only)
export async function uploadFile(
  filePath: string,
  file: File | Buffer,
  contentType = 'application/pdf'
) {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(filePath, file, {
      contentType,
      upsert: true,
    })

  if (error) throw error
  return data
}

// File delete karo
export async function deleteFile(filePath: string) {
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .remove([filePath])

  if (error) throw error
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DATABASE HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// User ka purchase check karo
export async function checkPurchase(userId: string, itemId: string) {
  const { data } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('item_id', itemId)
    .single()

  return !!data
}

// Active subscription check karo
export async function checkSubscription(userId: string) {
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gte('expires_at', new Date().toISOString())
    .single()

  return data
}
