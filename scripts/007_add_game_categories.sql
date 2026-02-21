-- Migration: Add game categories (combinatorics, discrete, conditional, all)
-- Run this in your Supabase SQL editor.

-- 1. Update CHECK constraints on matches
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_mode_check;
ALTER TABLE public.matches ADD CONSTRAINT matches_mode_check
  CHECK (mode IN ('probability', 'combinatorics', 'discrete', 'conditional', 'all'));

-- 2. Update CHECK constraints on matchmaking_queue
ALTER TABLE public.matchmaking_queue DROP CONSTRAINT IF EXISTS matchmaking_queue_mode_check;
ALTER TABLE public.matchmaking_queue ADD CONSTRAINT matchmaking_queue_mode_check
  CHECK (mode IN ('probability', 'combinatorics', 'discrete', 'conditional', 'all'));

-- 3. Create challenges table (if not already present)
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenged_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id),
  mode TEXT NOT NULL DEFAULT 'all',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'challenges' AND policyname = 'challenges_select_participant') THEN
    CREATE POLICY "challenges_select_participant" ON public.challenges FOR SELECT USING (auth.uid() IN (challenger_id, challenged_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'challenges' AND policyname = 'challenges_insert_own') THEN
    CREATE POLICY "challenges_insert_own" ON public.challenges FOR INSERT WITH CHECK (auth.uid() = challenger_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'challenges' AND policyname = 'challenges_update_participant') THEN
    CREATE POLICY "challenges_update_participant" ON public.challenges FOR UPDATE USING (auth.uid() IN (challenger_id, challenged_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'challenges' AND policyname = 'challenges_delete_own') THEN
    CREATE POLICY "challenges_delete_own" ON public.challenges FOR DELETE USING (auth.uid() = challenger_id);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;

-- 4. If challenges already existed without mode column, add it
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'all';

-- 5. Migrate existing 'probability' data to 'all'
UPDATE public.matches SET mode = 'all' WHERE mode = 'probability';
UPDATE public.matchmaking_queue SET mode = 'all' WHERE mode = 'probability';
