-- Final KYC hardening: private storage, immutable client-side approval state, and server-side employer gate.
-- MVP remains upload -> pending -> admin review; no paid KYC provider is required.

-- KYC storage bucket used by the web application. Keep it private.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('kyc-docs', 'kyc-docs', false, 5242880, ARRAY['image/jpeg','image/png','image/webp']::text[])
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']::text[];

DROP POLICY IF EXISTS "kyc users upload own documents" ON storage.objects;
CREATE POLICY "kyc users upload own documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'kyc-docs'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND (storage.extension(name)) IN ('jpg','jpeg','png','webp')
);

DROP POLICY IF EXISTS "kyc users read own documents" ON storage.objects;
CREATE POLICY "kyc users read own documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'kyc-docs'
  AND (
    (storage.foldername(name))[1] = (SELECT auth.uid())::text
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
);

DROP FUNCTION IF EXISTS public.protect_kyc_fields();
CREATE FUNCTION public.protect_kyc_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_is_service boolean := auth.role() = 'service_role';
  v_is_admin boolean := EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin');
BEGIN
  IF v_is_service OR v_is_admin THEN
    RETURN NEW;
  END IF;

  -- A normal client can never directly approve, reject, or rewrite review metadata.
  IF TG_OP = 'INSERT' THEN
    NEW.kyc_verified := false;
    NEW.kyc_status := 'not_started';
    NEW.kyc_submitted_at := NULL;
    NEW.kyc_reviewed_at := NULL;
    NEW.kyc_reviewed_by := NULL;
    NEW.kyc_rejection_reason := NULL;
  ELSE
    NEW.kyc_verified := OLD.kyc_verified;
    NEW.kyc_status := OLD.kyc_status;
    NEW.kyc_submitted_at := OLD.kyc_submitted_at;
    NEW.kyc_reviewed_at := OLD.kyc_reviewed_at;
    NEW.kyc_reviewed_by := OLD.kyc_reviewed_by;
    NEW.kyc_rejection_reason := OLD.kyc_rejection_reason;
  END IF;

  IF NEW.ktp_photo_url IS DISTINCT FROM OLD.ktp_photo_url THEN
    IF NEW.ktp_photo_url IS NOT NULL AND NEW.ktp_photo_url <> ''
       AND NOT NEW.ktp_photo_url LIKE (auth.uid()::text || '/%') THEN
      RAISE EXCEPTION 'Invalid KYC document path';
    END IF;
    NEW.kyc_verified := false;
    NEW.kyc_status := CASE WHEN NEW.ktp_photo_url IS NULL OR NEW.ktp_photo_url = '' THEN 'not_started' ELSE 'pending' END;
    NEW.kyc_submitted_at := CASE WHEN NEW.ktp_photo_url IS NULL OR NEW.ktp_photo_url = '' THEN NULL ELSE now() END;
    NEW.kyc_reviewed_at := NULL;
    NEW.kyc_reviewed_by := NULL;
    NEW.kyc_rejection_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_kyc_fields ON public.profiles;
CREATE TRIGGER trg_protect_kyc_fields
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_kyc_fields();

-- verify_kyc is submission confirmation only. The profile trigger owns the state transition.
DROP FUNCTION IF EXISTS public.verify_kyc();
CREATE FUNCTION public.verify_kyc()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_has_document boolean;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT (ktp_photo_url IS NOT NULL AND ktp_photo_url <> '') INTO v_has_document
  FROM public.profiles WHERE id = v_user;
  IF NOT COALESCE(v_has_document, false) THEN RAISE EXCEPTION 'KTP document is required'; END IF;
  RETURN jsonb_build_object('status','pending');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.verify_kyc() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_kyc() TO authenticated;

-- Keep review attribution auditable.
CREATE OR REPLACE FUNCTION public.admin_review_kyc(p_user_id uuid, p_approve boolean, p_rejection_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_user_id AND p.role IN ('worker','employer') AND p.ktp_photo_url IS NOT NULL) THEN
    RAISE EXCEPTION 'KYC submission not found';
  END IF;
  v_status := CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END;
  UPDATE public.profiles
  SET kyc_verified = p_approve,
      kyc_status = v_status,
      kyc_reviewed_at = now(),
      kyc_reviewed_by = auth.uid(),
      kyc_rejection_reason = CASE WHEN p_approve THEN NULL ELSE NULLIF(trim(p_rejection_reason), '') END
  WHERE id = p_user_id;
  RETURN jsonb_build_object('status', v_status, 'user_id', p_user_id);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_review_kyc(uuid,boolean,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_kyc(uuid,boolean,text) TO authenticated;

-- Enforce the same KYC requirement server-side; UI gates are not security boundaries.
DROP POLICY IF EXISTS "Employers can create own jobs" ON public.jobs;
DROP POLICY IF EXISTS "insert_own_jobs" ON public.jobs;
CREATE POLICY "Employers can create own jobs"
ON public.jobs FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = employer_id
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'employer' AND p.kyc_verified = true
  )
);

-- Keep KYC review functions explicitly authenticated-only.
REVOKE EXECUTE ON FUNCTION public.admin_list_kyc() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_kyc() TO authenticated;
