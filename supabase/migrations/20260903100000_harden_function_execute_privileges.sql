-- KerjaHarian security hardening: remove accidental API execution privileges
-- from trigger/legacy helper functions and keep application RPCs authenticated.

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.hash_phone(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_self_admin_promotion() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.request_extend_session(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.start_work_session(uuid, numeric, numeric, numeric, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_wage_before_insert() FROM PUBLIC, anon, authenticated;

-- update_worker_status is an authenticated application RPC; PUBLIC must not
-- retain the default EXECUTE privilege.
REVOKE EXECUTE ON FUNCTION public.update_worker_status(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_worker_status(boolean) TO authenticated;
