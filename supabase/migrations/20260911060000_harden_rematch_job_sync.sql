BEGIN;

-- Rematch is only legal before work starts. Keep the order, linked job and
-- dispatch layer atomically consistent so the released worker cannot remain
-- attached to an assigned job that has become open again.
CREATE OR REPLACE FUNCTION public.employer_request_rematch(
  p_order_id uuid,
  p_reason text
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_order public.orders;
  v_old_worker uuid;
  v_job public.jobs;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_reason NOT IN ('job_fit','worker_no_show','late','communication','safety_concern','other') THEN
    RAISE EXCEPTION 'Alasan rematch tidak valid';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
    AND employer_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pesanan tidak ditemukan atau bukan milik pemberi kerja';
  END IF;

  IF v_order.status <> 'assigned' OR v_order.worker_id IS NULL THEN
    RAISE EXCEPTION 'Rematch hanya tersedia sebelum pekerjaan dimulai';
  END IF;

  SELECT * INTO v_job
  FROM public.jobs
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pekerjaan terkait tidak ditemukan';
  END IF;

  IF v_job.status <> 'assigned' OR v_job.worker_id IS DISTINCT FROM v_order.worker_id THEN
    RAISE EXCEPTION 'Status pekerjaan tidak konsisten untuk rematch';
  END IF;

  IF v_job.started_at IS NOT NULL OR v_job.workflow_status IN ('active','overtime') THEN
    RAISE EXCEPTION 'Pekerjaan sudah dimulai; gunakan pusat resolusi';
  END IF;

  v_old_worker := v_order.worker_id;

  INSERT INTO public.order_rematch_events (
    order_id, employer_id, previous_worker_id, reason
  ) VALUES (
    v_order.id, auth.uid(), v_old_worker, p_reason
  );

  UPDATE public.dispatch_offers
  SET status = CASE WHEN status IN ('pending','offered','sent','accepted') THEN 'cancelled' ELSE status END,
      responded_at = COALESCE(responded_at, now())
  WHERE job_id = v_job.id;

  UPDATE public.jobs
  SET worker_id = NULL,
      status = 'open',
      workflow_status = NULL,
      assigned_at = NULL,
      arrival_deadline_at = NULL,
      worker_checked_in_at = NULL,
      worker_checkin_lat = NULL,
      worker_checkin_lng = NULL,
      worker_checkin_photo_path = NULL,
      employer_checked_in_at = NULL,
      employer_checkin_lat = NULL,
      employer_checkin_lng = NULL,
      employer_checkin_photo_path = NULL,
      employer_start_authorized_at = NULL,
      employer_start_authorization_mode = NULL,
      started_at = NULL,
      scheduled_end_at = NULL,
      overtime_minutes = 0,
      overtime_amount = 0,
      worker_overtime_amount = 0,
      worker_amount = worker_base_amount,
      completion_decision = NULL,
      completed_at = NULL,
      updated_at = now()
  WHERE id = v_job.id;

  UPDATE public.orders
  SET worker_id = NULL,
      status = 'open'
  WHERE id = v_order.id;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  RETURN v_order;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.employer_request_rematch(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employer_request_rematch(uuid, text) TO authenticated;

COMMIT;
