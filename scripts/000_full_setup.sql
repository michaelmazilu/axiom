-- Full database setup for Axiom (Probability mode)
-- Run this in your Supabase SQL editor for a fresh setup.

-- 1. Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  elo_probability INTEGER NOT NULL DEFAULT 1200,
  total_wins INTEGER NOT NULL DEFAULT 0,
  total_losses INTEGER NOT NULL DEFAULT 0,
  total_draws INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', 'Player')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Matches
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
CREATE POLICY "matches_select_all" ON public.matches FOR SELECT USING (true);
CREATE POLICY "matches_insert_players" ON public.matches FOR INSERT WITH CHECK (auth.uid() IN (player1_id, player2_id));
CREATE POLICY "matches_update_players" ON public.matches FOR UPDATE USING (auth.uid() IN (player1_id, player2_id));

-- 4. Matchmaking queue
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'probability' CHECK (mode IN ('probability')),
  elo INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched')),
  match_id UUID REFERENCES public.matches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, mode)
);

ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "queue_select_all" ON public.matchmaking_queue FOR SELECT USING (true);
CREATE POLICY "queue_insert_own" ON public.matchmaking_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "queue_update_authenticated" ON public.matchmaking_queue FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "queue_delete_own" ON public.matchmaking_queue FOR DELETE USING (auth.uid() = user_id);

-- 5. Challenges (friend invites)
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenged_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenges_select_participant" ON public.challenges FOR SELECT USING (auth.uid() IN (challenger_id, challenged_id));
CREATE POLICY "challenges_insert_own" ON public.challenges FOR INSERT WITH CHECK (auth.uid() = challenger_id);
CREATE POLICY "challenges_update_participant" ON public.challenges FOR UPDATE USING (auth.uid() IN (challenger_id, challenged_id));
CREATE POLICY "challenges_delete_own" ON public.challenges FOR DELETE USING (auth.uid() = challenger_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
