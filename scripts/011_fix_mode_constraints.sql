-- Fix: drop ALL check constraints on mode columns and recreate them correctly.
-- There may be multiple overlapping constraints from migrations 004/005/007.

-- Drop every check constraint on matchmaking_queue
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'matchmaking_queue'
      AND nsp.nspname = 'public'
      AND con.contype = 'c'
  LOOP
    EXECUTE 'ALTER TABLE public.matchmaking_queue DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- Drop every check constraint on matches
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'matches'
      AND nsp.nspname = 'public'
      AND con.contype = 'c'
  LOOP
    EXECUTE 'ALTER TABLE public.matches DROP CONSTRAINT ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- Recreate the correct constraints
ALTER TABLE public.matchmaking_queue ADD CONSTRAINT matchmaking_queue_mode_check
  CHECK (mode IN ('probability', 'combinatorics', 'discrete', 'conditional', 'all'));

ALTER TABLE public.matchmaking_queue ADD CONSTRAINT matchmaking_queue_status_check
  CHECK (status IN ('waiting', 'matched'));

ALTER TABLE public.matches ADD CONSTRAINT matches_mode_check
  CHECK (mode IN ('probability', 'combinatorics', 'discrete', 'conditional', 'all'));

ALTER TABLE public.matches ADD CONSTRAINT matches_status_check
  CHECK (status IN ('in_progress', 'completed'));

-- Clean up stale queue entries
DELETE FROM public.matchmaking_queue WHERE status = 'matched';
