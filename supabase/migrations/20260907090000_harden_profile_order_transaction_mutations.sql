-- Security hardening for production testing.
-- 1) The transactions table is not used by the current Rp0/payment-disabled flow.
-- Prevent authenticated clients from fabricating financial ledger rows.
DROP POLICY IF EXISTS "Authenticated users can insert" ON public.transactions;

-- 2) Participants may update order status through the current legacy UI, but must
-- never be able to rewrite ownership, pricing, billing, or job identity columns.
CREATE OR REPLACE FUNCTION public.protect_participant_order_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_admin boolean := EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_uid AND p.role = 'admin'
  );
BEGIN
  IF v_admin OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- All order fields except status are immutable to normal participants.
  IF (to_jsonb(NEW) - 'status') IS DISTINCT FROM (to_jsonb(OLD) - 'status') THEN
    RAISE EXCEPTION 'Order ownership and billing fields are server-controlled';
  END IF;

  IF v_uid = OLD.employer_id THEN
    IF NOT (
      (OLD.status IN ('open','Pending') AND NEW.status = 'Accepted')
      OR (OLD.status = NEW.status)
    ) THEN
      RAISE EXCEPTION 'Invalid employer order status transition';
    END IF;
    RETURN NEW;
  END IF;

  IF v_uid = OLD.worker_id THEN
    IF NOT (
      (OLD.status IN ('assigned','Accepted') AND NEW.status = 'In-Progress')
      OR (OLD.status = 'In-Progress' AND NEW.status IN ('Completed','completed'))
      OR (OLD.status = NEW.status)
    ) THEN
      RAISE EXCEPTION 'Invalid worker order status transition';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Order participant authorization required';
END;
$function$;

DROP TRIGGER IF EXISTS trg_protect_participant_order_mutation ON public.orders;
CREATE TRIGGER trg_protect_participant_order_mutation
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.protect_participant_order_mutation();

-- 3) The profile triggers already protect role/KYC/admin fields. Extend the
-- protection to server-owned presence and reputation counters.
CREATE OR REPLACE FUNCTION public.protect_profile_server_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_admin boolean := EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_uid AND p.role = 'admin'
  );
BEGIN
  IF v_admin OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_online := false;
    NEW.rating := 5.0;
    NEW.jobs_done := 0;
    RETURN NEW;
  END IF;

  NEW.is_online := OLD.is_online;
  NEW.rating := OLD.rating;
  NEW.jobs_done := OLD.jobs_done;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_protect_profile_server_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_server_fields
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_server_fields();
