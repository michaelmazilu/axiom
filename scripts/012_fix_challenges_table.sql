-- Fix: ensure challenges table has the mode column and correct constraints.
-- This mirrors what 011 did for matches and matchmaking_queue.

-- 1. Add mode column if missing (from running 006 without 007)
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'all';

-- 2. Drop all check constraints on challenges (may have stale/overlapping ones)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'challenges'
      AND nsp.nspname = 'public'
      AND con.contype = 'c'
  LOOP
    EXECUTE 'ALTER TABLE public.challenges DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- 3. Recreate correct constraints
ALTER TABLE public.challenges ADD CONSTRAINT challenges_mode_check
  CHECK (mode IN ('probability', 'combinatorics', 'discrete', 'conditional', 'all'));

ALTER TABLE public.challenges ADD CONSTRAINT challenges_status_check
  CHECK (status IN ('pending', 'accepted', 'declined', 'expired'));

-- 4. Ensure realtime is enabled (idempotent — errors are fine if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
