-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- PhysioVault — Supabase Database Schema
-- Supabase Dashboard > SQL Editor mein paste karo
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. USERS (Auth se auto-create)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. SUBJECTS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS public.subjects (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name            TEXT NOT NULL,
  code            TEXT NOT NULL UNIQUE,
  year            TEXT NOT NULL CHECK (year IN ('y1','y2','y3','y4')),
  icon            TEXT DEFAULT '📚',
  color           TEXT DEFAULT '#06B6D4',
  description     TEXT,
  theory_marks    INTEGER DEFAULT 100,
  practical_marks INTEGER DEFAULT 0,
  internal_marks  INTEGER DEFAULT 20,
  viva_marks      INTEGER DEFAULT 0,
  total_marks     INTEGER DEFAULT 200,
  is_active       BOOLEAN DEFAULT TRUE,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. CHAPTERS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS public.chapters (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subject_id      UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  chapter_number  INTEGER NOT NULL,
  topics          TEXT[] DEFAULT '{}',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. PAPERS (PYQ)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS public.papers (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subject_id       UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  exam_year        INTEGER NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('question','solution')),
  file_path        TEXT,         -- Supabase storage path: papers/anatomy/2024_question.pdf
  file_size        INTEGER,      -- bytes
  pages            INTEGER,
  price            INTEGER DEFAULT 29,
  is_free_preview  BOOLEAN DEFAULT FALSE,
  is_active        BOOLEAN DEFAULT TRUE,
  downloads        INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject_id, exam_year, type)
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. NOTES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS public.notes (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subject_id  UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  chapter_id  UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  type        TEXT NOT NULL CHECK (type IN ('chapter_notes','short_notes','important_qs')),
  title       TEXT NOT NULL,
  file_path   TEXT,
  file_size   INTEGER,
  pages       INTEGER,
  price       INTEGER DEFAULT 29,
  is_active   BOOLEAN DEFAULT TRUE,
  downloads   INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. ORDERS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS public.orders (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id               UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  razorpay_order_id     TEXT UNIQUE NOT NULL,
  razorpay_payment_id   TEXT,
  item_type             TEXT NOT NULL CHECK (item_type IN ('paper','note','subscription')),
  item_id               UUID NOT NULL,
  amount                INTEGER NOT NULL,   -- rupees
  status                TEXT DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
  payment_method        TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 7. PURCHASES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS public.purchases (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id    UUID REFERENCES public.orders(id),
  item_type   TEXT NOT NULL CHECK (item_type IN ('paper','note')),
  item_id     UUID NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 8. SUBSCRIPTIONS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                        UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id                   UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan                      TEXT NOT NULL CHECK (plan IN ('pro_monthly','annual')),
  razorpay_subscription_id  TEXT UNIQUE,
  status                    TEXT DEFAULT 'active' CHECK (status IN ('active','cancelled','expired')),
  starts_at                 TIMESTAMPTZ DEFAULT NOW(),
  expires_at                TIMESTAMPTZ NOT NULL,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 9. PRICES (admin se manage)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CREATE TABLE IF NOT EXISTS public.prices (
  key         TEXT PRIMARY KEY,
  value       INTEGER NOT NULL,
  label       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Default prices insert karo
INSERT INTO public.prices (key, value, label) VALUES
  ('chapter_notes', 29, 'Chapter Notes PDF'),
  ('short_notes', 19, 'Short Notes PDF'),
  ('important_qs', 19, 'Important Questions'),
  ('pyq_question', 29, 'PYQ Question Paper'),
  ('pyq_solution', 49, 'PYQ Solution'),
  ('pro_monthly', 149, 'Pro Plan Monthly'),
  ('annual', 999, 'Annual Plan')
ON CONFLICT (key) DO NOTHING;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 10. RLS POLICIES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;

-- Subjects: sabhi padh sakte hain
CREATE POLICY "subjects_public_read" ON public.subjects FOR SELECT USING (is_active = TRUE);

-- Chapters: sabhi padh sakte hain
CREATE POLICY "chapters_public_read" ON public.chapters FOR SELECT USING (is_active = TRUE);

-- Papers: sabhi metadata dekh sakte hain (file_path nahi)
CREATE POLICY "papers_public_read" ON public.papers FOR SELECT USING (is_active = TRUE);

-- Notes: sabhi metadata dekh sakte hain
CREATE POLICY "notes_public_read" ON public.notes FOR SELECT USING (is_active = TRUE);

-- Prices: sabhi dekh sakte hain
CREATE POLICY "prices_public_read" ON public.prices FOR SELECT USING (TRUE);

-- Profiles: sirf apna dekh sako
CREATE POLICY "profiles_own_read" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_own_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Orders: sirf apne
CREATE POLICY "orders_own_read" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "orders_own_insert" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Purchases: sirf apne
CREATE POLICY "purchases_own_read" ON public.purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "purchases_own_insert" ON public.purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Subscriptions: sirf apni
CREATE POLICY "subscriptions_own_read" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 11. STORAGE BUCKET
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Supabase Dashboard > Storage > New Bucket:
-- Name: physiovault-files
-- Public: FALSE (private bucket)
-- File size limit: 52428800 (50MB)

-- Storage policies (SQL mein):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('physiovault-files', 'physiovault-files', false);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 12. SEED DATA — 1st Year Subjects
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSERT INTO public.subjects (name, code, year, icon, color, description, theory_marks, practical_marks, internal_marks, viva_marks, total_marks, sort_order) VALUES
  ('Human Anatomy', 'BPT-101', 'y1', '🦴', '#06B6D4', 'Gross anatomy, regional anatomy, kinesiology', 100, 40, 40, 20, 200, 1),
  ('Human Physiology', 'BPT-102', 'y1', '💓', '#8B5CF6', 'Body functions, cardio-respiratory, neuromuscular', 100, 40, 40, 20, 200, 2),
  ('Physics, Biomechanics & Biomechanical Modalities', 'BPT-103', 'y1', '⚙️', '#F59E0B', 'Physics fundamentals, biomechanics of human movement', 100, 40, 40, 20, 200, 3),
  ('Fundamental of Medical Electronics & Bioelectrical Modalities', 'BPT-104', 'y1', '⚡', '#EF4444', 'Electronics principles, bioelectrical modalities in PT', 100, 40, 40, 20, 200, 4),
  ('Psychology & Sociology', 'BPT-105', 'y1', '🧠', '#10B981', 'Psychology (40M) + Sociology (40M) — theory only', 80, 0, 20, 0, 100, 5),
  ('Pathology & Microbiology', 'BPT-201', 'y2', '🧫', '#06B6D4', 'Disease mechanisms, microorganisms — theory only', 80, 0, 20, 0, 100, 1),
  ('Biochemistry & Pharmacology', 'BPT-202', 'y2', '💊', '#8B5CF6', 'Biochemical processes and drug actions — theory only', 80, 0, 20, 0, 100, 2),
  ('Medicine incl. Paediatrics & Geriatrics', 'BPT-203', 'y2', '🏥', '#F59E0B', 'Clinical medicine, child & elderly care — theory only', 80, 0, 20, 0, 100, 3),
  ('General Surgery, Obstetrics & Gynaecology', 'BPT-204', 'y2', '🔬', '#EF4444', 'Surgical conditions, women health — theory only', 80, 0, 20, 0, 100, 4),
  ('Exercise Therapy including Yoga', 'BPT-205', 'y2', '🏋️', '#10B981', 'Therapeutic exercise, yoga, mobility — with practical', 100, 40, 40, 20, 200, 5),
  ('Electrotherapy', 'BPT-206', 'y2', '⚡', '#06B6D4', 'Electrophysical agents, light & thermal therapy', 100, 40, 40, 20, 200, 6)
ON CONFLICT (code) DO NOTHING;

-- Papers rows initialize karo (file_path null rahega jab tak upload na ho)
-- Example for anatomy:
-- INSERT INTO public.papers (subject_id, exam_year, type, price, is_free_preview)
-- SELECT id, 2024, 'question', 29, TRUE FROM public.subjects WHERE code = 'BPT-101';

SELECT 'Schema created successfully! 🎉' AS status;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 13. HELPER FUNCTIONS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Downloads counter increment (verify route mein use hota hai)
CREATE OR REPLACE FUNCTION increment_downloads(paper_id UUID)
RETURNS void AS $$
  UPDATE public.papers SET downloads = downloads + 1 WHERE id = paper_id;
$$ LANGUAGE sql SECURITY DEFINER;
