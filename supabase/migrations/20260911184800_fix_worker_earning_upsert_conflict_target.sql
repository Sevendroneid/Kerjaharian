BEGIN;
DROP INDEX IF EXISTS public.worker_earning_job_credit_uq;
CREATE UNIQUE INDEX IF NOT EXISTS worker_earning_job_entry_uq ON public.worker_earning_ledger(job_id, entry_type);
COMMIT;
