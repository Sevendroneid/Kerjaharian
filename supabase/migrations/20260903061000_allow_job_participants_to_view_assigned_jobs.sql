-- Timer data must be readable by the employer and worker participating in the job.
DROP POLICY IF EXISTS "Public view active jobs" ON public.jobs;
CREATE POLICY "Public view active jobs" ON public.jobs
  FOR SELECT TO public
  USING (status='open' AND is_deleted=false);

CREATE POLICY "Participants view assigned jobs" ON public.jobs
  FOR SELECT TO authenticated
  USING (
    (status='assigned' AND (auth.uid()=employer_id OR auth.uid()=worker_id))
    OR (status='completed' AND (auth.uid()=employer_id OR auth.uid()=worker_id))
    OR (status='open' AND is_deleted=false)
  );
