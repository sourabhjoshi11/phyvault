'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface NavbarProps {
  breadcrumb?: string
}

export function Navbar({ breadcrumb }: NavbarProps) {
  const [user, setUser] = useState<any>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#07090F]/90 backdrop-blur-lg">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              MB
            </div>
            <span className="text-[15px] font-extrabold tracking-tight">MedicoseBuddy</span>
          </Link>
          {breadcrumb && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span>/</span>
              <span className="truncate max-w-[180px]">{breadcrumb}</span>
            </div>
          )}
        </div>

        {/* Desktop auth */}
        <div className="hidden sm:flex gap-2">
          {user ? (
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-4 py-1.5 rounded-lg border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5 transition-colors"
            >
              Logout
            </button>
          ) : (
            <>
              <Link href="/auth/login" className="px-4 py-1.5 rounded-lg border border-white/10 text-slate-300 text-sm font-semibold hover:bg-white/5 transition-colors">
                Login
              </Link>
              <Link href="/auth/signup" className="px-4 py-1.5 rounded-lg bg-cyan-500 text-white text-sm font-bold hover:bg-cyan-400 transition-colors">
                Sign Up Free
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen(o => !o)}
          className="sm:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Toggle menu"
        >
          <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
            {open ? (
              <path d="M2 2L18 14M2 14L18 2" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" />
            ) : (
              <path d="M0 1H20M0 8H20M0 15H20" stroke="#94A3B8" strokeWidth="1.6" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {open && (
        <div className="sm:hidden px-4 py-3 flex flex-col gap-2 border-t border-white/[0.06] bg-[#07090F]">
          {user ? (
            <button
              onClick={() => { supabase.auth.signOut(); setOpen(false) }}
              className="w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold active:bg-white/5"
            >
              Logout
            </button>
          ) : (
            <>
              <Link href="/auth/login" onClick={() => setOpen(false)}
                className="block w-full py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm font-semibold text-center active:bg-white/5">
                Login
              </Link>
              <Link href="/auth/signup" onClick={() => setOpen(false)}
                className="block w-full py-2.5 rounded-xl bg-cyan-500 text-white text-sm font-bold text-center active:bg-cyan-400">
                Sign Up Free
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
