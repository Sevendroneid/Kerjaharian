-- SECURITY: SECURITY DEFINER timer RPCs must never be callable by PUBLIC/anon.
REVOKE EXECUTE ON FUNCTION public.claim_job(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.start_job(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.resolve_job_duration(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_job(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_job(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_job_duration(uuid,text) TO authenticated;
