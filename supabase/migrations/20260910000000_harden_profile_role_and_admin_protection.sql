-- Harden profile privilege fields while preserving the existing customer role-switch flow.
-- worker <-> employer is allowed; admin can never be assigned/removed by client updates.
-- KYC and is_admin remain server-controlled.

CREATE OR REPLACE FUNCTION public.protect_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF OLD.role = 'admin' OR NEW.role = 'admin' THEN
      RAISE EXCEPTION 'Cannot modify admin role through profile update';
    END IF;
  END IF;

  IF NEW.kyc_verified IS DISTINCT FROM OLD.kyc_verified THEN
    RAISE EXCEPTION 'Cannot directly modify kyc_verified. Use the verification workflow.';
  END IF;

  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'Cannot directly modify is_admin';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_protect_sensitive ON public.profiles;
CREATE TRIGGER trg_protect_sensitive
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_sensitive_columns();
