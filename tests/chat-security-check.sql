-- KerjaHarian chat security regression checks (read-only).
-- Run with a privileged DB role in staging/test; do not use production credentials.
-- Expected invariants:
-- 1) public.messages has RLS enabled.
-- 2) exactly one authenticated SELECT policy and one authenticated INSERT policy exist.
-- 3) SELECT/INSERT policies require the caller to be the order employer or worker.
-- 4) sender_id must equal auth.uid().
-- 5) messages is present in supabase_realtime publication.
-- 6) order_id FK cascades message cleanup with the order.
-- 7) sender_id references auth.users.

select relrowsecurity as messages_rls_enabled
from pg_class where oid = 'public.messages'::regclass;

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'messages'
order by policyname;

select exists (
  select 1 from pg_publication_tables
  where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'messages'
) as messages_realtime_enabled;

select pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.messages'::regclass
  and contype = 'f'
order by oid;
