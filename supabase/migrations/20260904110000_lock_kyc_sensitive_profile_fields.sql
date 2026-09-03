-- Prevent non-admin clients from self-approving or mutating KYC review state.
CREATE OR REPLACE FUNCTION public.protect_kyc_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  v_is_admin := EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );

  IF NOT v_is_admin THEN
    NEW.kyc_verified := OLD.kyc_verified;
    NEW.kyc_status := OLD.kyc_status;
    NEW.kyc_submitted_at := OLD.kyc_submitted_at;
    NEW.kyc_reviewed_at := OLD.kyc_reviewed_at;
    NEW.kyc_rejection_reason := OLD.kyc_rejection_reason;
  END IF;

  IF NEW.ktp_photo_url IS DISTINCT FROM OLD.ktp_photo_url THEN
    IF NEW.ktp_photo_url IS NOT NULL
       AND NEW.ktp_photo_url <> ''
       AND NEW.ktp_photo_url NOT LIKE (auth.uid()::text || '/%')
       AND NOT v_is_admin THEN
      RAISE EXCEPTION 'Invalid KYC document path';
    END IF;
    NEW.kyc_verified := false;
    NEW.kyc_status := CASE WHEN NEW.ktp_photo_url IS NULL OR NEW.ktp_photo_url = '' THEN 'not_started' ELSE 'pending' END;
    NEW.kyc_submitted_at := CASE WHEN NEW.ktp_photo_url IS NULL OR NEW.ktp_photo_url = '' THEN NULL ELSE now() END;
    NEW.kyc_reviewed_at := NULL;
    NEW.kyc_rejection_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_kyc_sensitive_fields ON public.profiles;
CREATE TRIGGER trg_protect_kyc_sensitive_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_kyc_sensitive_fields();

REVOKE EXECUTE ON FUNCTION public.protect_kyc_sensitive_fields() FROM PUBLIC, anon, authenticated;
