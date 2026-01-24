-- =====================================================
-- MIGRATION: Lists & Router System
-- Transforms note-taking app into router-based system
-- =====================================================

-- Step 1: Rename subscriptions to billing_subscriptions
-- =====================================================
ALTER TABLE IF EXISTS public.subscriptions RENAME TO billing_subscriptions;

-- Update policy names to match new table name
ALTER POLICY IF EXISTS "Users can view own subscription" ON public.billing_subscriptions
  RENAME TO "Users can view own billing_subscription";

-- =====================================================
-- Step 2: Create LISTS table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('inbox', 'shopping', 'movies', 'tasks', 'custom')),
  icon TEXT, -- e.g., 'inbox', 'cart', 'film', 'check-square'
  color TEXT, -- hex color for UI
  position INTEGER NOT NULL DEFAULT 0, -- for user-defined ordering
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, name) -- prevent duplicate list names per user
);

CREATE INDEX IF NOT EXISTS idx_lists_user ON public.lists(user_id);
CREATE INDEX IF NOT EXISTS idx_lists_user_position ON public.lists(user_id, position);

-- RLS Policies for lists
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own lists" ON public.lists;
CREATE POLICY "Users manage own lists"
  ON public.lists FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_lists_updated_at ON public.lists;
CREATE TRIGGER update_lists_updated_at
  BEFORE UPDATE ON public.lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- Step 3: Create LIST_ITEMS table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_checked BOOLEAN DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}', -- for extensibility (e.g., source_type, voice_recording_id)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_list_items_list ON public.list_items(list_id, position);
CREATE INDEX IF NOT EXISTS idx_list_items_user ON public.list_items(user_id);
CREATE INDEX IF NOT EXISTS idx_list_items_checked ON public.list_items(list_id, is_checked);

-- RLS Policies for list_items
ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own list items" ON public.list_items;
CREATE POLICY "Users manage own list items"
  ON public.list_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_list_items_updated_at ON public.list_items;
CREATE TRIGGER update_list_items_updated_at
  BEFORE UPDATE ON public.list_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- Step 4: Create TASKS table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  description TEXT, -- optional detailed description
  due_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  tags TEXT[], -- for categorization
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tasks_user ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(user_id, due_date) WHERE due_date IS NOT NULL;

-- RLS Policies for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own tasks" ON public.tasks;
CREATE POLICY "Users manage own tasks"
  ON public.tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger to set completed_at when status changes to completed
CREATE OR REPLACE FUNCTION public.set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status != 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_task_completed_at ON public.tasks;
CREATE TRIGGER set_task_completed_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_completed_at();

-- =====================================================
-- Step 5: Migrate existing NOTES data to LISTS
-- =====================================================

-- Create a "Notes" list for each user who has notes
INSERT INTO public.lists (user_id, name, type, icon, position)
SELECT DISTINCT user_id, 'Notes', 'custom', 'file-text', 0
FROM public.notes
ON CONFLICT (user_id, name) DO NOTHING;

-- Migrate notes to list_items
INSERT INTO public.list_items (list_id, user_id, content, position, metadata, created_at, updated_at)
SELECT
  l.id as list_id,
  n.user_id,
  CASE
    WHEN n.title IS NOT NULL AND n.title != '' THEN
      n.title || E'\n\n' || COALESCE(n.content, '')
    ELSE
      COALESCE(n.content, '')
  END as content,
  ROW_NUMBER() OVER (PARTITION BY n.user_id ORDER BY n.created_at) - 1 as position,
  jsonb_build_object(
    'source_type', n.source_type,
    'voice_recording_id', n.voice_recording_id,
    'migrated_from_note_id', n.id
  ) as metadata,
  n.created_at,
  n.updated_at
FROM public.notes n
JOIN public.lists l ON l.user_id = n.user_id AND l.name = 'Notes'
WHERE NOT EXISTS (
  -- Avoid duplicate migration if script is run multiple times
  SELECT 1 FROM public.list_items li
  WHERE li.metadata->>'migrated_from_note_id' = n.id::text
);

-- =====================================================
-- Step 6: Drop NOTES table (after migration verification)
-- =====================================================

-- Drop foreign key constraint from voice_recordings first
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'voice_recordings_note_id_fkey'
    AND table_name = 'voice_recordings'
  ) THEN
    ALTER TABLE public.voice_recordings DROP CONSTRAINT voice_recordings_note_id_fkey;
  END IF;
END $$;

-- Drop the notes table
DROP TABLE IF EXISTS public.notes CASCADE;

-- =====================================================
-- Step 7: Update voice_recordings schema
-- =====================================================

-- Remove note_id column if it exists (no longer needed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'voice_recordings'
    AND column_name = 'note_id'
  ) THEN
    ALTER TABLE public.voice_recordings DROP COLUMN note_id;
  END IF;
END $$;

-- Add optional list_item_id reference for future voice → list_item linkage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'voice_recordings'
    AND column_name = 'list_item_id'
  ) THEN
    ALTER TABLE public.voice_recordings
    ADD COLUMN list_item_id UUID REFERENCES public.list_items(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_voice_recordings_list_item
    ON public.voice_recordings(list_item_id)
    WHERE list_item_id IS NOT NULL;
  END IF;
END $$;

-- =====================================================
-- VERIFICATION QUERIES (commented out - run manually)
-- =====================================================

-- Check that subscriptions was renamed
-- SELECT * FROM public.billing_subscriptions LIMIT 5;

-- Check new tables exist
-- SELECT * FROM public.lists LIMIT 5;
-- SELECT * FROM public.list_items LIMIT 5;
-- SELECT * FROM public.tasks LIMIT 5;

-- Verify notes were migrated
-- SELECT
--   l.name,
--   COUNT(li.id) as item_count,
--   MIN(li.created_at) as earliest_item
-- FROM public.lists l
-- LEFT JOIN public.list_items li ON li.list_id = l.id
-- GROUP BY l.id, l.name;

-- Check that notes table is gone
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name = 'notes';
