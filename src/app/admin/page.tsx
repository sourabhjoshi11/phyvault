'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface Subject {
  id: string; name: string; code: string; year: string
  icon: string; color: string; total_marks: number; is_active: boolean
}
interface Paper {
  id: string; subject_id: string; exam_year: number; type: string
  file_path: string | null; price: number; is_free_preview: boolean
  is_active: boolean; downloads: number
}
interface Note {
  id: string; subject_id: string; title: string; type: string
  file_path: string | null; price: number; is_active: boolean; created_at: string
}
interface Order {
  id: string; user_id: string; amount: number; status: string
  item_type: string; created_at: string
}
interface Profile {
  id: string; email: string; full_name: string; created_at: string
}

const NAV_ITEMS = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'upload', icon: '☁️', label: 'Upload PDFs' },
  { id: 'papers', icon: '📄', label: 'PYQ Papers' },
  { id: 'notes', icon: '📝', label: 'Notes' },
  { id: 'subjects', icon: '📚', label: 'Subjects' },
  { id: 'users', icon: '👥', label: 'Users' },
  { id: 'orders', icon: '🧾', label: 'Orders' },
  { id: 'pricing', icon: '💰', label: 'Pricing' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
]

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPass, setLoginPass] = useState('')
  const [loginErr, setLoginErr] = useState('')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [papers, setPapers] = useState<Paper[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [localPrices, setLocalPrices] = useState<Record<string, string>>({})
  const [toast, setToast] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Upload form
  const [upCategory, setUpCategory] = useState<'paper' | 'note'>('paper')
  const [upSubject, setUpSubject] = useState('')
  const [upYear, setUpYear] = useState('2024')
  const [upType, setUpType] = useState('question')
  const [upNoteType, setUpNoteType] = useState('chapter_notes')
  const [upTitle, setUpTitle] = useState('')
  const [upPrice, setUpPrice] = useState('29')
  const [upFree, setUpFree] = useState(false)

  // Add subject form
  const [showAddSubject, setShowAddSubject] = useState(false)
  const [newSubName, setNewSubName] = useState('')
  const [newSubCode, setNewSubCode] = useState('')
  const [newSubYear, setNewSubYear] = useState('y1')
  const [newSubIcon, setNewSubIcon] = useState('📗')
  const [newSubColor, setNewSubColor] = useState('#06B6D4')
  const [newSubMarks, setNewSubMarks] = useState('100')
  const [addingSubject, setAddingSubject] = useState(false)

  useEffect(() => {
    fetch('/api/admin/check')
      .then(r => r.json())
      .then(({ isAdmin }) => {
        if (isAdmin) { setAuthed(true); fetchAll() }
        else { setLoginErr('Please sign in with the admin account.') }
        setAuthLoading(false)
      })
      .catch(() => setAuthLoading(false))
  }, [])

  async function fetchAll() {
    const [
      { data: subs }, { data: paps }, { data: nts },
      { data: ords }, { data: usrs }, { data: prs },
    ] = await Promise.all([
      supabase.from('subjects').select('*').order('year').order('sort_order'),
      supabase.from('papers').select('*').order('exam_year', { ascending: false }),
      supabase.from('notes').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('prices').select('*'),
    ])
    setSubjects(subs || [])
    setPapers(paps || [])
    setNotes(nts || [])
    setOrders(ords || [])
    setUsers(usrs || [])
    const priceMap: Record<string, number> = {}
    ;(prs || []).forEach((p: any) => { priceMap[p.key] = p.value })
    setPrices(priceMap)
    const localMap: Record<string, string> = {}
    Object.entries(priceMap).forEach(([k, v]) => { localMap[k] = String(v) })
    setLocalPrices(localMap)
    if (subs && subs.length > 0) setUpSubject(subs[0].id)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function doLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginErr('')
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass })
    if (error) { setLoginErr(error.message); return }
    const res = await fetch('/api/admin/check')
    const { isAdmin } = await res.json()
    if (!isAdmin) {
      await supabase.auth.signOut()
      setLoginErr('Please sign in with the admin account.')
      return
    }
    setAuthed(true)
    fetchAll()
  }

  async function handleUpload(file: File) {
    if (!file.name.endsWith('.pdf')) { showToast('Only PDF files are allowed'); return }
    if (!upSubject) { showToast('Please select a subject'); return }
    if (upCategory === 'note' && !upTitle.trim()) { showToast('Please enter a title'); return }

    setUploading(true)
    setUploadProgress(0)
    setUploadResult(null)

    const interval = setInterval(() => setUploadProgress(p => Math.min(p + 15, 85)), 200)

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('category', upCategory)
      fd.append('subject_id', upSubject)
      fd.append('price', upPrice)
      if (upCategory === 'paper') {
        fd.append('exam_year', upYear)
        fd.append('type', upType)
        fd.append('is_free_preview', String(upFree))
      } else {
        fd.append('note_type', upNoteType)
        fd.append('title', upTitle)
      }

      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const ct = res.headers.get('content-type') || ''
      const data = ct.includes('application/json') ? await res.json() : { error: await res.text() }

      clearInterval(interval)
      setUploadProgress(100)

      if (res.ok) {
        setUploadResult(`✅ ${data.message}`)
        showToast(`✅ ${data.message}`)
        fetchAll()
      } else {
        setUploadResult(`❌ Error: ${data.error}`)
        showToast(`❌ Upload failed: ${data.error}`)
      }
    } catch (err: any) {
      clearInterval(interval)
      setUploadResult(`❌ Error: ${err.message}`)
      showToast('❌ Upload failed')
    }
    setUploading(false)
  }

  async function savePrice(key: string, value: number) {
    if (!value || value < 0) return
    const res = await fetch('/api/admin/prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
    if (res.ok) {
      setPrices(p => ({ ...p, [key]: value }))
      showToast(`✅ Price updated: ₹${value}`)
    } else {
      showToast('❌ Price update failed')
    }
  }

  async function togglePaper(id: string, current: boolean) {
    await supabase.from('papers').update({ is_active: !current }).eq('id', id)
    setPapers(p => p.map(x => x.id === id ? { ...x, is_active: !current } : x))
    showToast(current ? '⏸ Paper hidden' : '✅ Paper activated')
  }

  async function updatePaperPrice(id: string, price: number) {
    if (!price || price < 0) return
    await supabase.from('papers').update({ price }).eq('id', id)
    setPapers(p => p.map(x => x.id === id ? { ...x, price } : x))
    showToast(`✅ Price updated: ₹${price}`)
  }

  async function toggleNote(id: string, current: boolean) {
    await supabase.from('notes').update({ is_active: !current }).eq('id', id)
    setNotes(n => n.map(x => x.id === id ? { ...x, is_active: !current } : x))
    showToast(current ? '⏸ Note hidden' : '✅ Note activated')
  }

  async function updateNotePrice(id: string, price: number) {
    if (!price || price < 0) return
    await supabase.from('notes').update({ price }).eq('id', id)
    setNotes(n => n.map(x => x.id === id ? { ...x, price } : x))
    showToast(`✅ Price updated: ₹${price}`)
  }

  async function toggleSubject(id: string, current: boolean) {
    await supabase.from('subjects').update({ is_active: !current }).eq('id', id)
    setSubjects(s => s.map(x => x.id === id ? { ...x, is_active: !current } : x))
    showToast(current ? '⏸ Subject hidden' : '✅ Subject activated')
  }

  async function addSubject(e: React.FormEvent) {
    e.preventDefault()
    if (!newSubName || !newSubCode) return
    setAddingSubject(true)
    const { error } = await supabase.from('subjects').insert({
      name: newSubName,
      code: newSubCode.toUpperCase(),
      year: newSubYear,
      icon: newSubIcon,
      color: newSubColor,
      total_marks: parseInt(newSubMarks) || 100,
      sort_order: 999,
      is_active: true,
    })
    setAddingSubject(false)
    if (error) { showToast(`❌ ${error.message}`); return }
    showToast('✅ Subject added!')
    setShowAddSubject(false)
    setNewSubName(''); setNewSubCode(''); setNewSubYear('y1')
    setNewSubIcon('📗'); setNewSubColor('#06B6D4'); setNewSubMarks('100')
    fetchAll()
  }

  const totalRevenue = orders.filter(o => o.status === 'success').reduce((s, o) => s + o.amount, 0)
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString())

  function navClick(id: string) {
    setActiveTab(id)
    setSidebarOpen(false)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#07090F] flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#07090F] flex items-center justify-center p-4">
        <div className="bg-[#111827] border border-white/10 rounded-2xl p-8 w-full max-w-sm">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-2xl mx-auto mb-4">🩺</div>
          <h1 className="text-xl font-black text-center text-white mb-1">Admin Panel</h1>
          <p className="text-sm text-slate-500 text-center mb-6">MedicoseBuddy — Secure Access</p>
          {loginErr && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-red-400 mb-4">⚠️ {loginErr}</div>
          )}
          <form onSubmit={doLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Email</label>
              <input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                placeholder="admin@email.com"
                className="w-full bg-[#1C2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Password</label>
              <input type="password" required value={loginPass} onChange={e => setLoginPass(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1C2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50" />
            </div>
            <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-white font-bold py-2.5 rounded-lg text-sm transition-colors">
              Login →
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#07090F] text-slate-200 flex" style={{ fontFamily: 'Outfit, sans-serif' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 bottom-0 w-56 bg-[#111827] border-r border-white/[0.06] z-40 flex flex-col transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="px-4 py-4 border-b border-white/[0.06] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-sm">🩺</div>
          <div>
            <div className="text-sm font-black text-white">MedicoseBuddy</div>
            <div className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">Admin Panel</div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => navClick(item.id)}
              className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-semibold transition-colors text-left
                ${activeTab === item.id ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
              <span className="text-base">{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/[0.06]">
          <button onClick={async () => { await supabase.auth.signOut(); setAuthed(false) }}
            className="w-full py-2 rounded-lg border border-white/10 text-slate-400 text-xs font-semibold hover:bg-white/5 transition-colors">
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-56 min-h-screen flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 h-14 px-4 flex items-center justify-between border-b border-white/[0.06] bg-[#07090F]/90 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-white/5">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-base font-extrabold">
              {NAV_ITEMS.find(n => n.id === activeTab)?.icon} {NAV_ITEMS.find(n => n.id === activeTab)?.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-400">Live</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6">

          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                {[
                  { icon: '👥', val: users.length, label: 'Users', color: 'border-cyan-500', text: 'text-cyan-400' },
                  { icon: '💰', val: `₹${totalRevenue}`, label: 'Revenue', color: 'border-emerald-500', text: 'text-emerald-400' },
                  { icon: '🧾', val: orders.length, label: 'Orders', color: 'border-amber-500', text: 'text-amber-400' },
                  { icon: '📄', val: papers.filter(p => p.file_path).length, label: 'PDFs', color: 'border-violet-500', text: 'text-violet-400' },
                  { icon: '📝', val: notes.length, label: 'Notes', color: 'border-pink-500', text: 'text-pink-400' },
                  { icon: '🔥', val: todayOrders.length, label: 'Today', color: 'border-orange-500', text: 'text-orange-400' },
                ].map(s => (
                  <div key={s.label} className={`bg-[#111827] rounded-xl p-4 border-t-2 ${s.color} border border-white/[0.06]`}>
                    <div className="text-2xl mb-2">{s.icon}</div>
                    <div className={`text-2xl font-black font-mono ${s.text}`}>{s.val}</div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.06] text-sm font-bold">🧾 Recent Orders</div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {['User', 'Type', 'Amount', 'Status', 'Date'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left border-b border-white/[0.06]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 8).map(o => (
                        <tr key={o.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{o.user_id.slice(0, 8)}…</td>
                          <td className="px-4 py-3"><span className="bg-violet-500/10 text-violet-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{o.item_type}</span></td>
                          <td className="px-4 py-3 font-mono font-bold text-emerald-400">₹{o.amount}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${o.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                              {o.status === 'success' ? '✅ Success' : '⏳ ' + o.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[11px] text-slate-500">{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── UPLOAD ── */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.06] text-sm font-bold">☁️ Upload PDF to Supabase Storage</div>
                <div className="p-5 space-y-4">
                  {/* Category toggle */}
                  <div className="flex gap-2">
                    {(['paper', 'note'] as const).map(cat => (
                      <button key={cat} onClick={() => setUpCategory(cat)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors
                          ${upCategory === cat ? 'bg-cyan-500 text-white' : 'bg-[#1C2333] text-slate-400 hover:text-white border border-white/10'}`}>
                        {cat === 'paper' ? '📄 PYQ Paper' : '📝 Notes'}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Subject</label>
                      <select value={upSubject} onChange={e => setUpSubject(e.target.value)}
                        className="w-full bg-[#1C2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                      </select>
                    </div>

                    {upCategory === 'paper' ? (
                      <>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Exam Year</label>
                          <select value={upYear} onChange={e => setUpYear(e.target.value)}
                            className="w-full bg-[#1C2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
                            {[2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018].map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">File Type</label>
                          <select value={upType} onChange={e => setUpType(e.target.value)}
                            className="w-full bg-[#1C2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
                            <option value="question">PYQ — Question Paper</option>
                            <option value="solution">PYQ — Solution</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Price (₹)</label>
                          <input type="number" value={upPrice} onChange={e => setUpPrice(e.target.value)}
                            className="w-full bg-[#1C2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
                        </div>
                        <div className="flex items-center gap-2 pt-4">
                          <input id="freeP" type="checkbox" checked={upFree} onChange={e => setUpFree(e.target.checked)} className="rounded" />
                          <label htmlFor="freeP" className="text-sm font-semibold text-slate-400 cursor-pointer">Page 1 Free Preview?</label>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Note Type</label>
                          <select value={upNoteType} onChange={e => setUpNoteType(e.target.value)}
                            className="w-full bg-[#1C2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
                            <option value="chapter_notes">Chapter Notes</option>
                            <option value="short_notes">Short Notes</option>
                            <option value="important_qs">Important Questions</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Title</label>
                          <input type="text" value={upTitle} onChange={e => setUpTitle(e.target.value)}
                            placeholder="e.g. Anatomy Chapter 1 Notes"
                            className="w-full bg-[#1C2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Price (₹)</label>
                          <input type="number" value={upPrice} onChange={e => setUpPrice(e.target.value)}
                            className="w-full bg-[#1C2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Drop zone */}
                  <div
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleUpload(f) }}
                    className="border-2 border-dashed border-white/15 rounded-xl p-10 text-center cursor-pointer bg-[#1C2333] hover:border-cyan-500/40 transition-colors">
                    <div className="text-4xl mb-3 opacity-60">📁</div>
                    <div className="text-base font-bold mb-1">Click or drag PDF here</div>
                    <div className="text-xs text-slate-500">PDF only · Max 50MB</div>
                    {uploading && (
                      <div className="mt-4">
                        <div className="text-xs text-slate-400 mb-1.5">Uploading... {uploadProgress}%</div>
                        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />

                  {uploadResult && (
                    <div className={`px-4 py-3 rounded-xl text-sm font-mono ${uploadResult.startsWith('✅') ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                      {uploadResult}
                    </div>
                  )}
                </div>
              </div>

              {/* Upload status per subject */}
              <div className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.06] text-sm font-bold">📋 Upload Status</div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {['Subject', 'Code', 'Year', 'Papers', 'Notes', 'Quick Upload'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left border-b border-white/[0.06]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map(s => {
                        const sPapers = papers.filter(p => p.subject_id === s.id)
                        const sNotes = notes.filter(n => n.subject_id === s.id)
                        return (
                          <tr key={s.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                                <span className="font-semibold text-sm">{s.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-cyan-400">{s.code}</td>
                            <td className="px-4 py-3"><span className="bg-violet-500/10 text-violet-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{s.year}</span></td>
                            <td className="px-4 py-3">
                              <span className={`font-mono text-xs ${sPapers.filter(p => p.file_path).length > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {sPapers.filter(p => p.file_path).length}/{sPapers.length}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-slate-400">{sNotes.length}</td>
                            <td className="px-4 py-3">
                              <button onClick={() => { setUpSubject(s.id); setActiveTab('upload') }}
                                className="bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold px-3 py-1 rounded-lg transition-colors">
                                Upload →
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── PYQ PAPERS ── */}
          {activeTab === 'papers' && (
            <div className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.06] text-sm font-bold">📄 All PYQ Papers</div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {['Subject', 'Year', 'Type', 'File', 'Price', 'Downloads', 'Status', 'Action'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left border-b border-white/[0.06]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {papers.map(p => {
                      const subj = subjects.find(s => s.id === p.subject_id)
                      return (
                        <tr key={p.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-sm font-semibold whitespace-nowrap">{subj?.name || '—'}</td>
                          <td className="px-4 py-3 font-mono font-bold text-cyan-400">{p.exam_year}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.type === 'question' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                              {p.type === 'question' ? '📄 Q' : '✅ Sol'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[10px]">
                            <span className={p.file_path ? 'text-emerald-400' : 'text-slate-500'}>
                              {p.file_path ? '✅ ' + p.file_path.split('/').pop() : '⏳ Pending'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-500 text-xs">₹</span>
                              <input
                                type="number"
                                defaultValue={p.price}
                                onBlur={e => updatePaperPrice(p.id, parseInt(e.target.value))}
                                className="w-16 bg-[#1C2333] border border-white/10 rounded-lg px-2 py-1 text-xs font-mono font-bold text-emerald-400 outline-none focus:border-cyan-500/50 text-center"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.downloads}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                              {p.is_active ? '● Active' : '● Hidden'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => togglePaper(p.id, p.is_active)}
                              className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors ${p.is_active ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'}`}>
                              {p.is_active ? 'Hide' : 'Show'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── NOTES ── */}
          {activeTab === 'notes' && (
            <div className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-sm font-bold">📝 All Notes</span>
                <button onClick={() => { setUpCategory('note'); setActiveTab('upload') }}
                  className="bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                  + Upload Note
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {['Subject', 'Title', 'Type', 'File', 'Price', 'Status', 'Action'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left border-b border-white/[0.06]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {notes.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-sm">
                          No notes uploaded yet. <button onClick={() => { setUpCategory('note'); setActiveTab('upload') }} className="text-cyan-400 underline">Upload the first note</button>
                        </td>
                      </tr>
                    ) : notes.map(n => {
                      const subj = subjects.find(s => s.id === n.subject_id)
                      return (
                        <tr key={n.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-sm font-semibold whitespace-nowrap">{subj?.name || '—'}</td>
                          <td className="px-4 py-3 text-sm max-w-[200px] truncate">{n.title}</td>
                          <td className="px-4 py-3">
                            <span className="bg-pink-500/10 text-pink-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {n.type.replaceAll('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[10px]">
                            <span className={n.file_path ? 'text-emerald-400' : 'text-slate-500'}>
                              {n.file_path ? '✅ ' + n.file_path.split('/').pop() : '⏳ Pending'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-500 text-xs">₹</span>
                              <input
                                type="number"
                                defaultValue={n.price}
                                onBlur={e => updateNotePrice(n.id, parseInt(e.target.value))}
                                className="w-16 bg-[#1C2333] border border-white/10 rounded-lg px-2 py-1 text-xs font-mono font-bold text-emerald-400 outline-none focus:border-cyan-500/50 text-center"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${n.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                              {n.is_active ? '● Active' : '● Hidden'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => toggleNote(n.id, n.is_active)}
                              className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors ${n.is_active ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'}`}>
                              {n.is_active ? 'Hide' : 'Show'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── SUBJECTS ── */}
          {activeTab === 'subjects' && (
            <div className="space-y-4">
              <div className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <span className="text-sm font-bold">📚 All Subjects</span>
                  <button onClick={() => setShowAddSubject(v => !v)}
                    className="bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                    {showAddSubject ? '✕ Cancel' : '+ Add Subject'}
                  </button>
                </div>

                {showAddSubject && (
                  <form onSubmit={addSubject} className="p-5 border-b border-white/[0.06] bg-cyan-500/5">
                    <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3">New Subject</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Subject Name *</label>
                        <input required value={newSubName} onChange={e => setNewSubName(e.target.value)} placeholder="Anatomy"
                          className="w-full bg-[#1C2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Subject Code *</label>
                        <input required value={newSubCode} onChange={e => setNewSubCode(e.target.value)} placeholder="MBBS-101"
                          className="w-full bg-[#1C2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Year</label>
                        <select value={newSubYear} onChange={e => setNewSubYear(e.target.value)}
                          className="w-full bg-[#1C2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
                          <option value="y1">1st Year</option>
                          <option value="y2">2nd Year</option>
                          <option value="y3">3rd Year</option>
                          <option value="y4">4th Year</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Icon (emoji)</label>
                        <input value={newSubIcon} onChange={e => setNewSubIcon(e.target.value)} placeholder="📗"
                          className="w-full bg-[#1C2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Color (hex)</label>
                        <div className="flex gap-2">
                          <input type="color" value={newSubColor} onChange={e => setNewSubColor(e.target.value)}
                            className="w-10 h-9 rounded-lg bg-[#1C2333] border border-white/10 cursor-pointer" />
                          <input value={newSubColor} onChange={e => setNewSubColor(e.target.value)}
                            className="flex-1 bg-[#1C2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none font-mono" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Marks</label>
                        <input type="number" value={newSubMarks} onChange={e => setNewSubMarks(e.target.value)}
                          className="w-full bg-[#1C2333] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
                      </div>
                    </div>
                    <button type="submit" disabled={addingSubject}
                      className="mt-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-white text-sm font-bold px-5 py-2 rounded-lg transition-colors">
                      {addingSubject ? 'Adding…' : 'Add Subject →'}
                    </button>
                  </form>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {['Subject', 'Code', 'Year', 'Marks', 'Status', 'Action'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left border-b border-white/[0.06]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map(s => (
                        <tr key={s.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                              <span className="font-semibold text-sm">{s.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-cyan-400">{s.code}</td>
                          <td className="px-4 py-3"><span className="bg-violet-500/10 text-violet-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{s.year}</span></td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-400">{s.total_marks}M</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                              {s.is_active ? '● Active' : '● Hidden'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => toggleSubject(s.id, s.is_active)}
                              className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors ${s.is_active ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'}`}>
                              {s.is_active ? 'Hide' : 'Show'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {activeTab === 'users' && (
            <div className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-sm font-bold">👥 All Users</span>
                <span className="text-xs text-slate-400">{users.length} total</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {['Name', 'Email', 'Joined'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left border-b border-white/[0.06]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white">
                              {(u.full_name || u.email || 'U')[0].toUpperCase()}
                            </div>
                            <span className="font-semibold text-sm">{u.full_name || 'No name'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">{u.email}</td>
                        <td className="px-4 py-3 text-[11px] text-slate-500">{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── ORDERS ── */}
          {activeTab === 'orders' && (
            <div className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                <span className="text-sm font-bold">🧾 All Orders</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">₹{totalRevenue} total</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {['Order ID', 'Type', 'Amount', 'Status', 'Date'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left border-b border-white/[0.06]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="px-4 py-3 font-mono text-[11px] text-cyan-400">{o.id.slice(0, 8)}…</td>
                        <td className="px-4 py-3"><span className="bg-violet-500/10 text-violet-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{o.item_type}</span></td>
                        <td className="px-4 py-3 font-mono font-bold text-emerald-400">₹{o.amount}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${o.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            {o.status === 'success' ? '✅ Success' : '⏳ ' + o.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-500">{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── PRICING ── */}
          {activeTab === 'pricing' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.06] text-sm font-bold">💰 Per PDF Prices</div>
                <div className="p-5 space-y-1">
                  {[
                    { key: 'chapter_notes', label: 'Chapter Notes PDF', def: 29 },
                    { key: 'short_notes', label: 'Short Notes PDF', def: 29 },
                    { key: 'important_qs', label: 'Important Questions', def: 29 },
                    { key: 'pyq_question', label: 'PYQ Question Paper', def: 29 },
                    { key: 'pyq_solution', label: 'PYQ Solution', def: 29 },
                  ].map(item => (
                    <div key={item.key} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04]">
                      <span className="flex-1 text-sm font-semibold">{item.label}</span>
                      <span className="text-slate-500 font-bold">₹</span>
                      <input type="number"
                        value={localPrices[item.key] ?? String(prices[item.key] ?? item.def)}
                        onChange={e => setLocalPrices(p => ({ ...p, [item.key]: e.target.value }))}
                        onBlur={e => savePrice(item.key, parseInt(e.target.value) || item.def)}
                        className="w-20 bg-[#1C2333] border border-white/10 rounded-lg px-2 py-1.5 text-sm font-mono font-bold text-center text-white outline-none focus:border-cyan-500/50" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.06] text-sm font-bold">👑 Subscription Plans</div>
                <div className="p-5 space-y-1">
                  {[
                    { key: 'pro_monthly', label: 'Pro Plan (Monthly)', def: 149 },
                    { key: 'annual', label: 'Annual Plan', def: 999 },
                  ].map(item => (
                    <div key={item.key} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04]">
                      <span className="flex-1 text-sm font-semibold">{item.label}</span>
                      <span className="text-slate-500 font-bold">₹</span>
                      <input type="number"
                        value={localPrices[item.key] ?? String(prices[item.key] ?? item.def)}
                        onChange={e => setLocalPrices(p => ({ ...p, [item.key]: e.target.value }))}
                        onBlur={e => savePrice(item.key, parseInt(e.target.value) || item.def)}
                        className="w-24 bg-[#1C2333] border border-white/10 rounded-lg px-2 py-1.5 text-sm font-mono font-bold text-center text-white outline-none focus:border-cyan-500/50" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.06] text-sm font-bold">⚙️ Configuration</div>
                <div className="p-5">
                  <p className="text-sm text-slate-400 leading-relaxed mb-4">
                    Environment variables are managed in <code className="bg-[#1C2333] px-1.5 py-0.5 rounded text-xs">.env.local</code>.
                    To update on production, go to Vercel Dashboard → Settings → Environment Variables.
                  </p>
                  <div className="bg-[#1C2333] rounded-xl p-4 font-mono text-[11px] text-slate-500 space-y-1.5">
                    <div>NEXT_PUBLIC_SUPABASE_URL <span className="text-emerald-400">✅</span></div>
                    <div>NEXT_PUBLIC_SUPABASE_ANON_KEY <span className="text-emerald-400">✅</span></div>
                    <div>SUPABASE_SERVICE_ROLE_KEY <span className="text-emerald-400">✅</span></div>
                    <div>RAZORPAY_KEY_ID <span className="text-emerald-400">✅</span></div>
                    <div>RAZORPAY_KEY_SECRET <span className="text-emerald-400">✅</span></div>
                    <div>NEXT_PUBLIC_ADMIN_EMAIL <span className="text-emerald-400">✅</span></div>
                  </div>
                </div>
              </div>
              <div className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/[0.06] text-sm font-bold">📊 Database Stats</div>
                <div className="p-5 space-y-0.5">
                  {[
                    { label: 'Total Subjects', val: subjects.length },
                    { label: 'Active Subjects', val: subjects.filter(s => s.is_active).length },
                    { label: 'Total Papers', val: papers.length },
                    { label: 'Uploaded PDFs', val: papers.filter(p => p.file_path).length },
                    { label: 'Total Notes', val: notes.length },
                    { label: 'Total Users', val: users.length },
                    { label: 'Total Orders', val: orders.length },
                    { label: 'Successful Orders', val: orders.filter(o => o.status === 'success').length },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between py-2.5 border-b border-white/[0.04] text-sm">
                      <span className="text-slate-400">{item.label}</span>
                      <span className="font-mono font-bold text-cyan-400">{item.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[200] bg-[#111827] border border-white/10 rounded-xl px-4 py-3 text-sm font-semibold shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  )
}
