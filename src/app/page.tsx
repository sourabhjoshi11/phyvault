'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import type { Subject, Year } from '@/types'

const YEARS = [
  { id: 'y1' as Year, label: '1st Year', color: '#06B6D4', subjects: 5 },
  { id: 'y2' as Year, label: '2nd Year', color: '#10B981', subjects: 6 },
  { id: 'y3' as Year, label: '3rd Year', color: '#F59E0B', subjects: 6 },
  { id: 'y4' as Year, label: '4th Year', color: '#EF4444', subjects: 7 },
]

export default function HomePage() {
  const router = useRouter()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [activeYear, setActiveYear] = useState<Year>('y1')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { fetchSubjects('y1') }, [])

  async function fetchSubjects(year: Year) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/subjects?year=${year}`, { cache: 'no-store' })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Failed to load subjects')
      setSubjects(payload.subjects || [])
    } catch (e: any) {
      setSubjects([])
      setError(e.message || 'Failed to load subjects')
    } finally {
      setLoading(false)
    }
  }

  function switchYear(year: Year) {
    setActiveYear(year)
    fetchSubjects(year)
  }

  return (
    <div className="min-h-screen bg-[#07090F] text-[#EEF2FF]">
      <Navbar />

      {/* ── HERO ── */}
      <section className="max-w-6xl mx-auto px-4 pt-10 pb-10 sm:pt-16 sm:pb-14">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 mb-5 uppercase tracking-widest">
          MBBS · BPT · Medical Students
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-[52px] font-black leading-[1.1] tracking-tight mb-5">
          Your All-in-One<br />
          Medical Exam{' '}
          <span className="text-cyan-400">Study</span>
          <br />
          Companion
        </h1>

        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#111827] border border-white/[0.08] text-xs text-slate-400 mb-5 font-medium">
          🎓 MP Medical Science University, Jabalpur
        </div>

        <p className="text-sm sm:text-[15px] text-slate-400 leading-relaxed mb-7 max-w-sm sm:max-w-md">
          Smart notes, previous year question papers &amp; detailed solutions for MBBS, BPT and all medical programs — built around the official MPMSU syllabus.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => document.getElementById('subjects')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-6 py-3 rounded-xl text-[15px] font-bold bg-cyan-500 text-white hover:bg-cyan-400 active:bg-cyan-600 transition-colors"
          >
            Browse Subjects →
          </button>
          <Link href="/pricing"
            className="px-6 py-3 rounded-xl text-[15px] font-semibold border border-white/10 text-slate-200 hover:bg-white/5 active:bg-white/10 transition-colors">
            View Plans
          </Link>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-8 mt-10">
          {[['24', 'Total Subjects'], ['60+', 'Chapter Notes'], ['55+', 'PYQ Papers'], ['4', 'Years Covered']].map(([n, l]) => (
            <div key={l}>
              <div className="text-2xl font-black tracking-tight">{n}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-medium">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SUBJECTS ── */}
      <section id="subjects" className="max-w-6xl mx-auto px-4 pb-16">
        <div className="mb-7">
          <div className="text-[10px] tracking-[2.5px] uppercase text-cyan-400 font-bold mb-1">MPMSU Syllabus</div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight mb-1">All Subjects</div>
          <div className="text-slate-400 text-sm">4 years · 24 subjects in one place</div>
        </div>

        {/* Year pills — horizontal scroll on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none -mx-4 px-4">
          {YEARS.map(y => (
            <button
              key={y.id}
              onClick={() => switchYear(y.id)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-150"
              style={{
                borderColor: activeYear === y.id ? y.color : 'rgba(255,255,255,0.08)',
                background: activeYear === y.id ? y.color : 'transparent',
                color: activeYear === y.id ? 'white' : '#94A3B8',
              }}
            >
              {y.label}
              <span className="ml-1 opacity-60 text-[10px]">({y.subjects})</span>
            </button>
          ))}
        </div>

        {/* Subject grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-[#111827] rounded-2xl h-44 animate-pulse opacity-30" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-500/[0.07] border border-red-500/20 text-red-300 rounded-xl p-4 text-sm leading-relaxed">
            ⚠️ {error}
          </div>
        ) : subjects.length === 0 ? (
          <div className="bg-[#111827] border border-white/[0.06] text-slate-400 rounded-xl p-6 text-sm text-center">
            No subjects available for this year yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subjects.map(s => (
              <button
                key={s.id}
                onClick={() => router.push(`/subjects/${s.id}`)}
                className="text-left bg-[#111827] border border-white/[0.06] rounded-2xl p-5 hover:-translate-y-1 hover:shadow-2xl hover:border-white/10 active:scale-[0.98] transition-all duration-200 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: s.color }} />
                <div className="text-3xl mb-3">{s.icon}</div>
                <div className="font-mono text-[10px] text-slate-500 mb-1 font-medium tracking-wider">{s.code}</div>
                <div className="text-sm font-bold mb-2 leading-snug">{s.name}</div>
                <div className="text-xs text-slate-500 mb-4 leading-relaxed line-clamp-2">{s.description}</div>
                <div className="flex gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/10 text-cyan-400">
                    💯 {s.total_marks}M
                  </span>
                  {s.practical_marks > 0 && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white/[0.04] text-slate-500">
                      🔬 Practical
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.06] py-6 text-center text-slate-600 text-xs px-4">
        MedicoseBuddy · MP Medical Science University, Jabalpur · Medical Study Platform
      </footer>
    </div>
  )
}
