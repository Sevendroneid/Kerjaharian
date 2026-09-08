-- Keep the scheduled SECURITY DEFINER cleanup function on a controlled search path.
ALTER FUNCTION public.purge_expired_auth_challenges()
  SET search_path = pg_catalog, public;
