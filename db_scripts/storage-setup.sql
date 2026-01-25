-- ===========================================================
-- SUPABASE STORAGE SETUP FOR VOICE RECORDINGS
-- Run this in Supabase SQL Editor after schema.sql
-- ===========================================================

-- Create voice-recordings bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-recordings', 'voice-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for storage
DROP POLICY IF EXISTS "Users upload own recordings" ON storage.objects;
CREATE POLICY "Users upload own recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'voice-recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users view own recordings" ON storage.objects;
CREATE POLICY "Users view own recordings"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'voice-recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users delete own recordings" ON storage.objects;
CREATE POLICY "Users delete own recordings"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'voice-recordings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Verification
-- SELECT * FROM storage.buckets WHERE id = 'voice-recordings';
