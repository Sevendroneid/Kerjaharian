-- Resolution decisions are written only through the server-side admin RPC.
DROP POLICY IF EXISTS resolution_admin_update ON public.resolutions;
DROP POLICY IF EXISTS resolution_decisions_insert_admin ON public.resolution_decisions;
DROP POLICY IF EXISTS resolution_decisions_update_admin ON public.resolution_decisions;
DROP POLICY IF EXISTS resolution_decisions_delete_admin ON public.resolution_decisions;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.resolution_decisions FROM authenticated;
REVOKE UPDATE ON TABLE public.resolutions FROM authenticated;
GRANT SELECT, INSERT ON TABLE public.resolutions TO authenticated;
GRANT SELECT ON TABLE public.resolution_decisions TO authenticated;
