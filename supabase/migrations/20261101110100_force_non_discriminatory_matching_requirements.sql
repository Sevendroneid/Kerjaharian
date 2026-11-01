CREATE OR REPLACE FUNCTION public.set_job_matching_requirements(p_order_id uuid, p_requirements jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_order public.orders;
  v_requirements jsonb;
  v_workers_needed integer := 1;
  v_heavy_lifting integer := 0;
  v_night_work boolean := false;
  v_private_home boolean := false;
  v_needs_tools boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Login diperlukan';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id AND employer_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pesanan tidak ditemukan atau bukan milik employer';
  END IF;
  IF v_order.status NOT IN ('open', 'Pending') THEN
    RAISE EXCEPTION 'Kebutuhan pekerjaan hanya dapat diubah sebelum pekerja ditugaskan';
  END IF;
  IF jsonb_typeof(COALESCE(p_requirements, '{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'Format kebutuhan pekerjaan tidak valid';
  END IF;

  IF COALESCE(p_requirements->>'workers_needed', '') ~ '^[0-9]+$' THEN
    v_workers_needed := GREATEST(1, LEAST((p_requirements->>'workers_needed')::integer, 10));
  END IF;
  IF COALESCE(p_requirements->>'heavy_lifting_kg', '') ~ '^[0-9]+$' THEN
    v_heavy_lifting := GREATEST(0, LEAST((p_requirements->>'heavy_lifting_kg')::integer, 100));
  END IF;
  v_night_work := lower(COALESCE(p_requirements->>'night_work', 'false')) = 'true';
  v_private_home := lower(COALESCE(p_requirements->>'private_home', 'false')) = 'true';
  v_needs_tools := lower(COALESCE(p_requirements->>'needs_tools', 'false')) = 'true';

  -- Gender and age are intentionally not matching criteria.
  v_requirements := jsonb_build_object(
    'confirmed', true,
    'workers_needed', v_workers_needed,
    'gender', 'any',
    'age_min', NULL,
    'age_max', NULL,
    'heavy_lifting_kg', v_heavy_lifting,
    'night_work', v_night_work,
    'private_home', v_private_home,
    'needs_tools', v_needs_tools,
    'required_skill', COALESCE(NULLIF(left(p_requirements->>'required_skill', 100), ''), NULL),
    'notes', COALESCE(left(p_requirements->>'notes', 500), ''),
    'payment_gate', v_order.matching_requirements->'payment_gate'
  );

  UPDATE public.orders
  SET matching_requirements = v_requirements
  WHERE id = v_order.id;

  UPDATE public.jobs
  SET matching_requirements = v_requirements
  WHERE order_id = v_order.id AND status = 'open';

  INSERT INTO public.job_events(job_id, order_id, actor_id, event_type, metadata)
  SELECT j.id, j.order_id, auth.uid(), 'MATCHING_REQUIREMENTS_CONFIRMED', v_requirements
  FROM public.jobs j
  WHERE j.order_id = v_order.id;

  RETURN v_requirements;
END;
$function$;
