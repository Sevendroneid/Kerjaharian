BEGIN;

-- Assignment-time attendance window. This is deliberately measured from assignment,
-- because the current catalog does not expose a separate scheduled-start field.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS arrival_deadline_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_jobs_arrival_deadline
  ON public.jobs(arrival_deadline_at)
  WHERE status = 'assigned' AND started_at IS NULL AND worker_id IS NOT NULL;

-- Recreate the two controlled assignment paths so every accepted/claimed job receives
-- the same server-side attendance deadline and cannot manufacture its own timestamp.
CREATE OR REPLACE FUNCTION public.claim_job(p_job_id uuid)
RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_job public.jobs;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login diperlukan'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='worker' AND is_online=true AND kyc_verified=true) THEN
    RAISE EXCEPTION 'Mitra harus sudah terverifikasi KTP dan Online';
  END IF;
  UPDATE public.jobs
  SET worker_id=auth.uid(), status='assigned', workflow_status='assigned',
      assigned_at=COALESCE(assigned_at,now()), arrival_deadline_at=COALESCE(arrival_deadline_at,now()+interval '60 minutes'), updated_at=now()
  WHERE id=p_job_id AND status='open' AND worker_id IS NULL
  RETURNING * INTO v_job;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan sudah diambil mitra lain'; END IF;
  IF v_job.order_id IS NOT NULL THEN UPDATE public.orders SET worker_id=auth.uid(),status='assigned' WHERE id=v_job.order_id AND status IN ('open','Pending'); END IF;
  INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata) VALUES(v_job.id,v_job.order_id,auth.uid(),'JOB_CLAIMED',jsonb_build_object('source','claim_job','arrival_deadline_at',v_job.arrival_deadline_at));
  RETURN v_job;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_dispatch_offer(p_offer_id uuid)
RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_offer public.dispatch_offers; v_job public.jobs;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login diperlukan'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='worker' AND is_online=true AND kyc_verified=true) THEN RAISE EXCEPTION 'Mitra harus sudah terverifikasi KTP dan Online'; END IF;
  SELECT * INTO v_offer FROM public.dispatch_offers WHERE id=p_offer_id AND worker_id=auth.uid() AND status='offered' AND expires_at>now() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Panggilan kerja sudah tidak tersedia'; END IF;
  UPDATE public.jobs SET worker_id=auth.uid(),status='assigned',workflow_status='assigned',assigned_at=COALESCE(assigned_at,now()),arrival_deadline_at=COALESCE(arrival_deadline_at,now()+interval '60 minutes'),updated_at=now()
  WHERE id=v_offer.job_id AND status='open' AND worker_id IS NULL RETURNING * INTO v_job;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan sudah diambil mitra lain'; END IF;
  IF v_job.order_id IS NOT NULL THEN UPDATE public.orders SET worker_id=auth.uid(),status='assigned' WHERE id=v_job.order_id AND status IN ('open','Pending'); END IF;
  UPDATE public.dispatch_offers SET status='accepted',responded_at=now() WHERE id=v_offer.id;
  UPDATE public.dispatch_offers SET status='cancelled',responded_at=now() WHERE job_id=v_offer.job_id AND id<>v_offer.id AND status='offered';
  INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata) VALUES(v_job.id,v_job.order_id,auth.uid(),'DISPATCH_ACCEPTED',jsonb_build_object('offer_id',v_offer.id,'arrival_deadline_at',v_job.arrival_deadline_at));
  RETURN v_job;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_job(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_dispatch_offer(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_job(uuid) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.accept_dispatch_offer(uuid) FROM PUBLIC,anon;

-- Idempotent no-show detector. It never bans/suspends a worker; it records a reliability
-- signal and cancels only an assigned, not-started job whose arrival window has expired.
CREATE OR REPLACE FUNCTION public.detect_expired_worker_arrivals()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_count integer := 0; v_job public.jobs;
BEGIN
  FOR v_job IN
    SELECT * FROM public.jobs
    WHERE status='assigned' AND worker_id IS NOT NULL AND started_at IS NULL
      AND arrival_deadline_at IS NOT NULL AND arrival_deadline_at < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.jobs
      SET status='cancelled', workflow_status='cancelled', cancellation_actor='system',
          cancellation_reason='worker_arrival_deadline_expired', cancelled_at=now(), updated_at=now()
    WHERE id=v_job.id AND status='assigned' AND started_at IS NULL;
    IF FOUND THEN
      INSERT INTO public.job_reliability_events(job_id,worker_id,employer_id,actor_id,event_type,severity,metadata)
      VALUES(v_job.id,v_job.worker_id,v_job.employer_id,NULL,'worker_no_show',3,jsonb_build_object('arrival_deadline_at',v_job.arrival_deadline_at,'detected_at',now(),'automatic',true));
      INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata)
      VALUES(v_job.id,v_job.order_id,NULL,'WORKER_NO_SHOW_DETECTED',jsonb_build_object('arrival_deadline_at',v_job.arrival_deadline_at,'automatic',true));
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.detect_expired_worker_arrivals() TO authenticated;

-- Supabase environments that enable pg_cron run this every five minutes. The function
-- itself is safe to call repeatedly because only still-assigned jobs can transition.
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname='kerjaharian-worker-no-show-detector';
SELECT cron.schedule('kerjaharian-worker-no-show-detector','*/5 * * * *','select public.detect_expired_worker_arrivals();');

COMMIT;