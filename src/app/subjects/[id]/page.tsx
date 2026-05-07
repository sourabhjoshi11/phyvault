'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { openRazorpay } from '@/lib/razorpay-client'
import type { Subject, Paper, Note } from '@/types'

const TABS = [
  { id: 'pyq', label: '📄 PYQ Papers' },
  { id: 'notes', label: '📖 Chapter Notes' },
  { id: 'short', label: '📋 Short Notes' },
  { id: 'imp', label: '❓ Important Qs' },
  { id: 'pattern', label: '📊 Exam Pattern' },
]

export default function SubjectPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [subject, setSubject] = useState<Subject | null>(null)
  const [papers, setPapers] = useState<Paper[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [purchases, setPurchases] = useState<string[]>([])
  const [hasSubscription, setHasSubscription] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('pyq')
  const [loading, setLoading] = useState(true)
  const [payLoading, setPayLoading] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // Fetch purchases
        const { data: purcs } = await supabase.from('purchases').select('item_id').eq('user_id', user.id)
        setPurchases((purcs || []).map((p: any) => p.item_id))

        // Check subscription
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .gte('expires_at', new Date().toISOString())
          .single()
        setHasSubscription(!!sub)
      }

      // Fetch subject data
      const { data: sub } = await supabase.from('subjects').select('*').eq('id', params.id).single()
      setSubject(sub)
      const { data: paps } = await supabase.from('papers').select('*').eq('subject_id', params.id).eq('is_active', true).order('exam_year', { ascending: false })
      setPapers(paps || [])
      const { data: nts } = await supabase.from('notes').select('*').eq('subject_id', params.id).eq('is_active', true)
      setNotes(nts || [])
      setLoading(false)
    }
    init()
  }, [params.id])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleDownload(itemId: string, itemType: 'paper' | 'note') {
    if (!user) { router.push('/auth/login'); return }

    setPayLoading(itemId)
    try {
      const endpoint = itemType === 'paper' ? `/api/papers/${itemId}` : `/api/notes/${itemId}`
      const res = await fetch(endpoint)
      const data = await res.json()

      if (res.ok) {
        window.open(data.url, '_blank')
        showToast('⬇ Opening PDF…')
      } else if (res.status === 403) {
        await initPayment(itemId, itemType, data.price)
      } else {
        showToast('❌ ' + (data.error || 'Something went wrong'))
      }
    } catch {
      showToast('❌ Error occurred')
    }
    setPayLoading(null)
  }

  async function initPayment(itemId: string, itemType: string, amount: number) {
    if (!user) { router.push('/auth/login'); return }

    try {
      const res = await fetch('/api/payments/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_type: itemType, item_id: itemId, amount }),
      })
      const order = await res.json()
      if (!res.ok) throw new Error(order.error)

      openRazorpay({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: 'MedicoseBuddy',
        description: subject?.name || 'Study Material',
        order_id: order.order_id,
        prefill: { name: user.user_metadata?.full_name || '', email: user.email },
        theme: { color: '#06B6D4' },
        handler: async (response) => {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          })
          if (verifyRes.ok) {
            setPurchases(p => [...p, itemId])
            showToast('✅ Payment successful — content unlocked!')
          }
        },
      })
    } catch (err: any) {
      showToast('❌ ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090F]">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  if (!subject) {
    return (
      <div className="min-h-screen bg-[#07090F]">
        <Navbar />
        <div className="text-center py-20 text-slate-400">Subject not found.</div>
      </div>
    )
  }

  const canAccess = (itemId: string) => hasSubscription || purchases.includes(itemId)
  const years = Array.from(new Set(papers.map(p => p.exam_year))).sort((a, b) => b - a)
  const filteredNotes = (type: string) => notes.filter(n => n.type === type)

  const DownloadBtn = ({ itemId, itemType, price, free }: { itemId: string; itemType: 'paper' | 'note'; price: number; free?: boolean }) => {
    const accessible = canAccess(itemId)
    if (accessible || free) {
      return (
        <button
          onClick={() => handleDownload(itemId, itemType)}
          disabled={payLoading === itemId}
          className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 active:bg-emerald-500/30 transition-colors disabled:opacity-50"
        >
          {payLoading === itemId ? '…' : (free && !accessible ? '👁 Preview' : '⬇ Download')}
        </button>
      )
    }
    return (
      <button
        onClick={() => initPayment(itemId, itemType, price)}
        disabled={payLoading === itemId}
        className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-cyan-500 text-white hover:bg-cyan-400 active:bg-cyan-600 transition-colors disabled:opacity-50"
      >
        {payLoading === itemId ? '…' : `₹${price} Buy`}
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-[#07090F] text-[#EEF2FF]">
      <Navbar breadcrumb={subject.name} />

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-6"
        >
          ← Back
        </button>

        {/* Subject header */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-7 pb-7 border-b border-white/[0.06]">
          <div className="text-5xl sm:text-6xl flex-shrink-0">{subject.icon}</div>
          <div>
            <div className="font-mono text-[10px] text-slate-500 mb-1 font-medium tracking-wider">
              {subject.code} · MPMSU Jabalpur
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight mb-1">{subject.name}</h1>
            <p className="text-sm text-slate-400 mb-3 leading-relaxed">{subject.description}</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: `Total: ${subject.total_marks}M`, hi: true },
                { label: `Theory: ${subject.theory_marks}M` },
                subject.practical_marks > 0 && { label: `Practical: ${subject.practical_marks}M` },
                subject.viva_marks > 0 && { label: `Viva: ${subject.viva_marks}M` },
                { label: `Internal: ${subject.internal_marks}M` },
              ].filter(Boolean).map((pill: any) => (
                <span
                  key={pill.label}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
                  style={{
                    background: pill.hi ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.04)',
                    color: pill.hi ? '#06B6D4' : '#4A5568',
                  }}
                >
                  {pill.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Subscription banner */}
        {hasSubscription && (
          <div className="mb-6 px-4 py-3 bg-emerald-500/[0.08] border border-emerald-500/20 rounded-xl text-sm text-emerald-400 font-medium">
            ✅ Active subscription — all content unlocked
          </div>
        )}

        {/* Tab bar — scrollable on mobile */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none -mx-4 px-4 mb-6 pb-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 whitespace-nowrap"
              style={{
                background: activeTab === tab.id ? '#1C2333' : 'transparent',
                color: activeTab === tab.id ? '#EEF2FF' : '#4A5568',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── PYQ TAB ── */}
        {activeTab === 'pyq' && (
          <div>
            {years.length === 0 ? (
              <EmptyState msg="PYQ papers have not been uploaded yet." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {years.map(yr => {
                  const question = papers.find(p => p.exam_year === yr && p.type === 'question')
                  const solution = papers.find(p => p.exam_year === yr && p.type === 'solution')
                  return (
                    <div key={yr} className="bg-[#111827] border border-white/[0.06] rounded-2xl overflow-hidden">
                      <div className="h-[2px]" style={{ background: `linear-gradient(90deg,${subject.color},transparent)` }} />
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-1">
                          <div className="font-mono text-3xl font-black" style={{ color: subject.color }}>{yr}</div>
                          {question?.is_free_preview && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              FREE PREVIEW
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mb-4">Annual Examination · MPMSU Jabalpur</div>

                        {/* Question row */}
                        <div className="flex items-center gap-3 py-3 border-b border-white/[0.05]">
                          <span className="text-lg">📄</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold">Question Paper</div>
                            <div className="text-[10px] text-slate-500">100 marks · ~3 pages</div>
                          </div>
                          {question?.file_path
                            ? <DownloadBtn itemId={question.id} itemType="paper" price={question.price} free={question.is_free_preview} />
                            : <span className="text-[10px] text-slate-600 italic">Coming soon</span>
                          }
                        </div>

                        {/* Solution row */}
                        <div className="flex items-center gap-3 pt-3">
                          <span className="text-lg">✅</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold">Complete Solution</div>
                            <div className="text-[10px] text-slate-500">Detailed answers · ~8 pages</div>
                          </div>
                          {solution?.file_path
                            ? <DownloadBtn itemId={solution.id} itemType="paper" price={solution.price} />
                            : <span className="text-[10px] text-slate-600 italic">Coming soon</span>
                          }
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── NOTES TABS ── */}
        {(activeTab === 'notes' || activeTab === 'short' || activeTab === 'imp') && (
          <div className="flex flex-col gap-2">
            {(() => {
              const type = activeTab === 'notes' ? 'chapter_notes' : activeTab === 'short' ? 'short_notes' : 'important_qs'
              const list = filteredNotes(type)
              if (list.length === 0) return <EmptyState msg="This content has not been uploaded yet." />
              return list.map((note, i) => (
                <div key={note.id} className="bg-[#111827] border border-white/[0.06] rounded-xl px-4 py-3.5 flex items-center gap-3">
                  <span className="font-mono text-[11px] text-slate-600 font-semibold w-5 flex-shrink-0 text-right">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold leading-snug">{note.title}</div>
                    <div className="flex gap-1.5 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-500">{note.pages || '~'} pages</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-500">PDF</span>
                    </div>
                  </div>
                  {note.file_path
                    ? <DownloadBtn itemId={note.id} itemType="note" price={note.price} />
                    : <span className="text-[10px] text-slate-600 italic">Coming soon</span>
                  }
                </div>
              ))
            })()}
          </div>
        )}

        {/* ── EXAM PATTERN TAB ── */}
        {activeTab === 'pattern' && (
          <div className="max-w-xl flex flex-col gap-4">
            <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5">
              <div className="text-sm font-bold mb-4">📊 Theory Exam — {subject.theory_marks} Marks (University)</div>
              {[
                { type: 'Very Short Answer (50–60 words)', count: 10, each: 2, total: 20 },
                { type: 'Short Answer (250–300 words)', count: 5, each: 10, total: 50 },
                { type: 'Essay (450–500 words)', count: 2, each: 15, total: 30 },
              ].map(row => (
                <div key={row.type} className="flex items-center gap-3 py-2.5 border-b border-white/[0.05] text-sm">
                  <span className="flex-1 text-slate-400 text-xs">{row.type}</span>
                  <span className="font-mono text-xs text-slate-500">×{row.count}</span>
                  <span className="font-mono text-xs text-cyan-400 font-semibold w-14 text-right">{row.each}M each</span>
                  <span className="font-mono text-xs text-emerald-400 font-bold w-8 text-right">{row.total}</span>
                </div>
              ))}
              <div className="flex items-center gap-3 pt-3 text-sm font-bold">
                <span className="flex-1">Total Theory</span>
                <span className="font-mono text-cyan-400 text-base">100M</span>
              </div>
            </div>

            <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5">
              <div className="text-sm font-bold mb-3">📝 Internal Assessment</div>
              <div className="text-sm text-slate-400 leading-8">
                Theory Internal: <span className="text-slate-200 font-semibold">{Math.min(subject.internal_marks, 20)}M</span>
                {subject.practical_marks > 0 && <><br />Practical Internal: <span className="text-slate-200 font-semibold">20M</span></>}
                {subject.viva_marks > 0 && <><br />Viva (University): <span className="text-slate-200 font-semibold">{subject.viva_marks}M</span></>}
              </div>
              <p className="text-xs text-slate-500 mt-3">Minimum 50% in Theory + Viva required to pass.</p>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-[#111827] border border-white/10 rounded-xl px-5 py-3 text-sm font-semibold shadow-2xl whitespace-nowrap animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-8 text-center text-slate-500 text-sm">
      {msg}
    </div>
  )
}
