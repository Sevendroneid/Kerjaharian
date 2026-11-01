-- Keep the order payment trigger internal; it is invoked by the orders trigger, not by clients.
BEGIN;
REVOKE ALL ON FUNCTION public.mark_order_payment_pending() FROM PUBLIC, anon, authenticated;
COMMIT;
