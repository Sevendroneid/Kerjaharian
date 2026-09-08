-- Client roles do not need schema-management privileges on application tables.
-- RLS continues to govern row-level application access.
REVOKE REFERENCES, TRIGGER, TRUNCATE ON TABLE
  public.admin_settings,
  public.employer_wallets,
  public.job_prices_audit,
  public.job_pricing,
  public.job_reports,
  public.jobs,
  public.messages,
  public.orders,
  public.otp_codes,
  public.payment_method,
  public.profiles,
  public.resolution_decisions,
  public.resolution_evidence,
  public.resolution_messages,
  public.resolutions,
  public.reviews,
  public.transactions,
  public.worker_locations,
  public.workers
FROM anon, authenticated;
