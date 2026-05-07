'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { openRazorpay } from '@/lib/razorpay-client'

const PLANS = [
  {
    id: 'free', name: 'Free', price: 0, period: '', color: '#6B7280', badge: null,
    features: ['Online view — all subjects', 'Chapter list access', '3-page watermarked preview', 'Important topics list'],
    cta: 'Current Plan', disabled: true,
  },
  {
    id: 'per_pdf', name: 'Per Download', price: '₹19–₹49', period: 'per PDF', color: '#06B6D4', badge: 'FLEXIBLE',
    features: ['Chapter notes — ₹29', 'Short notes — ₹19', 'PYQ Paper — ₹29', 'PYQ Solution — ₹49', 'Important Qs — ₹19'],
    cta: 'Browse & Buy', disabled: false,
  },
  {
    id: 'pro_monthly', name: 'Pro Monthly', price: 149, period: '/month', color: '#10B981', badge: 'POPULAR',
    features: ['Unlimited PDF downloads', 'All chapters — all subjects', 'All PYQ papers + solutions', 'Short notes & important Qs', 'Instant access to new content'],
    cta: 'Get Pro', disabled: false,
  },
  {
    id: 'annual', name: 'Annual', price: 999, period: '/year', color: '#F59E0B', badge: 'SAVE 44%',
    features: ['Everything in Pro', 'Save ₹789 vs monthly', '3rd & 4th year content free', 'Priority doubt support', 'Offline download'],
    cta: 'Best Value', disabled: false,
  },
]

export default function PricingPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  async function handlePlan(planId: string) {
    if (planId === 'per_pdf') { window.location.href = '/'; return }
    if (!user) { window.location.href = '/auth/login'; return }

    setLoading(planId)
    try {
      const plan = PLANS.find(p => p.id === planId)!
      const amount = typeof plan.price === 'number' ? plan.price : 0

      const res = await fetch('/api/payments/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_type: 'subscription', item_id: planId, amount }),
      })
      const order = await res.json()
      if (!res.ok) throw new Error(order.error)

      openRazorpay({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: 'MedicoseBuddy',
        description: `${plan.name} Plan`,
        order_id: order.order_id,
        prefill: { name: user.user_metadata?.full_name || '', email: user.email },
        theme: { color: '#06B6D4' },
        handler: async (response) => {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          })
          if (verifyRes.ok) showToast(`✅ ${plan.name} Plan activated!`)
          else showToast('❌ Payment verification failed')
        },
      })
    } catch (err: any) {
      showToast('❌ ' + err.message)
    }
    setLoading(null)
  }

  return (
    <div className="min-h-screen bg-[#07090F] text-[#EEF2FF]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-[10px] tracking-[2.5px] uppercase text-cyan-400 font-bold mb-2">Plans & Pricing</div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight mb-2">Choose Your Plan</h1>
          <p className="text-slate-400 text-sm sm:text-[15px]">Buy individual PDFs or subscribe for unlimited access</p>
        </div>

        {/* Pricing grid — 1 col mobile, 2 col tablet, 4 col desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className="relative bg-[#111827] rounded-2xl p-6 overflow-hidden border-2 transition-all duration-200"
              style={{ borderColor: plan.badge === 'POPULAR' ? plan.color : 'rgba(255,255,255,0.06)' }}
            >
              {plan.badge && (
                <div
                  className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest text-white"
                  style={{ background: plan.color }}
                >
                  {plan.badge}
                </div>
              )}

              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">{plan.name}</div>

              <div className="flex items-end gap-1 mb-5">
                {plan.price === 0 ? (
                  <span className="text-4xl font-black">Free</span>
                ) : typeof plan.price === 'string' ? (
                  <span className="text-2xl font-black">{plan.price}</span>
                ) : (
                  <>
                    <span className="text-lg font-bold text-slate-400 mb-1">₹</span>
                    <span className="text-4xl font-black tracking-tight">{plan.price}</span>
                  </>
                )}
                {plan.period && (
                  <span className="text-xs text-slate-500 mb-1 ml-0.5">{plan.period}</span>
                )}
              </div>

              <ul className="flex flex-col gap-2.5 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="font-black mt-0.5 flex-shrink-0" style={{ color: plan.color }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                disabled={plan.disabled || loading === plan.id}
                onClick={() => handlePlan(plan.id)}
                className="w-full py-3 rounded-xl text-sm font-bold border-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-default"
                style={{ borderColor: plan.color, color: plan.color, background: 'transparent' }}
                onMouseEnter={e => { if (!plan.disabled) { const b = e.currentTarget; b.style.background = plan.color; b.style.color = 'white' } }}
                onMouseLeave={e => { if (!plan.disabled) { const b = e.currentTarget; b.style.background = 'transparent'; b.style.color = plan.color } }}
              >
                {loading === plan.id ? 'Loading…' : plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Exam pattern */}
        <div className="bg-[#111827] border border-white/[0.06] rounded-2xl p-6">
          <div className="font-black text-base mb-4">📊 MPMSU Exam Pattern</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-slate-400">
            {[
              ['10 VSAQs', '× 2 marks', '= 20'],
              ['5 SAQs', '× 10 marks', '= 50'],
              ['2 Essays', '× 15 marks', '= 30'],
              ['Total', 'Theory', '100 marks'],
            ].map(([a, b, c]) => (
              <div key={a} className="bg-[#1C2333] rounded-xl p-3">
                <div className="font-bold text-slate-200 mb-0.5">{a}</div>
                <div className="text-xs text-slate-500">{b}</div>
                <div className="text-xs font-bold text-cyan-400 mt-1">{c}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-[#111827] border border-white/10 rounded-xl px-5 py-3 text-sm font-semibold shadow-2xl whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
