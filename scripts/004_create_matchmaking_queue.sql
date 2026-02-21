-- Matchmaking queue
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

-- Anyone can view the queue (needed for matchmaking)
CREATE POLICY "queue_select_all" ON public.matchmaking_queue FOR SELECT USING (true);

-- Users can only add themselves to the queue
CREATE POLICY "queue_insert_own" ON public.matchmaking_queue FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Any authenticated user can update queue entries (matchmaking marks opponent as matched)
CREATE POLICY "queue_update_authenticated" ON public.matchmaking_queue FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Users can only remove themselves from the queue
CREATE POLICY "queue_delete_own" ON public.matchmaking_queue FOR DELETE USING (auth.uid() = user_id);
