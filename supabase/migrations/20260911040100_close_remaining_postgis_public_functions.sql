-- PostGIS helper functions are not part of KerjaHarian's public API.
-- Keep them unavailable to PostgREST API roles.
REVOKE ALL ON FUNCTION public.st_estimatedextent(text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.st_estimatedextent(text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.st_estimatedextent(text,text,text,boolean) FROM PUBLIC, anon, authenticated;
