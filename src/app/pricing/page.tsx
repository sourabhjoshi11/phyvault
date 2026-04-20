'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { openRazorpay } from '@/lib/razorpay'

const PLANS = [
  { id: 'free', name: 'Free', price: 0, period: '', color: '#6B7280', badge: null, features: ['Online view — all subjects', 'Chapter list access', '3-page watermarked preview', 'Important topics list'], cta: 'Current Plan', disabled: true },
  { id: 'per_pdf', name: 'Per Download', price: '₹19–₹49', period: 'per PDF', color: '#06B6D4', badge: 'FLEXIBLE', features: ['Chapter notes PDF — ₹29', 'Short notes — ₹19', 'PYQ Paper — ₹29', 'PYQ Solution — ₹49', 'Important Qs — ₹19'], cta: 'Browse & Buy', disabled: false },
  { id: 'pro_monthly', name: 'Pro', price: 149, period: '/month', color: '#10B981', badge: 'POPULAR', features: ['Unlimited PDF downloads', 'All chapters — all subjects', 'All PYQ papers + solutions', 'Short notes & important Qs', 'Instant access to new content'], cta: 'Get Pro', disabled: false },
  { id: 'annual', name: 'Annual', price: 999, period: '/year', color: '#F59E0B', badge: 'SAVE 44%', features: ['Everything in Pro', 'Save ₹789 vs monthly', '3rd & 4th year content free', 'Priority doubt support', 'Offline download'], cta: 'Best Value', disabled: false },
]

export default function PricingPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(''), 3000)
  }

  async function handlePlan(planId: string) {
    if (planId === 'per_pdf') { window.location.href = '/'; return }
    if (!user) { window.location.href = '/auth/login'; return }

    setLoading(planId)
    try {
      const plan = PLANS.find(p => p.id === planId)
      const amount = typeof plan?.price === 'number' ? plan.price : 0

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
        name: 'PhysioVault',
        description: `${plan?.name} Plan`,
        order_id: order.order_id,
        prefill: { name: user.user_metadata?.full_name || '', email: user.email },
        theme: { color: '#06B6D4' },
        handler: async (response) => {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          })
          if (verifyRes.ok) showToast(`✅ ${plan?.name} Plan activated!`)
        },
      })
    } catch (err: any) {
      showToast('❌ ' + err.message)
    }
    setLoading(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, height: 58, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'rgba(7,9,15,0.9)', backdropFilter: 'blur(18px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => window.location.href = '/'}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#06B6D4,#10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🦴</div>
          <span style={{ fontSize: 16, fontWeight: 800 }}>PhysioVault</span>
        </div>
        {!user && (
          <button onClick={() => window.location.href = '/auth/login'}
            style={{ padding: '7px 15px', borderRadius: 8, border: '1.5px solid var(--border2)', background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 13 }}>
            Login
          </button>
        )}
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: '#06B6D4', fontWeight: 700, marginBottom: 6 }}>Plans & Pricing</div>
          <div style={{ fontSize: 'clamp(24px,4vw,42px)', fontWeight: 900, letterSpacing: -1, marginBottom: 10 }}>Apna Plan Chuniye</div>
          <div style={{ color: 'var(--text2)', fontSize: 15 }}>Per PDF khareedo ya unlimited ke liye subscribe karo</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 16, marginBottom: 40 }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{
              background: 'var(--surface)',
              border: `2px solid ${plan.badge === 'POPULAR' ? plan.color : 'var(--border)'}`,
              borderRadius: 18, padding: 26, position: 'relative', overflow: 'hidden',
              transition: 'all 0.25s'
            }}>
              {plan.badge && (
                <div style={{ position: 'absolute', top: 16, right: 16, padding: '3px 10px', borderRadius: 20, fontSize: 9, fontWeight: 800, letterSpacing: 1, background: plan.color, color: 'white' }}>
                  {plan.badge}
                </div>
              )}
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>{plan.name}</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, marginBottom: 20 }}>
                {plan.price === 0 ? (
                  <span style={{ fontSize: 44, fontWeight: 900, letterSpacing: -2 }}>Free</span>
                ) : typeof plan.price === 'string' ? (
                  <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1 }}>{plan.price}</span>
                ) : (
                  <>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>₹</span>
                    <span style={{ fontSize: 44, fontWeight: 900, letterSpacing: -2 }}>{plan.price}</span>
                  </>
                )}
                <span style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 3 }}>{plan.period}</span>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9, margin: '20px 0' }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, fontWeight: 500 }}>
                    <span style={{ fontWeight: 800, color: plan.color }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={plan.disabled || loading === plan.id}
                onClick={() => handlePlan(plan.id)}
                style={{
                  width: '100%', padding: 12, borderRadius: 10, fontSize: 14, fontWeight: 700,
                  border: `2px solid ${plan.color}`, cursor: plan.disabled ? 'default' : 'pointer',
                  background: 'transparent', color: plan.color, fontFamily: 'Outfit, sans-serif',
                  transition: 'all 0.2s', opacity: plan.disabled ? 0.5 : 1,
                }}
                onMouseEnter={e => { if (!plan.disabled) { (e.target as HTMLButtonElement).style.background = plan.color; (e.target as HTMLButtonElement).style.color = 'white' } }}
                onMouseLeave={e => { if (!plan.disabled) { (e.target as HTMLButtonElement).style.background = 'transparent'; (e.target as HTMLButtonElement).style.color = plan.color } }}
              >
                {loading === plan.id ? 'Loading...' : plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Exam pattern reminder */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 28px' }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>📊 MPMSU Exam Pattern — Yaad rakho</div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: 'var(--text2)' }}>
            <div>✦ 10 VSAQs × 2 marks = <b>20</b></div>
            <div>✦ 5 SAQs × 10 marks = <b>50</b></div>
            <div>✦ 2 Essays × 15 marks = <b>30</b></div>
            <div style={{ color: '#06B6D4', fontWeight: 700 }}>Total = 100 marks theory</div>
          </div>
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', zIndex: 300, background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, padding: '12px 20px', fontSize: 13, fontWeight: 600, color: 'var(--text)', boxShadow: '0 8px 32px rgba(0,0,0,.3)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
