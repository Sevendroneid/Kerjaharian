BEGIN;

-- Revoke the PUBLIC grant as well as role-specific grants. PostgreSQL's
-- PUBLIC privilege otherwise makes the function callable by anonymous clients.
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text, boolean) FROM PUBLIC;

COMMIT;
