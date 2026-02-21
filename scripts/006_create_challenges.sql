-- Friend challenge invites
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenged_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Participants can view their own challenges
CREATE POLICY "challenges_select_participant" ON public.challenges
  FOR SELECT USING (auth.uid() IN (challenger_id, challenged_id));

-- Authenticated users can create challenges (challenger must be self)
CREATE POLICY "challenges_insert_own" ON public.challenges
  FOR INSERT WITH CHECK (auth.uid() = challenger_id);

-- Participants can update challenges (accept/decline)
CREATE POLICY "challenges_update_participant" ON public.challenges
  FOR UPDATE USING (auth.uid() IN (challenger_id, challenged_id));

-- Challenger can delete/cancel their own pending challenges
CREATE POLICY "challenges_delete_own" ON public.challenges
  FOR DELETE USING (auth.uid() = challenger_id);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
