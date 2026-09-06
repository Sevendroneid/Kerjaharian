-- Restore the report table used by the Admin dashboard and worker reporting flow.
CREATE TABLE IF NOT EXISTS public.job_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.job_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_all_reports ON public.job_reports;
CREATE POLICY read_all_reports ON public.job_reports
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS insert_reports ON public.job_reports;
CREATE POLICY insert_reports ON public.job_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS delete_own_reports ON public.job_reports;
CREATE POLICY delete_own_reports ON public.job_reports
  FOR DELETE TO authenticated USING (auth.uid() = reporter_id OR public.is_admin());

CREATE INDEX IF NOT EXISTS idx_reports_job ON public.job_reports(job_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.job_reports(created_at DESC);
