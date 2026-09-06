-- Admin-only destructive cleanup for a running order/job.
-- This is intentionally exposed only through a SECURITY DEFINER RPC and never
-- through a client-side DELETE policy.
CREATE OR REPLACE FUNCTION public.admin_delete_running_order(p_job_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_order_id uuid;
  v_status text;
  v_workflow text;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_admin AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  SELECT j.order_id, j.status, j.workflow_status
    INTO v_order_id, v_status, v_workflow
  FROM public.jobs j
  WHERE j.id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found';
  END IF;

  -- Delete job first: job_events and dispatch_offers cascade from jobs.
  DELETE FROM public.jobs WHERE id = p_job_id;

  -- The legacy order relation does not cascade reviews, so remove those
  -- dependent rows explicitly before removing the order itself.
  IF v_order_id IS NOT NULL THEN
    DELETE FROM public.reviews WHERE order_id = v_order_id;
    DELETE FROM public.orders WHERE id = v_order_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'job_id', p_job_id,
    'order_id', v_order_id,
    'previous_status', v_status,
    'previous_workflow_status', v_workflow
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_running_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_running_order(uuid) TO authenticated;
