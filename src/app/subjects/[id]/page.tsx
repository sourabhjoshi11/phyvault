'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { openRazorpay } from '@/lib/razorpay'
import type { Subject, Paper, Note } from '@/types'

export default function SubjectPage({ params }: { params: { id: string } }) {
  const [subject, setSubject] = useState<Subject | null>(null)
  const [papers, setPapers] = useState<Paper[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [purchases, setPurchases] = useState<string[]>([])
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('pyq')
  const [loading, setLoading] = useState(true)
  const [payLoading, setPayLoading] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    async function fetchSubject() {
      const { data: sub } = await supabase.from('subjects').select('*').eq('id', params.id).single()
      setSubject(sub)
      const { data: paps } = await supabase.from('papers').select('*').eq('subject_id', params.id).eq('is_active', true).order('exam_year', { ascending: false })
      setPapers(paps || [])
      const { data: nts } = await supabase.from('notes').select('*').eq('subject_id', params.id).eq('is_active', true)
      setNotes(nts || [])
      setLoading(false)
    }

    async function fetchPurchases(userId: string) {
      const { data } = await supabase.from('purchases').select('item_id').eq('user_id', userId)
      setPurchases((data || []).map((p: any) => p.item_id))
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) fetchPurchases(user.id)
    })
    fetchSubject()
  }, [params.id])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleDownload(itemId: string, itemType: 'paper' | 'note') {
    if (!user) { window.location.href = '/auth/login'; return }

    setPayLoading(itemId)
    try {
      const endpoint = itemType === 'paper' ? `/api/papers/${itemId}` : `/api/notes/${itemId}`
      const res = await fetch(endpoint)
      const data = await res.json()

      if (res.ok) {
        window.open(data.url, '_blank')
        showToast('⬇️ PDF download ho raha hai...')
      } else if (res.status === 403) {
        // Need to purchase
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
    if (!user) { window.location.href = '/auth/login'; return }

    try {
      // Create Razorpay order
      const res = await fetch('/api/payments/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_type: itemType, item_id: itemId, amount }),
      })
      const order = await res.json()
      if (!res.ok) throw new Error(order.error)

      // Open Razorpay checkout
      openRazorpay({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: 'PhysioVault',
        description: subject?.name || 'BPT Study Material',
        order_id: order.order_id,
        prefill: { name: user.user_metadata?.full_name || '', email: user.email },
        theme: { color: '#06B6D4' },
        handler: async (response) => {
          // Verify payment
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          })
          if (verifyRes.ok) {
            setPurchases(p => [...p, itemId])
            showToast('✅ Payment successful! Content unlock ho gaya.')
          }
        },
      })
    } catch (err: any) {
      showToast('❌ Payment error: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text3)', fontSize: 14 }}>Loading...</div>
      </div>
    )
  }

  if (!subject) return <div style={{ padding: 40, color: 'var(--text3)' }}>Subject not found</div>

  // Group papers by year
  const years = Array.from(new Set(papers.map(p => p.exam_year))).sort((a, b) => b - a)

  const TABS = [
    { id: 'pyq', label: '📄 PYQ Papers' },
    { id: 'notes', label: '📖 Chapter Notes' },
    { id: 'short', label: '📋 Short Notes' },
    { id: 'imp', label: '❓ Important Qs' },
    { id: 'pattern', label: '📊 Exam Pattern' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, height: 58, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'rgba(7,9,15,0.9)', backdropFilter: 'blur(18px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => window.location.href = '/'}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#06B6D4,#10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🦴</div>
          <span style={{ fontSize: 16, fontWeight: 800 }}>PhysioVault</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>
          <span>{subject.icon}</span>
          <span>{subject.name}</span>
          <span style={{ color: 'var(--text3)' }}>·</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#06B6D4', fontSize: 11 }}>{subject.code}</span>
        </div>
      </nav>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>

        {/* Back */}
        <button onClick={() => window.history.back()} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 13px', borderRadius: 9, background: 'var(--surface2)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text2)', fontFamily: 'Outfit, sans-serif', marginBottom: 22 }}>
          ← Back
        </button>

        {/* Subject Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 52 }}>{subject.icon}</div>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text3)', marginBottom: 3, fontWeight: 600 }}>{subject.code} · MP Medical Science University, Jabalpur</div>
            <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, marginBottom: 4 }}>{subject.name}</div>
            <div style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 10 }}>{subject.description}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { label: `Total: ${subject.total_marks}M`, hi: true },
                { label: `Theory: ${subject.theory_marks}`, hi: false },
                subject.practical_marks > 0 && { label: `Practical: ${subject.practical_marks}`, hi: false },
                subject.viva_marks > 0 && { label: `Viva: ${subject.viva_marks}`, hi: false },
                { label: `Internal: ${subject.internal_marks}`, hi: false },
              ].filter(Boolean).map((pill: any) => (
                <span key={pill.label} style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: pill.hi ? 'rgba(6,182,212,.1)' : 'var(--surface2)', color: pill.hi ? '#06B6D4' : 'var(--text3)' }}>
                  {pill.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 3, background: 'var(--surface2)', borderRadius: 11, padding: 4, width: 'fit-content', marginBottom: 26, flexWrap: 'wrap' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ padding: '8px 15px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', transition: 'all 0.17s', background: activeTab === tab.id ? 'var(--surface)' : 'transparent', color: activeTab === tab.id ? 'var(--text)' : 'var(--text3)', boxShadow: activeTab === tab.id ? '0 2px 10px rgba(0,0,0,.4)' : 'none' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── PYQ TAB ── */}
        {activeTab === 'pyq' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 16 }}>
            {years.length === 0 && (
              <div style={{ padding: 40, color: 'var(--text3)', fontSize: 14 }}>⏳ PYQ papers abhi upload nahi hue. Jald aa rahe hain!</div>
            )}
            {years.map(yr => {
              const question = papers.find(p => p.exam_year === yr && p.type === 'question')
              const solution = papers.find(p => p.exam_year === yr && p.type === 'solution')

              return (
                <div key={yr} style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 20, overflow: 'hidden', transition: 'all 0.25s' }}>
                  <div style={{ height: 3, background: `linear-gradient(90deg,${subject.color},transparent)` }} />
                  <div style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 40, fontWeight: 700, color: subject.color, lineHeight: 1 }}>{yr}</div>
                      {question?.is_free_preview && <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 9, fontWeight: 800, background: 'rgba(16,185,129,.12)', color: '#10B981', border: '1px solid rgba(16,185,129,.2)' }}>1 PAGE FREE</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>Annual Examination · MPMSU Jabalpur</div>

                    {/* Question Paper Row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 18 }}>📄</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>Question Paper</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>100 marks · Theory · {question?.pages || '~3'} pages</div>
                      </div>
                      {question?.file_path ? (
                        purchases.includes(question.id) ? (
                          <button onClick={() => handleDownload(question.id, 'paper')} disabled={payLoading === question.id}
                            style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: 'rgba(16,185,129,.15)', color: '#10B981', fontFamily: 'Outfit, sans-serif' }}>
                            ⬇ Download
                          </button>
                        ) : question.is_free_preview ? (
                          <button onClick={() => handleDownload(question.id, 'paper')}
                            style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: 'rgba(16,185,129,.15)', color: '#10B981', fontFamily: 'Outfit, sans-serif' }}>
                            👁 Free Preview
                          </button>
                        ) : (
                          <button onClick={() => initPayment(question.id, 'paper', question.price)} disabled={payLoading === question.id}
                            style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: '#06B6D4', color: 'white', fontFamily: 'Outfit, sans-serif' }}>
                            {payLoading === question.id ? '...' : `₹${question.price} Buy`}
                          </button>
                        )
                      ) : (
                        <span style={{ fontSize: 10, color: 'var(--text3)', fontStyle: 'italic' }}>Coming soon</span>
                      )}
                    </div>

                    {/* Solution Row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
                      <span style={{ fontSize: 18 }}>✅</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>Complete Solution</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>Detailed answers · {solution?.pages || '~8'} pages</div>
                      </div>
                      {solution?.file_path ? (
                        purchases.includes(solution.id) ? (
                          <button onClick={() => handleDownload(solution.id, 'paper')} disabled={payLoading === solution.id}
                            style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: 'rgba(16,185,129,.15)', color: '#10B981', fontFamily: 'Outfit, sans-serif' }}>
                            ⬇ Download
                          </button>
                        ) : (
                          <button onClick={() => initPayment(solution.id, 'paper', solution.price)} disabled={payLoading === solution.id}
                            style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: '#F59E0B', color: 'white', fontFamily: 'Outfit, sans-serif' }}>
                            {payLoading === solution.id ? '...' : `₹${solution.price} Solution`}
                          </button>
                        )
                      ) : (
                        <span style={{ fontSize: 10, color: 'var(--text3)', fontStyle: 'italic' }}>Coming soon</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── NOTES TAB ── */}
        {(activeTab === 'notes' || activeTab === 'short' || activeTab === 'imp') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notes.filter(n =>
              activeTab === 'notes' ? n.type === 'chapter_notes' :
              activeTab === 'short' ? n.type === 'short_notes' : n.type === 'important_qs'
            ).map((note, i) => {
              const bought = purchases.includes(note.id)
              return (
                <div key={note.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text3)', minWidth: 24, paddingTop: 2, fontWeight: 600 }}>{String(i + 1).padStart(2, '0')}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{note.title}</div>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'var(--surface2)', color: 'var(--text3)' }}>{note.pages || '~'} pages</span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'var(--surface2)', color: 'var(--text3)' }}>PDF</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                    {note.file_path ? (
                      bought ? (
                        <button onClick={() => handleDownload(note.id, 'note')}
                          style={{ padding: '7px 13px', borderRadius: 9, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', background: 'rgba(16,185,129,.15)', color: '#10B981', fontFamily: 'Outfit, sans-serif' }}>
                          ⬇ Download
                        </button>
                      ) : (
                        <button onClick={() => initPayment(note.id, 'note', note.price)}
                          style={{ padding: '7px 13px', borderRadius: 9, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', background: '#F59E0B', color: 'white', fontFamily: 'Outfit, sans-serif' }}>
                          ₹{note.price} Buy
                        </button>
                      )
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>Coming soon</span>
                    )}
                  </div>
                </div>
              )
            })}
            {notes.filter(n => activeTab === 'notes' ? n.type === 'chapter_notes' : activeTab === 'short' ? n.type === 'short_notes' : n.type === 'important_qs').length === 0 && (
              <div style={{ padding: 40, color: 'var(--text3)', fontSize: 14, textAlign: 'center' }}>⏳ Yeh content abhi upload nahi hua. Jald aa raha hai!</div>
            )}
          </div>
        )}

        {/* ── EXAM PATTERN TAB ── */}
        {activeTab === 'pattern' && (
          <div style={{ maxWidth: 600 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 24px', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>📊 Theory Exam Pattern — {subject.theory_marks} Marks (University)</div>
              {[
                { type: 'Very Short Answer (50–60 words)', count: 10, each: 2, total: 20 },
                { type: 'Short Answer (250–300 words)', count: 5, each: 10, total: 50 },
                { type: 'Essay Type (450–500 words)', count: 2, each: 15, total: 30 },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ flex: 1, color: 'var(--text2)' }}>{row.type}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 12, minWidth: 20, textAlign: 'center' }}>×{row.count}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#06B6D4', fontWeight: 600, minWidth: 60 }}>{row.each} marks</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: '#10B981', minWidth: 30, textAlign: 'right' }}>{row.total}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, padding: '10px 0', fontWeight: 700 }}>
                <span style={{ flex: 1 }}>Total University Theory</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, color: '#06B6D4' }}>100</span>
              </div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 24px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📝 Internal Assessment</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.9 }}>
                • Theory Internal: <b>{Math.min(subject.internal_marks, 20)} marks</b><br />
                {subject.practical_marks > 0 && <>• Practical Internal: <b>20 marks</b><br /></>}
                {subject.viva_marks > 0 && <>• Viva: <b>{subject.viva_marks} marks</b> (University)<br /></>}
                <span style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6, display: 'block' }}>
                  Pass ke liye Theory + Viva mein minimum 50% zaroori hai.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)', zIndex: 300, background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12, padding: '12px 20px', fontSize: 13, fontWeight: 600, color: 'var(--text)', boxShadow: '0 8px 32px rgba(0,0,0,.3)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
