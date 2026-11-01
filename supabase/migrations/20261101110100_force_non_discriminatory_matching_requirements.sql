CREATE OR REPLACE FUNCTION public.set_job_matching_requirements(p_order_id uuid, p_requirements jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_order public.orders;
  v_requirements jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login diperlukan'; END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id AND employer_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pesanan tidak ditemukan atau bukan milik employer'; END IF;
  IF v_order.status NOT IN ('open', 'Pending') THEN
    RAISE EXCEPTION 'Kebutuhan pekerjaan hanya dapat diubah sebelum pekerja ditugaskan';
  END IF;
  IF jsonb_typeof(COALESCE(p_requirements, '{}'::jsonb)) <> 'object' THEN
    RAISE EXCEPTION 'Format kebutuhan pekerjaan tidak valid';
  END IF;

  -- Gender and age are intentionally not matching criteria.
  v_requirements := jsonb_build_object(
    'confirmed', true,
    'workers_needed', GREATEST(1, LEAST(COALESCE((p_requirements->>'workers_needed')::integer, 1), 10)),
    'gender', 'any',
    'age_min', NULL,
    'age_max', NULL,
    'heavy_lifting_kg', CASE WHEN (p_requirements->>'heavy_lifting_kg') ~ '^[0-9]+ THEN GREATEST(0, LEAST((p_requirements->>'heavy_lifting_kg')::integer, 100)) ELSE 0 END,
    'night_work', COALESCE((p_requirements->>'night_work')::boolean, false),
    'private_home', COALESCE((p_requirements->>'private_home')::boolean, false),
    'needs_tools', COALESCE((p_requirements->>'needs_tools')::boolean, false),
    'required_skill', COALESCE(NULLIF(left(p_requirements->>'required_skill', 100), ''), NULL),
    'notes', COALESCE(left(p_requirements->>'notes', 500), '')
  );

  UPDATE public.orders SET matching_requirements = v_requirements WHERE id = v_order.id;
  UPDATE public.jobs SET matching_requirements = v_requirements WHERE order_id = v_order.id AND status = 'open';

  INSERT INTO public.job_events(job_id, order_id, actor_id, event_type, metadata)
  SELECT j.id, j.order_id, auth.uid(), 'MATCHING_REQUIREMENTS_CONFIRMED', v_requirements
  FROM public.jobs j WHERE j.order_id = v_order.id;

  RETURN v_requirements;
END;
$function$;
 THEN GREATEST(0, LEAST((p_requirements->>'heavy_lifting_kg')::integer, 100)) ELSE 0 END,
    'night_work', COALESCE((p_requirements->>'night_work')::boolean, false),
    'private_home', COALESCE((p_requirements->>'private_home')::boolean, false),
    'needs_tools', COALESCE((p_requirements->>'needs_tools')::boolean, false),
    'required_skill', COALESCE(NULLIF(left(p_requirements->>'required_skill', 100), ''), NULL),
    'notes', COALESCE(left(p_requirements->>'notes', 500), '')
  );

  UPDATE public.orders SET matching_requirements = v_requirements WHERE id = v_order.id;
  UPDATE public.jobs SET matching_requirements = v_requirements WHERE order_id = v_order.id AND status = 'open';

  INSERT INTO public.job_events(job_id, order_id, actor_id, event_type, metadata)
  SELECT j.id, j.order_id, auth.uid(), 'MATCHING_REQUIREMENTS_CONFIRMED', v_requirements
  FROM public.jobs j WHERE j.order_id = v_order.id;

  RETURN v_requirements;
END;
$function$;
