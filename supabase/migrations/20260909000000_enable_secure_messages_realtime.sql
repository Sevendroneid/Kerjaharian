-- Enable Supabase Realtime for the existing messages table.
-- RLS remains the authorization boundary: only employer/worker participants
-- of the referenced order can SELECT or INSERT messages.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
