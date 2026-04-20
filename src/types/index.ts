// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DATABASE TYPES — Supabase tables ke saath match karta hai
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface Subject {
  id: string
  name: string
  code: string
  year: 'y1' | 'y2' | 'y3' | 'y4'
  icon: string
  color: string
  description: string
  theory_marks: number
  practical_marks: number
  internal_marks: number
  viva_marks: number
  total_marks: number
  is_active: boolean
  created_at: string
}

export interface Chapter {
  id: string
  subject_id: string
  name: string
  chapter_number: number
  topics: string[]
  is_active: boolean
}

export interface Paper {
  id: string
  subject_id: string
  exam_year: number
  type: 'question' | 'solution'
  file_path: string | null   // Supabase storage path
  file_size: number | null
  pages: number | null
  price: number
  is_free_preview: boolean
  is_active: boolean
  downloads: number
  created_at: string
}

export interface Note {
  id: string
  subject_id: string
  chapter_id: string | null
  type: 'chapter_notes' | 'short_notes' | 'important_qs'
  title: string
  file_path: string | null
  file_size: number | null
  pages: number | null
  price: number
  is_active: boolean
  downloads: number
  created_at: string
}

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  created_at: string
}

export interface Order {
  id: string
  user_id: string
  razorpay_order_id: string
  razorpay_payment_id: string | null
  item_type: 'paper' | 'note' | 'subscription'
  item_id: string
  amount: number
  status: 'pending' | 'success' | 'failed'
  created_at: string
}

export interface Purchase {
  id: string
  user_id: string
  order_id: string
  item_type: 'paper' | 'note'
  item_id: string
  created_at: string
}

export interface Subscription {
  id: string
  user_id: string
  plan: 'pro_monthly' | 'annual'
  razorpay_subscription_id: string
  status: 'active' | 'cancelled' | 'expired'
  starts_at: string
  expires_at: string
  created_at: string
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UI TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type Year = 'y1' | 'y2' | 'y3' | 'y4'

export interface YearInfo {
  id: Year
  label: string
  color: string
  marks: number
  subjects: number
}

export interface PricingPlan {
  id: string
  name: string
  price: number | string
  period: string
  color: string
  badge: string | null
  features: string[]
  cta: string
  disabled: boolean
}

export interface PayItem {
  id: string
  name: string
  price: number
  type: 'paper' | 'note' | 'subscription'
}
