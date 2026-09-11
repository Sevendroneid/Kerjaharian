-- Employer identity hardening: require a selfie in addition to KTP.
-- Workers retain the existing KTP-only flow to keep worker onboarding simple.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS selfie_photo_url text;

-- KYC storage remains private; this policy permits the authenticated owner
-- to upload selfie files into the same private per-user KYC folder.
DROP POLICY IF EXISTS "kyc users upload own documents" ON storage.objects;
CREATE POLICY "kyc users upload own documents" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id='kyc-docs'
  AND (storage.foldername(name))[1]=(SELECT auth.uid())::text
  AND (storage.extension(name)) IN ('jpg','jpeg','png','webp')
);

-- Keep KYC approval server-controlled. For employers, changing either the KTP
-- or selfie invalidates the previous review and requires a fresh submission.
CREATE OR REPLACE FUNCTION public.protect_kyc_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public
AS $$
DECLARE
  v_is_service boolean:=auth.role()='service_role';
  v_is_admin boolean:=EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.role='admin');
BEGIN
  IF v_is_service OR v_is_admin THEN RETURN NEW; END IF;

  IF TG_OP='INSERT' THEN
    NEW.kyc_verified:=false;
    NEW.kyc_status:='not_started';
    NEW.kyc_submitted_at:=NULL;
    NEW.kyc_reviewed_at:=NULL;
    NEW.kyc_reviewed_by:=NULL;
    NEW.kyc_rejection_reason:=NULL;
  ELSE
    NEW.kyc_verified:=OLD.kyc_verified;
    NEW.kyc_status:=OLD.kyc_status;
    NEW.kyc_submitted_at:=OLD.kyc_submitted_at;
    NEW.kyc_reviewed_at:=OLD.kyc_reviewed_at;
    NEW.kyc_reviewed_by:=OLD.kyc_reviewed_by;
    NEW.kyc_rejection_reason:=OLD.kyc_rejection_reason;
  END IF;

  IF TG_OP='UPDATE' AND NEW.ktp_photo_url IS DISTINCT FROM OLD.ktp_photo_url THEN
    IF NEW.ktp_photo_url IS NOT NULL AND NEW.ktp_photo_url<>''
       AND NOT NEW.ktp_photo_url LIKE (auth.uid()::text||'/%') THEN
      RAISE EXCEPTION 'Invalid KYC document path';
    END IF;
    NEW.kyc_verified:=false;
    NEW.kyc_status:=CASE WHEN NEW.ktp_photo_url IS NULL OR NEW.ktp_photo_url='' THEN 'not_started' ELSE 'pending' END;
    NEW.kyc_submitted_at:=CASE WHEN NEW.ktp_photo_url IS NULL OR NEW.ktp_photo_url='' THEN NULL ELSE now() END;
    NEW.kyc_reviewed_at:=NULL;
    NEW.kyc_reviewed_by:=NULL;
    NEW.kyc_rejection_reason:=NULL;
  END IF;

  IF TG_OP='UPDATE' AND NEW.selfie_photo_url IS DISTINCT FROM OLD.selfie_photo_url THEN
    IF NEW.role='employer' AND NEW.selfie_photo_url IS NOT NULL AND NEW.selfie_photo_url<>''
       AND NOT NEW.selfie_photo_url LIKE (auth.uid()::text||'/%') THEN
      RAISE EXCEPTION 'Invalid selfie document path';
    END IF;
    IF NEW.role='employer' THEN
      NEW.kyc_verified:=false;
      NEW.kyc_status:=CASE
        WHEN COALESCE(NEW.ktp_photo_url,'')='' OR COALESCE(NEW.selfie_photo_url,'')='' THEN 'not_started'
        ELSE 'pending'
      END;
      NEW.kyc_submitted_at:=CASE
        WHEN COALESCE(NEW.ktp_photo_url,'')='' OR COALESCE(NEW.selfie_photo_url,'')='' THEN NULL
        ELSE now()
      END;
      NEW.kyc_reviewed_at:=NULL;
      NEW.kyc_reviewed_by:=NULL;
      NEW.kyc_rejection_reason:=NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Employer submission requires both identity documents. Worker flow remains KTP-only.
CREATE OR REPLACE FUNCTION public.verify_kyc()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public
AS $$
DECLARE
  v_user uuid:=auth.uid();
  v_role text;
  v_has_ktp boolean;
  v_has_selfie boolean;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT role, (ktp_photo_url IS NOT NULL AND ktp_photo_url<>''), (selfie_photo_url IS NOT NULL AND selfie_photo_url<>'')
    INTO v_role,v_has_ktp,v_has_selfie
  FROM public.profiles WHERE id=v_user;

  IF NOT COALESCE(v_has_ktp,false) THEN RAISE EXCEPTION 'KTP document is required'; END IF;
  IF v_role='employer' AND NOT COALESCE(v_has_selfie,false) THEN RAISE EXCEPTION 'Selfie diperlukan untuk verifikasi Employer'; END IF;

  RETURN jsonb_build_object('status','pending');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.verify_kyc() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.verify_kyc() TO authenticated;

-- Admin may approve an employer only when both KTP and selfie are present.
CREATE OR REPLACE FUNCTION public.admin_review_kyc(
  p_user_id uuid,
  p_approve boolean,
  p_rejection_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public
AS $$
DECLARE
  v_status text;
  v_role text;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.role='admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id=p_user_id;
  IF NOT FOUND OR v_role NOT IN('worker','employer') THEN
    RAISE EXCEPTION 'KYC submission not found';
  END IF;

  IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=p_user_id AND p.ktp_photo_url IS NOT NULL AND p.ktp_photo_url<>'') THEN
    RAISE EXCEPTION 'KTP document is required';
  END IF;
  IF v_role='employer' AND NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=p_user_id AND p.selfie_photo_url IS NOT NULL AND p.selfie_photo_url<>'') THEN
    RAISE EXCEPTION 'Employer selfie is required';
  END IF;

  v_status:=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END;
  UPDATE public.profiles
  SET kyc_verified=p_approve,
      kyc_status=v_status,
      kyc_reviewed_at=now(),
      kyc_reviewed_by=auth.uid(),
      kyc_rejection_reason=CASE WHEN p_approve THEN NULL ELSE NULLIF(trim(p_rejection_reason),'') END
  WHERE id=p_user_id;

  RETURN jsonb_build_object('status',v_status,'user_id',p_user_id);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_review_kyc(uuid,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_kyc(uuid,boolean,text) TO authenticated;

-- Admin receives the selfie path as part of the review queue.
DROP FUNCTION IF EXISTS public.admin_list_kyc();
CREATE FUNCTION public.admin_list_kyc()
RETURNS TABLE(
  id uuid,
  full_name text,
  role text,
  phone text,
  ktp_photo_url text,
  selfie_photo_url text,
  kyc_verified boolean,
  kyc_status text,
  kyc_submitted_at timestamptz,
  kyc_reviewed_at timestamptz,
  kyc_rejection_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public
AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.role='admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN QUERY
  SELECT p.id,p.full_name,p.role,p.phone,p.ktp_photo_url,p.selfie_photo_url,p.kyc_verified,p.kyc_status,p.kyc_submitted_at,p.kyc_reviewed_at,p.kyc_rejection_reason
  FROM public.profiles p
  WHERE p.kyc_status IN ('pending','rejected')
  ORDER BY p.kyc_submitted_at DESC NULLS LAST;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_list_kyc() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_list_kyc() TO authenticated;

COMMENT ON COLUMN public.profiles.selfie_photo_url IS 'Private KYC selfie for employer identity review; required before employer approval.';
