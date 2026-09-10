REVOKE ALL ON FUNCTION public.request_job_overtime(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_job_overtime(uuid,boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_job_incident(uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_job_overtime(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_job_overtime(uuid,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_job_incident(uuid,text,text,text) TO authenticated;
