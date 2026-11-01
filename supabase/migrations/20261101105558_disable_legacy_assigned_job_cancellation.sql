-- Direct cancellation after assignment has no Midtrans refund workflow and is unused by current UI.
-- Route post-payment cancellation through Resolution Center instead.
REVOKE ALL ON FUNCTION public.cancel_assigned_job(uuid, text) FROM PUBLIC, anon, authenticated;
