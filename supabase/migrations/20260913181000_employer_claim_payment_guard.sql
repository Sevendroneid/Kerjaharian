CREATE OR REPLACE FUNCTION public.claim_job(p_job_id uuid)
RETURNS public.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_job public.jobs;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='worker' AND is_online=true) THEN
    RAISE EXCEPTION 'Mitra harus berprofil pekerja dan Online';
  END IF;
  UPDATE public.jobs SET worker_id=auth.uid(),status='assigned',updated_at=now()
  WHERE id=p_job_id AND status='open' AND worker_id IS NULL
    AND (payment_required=false OR payment_status='settled')
  RETURNING * INTO v_job;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan belum dibayar atau sudah diambil mitra lain'; END IF;
  IF v_job.order_id IS NOT NULL THEN
    UPDATE public.orders SET worker_id=auth.uid(),status='assigned'
    WHERE id=v_job.order_id AND status IN ('open','Pending');
  END IF;
  RETURN v_job;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_job(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_job(uuid) FROM anon;
