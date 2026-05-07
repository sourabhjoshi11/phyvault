'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

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
    <div className="min-h-screen bg-[#07090F] flex flex-col items-center justify-center px-4 py-10">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-sm font-bold text-white">MB</div>
        <span className="text-lg font-extrabold tracking-tight">MedicoseBuddy</span>
      </Link>

      <div className="w-full max-w-sm bg-[#111827] border border-white/[0.08] rounded-2xl p-7">
        <h1 className="text-xl font-black mb-1 text-center">Welcome back</h1>
        <p className="text-sm text-slate-400 text-center mb-6">Sign in to your account</p>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/[0.08] border border-red-500/20 rounded-xl text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-[#1C2333] border border-white/[0.08] rounded-xl text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-[#1C2333] border border-white/[0.08] rounded-xl text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-white font-bold text-sm disabled:opacity-60 disabled:cursor-not-allowed hover:from-cyan-400 hover:to-cyan-300 active:from-cyan-600 active:to-cyan-500 transition-all mt-1"
          >
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-5">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-cyan-400 font-semibold hover:text-cyan-300">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  )
}
