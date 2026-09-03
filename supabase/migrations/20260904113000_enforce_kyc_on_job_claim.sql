CREATE OR REPLACE FUNCTION public.claim_job(p_job_id uuid)
RETURNS public.jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE v_job public.jobs;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'worker' AND is_online = true AND kyc_verified = true
  ) THEN
    RAISE EXCEPTION 'Mitra harus sudah terverifikasi KTP dan Online';
  END IF;
  UPDATE public.jobs
  SET worker_id = auth.uid(), status = 'assigned', updated_at = now()
  WHERE id = p_job_id AND status = 'open' AND worker_id IS NULL
  RETURNING * INTO v_job;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan sudah diambil atau tidak tersedia'; END IF;
  IF v_job.order_id IS NOT NULL THEN
    UPDATE public.orders SET worker_id = auth.uid(), status = 'assigned'
    WHERE id = v_job.order_id AND status IN ('open','Pending');
  END IF;
  RETURN v_job;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_job(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_job(uuid) TO authenticated, service_role;
