BEGIN;

-- Payment state is separate from job workflow state. This is a post-completion payment flow;
-- Midtrans settlement is NOT represented as a legal escrow account.
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_payment_status_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_payment_status_check CHECK (
  payment_status IS NULL OR payment_status IN ('pending','settled','cancelled','refunded','partial_refund')
);

CREATE TABLE IF NOT EXISTS public.job_payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  midtrans_order_id text NOT NULL,
  transaction_id text,
  transaction_status text NOT NULL,
  gross_amount integer NOT NULL CHECK (gross_amount >= 0),
  payment_status text NOT NULL CHECK (payment_status IN ('pending','settled','cancelled','refunded','partial_refund')),
  event_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS job_payment_events_job_idx ON public.job_payment_events(job_id,event_at DESC);
CREATE INDEX IF NOT EXISTS job_payment_events_order_idx ON public.job_payment_events(midtrans_order_id,event_at DESC);
ALTER TABLE public.job_payment_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_events_participant_select ON public.job_payment_events;
CREATE POLICY payment_events_participant_select ON public.job_payment_events FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id=job_id AND (j.employer_id=auth.uid() OR j.worker_id=auth.uid() OR is_admin())));
REVOKE INSERT, UPDATE, DELETE ON public.job_payment_events FROM anon, authenticated;

-- Direct worker claim must obey the same reliability cap/cooldown used by dispatch offers.
CREATE OR REPLACE FUNCTION public.claim_job(p_job_id uuid)
RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_job public.jobs; v_jobs_today integer; v_cooldown timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login diperlukan'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='worker' AND is_online=true AND kyc_verified=true) THEN
    RAISE EXCEPTION 'Mitra harus sudah terverifikasi KTP dan Online';
  END IF;
  INSERT INTO public.worker_trust_profiles(worker_id,jobs_today,jobs_today_date,cooldown_until)
  VALUES(auth.uid(),0,current_date,NULL)
  ON CONFLICT(worker_id) DO NOTHING;
  SELECT jobs_today,cooldown_until INTO v_jobs_today,v_cooldown FROM public.worker_trust_profiles WHERE worker_id=auth.uid() FOR UPDATE;
  IF COALESCE(v_cooldown,'epoch'::timestamptz)>now() THEN RAISE EXCEPTION 'Mitra masih dalam jeda pengambilan pekerjaan'; END IF;
  IF COALESCE((SELECT jobs_today FROM public.worker_trust_profiles WHERE worker_id=auth.uid() AND jobs_today_date=current_date),0)>=10 THEN RAISE EXCEPTION 'Batas 10 pekerjaan per hari tercapai'; END IF;

  UPDATE public.jobs SET worker_id=auth.uid(),status='assigned',workflow_status='assigned',assigned_at=COALESCE(assigned_at,now()),arrival_deadline_at=COALESCE(arrival_deadline_at,now()+interval '60 minutes'),updated_at=now()
  WHERE id=p_job_id AND status='open' AND worker_id IS NULL RETURNING * INTO v_job;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan sudah diambil mitra lain'; END IF;
  IF v_job.order_id IS NOT NULL THEN UPDATE public.orders SET worker_id=auth.uid(),status='assigned' WHERE id=v_job.order_id AND status IN ('open','Pending'); END IF;
  UPDATE public.worker_trust_profiles SET jobs_today=CASE WHEN jobs_today_date=current_date THEN jobs_today+1 ELSE 1 END,jobs_today_date=current_date,cooldown_until=now()+interval '30 seconds',updated_at=now() WHERE worker_id=auth.uid();
  INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata) VALUES(v_job.id,v_job.order_id,auth.uid(),'JOB_CLAIMED',jsonb_build_object('source','claim_job','arrival_deadline_at',v_job.arrival_deadline_at,'daily_cap',10,'cooldown_seconds',30));
  RETURN v_job;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_job(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_job(uuid) FROM PUBLIC,anon;

CREATE UNIQUE INDEX IF NOT EXISTS job_payment_events_idempotency_idx
  ON public.job_payment_events(midtrans_order_id,COALESCE(transaction_id,''),transaction_status);

COMMIT;
