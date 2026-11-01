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

  -- Employer payment is prepaid, but worker earnings remain pending until completion.
  IF v_job.payment_required IS TRUE
     AND v_job.payment_status = 'settled'
     AND COALESCE(v_job.worker_amount, 0) > 0 THEN
    INSERT INTO public.worker_earning_ledger(
      worker_id, job_id, order_id, midtrans_order_id, midtrans_transaction_id,
      entry_type, status, amount, description, metadata, posted_at
    )
    VALUES (
      v_confirmation.worker_id, v_job.id, v_job.order_id,
      v_job.midtrans_order_id, v_job.midtrans_transaction_id,
      'job_credit', 'pending', GREATEST(0, v_job.worker_amount),
      'Penghasilan menunggu pekerjaan selesai',
      jsonb_build_object('funding_model', 'midtrans_prepaid', 'payment_status', v_job.payment_status),
      NULL
    )
    ON CONFLICT (job_id, entry_type) DO NOTHING;
  END IF;

  INSERT INTO public.job_events(job_id, order_id, actor_id, event_type, metadata)
  VALUES (
    v_job.id, v_job.order_id, auth.uid(), 'EMPLOYER_CONFIRMED_WORKER',
    jsonb_build_object('worker_id', v_confirmation.worker_id, 'confirmation_id', v_confirmation.id)
  );

  RETURN v_job;
END;
$function$;

-- Promote a prepaid worker earning only after the job is completed.
CREATE OR REPLACE FUNCTION public.post_worker_earning_on_job_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF lower(COALESCE(NEW.status, '')) = 'completed'
     AND lower(COALESCE(OLD.status, '')) IS DISTINCT FROM lower(COALESCE(NEW.status, ''))
     AND NEW.worker_id IS NOT NULL
     AND NEW.payment_required IS TRUE
     AND NEW.payment_status = 'settled'
     AND COALESCE(NEW.worker_amount, 0) > 0 THEN
    INSERT INTO public.worker_earning_ledger(
      worker_id, job_id, order_id, midtrans_order_id, midtrans_transaction_id,
      entry_type, status, amount, description, metadata, posted_at
    )
    VALUES (
      NEW.worker_id, NEW.id, NEW.order_id, NEW.midtrans_order_id, NEW.midtrans_transaction_id,
      'job_credit', 'posted', GREATEST(0, NEW.worker_amount),
      'Penghasilan tersedia setelah pekerjaan selesai',
      jsonb_build_object('funding_model', 'midtrans_prepaid', 'completed_at', now()),
      now()
    )
    ON CONFLICT (job_id, entry_type) DO UPDATE
    SET worker_id = EXCLUDED.worker_id,
        order_id = EXCLUDED.order_id,
        amount = EXCLUDED.amount,
        status = 'posted',
        description = EXCLUDED.description,
        metadata = COALESCE(public.worker_earning_ledger.metadata, '{}'::jsonb)
                   || jsonb_build_object('completed_at', now()),
        posted_at = COALESCE(public.worker_earning_ledger.posted_at, now())
    WHERE public.worker_earning_ledger.status = 'pending';
  ELSIF lower(COALESCE(NEW.status, '')) IN ('cancelled', 'canceled')
     AND lower(COALESCE(OLD.status, '')) IS DISTINCT FROM lower(COALESCE(NEW.status, '')) THEN
    UPDATE public.worker_earning_ledger
    SET status = 'review',
        description = 'Pekerjaan dibatalkan; penghasilan menunggu resolusi',
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('cancelled_at', now())
    WHERE job_id = NEW.id
      AND entry_type = 'job_credit'
      AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_post_worker_earning_on_job_completion ON public.jobs;
CREATE TRIGGER trg_post_worker_earning_on_job_completion
AFTER UPDATE OF status ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.post_worker_earning_on_job_completion();

REVOKE ALL ON FUNCTION public.post_worker_earning_on_job_completion() FROM PUBLIC, anon, authenticated;
