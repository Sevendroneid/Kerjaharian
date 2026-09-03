-- Protected application RPCs must never be callable by the public/anon role.
-- The functions themselves already enforce auth.uid()/role ownership checks;
-- keep authenticated execution for the application clients.
REVOKE EXECUTE ON FUNCTION public.accept_dispatch_offer(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.dispatch_open_job(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_worker_location(numeric, numeric, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.worker_check_in(uuid, numeric, numeric, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.employer_check_in(uuid, numeric, numeric, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_job(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.start_job(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_job_duration(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.settle_job_payment(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.authorize_remote_job_start(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_job_payable_amount(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_job_event(uuid, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_worker_status(boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_kyc() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fonnte_monitor_snapshot() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_list_job_timing() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_list_kyc() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_review_kyc(uuid, boolean, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_set_job_pricing(uuid, integer, integer, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_update_job_timing(uuid, integer, integer, integer) FROM PUBLIC;
