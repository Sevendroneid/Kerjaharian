-- Harden profiles role/is_admin against client-side privilege escalation.
-- Ordinary users may choose worker/employer on profile completion, but cannot self-promote to admin.
-- Remove legacy test-role trigger because it allowed role changes based solely on phone number.

CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.role IS DISTINCT FROM 'worker' AND NEW.role IS DISTINCT FROM 'employer' THEN
        NEW.role := 'worker';
      END IF;
      NEW.is_admin := false;
    ELSE
      IF OLD.role <> 'admin' AND NEW.role = 'admin' THEN
        NEW.role := OLD.role;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'admin'
      ) THEN
        NEW.is_admin := OLD.is_admin;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
DROP TRIGGER IF EXISTS protect_is_admin ON public.profiles;
DROP TRIGGER IF EXISTS trg_assign_requested_test_role ON public.profiles;

CREATE TRIGGER trg_protect_profile_role
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_escalation();

DROP FUNCTION IF EXISTS public.prevent_self_admin_promotion();
DROP FUNCTION IF EXISTS public.assign_requested_test_role();
