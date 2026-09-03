-- SECURITY: admin/payment SECURITY DEFINER RPCs must not be callable anonymously.
REVOKE EXECUTE ON FUNCTION public.admin_list_job_timing() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_job_pricing(uuid, integer, integer, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_job_timing(uuid, integer, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.settle_job_payment(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_job_timing() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_job_pricing(uuid, integer, integer, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_job_timing(uuid, integer, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_job_payment(uuid) TO authenticated;

-- Trigger-only function: never expose direct RPC execution.
REVOKE EXECUTE ON FUNCTION public.sync_order_to_job() FROM PUBLIC, anon, authenticated;
