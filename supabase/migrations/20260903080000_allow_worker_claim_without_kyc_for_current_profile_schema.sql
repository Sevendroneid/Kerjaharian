CREATE OR REPLACE FUNCTION public.claim_job(p_job_id uuid)
RETURNS public.jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_job public.jobs;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'worker'
      AND is_online = true
  ) THEN
    RAISE EXCEPTION 'Mitra harus berstatus online untuk mengambil pekerjaan';
  END IF;

  UPDATE public.jobs
  SET worker_id = auth.uid(),
      status = 'assigned'
  WHERE id = p_job_id
    AND status = 'open'
    AND worker_id IS NULL
  RETURNING * INTO v_job;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pekerjaan sudah diambil atau tidak tersedia';
  END IF;

  IF v_job.order_id IS NOT NULL THEN
    UPDATE public.orders
    SET worker_id = auth.uid(),
        status = 'assigned'
    WHERE id = v_job.order_id
      AND status IN ('open', 'Pending');
  END IF;

  RETURN v_job;
END;
$function$;
