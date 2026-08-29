/*
# Fix function execute permissions

## Overview
Revokes EXECUTE permission from the `anon` role for all SECURITY DEFINER functions
that should not be publicly callable. Trigger functions (handle_new_user, protect_sensitive_columns)
should never be directly callable. User-facing functions (verify_kyc, update_worker_status, set_role)
should only be callable by authenticated users.

## Security Changes
1. REVOKE EXECUTE on `handle_new_user()` from anon and authenticated — it's a trigger function only.
2. REVOKE EXECUTE on `protect_sensitive_columns()` from anon and authenticated — it's a trigger function only.
3. REVOKE EXECUTE on `verify_kyc()` from anon — only authenticated users should verify their KYC.
4. REVOKE EXECUTE on `update_worker_status(boolean)` from anon — only authenticated workers.
5. REVOKE EXECUTE on `set_role(text)` from anon — only authenticated users.
*/

REVOKE EXECUTE ON FUNCTION handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION protect_sensitive_columns() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION verify_kyc() FROM anon;
REVOKE EXECUTE ON FUNCTION update_worker_status(boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION set_role(text) FROM anon;
