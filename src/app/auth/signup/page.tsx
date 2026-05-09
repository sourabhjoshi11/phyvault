'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else if (data.session) {
      // Email confirmation is off — user is directly logged in
      router.push('/')
      router.refresh()
    } else {
      // Email confirmation is on — show check email screen
      setSuccess(true)
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
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

        {/* Google signup */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white text-[#0F172A] font-bold text-sm hover:bg-slate-100 active:bg-slate-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed mb-4"
        >
          {googleLoading ? (
            <span className="animate-spin text-base">⟳</span>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {googleLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-white/[0.08]" />
          <span className="text-xs text-slate-600 font-medium">or</span>
          <div className="flex-1 h-px bg-white/[0.08]" />
        </div>

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
            disabled={loading || googleLoading}
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
