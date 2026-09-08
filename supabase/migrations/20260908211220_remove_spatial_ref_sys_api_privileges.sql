REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon;
REVOKE ALL ON TABLE public.spatial_ref_sys FROM authenticated;
REVOKE SELECT ON TABLE public.spatial_ref_sys FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_job_event(uuid,text,jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_job_event(uuid,text,jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.log_job_event(uuid,text,jsonb) FROM PUBLIC;
