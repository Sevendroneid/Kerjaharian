-- Profiles are private by RLS. Expose only safe candidate summary fields to the owning Employer.
CREATE OR REPLACE FUNCTION public.get_employer_dispatch_candidates()
RETURNS TABLE (
  id uuid,
  job_id uuid,
  worker_id uuid,
  expires_at timestamptz,
  worker jsonb,
  job jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'employer'
  ) THEN
    RAISE EXCEPTION 'Employer access required';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.job_id,
    c.worker_id,
    c.expires_at,
    jsonb_build_object(
      'full_name', p.full_name,
      'rating', p.rating,
      'jobs_done', p.jobs_done,
      'kyc_verified', p.kyc_verified
    ),
    jsonb_build_object(
      'title', j.title,
      'order_id', j.order_id
    )
  FROM public.dispatch_confirmations c
  JOIN public.profiles p ON p.id = c.worker_id
  JOIN public.jobs j ON j.id = c.job_id
  WHERE c.employer_id = auth.uid()
    AND c.status = 'pending'
    AND c.expires_at > now()
  ORDER BY c.created_at DESC
  LIMIT 10;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_employer_dispatch_candidates() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_employer_dispatch_candidates() TO authenticated;
