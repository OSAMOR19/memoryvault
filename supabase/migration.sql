-- ============================================================
-- MemoryVault — Supabase Database Migration
-- Run this in Supabase → SQL Editor (paste the entire file)
-- ============================================================

-- ── Table 1: profiles ──────────────────────────────────────
-- Extends Supabase auth.users with app-specific profile data.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create a profile when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it already exists (safe re-run)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);


-- ── Table 2: capsules ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.capsules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  occasion TEXT NOT NULL DEFAULT 'custom',
  message TEXT NOT NULL DEFAULT '',
  gift_enabled BOOLEAN DEFAULT FALSE,
  gift_amount INTEGER DEFAULT 0,
  unlock_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  opened_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'sealed' CHECK (status IN ('sealed', 'opened'))
);

-- RLS
ALTER TABLE public.capsules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own capsules"
  ON public.capsules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own capsules"
  ON public.capsules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own capsules"
  ON public.capsules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own capsules"
  ON public.capsules FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_capsules_user_id ON public.capsules(user_id);


-- ── Table 3: capsule_photos ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.capsule_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id UUID NOT NULL REFERENCES public.capsules(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS (photos accessible only via their parent capsule's owner)
ALTER TABLE public.capsule_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own capsule photos"
  ON public.capsule_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.capsules
      WHERE capsules.id = capsule_photos.capsule_id
        AND capsules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own capsule photos"
  ON public.capsule_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.capsules
      WHERE capsules.id = capsule_photos.capsule_id
        AND capsules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own capsule photos"
  ON public.capsule_photos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.capsules
      WHERE capsules.id = capsule_photos.capsule_id
        AND capsules.user_id = auth.uid()
    )
  );

-- Index for fast capsule photo lookups
CREATE INDEX IF NOT EXISTS idx_capsule_photos_capsule_id ON public.capsule_photos(capsule_id);
