-- The consent audit row references NEW.id, so the job must exist before it is inserted.
-- AFTER INSERT still runs in the same transaction; a consent failure rolls back the job.
DROP TRIGGER IF EXISTS trg_guard_job_insert_marketplace_consent ON public.jobs;
CREATE TRIGGER trg_guard_job_insert_marketplace_consent
AFTER INSERT ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.guard_job_insert_marketplace_consent();
