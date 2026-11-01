-- RLS does not protect TRUNCATE. Remove dangerous table privileges from API roles
-- on all application-owned public tables, and stop granting them by default.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT n.nspname, c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relowner = (SELECT oid FROM pg_roles WHERE rolname = 'postgres')
  LOOP
    EXECUTE format(
      'REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE %I.%I FROM PUBLIC, anon, authenticated',
      t.nspname, t.relname
    );
  END LOOP;
END;
$$;

-- These records are read-only to clients; all writes use server-side RPC/webhook paths.
REVOKE ALL PRIVILEGES ON TABLE public.dispatch_confirmations FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.worker_earning_ledger FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.worker_withdrawals FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.employer_wallet_accounts FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.employer_wallet_ledger FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.employer_wallet_topups FROM anon, authenticated;

-- Audit rows may be inserted/read by their owner, never edited or truncated by clients.
REVOKE UPDATE, DELETE ON TABLE public.ai_action_logs FROM anon, authenticated;

-- Marketplace mutations must pass through validated SECURITY DEFINER RPCs.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.jobs FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.orders FROM anon, authenticated;
REVOKE UPDATE, DELETE ON TABLE public.order_locations FROM anon, authenticated;
REVOKE DELETE ON TABLE public.profiles FROM anon, authenticated;
