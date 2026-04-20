import Razorpay from 'razorpay'
import crypto from 'crypto'

// ── Razorpay Instance ──
export const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ORDER CREATE — PDF Purchase
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function createOrder(amountInRupees: number, receipt: string) {
  const order = await razorpay.orders.create({
    amount: amountInRupees * 100, // paise mein
    currency: 'INR',
    receipt,
    notes: { platform: 'PhysioVault' },
  })
  return order
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PAYMENT VERIFY — HMAC Signature
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function verifyPayment(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const body = orderId + '|' + paymentId
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex')

  return expectedSignature === signature
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WEBHOOK VERIFY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function verifyWebhook(body: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')

  return expectedSignature === signature
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUBSCRIPTION CREATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const PLAN_IDS = {
  pro_monthly: 'plan_pro_monthly',   // Razorpay dashboard mein banao
  annual: 'plan_annual',
}

export async function createSubscription(planId: string) {
  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    total_count: 12,
    quantity: 1,
  })
  return subscription
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FRONTEND CHECKOUT HELPER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  prefill: { name: string; email: string }
  theme: { color: string }
  handler: (response: RazorpayResponse) => void
}

export interface RazorpayResponse {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export function openRazorpay(options: RazorpayOptions) {
  if (typeof window === 'undefined') return
  // @ts-ignore
  const rzp = new window.Razorpay(options)
  rzp.open()
}
