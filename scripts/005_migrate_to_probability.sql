-- Migration: Replace per-mode Elo columns with single elo_probability
-- Run this if your database was set up with the old schema.

-- Add new column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS elo_probability INTEGER NOT NULL DEFAULT 1200;

-- Copy the best Elo from the old columns (if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'elo_arithmetic') THEN
    UPDATE public.profiles SET elo_probability = GREATEST(elo_arithmetic, elo_functions, elo_calculus);
    ALTER TABLE public.profiles DROP COLUMN elo_arithmetic;
    ALTER TABLE public.profiles DROP COLUMN elo_functions;
    ALTER TABLE public.profiles DROP COLUMN elo_calculus;
  END IF;
END $$;

-- Update matches mode constraint to only allow 'probability'
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_mode_check;
ALTER TABLE public.matches ADD CONSTRAINT matches_mode_check CHECK (mode IN ('probability'));

-- Update existing matches to 'probability' mode
UPDATE public.matches SET mode = 'probability' WHERE mode != 'probability';

-- Update matchmaking queue mode constraint
ALTER TABLE public.matchmaking_queue DROP CONSTRAINT IF EXISTS matchmaking_queue_mode_check;
ALTER TABLE public.matchmaking_queue ADD CONSTRAINT matchmaking_queue_mode_check CHECK (mode IN ('probability'));

-- Clear old queue entries
DELETE FROM public.matchmaking_queue WHERE mode != 'probability';
