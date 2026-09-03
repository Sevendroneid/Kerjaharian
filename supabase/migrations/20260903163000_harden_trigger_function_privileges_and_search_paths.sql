BEGIN;

-- Trigger-only functions do not need to be callable through PostgREST RPC.
-- Pin function name resolution to reduce search_path injection risk.
ALTER FUNCTION public.check_self_order_prevention() SET search_path = pg_catalog, public;
ALTER FUNCTION public.prevent_spam_orders() SET search_path = pg_catalog, public;
ALTER FUNCTION public.set_updated_at() SET search_path = pg_catalog, public;
ALTER FUNCTION public.handle_new_user() SET search_path = pg_catalog, public;
ALTER FUNCTION public.validate_wage_before_insert() SET search_path = pg_catalog, public;
ALTER FUNCTION public.prevent_self_admin_promotion() SET search_path = pg_catalog, public;
ALTER FUNCTION public.hash_phone(text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.request_extend_session(uuid, text) SET search_path = pg_catalog, public;
ALTER FUNCTION public.start_work_session(uuid, numeric, numeric, numeric, numeric) SET search_path = pg_catalog, public;

REVOKE EXECUTE ON FUNCTION public.check_self_order_prevention() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_spam_orders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

COMMIT;
