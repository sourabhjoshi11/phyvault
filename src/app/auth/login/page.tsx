'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 24, padding: 40, width: '100%', maxWidth: 400, boxShadow: '0 32px 80px rgba(0,0,0,.6)' }}>
        {/* Logo */}
        <div style={{ width: 52, height: 52, borderRadius: 15, background: 'linear-gradient(135deg,#06B6D4,#10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 20px' }}>🦴</div>
        <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4, textAlign: 'center' }}>Welcome Back 👋</h1>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 28, textAlign: 'center' }}>Apne PhysioVault account mein login karein</p>

        {error && (
          <div style={{ padding: '10px 13px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 9, fontSize: 13, color: '#EF4444', marginBottom: 13 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>Email Address</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
              style={{ width: '100%', padding: '11px 14px', background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontFamily: 'Outfit, sans-serif', fontSize: 14, outline: 'none' }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>Password</label>
            <input
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '11px 14px', background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontFamily: 'Outfit, sans-serif', fontSize: 14, outline: 'none' }}
            />
          </div>
          <button
            type="submit" disabled={loading}
            style={{ width: '100%', padding: 13, borderRadius: 11, fontSize: 15, fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#06B6D4,#0891B2)', color: 'white', fontFamily: 'Outfit, sans-serif', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Login ho raha hai...' : 'Login Karein →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text3)' }}>
          Account nahi hai?{' '}
          <a href="/auth/signup" style={{ color: '#06B6D4', fontWeight: 600, textDecoration: 'none' }}>Register karein</a>
        </p>
      </div>
    </div>
  )
}
