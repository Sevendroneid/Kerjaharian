-- KerjaHarian: durable job timing and overtime state
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS overtime_rate_per_minute integer,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_end_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS overtime_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completion_decision text;

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_duration_minutes_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_duration_minutes_check
  CHECK (duration_minutes IS NULL OR duration_minutes > 0);

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_overtime_rate_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_overtime_rate_check
  CHECK (overtime_rate_per_minute IS NULL OR overtime_rate_per_minute >= 0);

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_overtime_minutes_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_overtime_minutes_check CHECK (overtime_minutes >= 0);

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_overtime_amount_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_overtime_amount_check CHECK (overtime_amount >= 0);

ALTER TABLE public.jobs
  DROP CONSTRAINT IF EXISTS jobs_completion_decision_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_completion_decision_check
  CHECK (completion_decision IS NULL OR completion_decision IN ('finished', 'continued'));

CREATE INDEX IF NOT EXISTS idx_jobs_active_timing
  ON public.jobs(status, scheduled_end_at)
  WHERE status = 'assigned';

-- Start a job only when it is assigned and has a configured duration.
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
  RETURNING * INTO v_job;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job tidak dapat dimulai atau bukan milik pemberi kerja';
  END IF;

  RETURN v_job;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_job(uuid) TO authenticated;

-- Finish or continue after the agreed duration.
-- If continued, overtime starts from the first minute after scheduled_end_at.
CREATE OR REPLACE FUNCTION public.resolve_job_duration(
  p_job_id uuid,
  p_decision text
)
RETURNS public.jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_job public.jobs;
  v_overtime integer;
BEGIN
  IF p_decision NOT IN ('finished', 'continued') THEN
    RAISE EXCEPTION 'Decision must be finished or continued';
  END IF;

  SELECT * INTO v_job
  FROM public.jobs
  WHERE id = p_job_id AND employer_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job tidak ditemukan atau bukan milik pemberi kerja';
  END IF;

  IF v_job.started_at IS NULL OR v_job.scheduled_end_at IS NULL THEN
    RAISE EXCEPTION 'Job belum dimulai';
  END IF;

  IF p_decision = 'finished' THEN
    UPDATE public.jobs
    SET status = 'completed',
        completed_at = now(),
        completion_decision = 'finished'
    WHERE id = p_job_id
    RETURNING * INTO v_job;
  ELSE
    v_overtime := GREATEST(
      0,
      FLOOR(EXTRACT(EPOCH FROM (now() - v_job.scheduled_end_at)) / 60)::integer
    );

    UPDATE public.jobs
    SET completion_decision = 'continued',
        overtime_minutes = v_overtime,
        overtime_amount = v_overtime * COALESCE(overtime_rate_per_minute, 0)
    WHERE id = p_job_id
    RETURNING * INTO v_job;
  END IF;

  RETURN v_job;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_job_duration(uuid, text) TO authenticated;
