-- Connect the durable timer to the worker who accepted the job.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS worker_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_worker_status ON public.jobs(worker_id, status) WHERE worker_id IS NOT NULL;

-- Worker claims one open job atomically. Employer ownership remains protected by RLS;
-- this function is the controlled path for worker assignment.
CREATE OR REPLACE FUNCTION public.claim_job(p_job_id uuid)
RETURNS public.jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_job public.jobs;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'worker'
      AND kyc_verified = true
      AND is_online = true
  ) THEN
    RAISE EXCEPTION 'Worker harus terverifikasi dan online';
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

  RETURN v_job;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_job(uuid) TO authenticated;

-- Starting remains employer-controlled: the employer confirms the real start.
-- The timer itself is server-clock based.
CREATE OR REPLACE FUNCTION public.start_job(p_job_id uuid)
RETURNS public.jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_job public.jobs;
BEGIN
  UPDATE public.jobs
  SET started_at = COALESCE(started_at, now()),
      scheduled_end_at = COALESCE(
        scheduled_end_at,
        now() + make_interval(mins => duration_minutes)
      )
  WHERE id = p_job_id
    AND status = 'assigned'
    AND duration_minutes IS NOT NULL
    AND duration_minutes > 0
    AND employer_id = auth.uid()
    AND worker_id IS NOT NULL
  RETURNING * INTO v_job;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job tidak dapat dimulai, belum ada pekerja, atau bukan milik pemberi kerja';
  END IF;

  RETURN v_job;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_job(uuid) TO authenticated;
