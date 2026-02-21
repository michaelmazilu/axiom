-- Match history
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL DEFAULT 'probability' CHECK (mode IN ('probability')),
  seed TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  player1_id UUID NOT NULL REFERENCES public.profiles(id),
  player2_id UUID NOT NULL REFERENCES public.profiles(id),
  player1_score INTEGER NOT NULL DEFAULT 0,
  player2_score INTEGER NOT NULL DEFAULT 0,
  winner_id UUID REFERENCES public.profiles(id),
  player1_elo_before INTEGER NOT NULL DEFAULT 1200,
  player2_elo_before INTEGER NOT NULL DEFAULT 1200,
  player1_elo_after INTEGER NOT NULL DEFAULT 1200,
  player2_elo_after INTEGER NOT NULL DEFAULT 1200,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Anyone can view match history
CREATE POLICY "matches_select_all" ON public.matches FOR SELECT USING (true);

-- Only match participants can insert
CREATE POLICY "matches_insert_players" ON public.matches FOR INSERT WITH CHECK (auth.uid() IN (player1_id, player2_id));

-- Only match participants can update (for final score submission)
CREATE POLICY "matches_update_players" ON public.matches FOR UPDATE USING (auth.uid() IN (player1_id, player2_id));
