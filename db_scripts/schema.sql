-- =====================================================
-- SMART NOTEPAD DATABASE SCHEMA - Phase 1
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USER PROFILES (extends auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  preferences JSONB DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add new columns if they don't exist (for existing databases)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'profiles'
                 AND column_name = 'is_admin') THEN
    ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'profiles'
                 AND column_name = 'account_status') THEN
    ALTER TABLE public.profiles ADD COLUMN account_status TEXT NOT NULL DEFAULT 'pending';
  END IF;
END $$;

-- Add constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conname = 'profiles_account_status_check'
                 AND conrelid = 'public.profiles'::regclass) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_account_status_check
    CHECK (account_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- RLS Policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid errors on re-run
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 2. SUBSCRIPTION TIERS (for future billing)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  price_monthly_cents INTEGER NOT NULL DEFAULT 0,
  price_yearly_cents INTEGER,
  features JSONB DEFAULT '{}',
  limits JSONB DEFAULT '{"notes_per_month": 100, "actions_per_day": 10, "tools_count": 5}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed default tiers (only if not exists)
INSERT INTO public.subscription_tiers (name, display_name, price_monthly_cents, limits)
SELECT 'free', 'Free', 0, '{"notes_per_month": 50, "actions_per_day": 5, "tools_count": 3, "voice_minutes": 30}'::JSONB
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_tiers WHERE name = 'free');

INSERT INTO public.subscription_tiers (name, display_name, price_monthly_cents, limits)
SELECT 'pro', 'Pro', 999, '{"notes_per_month": 500, "actions_per_day": 50, "tools_count": 20, "voice_minutes": 300}'::JSONB
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_tiers WHERE name = 'pro');

INSERT INTO public.subscription_tiers (name, display_name, price_monthly_cents, limits)
SELECT 'unlimited', 'Unlimited', 2499, '{"notes_per_month": -1, "actions_per_day": -1, "tools_count": -1, "voice_minutes": -1}'::JSONB
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_tiers WHERE name = 'unlimited');

-- =====================================================
-- 3. USER SUBSCRIPTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.subscription_tiers(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON public.subscriptions(stripe_subscription_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Auto-create subscription for approved users only
-- Admins get unlimited tier, others stay pending until manually approved
CREATE OR REPLACE FUNCTION public.create_subscription_if_approved()
RETURNS TRIGGER AS $$
DECLARE
  subscription_exists BOOLEAN;
BEGIN
  -- Check if subscription already exists
  SELECT EXISTS(SELECT 1 FROM public.subscriptions WHERE user_id = NEW.id) INTO subscription_exists;

  -- Only create subscription if it doesn't exist and user is approved or admin
  IF NOT subscription_exists THEN
    IF NEW.is_admin = TRUE THEN
      -- Admins get unlimited tier
      INSERT INTO public.subscriptions (user_id, tier_id, status)
      SELECT NEW.id, id, 'active' FROM public.subscription_tiers WHERE name = 'unlimited'
      ON CONFLICT (user_id) DO NOTHING;
    ELSIF NEW.account_status = 'approved' THEN
      -- Approved users get free tier
      INSERT INTO public.subscriptions (user_id, tier_id, status)
      SELECT NEW.id, id, 'active' FROM public.subscription_tiers WHERE name = 'free'
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid errors on re-run
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

-- Trigger on INSERT and UPDATE to handle approval flow
CREATE TRIGGER on_profile_created
  AFTER INSERT OR UPDATE OF account_status, is_admin ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_subscription_if_approved();

-- =====================================================
-- HELPER FUNCTION: Update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- BACKFILL: Update existing users (if migrating from old schema)
-- =====================================================
-- This ensures existing users aren't locked out after migration
DO $$
BEGIN
  -- Set existing users without subscriptions to approved with free tier
  -- (assumes they were created under old system and should have access)
  UPDATE public.profiles
  SET account_status = 'approved'
  WHERE account_status IS NULL OR account_status = 'pending'
  AND EXISTS (
    SELECT 1 FROM auth.users WHERE auth.users.id = profiles.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions WHERE subscriptions.user_id = profiles.id
  );

  -- Create subscriptions for any approved users who don't have one
  INSERT INTO public.subscriptions (user_id, tier_id, status)
  SELECT p.id, st.id, 'active'
  FROM public.profiles p
  CROSS JOIN public.subscription_tiers st
  WHERE p.account_status = 'approved'
  AND st.name = 'free'
  AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions WHERE user_id = p.id
  )
  ON CONFLICT (user_id) DO NOTHING;
END $$;

-- =====================================================
-- 4. VOICE RECORDINGS (Phase 1: AI Agents & Tools)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.voice_recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  duration_seconds NUMERIC(10, 2),
  transcription_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_voice_recordings_user ON public.voice_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_created ON public.voice_recordings(created_at DESC);

ALTER TABLE public.voice_recordings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own recordings" ON public.voice_recordings;
CREATE POLICY "Users manage own recordings"
  ON public.voice_recordings FOR ALL
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_voice_recordings_updated_at ON public.voice_recordings;
CREATE TRIGGER update_voice_recordings_updated_at
  BEFORE UPDATE ON public.voice_recordings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- 5. NOTES (Phase 1: AI Agents & Tools)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('text', 'voice', 'agent_action')),
  voice_recording_id UUID REFERENCES public.voice_recordings(id) ON DELETE SET NULL,
  agent_execution_id UUID, -- Will reference agent_executions in Phase 2
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_user ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_created ON public.notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_voice_recording ON public.notes(voice_recording_id) WHERE voice_recording_id IS NOT NULL;

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own notes" ON public.notes;
CREATE POLICY "Users manage own notes"
  ON public.notes FOR ALL
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_notes_updated_at ON public.notes;
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- VERIFICATION QUERIES (run after schema creation)
-- =====================================================
-- SELECT * FROM public.subscription_tiers;
-- SELECT * FROM public.profiles;
-- SELECT * FROM public.subscriptions;
-- SELECT * FROM public.voice_recordings;
-- SELECT * FROM public.notes;
