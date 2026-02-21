-- Clean up all stale matchmaking queue entries
DELETE FROM public.matchmaking_queue WHERE status = 'matched';
