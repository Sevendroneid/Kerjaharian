BEGIN;

-- These are server-side pricing worker tables. They are protected by RLS with
-- no client policies and must not carry client DML privileges either.
REVOKE SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER, TRUNCATE
  ON TABLE public.pricing_recalc_queue, public.pricing_worker_runs
  FROM PUBLIC, anon, authenticated;

COMMIT;
