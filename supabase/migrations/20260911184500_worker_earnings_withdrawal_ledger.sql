BEGIN;

-- Worker earnings ledger: payment events create accounting records here; this is
-- not a wallet top-up system and does not give employers a stored balance.
CREATE TABLE IF NOT EXISTS public.worker_earning_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  midtrans_order_id text,
  midtrans_transaction_id text,
  entry_type text NOT NULL CHECK (entry_type IN ('job_credit','job_reversal','withdrawal_debit','withdrawal_reversal','adjustment')),
  status text NOT NULL CHECK (status IN ('pending','posted','review','reversed')),
  amount integer NOT NULL CHECK (amount >= 0),
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  posted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS worker_earning_job_credit_uq
  ON public.worker_earning_ledger(job_id, entry_type)
  WHERE job_id IS NOT NULL AND entry_type = 'job_credit';
CREATE UNIQUE INDEX IF NOT EXISTS worker_earning_withdrawal_debit_uq
  ON public.worker_earning_ledger((metadata->>'withdrawal_id'))
  WHERE entry_type = 'withdrawal_debit' AND metadata ? 'withdrawal_id';
CREATE INDEX IF NOT EXISTS worker_earning_worker_idx
  ON public.worker_earning_ledger(worker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS worker_earning_job_idx
  ON public.worker_earning_ledger(job_id, created_at DESC);

ALTER TABLE public.worker_earning_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS worker_earning_select_own ON public.worker_earning_ledger;
CREATE POLICY worker_earning_select_own ON public.worker_earning_ledger
  FOR SELECT TO authenticated
  USING (worker_id = auth.uid() OR is_admin());
REVOKE INSERT, UPDATE, DELETE ON public.worker_earning_ledger FROM anon, authenticated;

-- Withdrawal request ledger. There is deliberately no employer top-up/wallet.
CREATE TABLE IF NOT EXISTS public.worker_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount integer NOT NULL CHECK (amount > 0),
  payout_method text NOT NULL CHECK (payout_method IN ('bank_transfer','ewallet','cash')),
  destination_name text,
  destination_account text,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','processing','paid','rejected','cancelled')),
  rejection_reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  paid_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS worker_withdrawals_worker_idx
  ON public.worker_withdrawals(worker_id, requested_at DESC);
ALTER TABLE public.worker_withdrawals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS worker_withdrawals_select_own ON public.worker_withdrawals;
CREATE POLICY worker_withdrawals_select_own ON public.worker_withdrawals
  FOR SELECT TO authenticated
  USING (worker_id = auth.uid() OR is_admin());
REVOKE INSERT, UPDATE, DELETE ON public.worker_withdrawals FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_worker_earnings()
RETURNS TABLE(available integer, pending integer, reserved integer, paid integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login diperlukan'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='worker') THEN
    RAISE EXCEPTION 'Akses pekerja diperlukan';
  END IF;
  RETURN QUERY
  WITH credits AS (
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE entry_type='job_credit' AND status='posted'),0)::integer AS posted_credit,
      COALESCE(SUM(amount) FILTER (WHERE entry_type='job_credit' AND status='pending'),0)::integer AS pending_credit,
      COALESCE(SUM(amount) FILTER (WHERE entry_type='job_reversal' AND status='posted'),0)::integer AS reversals,
      COALESCE(SUM(amount) FILTER (WHERE entry_type='withdrawal_debit' AND status='posted'),0)::integer AS withdrawals
    FROM public.worker_earning_ledger WHERE worker_id=auth.uid()
  ), reserved_rows AS (
    SELECT COALESCE(SUM(amount),0)::integer AS reserved_amount
    FROM public.worker_withdrawals
    WHERE worker_id=auth.uid() AND status IN ('requested','approved','processing')
  )
  SELECT GREATEST(0, c.posted_credit-c.reversals-c.withdrawals-r.reserved_amount),
         c.pending_credit,
         r.reserved_amount,
         c.withdrawals
  FROM credits c CROSS JOIN reserved_rows r;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_worker_earnings() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_worker_earnings() FROM anon;

CREATE OR REPLACE FUNCTION public.request_worker_withdrawal(
  p_amount integer,
  p_payout_method text,
  p_destination_name text DEFAULT NULL,
  p_destination_account text DEFAULT NULL
)
RETURNS public.worker_withdrawals
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_available integer; v_withdrawal public.worker_withdrawals;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login diperlukan'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='worker') THEN RAISE EXCEPTION 'Akses pekerja diperlukan'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Nominal penarikan tidak valid'; END IF;
  IF p_payout_method NOT IN ('bank_transfer','ewallet','cash') THEN RAISE EXCEPTION 'Metode pencairan tidak valid'; END IF;
  SELECT available INTO v_available FROM public.get_worker_earnings();
  IF p_amount > v_available THEN RAISE EXCEPTION 'Saldo yang dapat ditarik tidak mencukupi'; END IF;
  INSERT INTO public.worker_withdrawals(worker_id,amount,payout_method,destination_name,destination_account)
  VALUES(auth.uid(),p_amount,p_payout_method,NULLIF(trim(p_destination_name),''),NULLIF(trim(p_destination_account),''))
  RETURNING * INTO v_withdrawal;
  RETURN v_withdrawal;
END;
$$;
GRANT EXECUTE ON FUNCTION public.request_worker_withdrawal(integer,text,text,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.request_worker_withdrawal(integer,text,text,text) FROM anon;

-- When an approved payout is marked paid, create exactly one debit entry.
CREATE OR REPLACE FUNCTION public.sync_worker_withdrawal_paid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
BEGIN
  IF NEW.status='paid' AND COALESCE(OLD.status,'')<>'paid' THEN
    INSERT INTO public.worker_earning_ledger(worker_id,entry_type,status,amount,description,metadata,created_at,posted_at)
    VALUES(NEW.worker_id,'withdrawal_debit','posted',NEW.amount,'Pencairan penghasilan',jsonb_build_object('withdrawal_id',NEW.id),COALESCE(NEW.paid_at,now()),COALESCE(NEW.paid_at,now()))
    ON CONFLICT DO NOTHING;
    NEW.paid_at := COALESCE(NEW.paid_at,now());
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_worker_withdrawal_paid ON public.worker_withdrawals;
CREATE TRIGGER trg_sync_worker_withdrawal_paid
BEFORE UPDATE OF status ON public.worker_withdrawals
FOR EACH ROW EXECUTE FUNCTION public.sync_worker_withdrawal_paid();

COMMIT;
