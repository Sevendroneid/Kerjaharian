-- Marketplace behavior guardrails.
-- KerjaHarian facilitates transactions; it must not silently become an employer-like
-- controller. Server-side transitions therefore require legal account consent,
-- preserve worker choice, and record job creation as a transaction action.

BEGIN;

CREATE OR REPLACE FUNCTION public.require_role_legal_consent(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM public.platform_consents
      WHERE user_id=p_user_id AND role=p_role
        AND consent_type='platform_terms' AND document_version='1.0'
    )
    OR NOT EXISTS (
      SELECT 1 FROM public.platform_consents
      WHERE user_id=p_user_id AND role=p_role
        AND consent_type='privacy_policy' AND document_version='1.0'
    )
    OR NOT EXISTS (
      SELECT 1 FROM public.platform_consents
      WHERE user_id=p_user_id AND role=p_role
        AND consent_type=CASE WHEN p_role='worker' THEN 'worker_role_notice' ELSE 'employer_role_notice' END
        AND document_version='1.0'
    ) THEN
    RAISE EXCEPTION 'Persetujuan legal akun belum lengkap. Silakan setujui Syarat & Ketentuan, Privasi, dan peran Anda terlebih dahulu.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.require_role_legal_consent(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.require_role_legal_consent(uuid,text) TO authenticated;

-- A job can only enter the marketplace through an employer who has accepted
-- the current legal/privacy/role documents. This covers jobs created directly
-- and jobs materialized from an order by server-side publish triggers.
CREATE OR REPLACE FUNCTION public.guard_job_insert_marketplace_consent()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.employer_id IS NULL THEN
    RAISE EXCEPTION 'Pekerjaan harus memiliki pemberi kerja';
  END IF;

  PERFORM public.require_role_legal_consent(NEW.employer_id,'employer');

  INSERT INTO public.platform_consents(
    user_id,role,consent_type,document_key,document_version,order_id,job_id,metadata
  ) VALUES (
    NEW.employer_id,'employer','job_create','job_create','1.0',NEW.order_id,NEW.id,
    jsonb_build_object(
      'source','job_insert_marketplace_guard',
      'explicit_action','create_or_publish_job',
      'status',NEW.status
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_job_insert_marketplace_consent ON public.jobs;
CREATE TRIGGER trg_guard_job_insert_marketplace_consent
BEFORE INSERT ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.guard_job_insert_marketplace_consent();

-- Worker choice remains explicit: assignment is only created by a worker-facing
-- claim/offer acceptance RPC, and the existing transaction-consent trigger records
-- the acceptance. No platform job can silently assign a worker through a plain
-- client-side UPDATE without the legal/transaction guard.

COMMIT;
