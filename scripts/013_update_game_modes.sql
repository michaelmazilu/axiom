-- Migration: Update game modes to new 4-mode system
-- Old modes: 'probability', 'combinatorics', 'discrete', 'conditional', 'all'
-- New modes: 'statistics', 'arithmetic', 'functions', 'calculus'

-- 1. Drop ALL existing CHECK constraints on mode columns (handles any name)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname, rel.relname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname IN ('matches', 'matchmaking_queue', 'challenges')
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%mode%'
  LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', r.relname, r.conname);
  END LOOP;
END $$;

-- 2. Migrate existing data to 'statistics'
UPDATE matches SET mode = 'statistics' WHERE mode NOT IN ('statistics', 'arithmetic', 'functions', 'calculus');
UPDATE matchmaking_queue SET mode = 'statistics' WHERE mode NOT IN ('statistics', 'arithmetic', 'functions', 'calculus');
UPDATE challenges SET mode = 'statistics' WHERE mode IS NULL OR mode NOT IN ('statistics', 'arithmetic', 'functions', 'calculus');

-- 3. Add new CHECK constraints
ALTER TABLE matches
  ADD CONSTRAINT matches_mode_check
  CHECK (mode IN ('statistics', 'arithmetic', 'functions', 'calculus'));

ALTER TABLE matchmaking_queue
  ADD CONSTRAINT matchmaking_queue_mode_check
  CHECK (mode IN ('statistics', 'arithmetic', 'functions', 'calculus'));

ALTER TABLE challenges
  ADD CONSTRAINT challenges_mode_check
  CHECK (mode IN ('statistics', 'arithmetic', 'functions', 'calculus'));
