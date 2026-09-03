-- KerjaHarian: allow the 15-minute warning to resolve the deal before expiry.
-- Selesai before expiry closes at the agreed deal amount (no overtime).
-- Lanjutkan before expiry keeps the job active; overtime begins only after scheduled_end_at.
-- Finishing after expiry settles base wage + accumulated overtime.

CREATE OR REPLACE FUNCTION public.resolve_job_duration(
  p_job_id uuid,
  p_decision text
)
RETURNS public.jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_job public.jobs;
  v_now timestamptz := now();
  v_overtime integer := 0;
  v_overtime_amount integer := 0;
  v_worker_base integer := 0;
  v_worker_amount integer := 0;
  v_platform_fee integer := 0;
  v_protection_fee integer := 0;
  v_tax_amount integer := 0;
  v_employer_total integer := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'employer'
  ) THEN
    RAISE EXCEPTION 'Akses pemberi kerja diperlukan';
  END IF;

  IF p_decision NOT IN ('finished','continued') THEN
    RAISE EXCEPTION 'Keputusan tidak valid';
  END IF;

  SELECT * INTO v_job
  FROM public.jobs
  WHERE id = p_job_id AND employer_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan tidak ditemukan'; END IF;
  IF v_job.status <> 'assigned' THEN RAISE EXCEPTION 'Pekerjaan belum dalam status aktif'; END IF;
  IF v_job.started_at IS NULL OR v_job.scheduled_end_at IS NULL THEN RAISE EXCEPTION 'Pekerjaan belum dimulai'; END IF;

  v_worker_base := GREATEST(0, COALESCE(v_job.wage, 0));
  v_platform_fee := GREATEST(0, COALESCE(v_job.platform_fee, COALESCE((v_job.fee_breakdown->>'platform')::integer, 0)));
  v_protection_fee := GREATEST(0, COALESCE(v_job.protection_fee, COALESCE((v_job.fee_breakdown->>'insurance')::integer, 0)));
  v_tax_amount := GREATEST(0, COALESCE(v_job.tax_amount, COALESCE((v_job.fee_breakdown->>'tax')::integer, 0)));

  -- Selesai before expiry: close at the original deal amount. No overtime.
  IF p_decision = 'finished' AND v_now < v_job.scheduled_end_at THEN
    v_worker_amount := v_worker_base;
    v_employer_total := v_worker_amount + v_platform_fee + v_protection_fee + v_tax_amount;

    UPDATE public.jobs
    SET overtime_minutes = 0,
        overtime_amount = 0,
        worker_base_amount = v_worker_base,
        worker_overtime_amount = 0,
        worker_amount = v_worker_amount,
        platform_fee = v_platform_fee,
        protection_fee = v_protection_fee,
        tax_amount = v_tax_amount,
        employer_total = v_employer_total,
        completion_decision = 'finished',
        final_amount = v_employer_total,
        payment_status = 'pending',
        completed_at = v_now,
        status = 'completed'
    WHERE id = p_job_id
    RETURNING * INTO v_job;

    IF v_job.order_id IS NOT NULL THEN
      UPDATE public.orders
      SET status = 'Completed', total = v_employer_total
      WHERE id = v_job.order_id;
    END IF;

    RETURN v_job;
  END IF;

  -- Lanjutkan before expiry: remember the decision, but do not create overtime yet.
  IF p_decision = 'continued' AND v_now < v_job.scheduled_end_at THEN
    UPDATE public.jobs
    SET completion_decision = 'continued'
    WHERE id = p_job_id
    RETURNING * INTO v_job;
    RETURN v_job;
  END IF;

  -- At/after expiry, overtime is counted from the first full minute after scheduled_end_at.
  v_overtime := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_now - v_job.scheduled_end_at)) / 60)::integer);
  v_overtime_amount := v_overtime * COALESCE(v_job.overtime_rate_per_minute, 0);

  IF p_decision = 'continued' THEN
    UPDATE public.jobs
    SET overtime_minutes = v_overtime,
        overtime_amount = v_overtime_amount,
        worker_base_amount = v_worker_base,
        worker_overtime_amount = v_overtime_amount,
        worker_amount = v_worker_base + v_overtime_amount,
        platform_fee = v_platform_fee,
        protection_fee = v_protection_fee,
        tax_amount = v_tax_amount,
        employer_total = v_worker_base + v_overtime_amount + v_platform_fee + v_protection_fee + v_tax_amount,
        completion_decision = 'continued'
    WHERE id = p_job_id
    RETURNING * INTO v_job;
    RETURN v_job;
  END IF;

  -- Selesai after expiry: settle base wage plus all overtime accumulated so far.
  v_worker_amount := v_worker_base + v_overtime_amount;
  v_employer_total := v_worker_amount + v_platform_fee + v_protection_fee + v_tax_amount;

  UPDATE public.jobs
  SET overtime_minutes = v_overtime,
      overtime_amount = v_overtime_amount,
      worker_base_amount = v_worker_base,
      worker_overtime_amount = v_overtime_amount,
      worker_amount = v_worker_amount,
      platform_fee = v_platform_fee,
      protection_fee = v_protection_fee,
      tax_amount = v_tax_amount,
      employer_total = v_employer_total,
      completion_decision = 'finished',
      final_amount = v_employer_total,
      payment_status = 'pending',
      completed_at = v_now,
      status = 'completed'
  WHERE id = p_job_id
  RETURNING * INTO v_job;

  IF v_job.order_id IS NOT NULL THEN
    UPDATE public.orders
    SET status = 'Completed', total = v_employer_total
    WHERE id = v_job.order_id;
  END IF;

  RETURN v_job;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_job_duration(uuid, text) TO authenticated;
