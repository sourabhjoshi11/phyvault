"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

// ── Types ──
interface Subject {
  id: string;
  name: string;
  code: string;
  year: string;
  icon: string;
  color: string;
  total_marks: number;
  is_active: boolean;
}
interface Paper {
  id: string;
  subject_id: string;
  exam_year: number;
  type: string;
  file_path: string | null;
  price: number;
  is_free_preview: boolean;
  is_active: boolean;
  downloads: number;
}
interface Order {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  item_type: string;
  created_at: string;
}
interface Profile {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

const NAV_ITEMS = [
  { id: "dashboard", icon: "📊", label: "Dashboard" },
  { id: "upload", icon: "☁️", label: "Upload PDFs" },
  { id: "papers", icon: "📄", label: "PYQ Papers" },
  { id: "subjects", icon: "📚", label: "Subjects" },
  { id: "users", icon: "👥", label: "Users" },
  { id: "orders", icon: "🧾", label: "Orders" },
  { id: "pricing", icon: "💰", label: "Pricing" },
  { id: "settings", icon: "⚙️", label: "Settings" },
];

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [toast, setToast] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Upload form state
  const [upSubject, setUpSubject] = useState("");
  const [upYear, setUpYear] = useState("2024");
  const [upType, setUpType] = useState("question");
  const [upPrice, setUpPrice] = useState("29");
  const [upFree, setUpFree] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        setAuthed(true);
        fetchAll();
      } else if (user) {
        setLoginErr("Admin account se login karein.");
      }
      setAuthLoading(false);
    });
  }, []);

  async function fetchAll() {
    const [
      { data: subs },
      { data: paps },
      { data: ords },
      { data: usrs },
      { data: prs },
    ] = await Promise.all([
      supabase.from("subjects").select("*").order("year").order("sort_order"),
      supabase
        .from("papers")
        .select("*")
        .order("exam_year", { ascending: false }),
      supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("prices").select("*"),
    ]);
    setSubjects(subs || []);
    setPapers(paps || []);
    setOrders(ords || []);
    setUsers(usrs || []);
    const priceMap: Record<string, number> = {};
    (prs || []).forEach((p: any) => {
      priceMap[p.key] = p.value;
    });
    setPrices(priceMap);
    if (subs && subs.length > 0) setUpSubject(subs[0].id);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  // ── LOGIN ──
  async function doLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginErr("");
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPass,
    });
    if (error) {
      setLoginErr(error.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
      await supabase.auth.signOut();
      setLoginErr("Admin account se login karein.");
      setAuthed(false);
      return;
    }

    setAuthed(true);
    fetchAll();
  }

  // ── UPLOAD ──
  async function handleUpload(file: File) {
    if (!file.name.endsWith(".pdf")) {
      showToast("❌ Sirf PDF files allowed");
      return;
    }
    if (!upSubject) {
      showToast("❌ Subject chunno");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    try {
      const subj = subjects.find((s) => s.id === upSubject);
      const subjCode =
        subj?.code?.toLowerCase().replace("bpt-", "") || "unknown";
      const filePath = `papers/${subjCode}/${upYear}_${upType}.pdf`;

      // Simulate progress
      const interval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + 15, 85));
      }, 200);

      // Upload to Supabase Storage via API
      const formData = new FormData();
      formData.append("file", file);
      formData.append("subject_id", upSubject);
      formData.append("exam_year", upYear);
      formData.append("type", upType);
      formData.append("price", upPrice);
      formData.append("is_free_preview", String(upFree));

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await res.json()
        : { error: await res.text() };

      clearInterval(interval);
      setUploadProgress(100);

      if (res.ok) {
        setUploadResult(`✅ Uploaded: ${filePath}`);
        showToast("✅ PDF upload successful!");
        fetchAll();
      } else {
        setUploadResult(`❌ Error: ${data.error}`);
        showToast("❌ Upload failed: " + data.error);
      }
    } catch (err: any) {
      setUploadResult("❌ Error: " + err.message);
      showToast("❌ Upload failed");
    }
    setUploading(false);
  }

  // ── SAVE PRICES ──
  async function savePrice(key: string, value: number) {
    await supabase.from("prices").upsert({ key, value });
    showToast(`✅ Price updated: ₹${value}`);
  }

  // ── TOGGLE PAPER ACTIVE ──
  async function togglePaper(id: string, current: boolean) {
    await supabase.from("papers").update({ is_active: !current }).eq("id", id);
    setPapers((p) =>
      p.map((x) => (x.id === id ? { ...x, is_active: !current } : x)),
    );
    showToast(`${!current ? "✅ Activated" : "⏸ Hidden"}`);
  }

  // ── TOGGLE SUBJECT ──
  async function toggleSubject(id: string, current: boolean) {
    await supabase
      .from("subjects")
      .update({ is_active: !current })
      .eq("id", id);
    setSubjects((s) =>
      s.map((x) => (x.id === id ? { ...x, is_active: !current } : x)),
    );
    showToast(`${!current ? "✅ Subject activated" : "⏸ Subject hidden"}`);
  }

  const totalRevenue = orders
    .filter((o) => o.status === "success")
    .reduce((sum, o) => sum + o.amount, 0);
  const todayOrders = orders.filter(
    (o) => new Date(o.created_at).toDateString() === new Date().toDateString(),
  );

  // ── STYLES ──
  const S = {
    page: {
      minHeight: "100vh",
      background: "#07090F",
      color: "#EEF2FF",
      display: "flex",
      fontFamily: "Outfit, sans-serif",
    } as React.CSSProperties,
    sidebar: {
      width: 220,
      background: "#111827",
      borderRight: "1px solid rgba(255,255,255,0.06)",
      display: "flex",
      flexDirection: "column" as const,
      position: "fixed" as const,
      left: 0,
      top: 0,
      bottom: 0,
      zIndex: 40,
    },
    main: { marginLeft: 220, flex: 1, minHeight: "100vh" },
    topbar: {
      position: "sticky" as const,
      top: 0,
      zIndex: 30,
      height: 56,
      padding: "0 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      background: "rgba(7,9,15,0.9)",
      backdropFilter: "blur(16px)",
    },
    card: {
      background: "#111827",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 14,
      overflow: "hidden",
      marginBottom: 16,
    },
    cardHead: {
      padding: "16px 20px",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    cardBody: { padding: 20 },
    table: { width: "100%", borderCollapse: "collapse" as const },
    th: {
      textAlign: "left" as const,
      fontSize: 10,
      fontWeight: 700,
      color: "#4A5568",
      textTransform: "uppercase" as const,
      letterSpacing: 1,
      padding: "0 14px 10px",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    },
    td: {
      padding: "12px 14px",
      fontSize: 13,
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      verticalAlign: "middle" as const,
    },
    input: {
      width: "100%",
      padding: "9px 12px",
      background: "#1C2333",
      border: "1.5px solid rgba(255,255,255,0.1)",
      borderRadius: 9,
      color: "#EEF2FF",
      fontFamily: "Outfit, sans-serif",
      fontSize: 13,
      outline: "none",
    },
    select: {
      width: "100%",
      padding: "9px 12px",
      background: "#1C2333",
      border: "1.5px solid rgba(255,255,255,0.1)",
      borderRadius: 9,
      color: "#EEF2FF",
      fontFamily: "Outfit, sans-serif",
      fontSize: 13,
      outline: "none",
    },
    btnPrimary: {
      padding: "8px 16px",
      borderRadius: 9,
      fontSize: 12,
      fontWeight: 700,
      border: "none",
      cursor: "pointer",
      background: "#06B6D4",
      color: "white",
      fontFamily: "Outfit, sans-serif",
    },
    btnDanger: {
      padding: "6px 12px",
      borderRadius: 8,
      fontSize: 11,
      fontWeight: 700,
      border: "none",
      cursor: "pointer",
      background: "rgba(239,68,68,.1)",
      color: "#EF4444",
      fontFamily: "Outfit, sans-serif",
    },
    btnGhost: {
      padding: "6px 12px",
      borderRadius: 8,
      fontSize: 11,
      fontWeight: 700,
      border: "1px solid rgba(255,255,255,0.1)",
      cursor: "pointer",
      background: "transparent",
      color: "#94A3B8",
      fontFamily: "Outfit, sans-serif",
    },
    label: {
      display: "block",
      fontSize: 10,
      fontWeight: 700,
      color: "#4A5568",
      marginBottom: 5,
      textTransform: "uppercase" as const,
      letterSpacing: 1,
    },
    badge: (color: string, bg: string) => ({
      display: "inline-flex",
      alignItems: "center",
      padding: "2px 8px",
      borderRadius: 20,
      fontSize: 10,
      fontWeight: 700,
      background: bg,
      color,
    }),
  };

  // ── LOGIN SCREEN ──
  if (authLoading)
    return (
      <div
        style={{ ...S.page, alignItems: "center", justifyContent: "center" }}
      >
        <div style={{ color: "#4A5568" }}>Loading...</div>
      </div>
    );

  if (!authed)
    return (
      <div
        style={{ ...S.page, alignItems: "center", justifyContent: "center" }}
      >
        <div
          style={{
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 22,
            padding: 36,
            width: "100%",
            maxWidth: 380,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 13,
              background: "linear-gradient(135deg,#06B6D4,#10B981)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              margin: "0 auto 18px",
            }}
          >
            🦴
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 900,
              textAlign: "center",
              marginBottom: 4,
            }}
          >
            Admin Panel
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "#4A5568",
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            PhysioVault — Secure Access
          </p>
          {loginErr && (
            <div
              style={{
                padding: "9px 12px",
                background: "rgba(239,68,68,.08)",
                border: "1px solid rgba(239,68,68,.2)",
                borderRadius: 8,
                fontSize: 13,
                color: "#EF4444",
                marginBottom: 12,
              }}
            >
              ⚠️ {loginErr}
            </div>
          )}
          <form onSubmit={doLogin}>
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Email</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@email.com"
                style={S.input}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={S.label}>Password</label>
              <input
                type="password"
                required
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                placeholder="••••••••"
                style={S.input}
              />
            </div>
            <button
              type="submit"
              style={{
                ...S.btnPrimary,
                width: "100%",
                padding: 12,
                fontSize: 14,
              }}
            >
              Login →
            </button>
          </form>
        </div>
      </div>
    );

  // ── MAIN ADMIN UI ──
  return (
    <div style={S.page}>
      {/* SIDEBAR */}
      <div style={S.sidebar}>
        <div
          style={{
            padding: "18px 16px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            gap: 9,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "linear-gradient(135deg,#06B6D4,#10B981)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}
          >
            🦴
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>PhysioVault</div>
            <div
              style={{
                fontSize: 9,
                color: "#06B6D4",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Admin Panel
            </div>
          </div>
        </div>
        <div style={{ padding: "10px 8px", flex: 1 }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "9px 10px",
                borderRadius: 8,
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
                border: "none",
                fontFamily: "Outfit, sans-serif",
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 2,
                transition: "all .18s",
                background:
                  activeTab === item.id ? "rgba(6,182,212,.12)" : "transparent",
                color: activeTab === item.id ? "#06B6D4" : "#94A3B8",
              }}
            >
              <span style={{ fontSize: 15 }}>{item.icon}</span> {item.label}
            </button>
          ))}
        </div>
        <div
          style={{
            padding: "12px 14px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              setAuthed(false);
            }}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: 8,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#4A5568",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "Outfit, sans-serif",
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={S.main}>
        <div style={S.topbar}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>
            {NAV_ITEMS.find((n) => n.id === activeTab)?.icon}{" "}
            {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                padding: "5px 12px",
                borderRadius: 7,
                background: "rgba(16,185,129,.08)",
                border: "1px solid rgba(16,185,129,.2)",
                fontSize: 11,
                fontWeight: 600,
                color: "#10B981",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#10B981",
                  display: "inline-block",
                  animation: "pulse 2s infinite",
                }}
              />
              Supabase Live
            </div>
          </div>
        </div>

        <div style={{ padding: 24 }}>
          {/* ══ DASHBOARD ══ */}
          {activeTab === "dashboard" && (
            <div>
              {/* Stat Cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                {[
                  {
                    icon: "👥",
                    val: users.length,
                    label: "Total Users",
                    color: "#06B6D4",
                  },
                  {
                    icon: "💰",
                    val: `₹${totalRevenue}`,
                    label: "Total Revenue",
                    color: "#10B981",
                  },
                  {
                    icon: "🧾",
                    val: orders.length,
                    label: "Total Orders",
                    color: "#F59E0B",
                  },
                  {
                    icon: "📄",
                    val: papers.filter((p) => p.file_path).length,
                    label: "PDFs Uploaded",
                    color: "#8B5CF6",
                  },
                  {
                    icon: "⏳",
                    val: papers.filter((p) => !p.file_path).length,
                    label: "Upload Pending",
                    color: "#EF4444",
                  },
                  {
                    icon: "🔥",
                    val: todayOrders.length,
                    label: "Orders Today",
                    color: "#06B6D4",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      ...S.card,
                      marginBottom: 0,
                      padding: 18,
                      borderTop: `2px solid ${s.color}`,
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 8 }}>
                      {s.icon}
                    </div>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 900,
                        color: s.color,
                        fontFamily: "JetBrains Mono, monospace",
                        letterSpacing: -1,
                      }}
                    >
                      {s.val}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#4A5568",
                        fontWeight: 500,
                        marginTop: 3,
                      }}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent Orders */}
              <div style={S.card}>
                <div style={S.cardHead}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>
                    🧾 Recent Orders
                  </span>
                </div>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>User</th>
                      <th style={S.th}>Type</th>
                      <th style={S.th}>Amount</th>
                      <th style={S.th}>Status</th>
                      <th style={S.th}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 8).map((o) => (
                      <tr key={o.id}>
                        <td style={S.td}>
                          <span
                            style={{
                              fontFamily: "JetBrains Mono, monospace",
                              fontSize: 11,
                              color: "#4A5568",
                            }}
                          >
                            {o.user_id.slice(0, 8)}...
                          </span>
                        </td>
                        <td style={S.td}>
                          <span
                            style={{
                              ...S.badge("#8B5CF6", "rgba(139,92,246,.1)"),
                            }}
                          >
                            {o.item_type}
                          </span>
                        </td>
                        <td style={S.td}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: "#10B981",
                              fontFamily: "JetBrains Mono, monospace",
                            }}
                          >
                            ₹{o.amount}
                          </span>
                        </td>
                        <td style={S.td}>
                          <span
                            style={
                              o.status === "success"
                                ? S.badge("#10B981", "rgba(16,185,129,.1)")
                                : S.badge("#F59E0B", "rgba(245,158,11,.1)")
                            }
                          >
                            {o.status === "success"
                              ? "✅ Success"
                              : "⏳ Pending"}
                          </span>
                        </td>
                        <td style={{ ...S.td, color: "#4A5568", fontSize: 11 }}>
                          {new Date(o.created_at).toLocaleDateString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══ UPLOAD PDFs ══ */}
          {activeTab === "upload" && (
            <div>
              <div style={S.card}>
                <div style={S.cardHead}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>
                    ☁️ Upload PDF to Supabase Storage
                  </span>
                </div>
                <div style={S.cardBody}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 14,
                      marginBottom: 18,
                    }}
                  >
                    <div>
                      <label style={S.label}>Subject</label>
                      <select
                        value={upSubject}
                        onChange={(e) => setUpSubject(e.target.value)}
                        style={S.select}
                      >
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={S.label}>Exam Year</label>
                      <select
                        value={upYear}
                        onChange={(e) => setUpYear(e.target.value)}
                        style={S.select}
                      >
                        {[2024, 2023, 2022, 2021, 2020].map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={S.label}>File Type</label>
                      <select
                        value={upType}
                        onChange={(e) => setUpType(e.target.value)}
                        style={S.select}
                      >
                        <option value="question">PYQ — Question Paper</option>
                        <option value="solution">PYQ — Solution</option>
                      </select>
                    </div>
                    <div>
                      <label style={S.label}>Price (₹)</label>
                      <input
                        type="number"
                        value={upPrice}
                        onChange={(e) => setUpPrice(e.target.value)}
                        style={S.input}
                      />
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <input
                        type="checkbox"
                        id="freePreview"
                        checked={upFree}
                        onChange={(e) => setUpFree(e.target.checked)}
                      />
                      <label
                        htmlFor="freePreview"
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#94A3B8",
                          cursor: "pointer",
                        }}
                      >
                        Page 1 Free Preview?
                      </label>
                    </div>
                  </div>

                  {/* Drop Zone */}
                  <div
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const f = e.dataTransfer.files[0];
                      if (f) handleUpload(f);
                    }}
                    style={{
                      border: "2px dashed rgba(255,255,255,0.15)",
                      borderRadius: 12,
                      padding: 36,
                      textAlign: "center",
                      cursor: "pointer",
                      background: "#1C2333",
                      transition: "all .2s",
                    }}
                  >
                    <div
                      style={{ fontSize: 36, marginBottom: 10, opacity: 0.6 }}
                    >
                      📁
                    </div>
                    <div
                      style={{ fontSize: 15, fontWeight: 700, marginBottom: 5 }}
                    >
                      Click karo ya PDF drag karo
                    </div>
                    <div style={{ fontSize: 12, color: "#4A5568" }}>
                      PDF only · Max 50MB
                    </div>
                    {uploading && (
                      <div style={{ marginTop: 14 }}>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#94A3B8",
                            marginBottom: 6,
                          }}
                        >
                          Uploading... {uploadProgress}%
                        </div>
                        <div
                          style={{
                            height: 5,
                            background: "#2D3748",
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${uploadProgress}%`,
                              background: "#06B6D4",
                              borderRadius: 3,
                              transition: "width .3s",
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f);
                    }}
                  />

                  {uploadResult && (
                    <div
                      style={{
                        marginTop: 14,
                        padding: "12px 14px",
                        background: uploadResult.startsWith("✅")
                          ? "rgba(16,185,129,.08)"
                          : "rgba(239,68,68,.08)",
                        border: `1px solid ${uploadResult.startsWith("✅") ? "rgba(16,185,129,.2)" : "rgba(239,68,68,.2)"}`,
                        borderRadius: 10,
                        fontSize: 13,
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {uploadResult}
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Status Table */}
              <div style={S.card}>
                <div style={S.cardHead}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>
                    📋 Upload Status — All Subjects
                  </span>
                </div>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Subject</th>
                      <th style={S.th}>Code</th>
                      <th style={S.th}>Year</th>
                      <th style={S.th}>PYQ Papers</th>
                      <th style={S.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((s) => {
                      const sPapers = papers.filter(
                        (p) => p.subject_id === s.id,
                      );
                      const uploaded = sPapers.filter(
                        (p) => p.file_path,
                      ).length;
                      const total = sPapers.length;
                      return (
                        <tr key={s.id}>
                          <td style={S.td}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <div
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  background: s.color,
                                }}
                              />
                              <span style={{ fontWeight: 600 }}>{s.name}</span>
                            </div>
                          </td>
                          <td style={S.td}>
                            <span
                              style={{
                                fontFamily: "JetBrains Mono, monospace",
                                fontSize: 11,
                                color: "#06B6D4",
                              }}
                            >
                              {s.code}
                            </span>
                          </td>
                          <td style={S.td}>
                            <span
                              style={{
                                ...S.badge("#8B5CF6", "rgba(139,92,246,.1)"),
                              }}
                            >
                              {s.year}
                            </span>
                          </td>
                          <td style={S.td}>
                            <span
                              style={{
                                fontFamily: "JetBrains Mono, monospace",
                                fontSize: 12,
                                color: uploaded > 0 ? "#10B981" : "#4A5568",
                              }}
                            >
                              {uploaded}/{total}
                            </span>
                            <div
                              style={{
                                width: 80,
                                height: 3,
                                background: "#2D3748",
                                borderRadius: 2,
                                marginTop: 4,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width:
                                    total > 0
                                      ? `${(uploaded / total) * 100}%`
                                      : "0%",
                                  background: "#10B981",
                                  borderRadius: 2,
                                }}
                              />
                            </div>
                          </td>
                          <td style={S.td}>
                            <button
                              onClick={() => {
                                setUpSubject(s.id);
                                setActiveTab("upload");
                              }}
                              style={S.btnPrimary}
                            >
                              Upload →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══ PYQ PAPERS ══ */}
          {activeTab === "papers" && (
            <div style={S.card}>
              <div style={S.cardHead}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>
                  📄 All PYQ Papers
                </span>
              </div>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Subject</th>
                    <th style={S.th}>Year</th>
                    <th style={S.th}>Type</th>
                    <th style={S.th}>File</th>
                    <th style={S.th}>Price</th>
                    <th style={S.th}>Downloads</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {papers.map((p) => {
                    const subj = subjects.find((s) => s.id === p.subject_id);
                    return (
                      <tr key={p.id}>
                        <td style={S.td}>
                          <span style={{ fontWeight: 600, fontSize: 12 }}>
                            {subj?.name || "—"}
                          </span>
                        </td>
                        <td style={S.td}>
                          <span
                            style={{
                              fontFamily: "JetBrains Mono, monospace",
                              fontWeight: 700,
                              color: "#06B6D4",
                            }}
                          >
                            {p.exam_year}
                          </span>
                        </td>
                        <td style={S.td}>
                          <span
                            style={
                              p.type === "question"
                                ? S.badge("#06B6D4", "rgba(6,182,212,.1)")
                                : S.badge("#10B981", "rgba(16,185,129,.1)")
                            }
                          >
                            {p.type === "question"
                              ? "📄 Question"
                              : "✅ Solution"}
                          </span>
                        </td>
                        <td style={S.td}>
                          <span
                            style={{
                              fontFamily: "JetBrains Mono, monospace",
                              fontSize: 10,
                              color: p.file_path ? "#10B981" : "#4A5568",
                            }}
                          >
                            {p.file_path
                              ? "✅ " + p.file_path.split("/").pop()
                              : "⏳ Not uploaded"}
                          </span>
                        </td>
                        <td style={S.td}>
                          <span style={{ fontWeight: 700, color: "#10B981" }}>
                            ₹{p.price}
                          </span>
                        </td>
                        <td style={S.td}>
                          <span
                            style={{
                              fontFamily: "JetBrains Mono, monospace",
                              fontSize: 12,
                              color: "#94A3B8",
                            }}
                          >
                            {p.downloads}
                          </span>
                        </td>
                        <td style={S.td}>
                          <span
                            style={
                              p.is_active
                                ? S.badge("#10B981", "rgba(16,185,129,.1)")
                                : S.badge("#EF4444", "rgba(239,68,68,.1)")
                            }
                          >
                            {p.is_active ? "● Active" : "● Hidden"}
                          </span>
                        </td>
                        <td style={S.td}>
                          <button
                            onClick={() => togglePaper(p.id, p.is_active)}
                            style={
                              p.is_active
                                ? S.btnDanger
                                : {
                                    ...S.btnGhost,
                                    color: "#10B981",
                                    borderColor: "rgba(16,185,129,.3)",
                                  }
                            }
                          >
                            {p.is_active ? "Hide" : "Show"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ══ SUBJECTS ══ */}
          {activeTab === "subjects" && (
            <div style={S.card}>
              <div style={S.cardHead}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>
                  📚 All Subjects
                </span>
              </div>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Subject</th>
                    <th style={S.th}>Code</th>
                    <th style={S.th}>Year</th>
                    <th style={S.th}>Marks</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s) => (
                    <tr key={s.id}>
                      <td style={S.td}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: s.color,
                            }}
                          />
                          <span style={{ fontWeight: 600 }}>{s.name}</span>
                        </div>
                      </td>
                      <td style={S.td}>
                        <span
                          style={{
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: 11,
                            color: "#06B6D4",
                          }}
                        >
                          {s.code}
                        </span>
                      </td>
                      <td style={S.td}>
                        <span
                          style={{
                            ...S.badge("#8B5CF6", "rgba(139,92,246,.1)"),
                          }}
                        >
                          {s.year}
                        </span>
                      </td>
                      <td style={S.td}>
                        <span
                          style={{
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: 12,
                            color: "#94A3B8",
                          }}
                        >
                          {s.total_marks}M
                        </span>
                      </td>
                      <td style={S.td}>
                        <span
                          style={
                            s.is_active
                              ? S.badge("#10B981", "rgba(16,185,129,.1)")
                              : S.badge("#EF4444", "rgba(239,68,68,.1)")
                          }
                        >
                          {s.is_active ? "● Active" : "● Hidden"}
                        </span>
                      </td>
                      <td style={S.td}>
                        <button
                          onClick={() => toggleSubject(s.id, s.is_active)}
                          style={
                            s.is_active
                              ? S.btnDanger
                              : {
                                  ...S.btnGhost,
                                  color: "#10B981",
                                  borderColor: "rgba(16,185,129,.3)",
                                }
                          }
                        >
                          {s.is_active ? "Hide" : "Show"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ══ USERS ══ */}
          {activeTab === "users" && (
            <div style={S.card}>
              <div style={S.cardHead}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>
                  👥 All Users
                </span>
                <span style={{ fontSize: 12, color: "#94A3B8" }}>
                  {users.length} total
                </span>
              </div>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Name</th>
                    <th style={S.th}>Email</th>
                    <th style={S.th}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td style={S.td}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 9,
                          }}
                        >
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              background:
                                "linear-gradient(135deg,#06B6D4,#8B5CF6)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {(u.full_name || u.email || "U")[0].toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600 }}>
                            {u.full_name || "No name"}
                          </span>
                        </div>
                      </td>
                      <td style={{ ...S.td, color: "#94A3B8", fontSize: 12 }}>
                        {u.email}
                      </td>
                      <td style={{ ...S.td, color: "#4A5568", fontSize: 11 }}>
                        {new Date(u.created_at).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ══ ORDERS ══ */}
          {activeTab === "orders" && (
            <div style={S.card}>
              <div style={S.cardHead}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>
                  🧾 All Orders
                </span>
                <span
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#10B981",
                  }}
                >
                  ₹{totalRevenue} total
                </span>
              </div>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Order ID</th>
                    <th style={S.th}>Type</th>
                    <th style={S.th}>Amount</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td style={S.td}>
                        <span
                          style={{
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: 11,
                            color: "#06B6D4",
                          }}
                        >
                          {o.id.slice(0, 8)}...
                        </span>
                      </td>
                      <td style={S.td}>
                        <span
                          style={{
                            ...S.badge("#8B5CF6", "rgba(139,92,246,.1)"),
                          }}
                        >
                          {o.item_type}
                        </span>
                      </td>
                      <td style={S.td}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: "#10B981",
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          ₹{o.amount}
                        </span>
                      </td>
                      <td style={S.td}>
                        <span
                          style={
                            o.status === "success"
                              ? S.badge("#10B981", "rgba(16,185,129,.1)")
                              : S.badge("#F59E0B", "rgba(245,158,11,.1)")
                          }
                        >
                          {o.status === "success"
                            ? "✅ Success"
                            : "⏳ " + o.status}
                        </span>
                      </td>
                      <td style={{ ...S.td, color: "#4A5568", fontSize: 11 }}>
                        {new Date(o.created_at).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ══ PRICING ══ */}
          {activeTab === "pricing" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <div style={S.card}>
                <div style={S.cardHead}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>
                    💰 Per PDF Prices
                  </span>
                </div>
                <div style={S.cardBody}>
                  {[
                    { key: "chapter_notes", label: "Chapter Notes PDF" },
                    { key: "short_notes", label: "Short Notes PDF" },
                    { key: "important_qs", label: "Important Questions" },
                    { key: "pyq_question", label: "PYQ Question Paper" },
                    { key: "pyq_solution", label: "PYQ Solution" },
                  ].map((item) => (
                    <div
                      key={item.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "11px 0",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
                        {item.label}
                      </span>
                      <span style={{ color: "#4A5568", fontWeight: 700 }}>
                        ₹
                      </span>
                      <input
                        type="number"
                        defaultValue={prices[item.key] || 29}
                        onBlur={(e) =>
                          savePrice(item.key, parseInt(e.target.value))
                        }
                        style={{
                          ...S.input,
                          width: 80,
                          textAlign: "center",
                          fontFamily: "JetBrains Mono, monospace",
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div style={S.card}>
                <div style={S.cardHead}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>
                    👑 Subscription Plans
                  </span>
                </div>
                <div style={S.cardBody}>
                  {[
                    { key: "pro_monthly", label: "Pro Plan (Monthly)" },
                    { key: "annual", label: "Annual Plan" },
                  ].map((item) => (
                    <div
                      key={item.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "11px 0",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
                        {item.label}
                      </span>
                      <span style={{ color: "#4A5568", fontWeight: 700 }}>
                        ₹
                      </span>
                      <input
                        type="number"
                        defaultValue={prices[item.key] || 149}
                        onBlur={(e) =>
                          savePrice(item.key, parseInt(e.target.value))
                        }
                        style={{
                          ...S.input,
                          width: 90,
                          textAlign: "center",
                          fontFamily: "JetBrains Mono, monospace",
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ SETTINGS ══ */}
          {activeTab === "settings" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <div style={S.card}>
                <div style={S.cardHead}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>
                    ⚙️ Supabase Config
                  </span>
                </div>
                <div style={S.cardBody}>
                  <p
                    style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.7 }}
                  >
                    Supabase config{" "}
                    <code
                      style={{
                        background: "#1C2333",
                        padding: "1px 6px",
                        borderRadius: 4,
                        fontSize: 11,
                      }}
                    >
                      .env.local
                    </code>{" "}
                    mein manage hoti hai.
                    <br />
                    <br />
                    Keys change karne ke liye Vercel Dashboard → Settings →
                    Environment Variables mein jao.
                  </p>
                  <div
                    style={{
                      marginTop: 14,
                      padding: "12px 14px",
                      background: "#1C2333",
                      borderRadius: 10,
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 11,
                      color: "#4A5568",
                      lineHeight: 1.8,
                    }}
                  >
                    NEXT_PUBLIC_SUPABASE_URL=✅
                    <br />
                    NEXT_PUBLIC_SUPABASE_ANON_KEY=✅
                    <br />
                    SUPABASE_SERVICE_ROLE_KEY=✅
                    <br />
                    RAZORPAY_KEY_SECRET=✅
                  </div>
                </div>
              </div>
              <div style={S.card}>
                <div style={S.cardHead}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>
                    📊 Database Stats
                  </span>
                </div>
                <div style={S.cardBody}>
                  {[
                    { label: "Total Subjects", val: subjects.length },
                    { label: "Total Papers", val: papers.length },
                    {
                      label: "Uploaded PDFs",
                      val: papers.filter((p) => p.file_path).length,
                    },
                    { label: "Total Users", val: users.length },
                    { label: "Total Orders", val: orders.length },
                    {
                      label: "Successful Orders",
                      val: orders.filter((o) => o.status === "success").length,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "9px 0",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: "#94A3B8" }}>{item.label}</span>
                      <span
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          fontWeight: 700,
                          color: "#06B6D4",
                        }}
                      >
                        {item.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            zIndex: 200,
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 11,
            padding: "12px 18px",
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 8px 32px rgba(0,0,0,.4)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
