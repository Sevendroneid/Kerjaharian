-- KYC changes are allowed only through the dedicated Admin review RPC or service role.
CREATE OR REPLACE FUNCTION public.protect_kyc_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_is_service boolean := auth.role() = 'service_role';
  v_is_admin boolean := EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  );
  v_kyc_review boolean := current_setting('kh.kyc_review', true) = 'on';
BEGIN
  IF v_is_service OR (v_is_admin AND v_kyc_review) THEN
    RETURN NEW;
  END IF;

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

  IF TG_OP = 'UPDATE' AND NEW.ktp_photo_url IS DISTINCT FROM OLD.ktp_photo_url THEN
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

  IF TG_OP = 'UPDATE' AND NEW.selfie_photo_url IS DISTINCT FROM OLD.selfie_photo_url AND NEW.role = 'employer' THEN
    IF NEW.selfie_photo_url IS NOT NULL AND NEW.selfie_photo_url <> ''
       AND NOT NEW.selfie_photo_url LIKE (auth.uid()::text || '/%') THEN
      RAISE EXCEPTION 'Invalid selfie document path';
    END IF;
    NEW.kyc_verified := false;
    NEW.kyc_status := CASE WHEN COALESCE(NEW.ktp_photo_url,'') = '' OR COALESCE(NEW.selfie_photo_url,'') = '' THEN 'not_started' ELSE 'pending' END;
    NEW.kyc_submitted_at := CASE WHEN COALESCE(NEW.ktp_photo_url,'') = '' OR COALESCE(NEW.selfie_photo_url,'') = '' THEN NULL ELSE now() END;
    NEW.kyc_reviewed_at := NULL;
    NEW.kyc_reviewed_by := NULL;
    NEW.kyc_rejection_reason := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_admin boolean := EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  );
  v_kyc_review boolean := current_setting('kh.kyc_review', true) = 'on';
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Cannot modify account role through profile update';
  END IF;

  IF NEW.kyc_verified IS DISTINCT FROM OLD.kyc_verified
     AND NOT (v_admin AND v_kyc_review) THEN
    RAISE EXCEPTION 'Cannot directly modify kyc_verified. Use the verification workflow.';
  END IF;

  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'Cannot directly modify is_admin';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_review_kyc(
  p_user_id uuid,
  p_approve boolean,
  p_rejection_reason text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_status text;
  v_role text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND OR v_role NOT IN ('worker', 'employer') THEN
    RAISE EXCEPTION 'KYC submission not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_user_id AND p.ktp_photo_url IS NOT NULL AND p.ktp_photo_url <> '') THEN
    RAISE EXCEPTION 'KTP document is required';
  END IF;

  IF v_role = 'employer' AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = p_user_id AND p.selfie_photo_url IS NOT NULL AND p.selfie_photo_url <> ''
  ) THEN
    RAISE EXCEPTION 'Employer selfie is required';
  END IF;

  v_status := CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END;
  PERFORM set_config('kh.kyc_review', 'on', true);

  UPDATE public.profiles
  SET kyc_verified = p_approve,
      kyc_status = v_status,
      kyc_reviewed_at = now(),
      kyc_reviewed_by = auth.uid(),
      kyc_rejection_reason = CASE WHEN p_approve THEN NULL ELSE NULLIF(trim(p_rejection_reason), '') END
  WHERE id = p_user_id;

  RETURN jsonb_build_object('status', v_status, 'user_id', p_user_id);
END;
$function$;
