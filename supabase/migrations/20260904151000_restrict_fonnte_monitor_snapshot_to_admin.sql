CREATE OR REPLACE FUNCTION public.fonnte_monitor_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'status', c.last_status,
      'reason', c.last_reason,
      'device', c.device,
      'last_event_at', c.last_event_at,
      'last_health_check_at', c.last_health_check_at,
      'consecutive_failures', c.consecutive_failures
    )
    FROM public.fonnte_monitor_config c
    WHERE c.id = true
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fonnte_monitor_snapshot() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fonnte_monitor_snapshot() TO authenticated;
