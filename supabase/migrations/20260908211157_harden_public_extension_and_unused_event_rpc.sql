BEGIN;

-- The event logger has no application call site and accepts arbitrary event types/metadata.
-- Keep the function definition for audit/history, but remove client EXECUTE access.
REVOKE EXECUTE ON FUNCTION public.log_job_event(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;

-- Keep the PostGIS system table out of the Data API surface.
REVOKE ALL PRIVILEGES ON TABLE public.spatial_ref_sys FROM PUBLIC, anon, authenticated;

COMMIT;
