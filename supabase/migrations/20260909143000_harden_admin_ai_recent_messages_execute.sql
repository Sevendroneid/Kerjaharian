BEGIN;

-- admin_ai_recent_messages exposes admin operational data and must never be
-- callable by anonymous clients. Keep authenticated execution because the
-- function performs its own admin authorization check.
REVOKE EXECUTE ON FUNCTION public.admin_ai_recent_messages(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_ai_recent_messages(integer, integer) TO authenticated;

COMMIT;
