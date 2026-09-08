-- The current payment flow settles jobs from verified Midtrans notifications.
-- This legacy RPC only changed jobs.payment_status without proving a payment event,
-- so it must not be callable by client sessions.
REVOKE EXECUTE ON FUNCTION public.settle_job_payment(uuid) FROM PUBLIC, anon, authenticated;
