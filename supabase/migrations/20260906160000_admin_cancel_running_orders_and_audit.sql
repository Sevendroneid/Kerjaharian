-- Admin operational control: cancel/remove running jobs safely without deleting financial history.
-- The admin UI calls this RPC from AdminDashboard.tsx.

CREATE OR REPLACE FUNCTION public.admin_delete_running_order(p_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_job public.jobs%ROWTYPE;
  v_order_id uuid;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_admin AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin authorization required';
  END IF;

  SELECT * INTO v_job
  FROM public.jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job tidak ditemukan';
  END IF;

  v_order_id := v_job.order_id;

  -- Stop the live workflow first. Keep the row for audit/payment reconciliation.
  UPDATE public.jobs
  SET is_deleted = true,
      status = 'cancelled',
      workflow_status = 'cancelled',
      completion_decision = 'admin_cancelled',
      completed_at = COALESCE(completed_at, now()),
      updated_at = now()
  WHERE id = p_job_id;

  IF v_order_id IS NOT NULL THEN
    UPDATE public.orders
    SET status = 'cancelled'
    WHERE id = v_order_id;
  END IF;

  INSERT INTO public.job_events(job_id, order_id, actor_id, event_type, metadata)
  VALUES (
    p_job_id,
    v_order_id,
    v_admin,
    'admin_cancelled',
    jsonb_build_object('reason','admin_dashboard','previous_status',v_job.status,'previous_workflow_status',v_job.workflow_status)
  );

  RETURN jsonb_build_object(
    'success', true,
    'job_id', p_job_id,
    'order_id', v_order_id,
    'status', 'cancelled'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_running_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_running_order(uuid) TO authenticated;
