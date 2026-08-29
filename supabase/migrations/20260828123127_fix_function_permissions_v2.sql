/*
# Fix function execute permissions (revoke from PUBLIC)

## Overview
PostgreSQL SECURITY DEFINER functions are executable by PUBLIC by default.
The previous migration revoked from `anon` and `authenticated` roles explicitly,
but PUBLIC still grants access. This migration revokes from PUBLIC and then
re-grants only to the roles that should have access.

## Security Changes
1. REVOKE EXECUTE ON ALL 5 SECURITY DEFINER functions FROM PUBLIC.
2. GRANT EXECUTE on user-facing functions (verify_kyc, update_worker_status, set_role) TO authenticated ONLY.
3. Trigger functions (handle_new_user, protect_sensitive_columns) get NO execute grant — they're called by triggers, not by users.
*/

REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION protect_sensitive_columns() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION verify_kyc() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_worker_status(boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION set_role(text) FROM PUBLIC;

-- Only authenticated users can call user-facing functions
GRANT EXECUTE ON FUNCTION verify_kyc() TO authenticated;
GRANT EXECUTE ON FUNCTION update_worker_status(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION set_role(text) TO authenticated;
