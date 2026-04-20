# PhysioVault 🦴
## BPT Study Platform — MP Medical Science University, Jabalpur

---

## ⚡ 10 Minute Deployment Guide

### Step 1 — Supabase Setup (Free)

1. **https://supabase.com** pe jaao → New Project banao
2. Project name: `physiovault`
3. Database password: kuch strong daalo (save kar lo)
4. Region: **South Asia (Mumbai)** chunna
5. Project ban jaaye toh:
   - **Settings > API** mein jaao
   - `Project URL` copy karo → `.env.local` mein daalo
   - `anon public` key copy karo → `.env.local` mein daalo
   - `service_role` key copy karo → `.env.local` mein daalo

6. **SQL Editor** mein jaao → `supabase_schema.sql` ka poora content paste karo → Run karo
7. **Storage** mein jaao → **New Bucket**:
   - Name: `physiovault-files`
   - Public: `OFF` (private)
   - File size limit: `50MB`

---

### Step 2 — Razorpay Setup

1. **https://razorpay.com** pe account banao
2. Test mode mein kaam karo pehle
3. **Settings > API Keys** → Generate Test Key
4. Key ID aur Secret `.env.local` mein daalo
5. **Webhooks** mein jaao → Add webhook:
   - URL: `https://your-domain.vercel.app/api/payments/webhook`
   - Events: `payment.captured`, `payment.failed`, `subscription.activated`, `subscription.cancelled`
   - Secret generate karo → `.env.local` mein daalo

---

### Step 3 — Vercel Deploy (Free)

```bash
# Option A: GitHub se (Recommended)
1. GitHub pe repo push karo
2. https://vercel.com → New Project → Import GitHub repo
3. Framework: Next.js (auto-detect)
4. Environment Variables daalo (niche list hai)
5. Deploy! 🚀

# Option B: Vercel CLI se
npm install -g vercel
vercel login
vercel --prod
```

**Vercel mein yeh Environment Variables daalo:**

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | rzp_test_xxxxxxxxxx |
| `RAZORPAY_KEY_SECRET` | Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook secret |
| `ADMIN_EMAIL` | admin@youremail.com |
| `NEXT_PUBLIC_APP_URL` | https://your-project.vercel.app |

---

### Step 4 — PYQ Papers Upload

Admin panel pe jaao → Upload PDFs section

**File naming convention:**
```
papers/anatomy/2024_question.pdf
papers/anatomy/2024_solution.pdf
papers/physiology/2023_question.pdf
```

Ya directly Supabase Storage mein jaake upload karo.

---

## 📁 Project Structure

```
physiovault/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── payments/
│   │   │   │   ├── order/route.ts      ← Razorpay order create
│   │   │   │   ├── verify/route.ts     ← Payment verify
│   │   │   │   └── webhook/route.ts    ← Razorpay webhook
│   │   │   ├── papers/[id]/route.ts    ← PDF download (signed URL)
│   │   │   └── admin/upload/route.ts   ← PDF upload (admin)
│   │   ├── layout.tsx                  ← Root layout
│   │   └── globals.css                 ← Global styles
│   ├── lib/
│   │   ├── supabase.ts                 ← Supabase client + helpers
│   │   └── razorpay.ts                 ← Razorpay helpers
│   └── types/index.ts                  ← TypeScript types
├── supabase_schema.sql                 ← Database schema
├── vercel.json                         ← Vercel config
├── .env.local                          ← Environment variables
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

## 💰 Pricing (Change karne ke liye)

Supabase → Table Editor → `prices` table mein directly edit karo.

| Key | Default | Description |
|-----|---------|-------------|
| `chapter_notes` | ₹29 | Full chapter PDF |
| `short_notes` | ₹19 | Short revision notes |
| `important_qs` | ₹19 | Important questions |
| `pyq_question` | ₹29 | PYQ paper |
| `pyq_solution` | ₹49 | PYQ solution |
| `pro_monthly` | ₹149 | Pro subscription/month |
| `annual` | ₹999 | Annual subscription |

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Backend | Next.js API Routes (serverless) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Payments | Razorpay |
| Hosting | Vercel (free tier) |

---

## 📞 Support

Koi problem aaye toh contact karo — WhatsApp ya email.
