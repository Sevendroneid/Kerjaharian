-- Admin-only hard deletion for a running job/order.
-- The RPC verifies that both linked records are actually gone before returning success.
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
  IF v_admin IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = v_admin AND p.role = 'admin') THEN
    RAISE EXCEPTION 'Admin authorization required';
  END IF;

  SELECT j.order_id, j.status, j.workflow_status INTO v_order_id, v_status, v_workflow
  FROM public.jobs j WHERE j.id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job tidak ditemukan'; END IF;

  IF v_order_id IS NOT NULL THEN
    DELETE FROM public.reviews WHERE order_id = v_order_id;
    DELETE FROM public.orders WHERE id = v_order_id;
  END IF;
  DELETE FROM public.jobs WHERE id = p_job_id;

  IF EXISTS (SELECT 1 FROM public.jobs WHERE id = p_job_id) THEN
    RAISE EXCEPTION 'Job masih ada setelah penghapusan';
  END IF;
  IF v_order_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.orders WHERE id = v_order_id) THEN
    RAISE EXCEPTION 'Order masih ada setelah penghapusan';
  END IF;

  RETURN jsonb_build_object('success', true, 'job_id', p_job_id, 'order_id', v_order_id,
    'previous_status', v_status, 'previous_workflow_status', v_workflow);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_delete_running_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_running_order(uuid) TO authenticated;
