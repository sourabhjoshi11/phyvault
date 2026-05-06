'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.name },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 24, padding: 40, width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>Mail</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Verify Your Email</h2>
          <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
            A verification link has been sent to <b>{form.email}</b>.
            <br />
            Open your inbox and click the link to continue.
          </p>
          <a href="/auth/login" style={{ display: 'inline-block', padding: '12px 28px', borderRadius: 11, background: '#06B6D4', color: 'white', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
            Go to Login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 24, padding: 40, width: '100%', maxWidth: 400, boxShadow: '0 32px 80px rgba(0,0,0,.6)' }}>
        <div style={{ width: 52, height: 52, borderRadius: 15, background: 'linear-gradient(135deg,#06B6D4,#10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 20px' }}>MB</div>
        <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4, textAlign: 'center' }}>Join MedicoseBuddy</h1>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 28, textAlign: 'center' }}>Create a free account and get started</p>

        {error && (
          <div style={{ padding: '10px 13px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 9, fontSize: 13, color: '#EF4444', marginBottom: 13 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSignup}>
          {[
            { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Your full name' },
            { key: 'email', label: 'Email Address', type: 'email', placeholder: 'email@example.com' },
            { key: 'password', label: 'Password', type: 'password', placeholder: 'Min. 8 characters' },
          ].map(field => (
            <div key={field.key} style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>{field.label}</label>
              <input
                type={field.type}
                required
                value={form[field.key as keyof typeof form]}
                onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                minLength={field.key === 'password' ? 8 : undefined}
                style={{ width: '100%', padding: '11px 14px', background: 'var(--surface2)', border: '1.5px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontFamily: 'Outfit, sans-serif', fontSize: 14, outline: 'none' }}
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: 13, borderRadius: 11, fontSize: 15, fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#06B6D4,#0891B2)', color: 'white', fontFamily: 'Outfit, sans-serif', marginTop: 6, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Creating account...' : 'Create Account ->'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text3)' }}>
          Already have an account?{' '}
          <a href="/auth/login" style={{ color: '#06B6D4', fontWeight: 600, textDecoration: 'none' }}>Sign in</a>
        </p>
      </div>
    </div>
  )
}
