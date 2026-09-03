-- Security hardening: jobs must be created by the owning employer.
DROP POLICY IF EXISTS "Anyone can create jobs" ON public.jobs;
CREATE POLICY "Employers can create own jobs"
  ON public.jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = employer_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'employer'
    )
  );

-- Payable amount is sensitive financial data; only participants may query it.
CREATE OR REPLACE FUNCTION public.get_job_payable_amount(p_job_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_amount integer;
BEGIN
  SELECT GREATEST(0, COALESCE(final_amount, employer_total, total, 0))
    INTO v_amount
  FROM public.jobs
  WHERE id = p_job_id
    AND (employer_id = auth.uid() OR worker_id = auth.uid());

  IF v_amount IS NULL THEN
    RAISE EXCEPTION 'Pekerjaan tidak ditemukan atau Anda tidak memiliki akses';
  END IF;

  RETURN v_amount;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_job_payable_amount(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_job_payable_amount(uuid) TO authenticated;
