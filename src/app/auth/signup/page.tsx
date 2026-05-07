'use client'

import { useState } from 'react'
import Link from 'next/link'
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
      <div className="min-h-screen bg-[#07090F] flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm bg-[#111827] border border-white/[0.08] rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-xl font-black mb-2">Check Your Email</h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            We sent a verification link to <span className="text-slate-200 font-medium">{form.email}</span>.
            Click it to activate your account.
          </p>
          <Link href="/auth/login"
            className="inline-block px-6 py-3 rounded-xl bg-cyan-500 text-white font-bold text-sm hover:bg-cyan-400 transition-colors">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#07090F] flex flex-col items-center justify-center px-4 py-10">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-sm font-bold text-white">MB</div>
        <span className="text-lg font-extrabold tracking-tight">MedicoseBuddy</span>
      </Link>

      <div className="w-full max-w-sm bg-[#111827] border border-white/[0.08] rounded-2xl p-7">
        <h1 className="text-xl font-black mb-1 text-center">Join MedicoseBuddy</h1>
        <p className="text-sm text-slate-400 text-center mb-6">Create your free account</p>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/[0.08] border border-red-500/20 rounded-xl text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          {[
            { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Your full name' },
            { key: 'email', label: 'Email Address', type: 'email', placeholder: 'you@example.com' },
            { key: 'password', label: 'Password', type: 'password', placeholder: 'Min. 8 characters' },
          ].map(field => (
            <div key={field.key}>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                {field.label}
              </label>
              <input
                type={field.type}
                required
                value={form[field.key as keyof typeof form]}
                onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                minLength={field.key === 'password' ? 8 : undefined}
                className="w-full px-4 py-3 bg-[#1C2333] border border-white/[0.08] rounded-xl text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-white font-bold text-sm disabled:opacity-60 disabled:cursor-not-allowed hover:from-cyan-400 hover:to-cyan-300 active:from-cyan-600 active:to-cyan-500 transition-all mt-1"
          >
            {loading ? 'Creating account…' : 'Create Account →'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-5">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-cyan-400 font-semibold hover:text-cyan-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
