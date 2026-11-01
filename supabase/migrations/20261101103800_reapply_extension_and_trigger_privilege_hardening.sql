-- Reapply API privilege hardening after extension/function grants drifted in production.
-- These objects are internal trigger/PostGIS implementation details, not client RPCs.
BEGIN;

REVOKE ALL PRIVILEGES ON TABLE public.spatial_ref_sys FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.st_estimatedextent(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.st_estimatedextent(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.st_estimatedextent(text, text, text, boolean) FROM PUBLIC, anon, authenticated;

-- Trigger execution is managed by the installed trigger; clients must not invoke it via RPC.
REVOKE ALL ON FUNCTION public.mark_order_payment_pending() FROM PUBLIC, anon, authenticated;

COMMIT;
