BEGIN;

-- Order state is authoritative and must only change through guarded server RPCs.
-- Participants retain SELECT/INSERT as already defined by RLS, but cannot
-- directly mutate status, worker assignment, totals, timestamps, or other
-- transactional columns from the browser.
REVOKE UPDATE ON TABLE public.orders FROM anon, authenticated;

COMMIT;
