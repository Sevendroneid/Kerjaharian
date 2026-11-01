-- Worker acceptance creates a candidate confirmation, not an assignment.
-- The Employer explicitly confirms the candidate before the worker may travel.
CREATE OR REPLACE FUNCTION public.accept_dispatch_offer(p_offer_id uuid)
RETURNS public.jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_offer public.dispatch_offers;
  v_job public.jobs;
  v_confirmation public.dispatch_confirmations;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Login diperlukan';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'worker' AND is_online IS TRUE AND kyc_verified IS TRUE
  ) THEN
    RAISE EXCEPTION 'Mitra harus sudah terverifikasi KTP dan Online';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.jobs
    WHERE worker_id = auth.uid() AND status IN ('assigned', 'active', 'overtime')
  ) THEN
    RAISE EXCEPTION 'Selesaikan pekerjaan aktif sebelum menerima tawaran lain';
  END IF;

  UPDATE public.dispatch_confirmations
  SET status = 'expired', responded_at = now()
  WHERE worker_id = auth.uid() AND status = 'pending' AND expires_at <= now();

  IF EXISTS (
    SELECT 1 FROM public.dispatch_confirmations
    WHERE worker_id = auth.uid() AND status = 'pending' AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Anda sedang menunggu konfirmasi Employer untuk tawaran lain';
  END IF;

  -- Read the offer first without locking, then lock job before offer to match
  -- dispatch_open_job's lock order and avoid job/offer deadlocks.
  SELECT * INTO v_offer
  FROM public.dispatch_offers
  WHERE id = p_offer_id
    AND worker_id = auth.uid()
    AND status = 'offered'
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Panggilan kerja sudah tidak tersedia';
  END IF;

  SELECT * INTO v_job
  FROM public.jobs
  WHERE id = v_offer.job_id
    AND status = 'open'
    AND worker_id IS NULL
    AND (
      payment_status = 'funds_reserved'
      OR (payment_status = 'settled' AND payment_required IS TRUE)
    )
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pekerjaan tidak tersedia atau pembayaran belum terverifikasi';
  END IF;

  SELECT * INTO v_offer
  FROM public.dispatch_offers
  WHERE id = p_offer_id
    AND job_id = v_job.id
    AND worker_id = auth.uid()
    AND status = 'offered'
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Panggilan kerja sudah tidak tersedia';
  END IF;

  IF COALESCE((v_job.matching_requirements->>'confirmed')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Kebutuhan pekerjaan belum dikonfirmasi Employer';
  END IF;

  UPDATE public.dispatch_confirmations
  SET status = 'expired', responded_at = now()
  WHERE job_id = v_job.id AND status = 'pending' AND expires_at <= now();

  UPDATE public.dispatch_offers
  SET status = 'expired', responded_at = now()
  WHERE id IN (
    SELECT offer_id FROM public.dispatch_confirmations
    WHERE job_id = v_job.id AND status = 'expired'
  ) AND status = 'accepted';

  INSERT INTO public.dispatch_confirmations(job_id, offer_id, employer_id, worker_id, status, expires_at)
  VALUES (v_job.id, v_offer.id, v_job.employer_id, auth.uid(), 'pending', now() + interval '2 minutes')
  RETURNING * INTO v_confirmation;

  UPDATE public.dispatch_offers
  SET status = 'accepted', responded_at = now()
  WHERE id = v_offer.id;

  INSERT INTO public.job_events(job_id, order_id, actor_id, event_type, metadata)
  VALUES (
    v_job.id, v_job.order_id, auth.uid(), 'DISPATCH_CANDIDATE_ACCEPTED',
    jsonb_build_object(
      'offer_id', v_offer.id,
      'confirmation_id', v_confirmation.id,
      'employer_confirmation_required', true,
      'expires_at', v_confirmation.expires_at,
      'trust_tier', v_offer.trust_tier_snapshot,
      'golden_window_stage', v_offer.golden_window_stage
    )
  );

  RETURN v_job;
END;
$function$;

CREATE OR REPLACE FUNCTION public.confirm_dispatch_candidate(p_confirmation_id uuid)
RETURNS public.jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_confirmation public.dispatch_confirmations;
  v_offer public.dispatch_offers;
  v_job public.jobs;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Login diperlukan';
  END IF;

  -- Lock the job first to keep the same lock order as worker acceptance/dispatch.
  SELECT * INTO v_confirmation
  FROM public.dispatch_confirmations
  WHERE id = p_confirmation_id
    AND employer_id = auth.uid()
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Konfirmasi kandidat sudah tidak tersedia';
  END IF;

  SELECT * INTO v_job
  FROM public.jobs
  WHERE id = v_confirmation.job_id
    AND employer_id = auth.uid()
    AND status = 'open'
    AND worker_id IS NULL
    AND (
      payment_status = 'funds_reserved'
      OR (payment_status = 'settled' AND payment_required IS TRUE)
    )
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pekerjaan sudah diambil atau pembayaran tidak lagi valid';
  END IF;

  SELECT * INTO v_confirmation
  FROM public.dispatch_confirmations
  WHERE id = p_confirmation_id
    AND employer_id = auth.uid()
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Konfirmasi kandidat sudah tidak tersedia';
  END IF;

  SELECT * INTO v_offer
  FROM public.dispatch_offers
  WHERE id = v_confirmation.offer_id
    AND job_id = v_confirmation.job_id
    AND worker_id = v_confirmation.worker_id
    AND status = 'accepted'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tawaran pekerja sudah tidak tersedia';
  END IF;

  UPDATE public.jobs
  SET worker_id = v_confirmation.worker_id,
      status = 'assigned',
      workflow_status = 'assigned',
      assigned_at = COALESCE(assigned_at, now()),
      arrival_deadline_at = COALESCE(arrival_deadline_at, now() + interval '60 minutes'),
      updated_at = now()
  WHERE id = v_job.id AND status = 'open' AND worker_id IS NULL
  RETURNING * INTO v_job;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pekerjaan sudah diambil atau tidak tersedia';
  END IF;

  -- Use the job's order_id. dispatch_confirmations has no order_id column.
  IF v_job.order_id IS NOT NULL THEN
    UPDATE public.orders
    SET worker_id = v_confirmation.worker_id, status = 'assigned'
    WHERE id = v_job.order_id AND status IN ('open', 'Pending');
  END IF;

  UPDATE public.dispatch_confirmations
  SET status = 'confirmed', responded_at = now()
  WHERE id = v_confirmation.id;

  UPDATE public.dispatch_offers
  SET status = 'accepted', responded_at = COALESCE(responded_at, now())
  WHERE id = v_offer.id;

  UPDATE public.dispatch_offers
  SET status = 'cancelled', responded_at = now()
  WHERE job_id = v_job.id AND id <> v_offer.id AND status IN ('offered', 'accepted');

  UPDATE public.dispatch_confirmations
  SET status = 'expired', responded_at = now()
  WHERE job_id = v_job.id AND id <> v_confirmation.id AND status = 'pending';

  -- Count the job and apply cooldown only after Employer confirmation/assignment.
  INSERT INTO public.worker_trust_profiles(worker_id, jobs_today, jobs_today_date, cooldown_until)
  VALUES (v_confirmation.worker_id, 1, current_date, now() + interval '30 seconds')
  ON CONFLICT(worker_id) DO UPDATE
  SET jobs_today = CASE
        WHEN worker_trust_profiles.jobs_today_date = current_date THEN worker_trust_profiles.jobs_today + 1
        ELSE 1
      END,
      jobs_today_date = current_date,
      cooldown_until = now() + interval '30 seconds',
      updated_at = now();

  INSERT INTO public.job_events(job_id, order_id, actor_id, event_type, metadata)
  VALUES (
    v_job.id, v_job.order_id, auth.uid(), 'EMPLOYER_CONFIRMED_WORKER',
    jsonb_build_object('worker_id', v_confirmation.worker_id, 'confirmation_id', v_confirmation.id)
  );

  RETURN v_job;
END;
$function$;
