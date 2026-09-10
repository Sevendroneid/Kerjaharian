BEGIN;

-- Privacy requests are handled as an auditable workflow. This does not silently delete
-- operational records needed for an active job, payment reconciliation, safety review,
-- fraud prevention, or legal obligations.
CREATE TABLE IF NOT EXISTS public.privacy_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('access','correction','deletion')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','under_review','completed','rejected')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_note text
);
CREATE INDEX IF NOT EXISTS privacy_requests_user_idx ON public.privacy_requests(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS privacy_requests_status_idx ON public.privacy_requests(status,created_at DESC);
ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS privacy_request_own_select ON public.privacy_requests;
CREATE POLICY privacy_request_own_select ON public.privacy_requests FOR SELECT TO authenticated USING (user_id=auth.uid() OR is_admin());
DROP POLICY IF EXISTS privacy_request_own_insert ON public.privacy_requests;
CREATE POLICY privacy_request_own_insert ON public.privacy_requests FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid());
DROP POLICY IF EXISTS privacy_request_admin_update ON public.privacy_requests;
CREATE POLICY privacy_request_admin_update ON public.privacy_requests FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE TABLE IF NOT EXISTS public.data_retention_policy (
  id boolean PRIMARY KEY DEFAULT true CHECK(id),
  inactive_account_days integer NOT NULL DEFAULT 730 CHECK(inactive_account_days BETWEEN 30 AND 3650),
  operational_event_days integer NOT NULL DEFAULT 730 CHECK(operational_event_days BETWEEN 90 AND 3650),
  safety_incident_days integer NOT NULL DEFAULT 2555 CHECK(safety_incident_days BETWEEN 365 AND 3650),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.data_retention_policy(id) VALUES(true) ON CONFLICT(id) DO NOTHING;
ALTER TABLE public.data_retention_policy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS retention_policy_authenticated_select ON public.data_retention_policy;
CREATE POLICY retention_policy_authenticated_select ON public.data_retention_policy FOR SELECT TO authenticated USING(true);
DROP POLICY IF EXISTS retention_policy_admin_update ON public.data_retention_policy;
CREATE POLICY retention_policy_admin_update ON public.data_retention_policy FOR UPDATE TO authenticated USING(is_admin()) WITH CHECK(is_admin());

CREATE OR REPLACE FUNCTION public.submit_privacy_request(p_request_type text,p_reason text DEFAULT NULL)
RETURNS public.privacy_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $function$
DECLARE v_row public.privacy_requests;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login diperlukan'; END IF;
  IF p_request_type NOT IN ('access','correction','deletion') THEN RAISE EXCEPTION 'Jenis permintaan privasi tidak valid'; END IF;
  INSERT INTO public.privacy_requests(user_id,request_type,reason) VALUES(auth.uid(),p_request_type,NULLIF(trim(COALESCE(p_reason,'')),'')) RETURNING * INTO v_row;
  RETURN v_row;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.submit_privacy_request(text,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_privacy_request(text,text) FROM PUBLIC,anon;

COMMENT ON TABLE public.privacy_requests IS 'User privacy rights workflow. Deletion is reviewed before execution so active-job, payment, safety and legal records are not destroyed prematurely.';
COMMENT ON TABLE public.data_retention_policy IS 'Retention defaults are operational controls and must be aligned with the final privacy/legal policy before automated deletion is enabled.';
COMMIT;
