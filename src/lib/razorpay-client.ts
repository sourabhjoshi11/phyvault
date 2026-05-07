// Browser-safe Razorpay helpers — safe to import in client components

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
  // @ts-ignore — loaded via <script> in layout.tsx
  const rzp = new window.Razorpay(options)
  rzp.open()
}
