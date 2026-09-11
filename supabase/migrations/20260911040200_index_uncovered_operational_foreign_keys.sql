-- Cover foreign keys reported by the Supabase performance advisor.
CREATE INDEX IF NOT EXISTS data_retention_policy_updated_by_idx ON public.data_retention_policy(updated_by);
CREATE INDEX IF NOT EXISTS dispatch_confirmations_employer_id_idx ON public.dispatch_confirmations(employer_id);
CREATE INDEX IF NOT EXISTS dispatch_confirmations_job_id_idx ON public.dispatch_confirmations(job_id);
CREATE INDEX IF NOT EXISTS dispatch_confirmations_worker_id_idx ON public.dispatch_confirmations(worker_id);
CREATE INDEX IF NOT EXISTS job_incidents_order_id_idx ON public.job_incidents(order_id);
CREATE INDEX IF NOT EXISTS job_incidents_reported_by_idx ON public.job_incidents(reported_by);
CREATE INDEX IF NOT EXISTS job_reliability_events_actor_id_idx ON public.job_reliability_events(actor_id);
CREATE INDEX IF NOT EXISTS order_rematch_events_previous_worker_id_idx ON public.order_rematch_events(previous_worker_id);
CREATE INDEX IF NOT EXISTS platform_policy_config_updated_by_idx ON public.platform_policy_config(updated_by);
CREATE INDEX IF NOT EXISTS privacy_requests_resolved_by_idx ON public.privacy_requests(resolved_by);
DROP INDEX IF EXISTS public.idx_job_prices_catalog_active;
