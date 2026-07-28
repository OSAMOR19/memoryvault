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

-- Auto-update `updated_at` on profile changes
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;

CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
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
  gift_amount FLOAT DEFAULT 0,
  tx_hash TEXT,
  unlock_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  opened_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'sealed' CHECK (status IN ('sealed', 'opened'))
);

-- RLS
ALTER TABLE public.capsules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own capsules" ON public.capsules;
CREATE POLICY "Users can view own capsules"
  ON public.capsules FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own capsules" ON public.capsules;
CREATE POLICY "Users can insert own capsules"
  ON public.capsules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own capsules" ON public.capsules;
CREATE POLICY "Users can update own capsules"
  ON public.capsules FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own capsules" ON public.capsules;
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

DROP POLICY IF EXISTS "Users can view own capsule photos" ON public.capsule_photos;
CREATE POLICY "Users can view own capsule photos"
  ON public.capsule_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.capsules
      WHERE capsules.id = capsule_photos.capsule_id
        AND capsules.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own capsule photos" ON public.capsule_photos;
CREATE POLICY "Users can insert own capsule photos"
  ON public.capsule_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.capsules
      WHERE capsules.id = capsule_photos.capsule_id
        AND capsules.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own capsule photos" ON public.capsule_photos;
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


-- ════════════════════════════════════════════════════════════
-- STORAGE BUCKET SETUP
-- ════════════════════════════════════════════════════════════
-- Note: The bucket itself must be created via Supabase Dashboard:
--   Storage → New Bucket → "capsule-photos" (public, 5MB limit)
--
-- The policies below secure access so users can only upload/delete
-- files in their own folder (path: userId/capsuleId/filename).
-- ════════════════════════════════════════════════════════════

-- Allow authenticated users to upload to their own folder
-- Path format: {user_id}/{capsule_id}/{filename}
-- storage.foldername(name)[1] extracts the first folder = user_id
INSERT INTO storage.policies (name, bucket_id, operation, definition, check_expression)
SELECT
  'Users can upload own photos',
  'capsule-photos',
  'INSERT',
  NULL,
  $$(bucket_id = 'capsule-photos' AND auth.uid()::text = (storage.foldername(name))[1])$$
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies
  WHERE name = 'Users can upload own photos' AND bucket_id = 'capsule-photos'
);

-- Allow anyone to view photos (public bucket)
INSERT INTO storage.policies (name, bucket_id, operation, definition)
SELECT
  'Public photo access',
  'capsule-photos',
  'SELECT',
  $$(bucket_id = 'capsule-photos')$$
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies
  WHERE name = 'Public photo access' AND bucket_id = 'capsule-photos'
);

-- Allow users to delete their own photos
INSERT INTO storage.policies (name, bucket_id, operation, definition)
SELECT
  'Users can delete own photos',
  'capsule-photos',
  'DELETE',
  $$(bucket_id = 'capsule-photos' AND auth.uid()::text = (storage.foldername(name))[1])$$
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies
  WHERE name = 'Users can delete own photos' AND bucket_id = 'capsule-photos'
);

-- ── Table 4: notifications ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- e.g., 'created', 'opened', 'deleted'
  capsule_id UUID REFERENCES public.capsules(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Index for user notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

