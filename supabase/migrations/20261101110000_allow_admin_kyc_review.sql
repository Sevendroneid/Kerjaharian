-- Admin KYC review must be able to change verified/status fields; ordinary users cannot.
CREATE OR REPLACE FUNCTION public.protect_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_admin boolean := EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Cannot modify account role through profile update';
  END IF;

  IF NEW.kyc_verified IS DISTINCT FROM OLD.kyc_verified AND NOT v_admin THEN
    RAISE EXCEPTION 'Cannot directly modify kyc_verified. Use the verification workflow.';
  END IF;

  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'Cannot directly modify is_admin';
  END IF;

  RETURN NEW;
END;
$function$;
