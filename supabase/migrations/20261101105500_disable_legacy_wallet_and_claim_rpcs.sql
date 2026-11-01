-- Disable legacy marketplace RPCs that bypass the current direct-payment/dispatch flow.
-- Current application code does not call these functions.
REVOKE ALL ON FUNCTION public.claim_job(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_employer_wallet() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_employer_order_reservation(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.settle_employer_order_reservation(uuid) FROM PUBLIC, anon, authenticated;
