-- KerjaHarian legal/operational consent layer.
-- Consent records are evidence of what the authenticated user accepted at a given time.
-- This does not by itself determine employment status; actual platform behavior must remain
-- consistent with the marketplace model and applicable Indonesian law.

CREATE TABLE IF NOT EXISTS public.platform_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('worker','employer')),
  consent_type text NOT NULL CHECK (consent_type IN ('platform_terms','privacy_policy','worker_role_notice','employer_role_notice','job_create','job_accept','payment_confirmation','job_start','job_completion','overtime')),
  document_key text NOT NULL,
  document_version text NOT NULL,
  order_id uuid NULL REFERENCES public.orders(id) ON DELETE SET NULL,
  job_id uuid NULL REFERENCES public.jobs(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  accepted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_consents_user_idx ON public.platform_consents(user_id, accepted_at DESC);
CREATE INDEX IF NOT EXISTS platform_consents_order_idx ON public.platform_consents(order_id, accepted_at DESC) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS platform_consents_job_idx ON public.platform_consents(job_id, accepted_at DESC) WHERE job_id IS NOT NULL;

ALTER TABLE public.platform_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_consents_own_select ON public.platform_consents;
CREATE POLICY platform_consents_own_select ON public.platform_consents FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS platform_consents_own_insert ON public.platform_consents;
CREATE POLICY platform_consents_own_insert ON public.platform_consents FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- No UPDATE/DELETE policy is intentionally provided: consent evidence is append-only.

CREATE OR REPLACE FUNCTION public.record_platform_consent(
  p_role text,
  p_consent_type text,
  p_document_key text,
  p_document_version text,
  p_order_id uuid DEFAULT NULL,
  p_job_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS public.platform_consents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_row public.platform_consents;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Autentikasi diperlukan'; END IF;
  IF p_role NOT IN ('worker','employer') THEN RAISE EXCEPTION 'Role consent tidak valid'; END IF;
  IF p_consent_type NOT IN ('platform_terms','privacy_policy','worker_role_notice','employer_role_notice','job_create','job_accept','payment_confirmation','job_start','job_completion','overtime') THEN RAISE EXCEPTION 'Jenis consent tidak valid'; END IF;
  IF p_document_key IS NULL OR length(trim(p_document_key)) = 0 OR p_document_version IS NULL OR length(trim(p_document_version)) = 0 THEN RAISE EXCEPTION 'Dokumen dan versi consent wajib diisi'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user AND role IS NOT NULL) AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user AND role = p_role) THEN RAISE EXCEPTION 'Role consent tidak sesuai dengan profil pengguna'; END IF;
  INSERT INTO public.platform_consents(user_id,role,consent_type,document_key,document_version,order_id,job_id,metadata)
  VALUES(v_user,p_role,p_consent_type,trim(p_document_key),trim(p_document_version),p_order_id,p_job_id,COALESCE(p_metadata,'{}'::jsonb)) RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_platform_consent(text,text,text,text,uuid,uuid,jsonb) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.record_platform_consent(text,text,text,text,uuid,uuid,jsonb) TO authenticated;

COMMENT ON TABLE public.platform_consents IS 'Append-only evidence of user consent to versioned platform/legal documents and transaction notices.';
COMMENT ON COLUMN public.platform_consents.document_key IS 'Stable legal/content identifier, e.g. platform_terms or worker_role_notice.';
COMMENT ON COLUMN public.platform_consents.document_version IS 'Exact version displayed to and accepted by the user.';
