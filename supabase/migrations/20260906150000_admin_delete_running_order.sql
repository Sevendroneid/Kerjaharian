CREATE OR REPLACE FUNCTION public.admin_delete_running_order(p_job_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_order_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN
    RAISE EXCEPTION 'Admin authorization required';
  END IF;
  SELECT order_id INTO v_order_id FROM public.jobs WHERE id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job tidak ditemukan'; END IF;
  DELETE FROM public.jobs WHERE id = p_job_id;
  IF v_order_id IS NOT NULL THEN DELETE FROM public.orders WHERE id = v_order_id; END IF;
  RETURN jsonb_build_object('success', true, 'job_id', p_job_id, 'order_id', v_order_id);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_delete_running_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_running_order(uuid) TO authenticated;
