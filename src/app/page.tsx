'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Subject, Year } from '@/types'

// ── Syllabus Data (DB se aane tak fallback) ──
const YEARS = [
  { id: 'y1' as Year, label: '1st Year', color: '#06B6D4', marks: 900, subjects: 5 },
  { id: 'y2' as Year, label: '2nd Year', color: '#10B981', marks: 800, subjects: 6 },
  { id: 'y3' as Year, label: '3rd Year', color: '#F59E0B', marks: 900, subjects: 6 },
  { id: 'y4' as Year, label: '4th Year', color: '#EF4444', marks: 900, subjects: 7 },
]

export default function HomePage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [activeYear, setActiveYear] = useState<Year>('y1')
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [subjectsError, setSubjectsError] = useState('')

  useEffect(() => {
    // Auth check
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    // Subjects fetch
    fetchSubjects('y1')
  }, [])

  async function fetchSubjects(year: Year) {
    setLoading(true)
    setSubjectsError('')
    try {
      const res = await fetch(`/api/subjects?year=${year}`, {
        cache: 'no-store',
      })
      const payload = await res.json()

      if (!res.ok) {
        throw new Error(payload.error || 'Failed to load subjects')
      }

      setSubjects(payload.subjects || [])
      setLoading(false)
      return
    } catch (error: any) {
      console.error('Subjects fetch error:', error)
      setSubjects([])
      setSubjectsError(error.message || 'Failed to load subjects')
      setLoading(false)
    }
  }

  function switchYear(year: Year) {
    setActiveYear(year)
    fetchSubjects(year)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100, height: 62,
        padding: '0 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', borderBottom: '1px solid var(--border)',
        background: 'rgba(7,9,15,0.9)', backdropFilter: 'blur(18px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg,#06B6D4,#10B981)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16
          }}>🦴</div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.4 }}>PhysioVault</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500, letterSpacing: 0.5 }}>BPT Study Platform</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {user ? (
            <button
              onClick={() => supabase.auth.signOut()}
              style={{ padding: '7px 15px', borderRadius: 8, border: '1.5px solid var(--border2)', background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 13 }}
            >Logout</button>
          ) : (
            <>
              <button
                onClick={() => window.location.href = '/auth/login'}
                style={{ padding: '7px 15px', borderRadius: 8, border: '1.5px solid var(--border2)', background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 13 }}
              >Login</button>
              <button
                onClick={() => window.location.href = '/auth/signup'}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#06B6D4', color: 'white', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 13 }}
              >Sign Up Free</button>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '72px 28px 60px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 13px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(6,182,212,.1)', border: '1px solid rgba(6,182,212,.25)', color: '#06B6D4', marginBottom: 18, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          For BPT Students
        </div>
        <h1 style={{ fontSize: 'clamp(32px,4.5vw,54px)', fontWeight: 900, lineHeight: 1.08, letterSpacing: -1.5, marginBottom: 18 }}>
          Crack Your BPT<br />Exams with <span style={{ color: '#06B6D4' }}>Smart</span><br />Notes &amp; PYQs
        </h1>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border2)', fontSize: 12, color: 'var(--text2)', marginBottom: 28, fontWeight: 500 }}>
          🎓 MP Medical Science University, Jabalpur
        </div>
        <p style={{ fontSize: 16, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 32, maxWidth: 460 }}>
          Built around the official MPMSU syllabus with chapter-wise notes, previous year papers, and solutions in one place.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => document.getElementById('subjects')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ padding: '13px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', background: '#06B6D4', color: 'white', fontFamily: 'Outfit, sans-serif' }}
          >Browse Subjects →</button>
          <button
            onClick={() => window.location.href = '/pricing'}
            style={{ padding: '13px 28px', borderRadius: 12, fontSize: 15, fontWeight: 600, border: '1.5px solid var(--border2)', cursor: 'pointer', background: 'transparent', color: 'var(--text)', fontFamily: 'Outfit, sans-serif' }}
          >View Plans</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 28, marginTop: 40, flexWrap: 'wrap' }}>
          {[['11', 'Total Subjects'], ['60+', 'Chapter Notes'], ['55+', 'PYQ Papers'], ['4', 'Years Covered']].map(([num, label]) => (
            <div key={label}>
              <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1 }}>{num}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SUBJECTS SECTION ── */}
      <div id="subjects" style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px 60px' }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: '#06B6D4', fontWeight: 700, marginBottom: 6 }}>MPMSU BPT Syllabus</div>
          <div style={{ fontSize: 'clamp(20px,3vw,32px)', fontWeight: 900, letterSpacing: -0.7, marginBottom: 8 }}>All Subjects</div>
          <div style={{ color: 'var(--text2)', fontSize: 14 }}>4 years · 11 subjects in one place</div>
        </div>

        {/* Year Pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
          {YEARS.map(y => (
            <button
              key={y.id}
              onClick={() => switchYear(y.id)}
              style={{
                padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                border: `1.5px solid ${activeYear === y.id ? y.color : 'var(--border)'}`,
                cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                background: activeYear === y.id ? y.color : 'var(--surface)',
                color: activeYear === y.id ? 'white' : 'var(--text2)',
                transition: 'all 0.2s',
              }}
            >
              {y.label} <span style={{ fontSize: 10, opacity: 0.75 }}>({y.subjects} sub)</span>
            </button>
          ))}
        </div>

        {/* Subject Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 12 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ background: 'var(--surface)', borderRadius: 16, padding: '20px 17px', height: 160, opacity: 0.4, animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : subjectsError ? (
          <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#FCA5A5', borderRadius: 14, padding: '18px 20px', fontSize: 14, lineHeight: 1.6 }}>
            Subjects could not be loaded.
            <br />
            {subjectsError}
          </div>
        ) : subjects.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)', borderRadius: 14, padding: '18px 20px', fontSize: 14, lineHeight: 1.6 }}>
            No subjects are available for this year yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))', gap: 12 }}>
            {subjects.map(s => (
              <div
                key={s.id}
                onClick={() => window.location.href = `/subjects/${s.id}`}
                style={{
                  background: 'var(--surface)', border: `1.5px solid var(--border)`,
                  borderRadius: 16, padding: '20px 17px', cursor: 'pointer',
                  transition: 'all 0.22s', position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget
                  el.style.transform = 'translateY(-4px)'
                  el.style.borderColor = s.color
                  el.style.boxShadow = '0 4px 30px rgba(0,0,0,.55)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget
                  el.style.transform = 'translateY(0)'
                  el.style.borderColor = 'var(--border)'
                  el.style.boxShadow = 'none'
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.color }} />
                <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text3)', marginBottom: 4, fontWeight: 500 }}>{s.code}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 5, lineHeight: 1.35 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 13, lineHeight: 1.45 }}>{s.description}</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 600, background: 'rgba(6,182,212,.1)', color: '#06B6D4' }}>💯 {s.total_marks}M</span>
                  {s.practical_marks > 0 && <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 600, background: 'var(--surface2)', color: 'var(--text3)' }}>🔬 Practical</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '28px 24px', textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
        PhysioVault · MP Medical Science University, Jabalpur · BPT Study Platform · Session 2016-17 Onwards
      </div>
    </div>
  )
}
