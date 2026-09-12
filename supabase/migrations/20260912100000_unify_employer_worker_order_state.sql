BEGIN;

-- KerjaHarian single order-state contract.
-- OPEN -> ASSIGNED -> IN-PROGRESS -> COMPLETED
-- OPEN/ASSIGNED may also become CANCELLED through a guarded cancellation RPC.
-- Legacy Pending/Accepted values remain readable for compatibility.

CREATE OR REPLACE FUNCTION public.canonical_order_status(p_status text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(p_status,''))
    WHEN 'pending' THEN 'open'
    WHEN 'accepted' THEN 'assigned'
    WHEN 'in-progress' THEN 'in-progress'
    WHEN 'in_progress' THEN 'in-progress'
    WHEN 'completed' THEN 'completed'
    WHEN 'cancelled' THEN 'cancelled'
    WHEN 'assigned' THEN 'assigned'
    WHEN 'open' THEN 'open'
    ELSE lower(coalesce(p_status,''))
  END;
$$;

-- One guarded cancellation path for Employer. This keeps cancellation on the
-- same order/job lifecycle without allowing client-side ownership or billing edits.
CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id uuid, p_reason text DEFAULT 'Dibatalkan oleh Employer')
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_order public.orders;
  v_job public.jobs;
  v_reason text := trim(coalesce(p_reason,''));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login diperlukan'; END IF;
  IF char_length(v_reason) < 3 THEN RAISE EXCEPTION 'Alasan pembatalan wajib diisi'; END IF;

  SELECT * INTO v_order FROM public.orders
  WHERE id=p_order_id AND employer_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order tidak ditemukan atau bukan milik Employer'; END IF;
  IF public.canonical_order_status(v_order.status) NOT IN ('open','assigned') THEN
    RAISE EXCEPTION 'Order sudah tidak dapat dibatalkan pada status %', v_order.status;
  END IF;

  SELECT * INTO v_job FROM public.jobs WHERE order_id=v_order.id LIMIT 1 FOR UPDATE;
  IF v_job.id IS NOT NULL THEN
    UPDATE public.jobs SET status='cancelled', workflow_status='cancelled',
      cancellation_actor='employer', cancellation_reason=v_reason,
      cancelled_at=now(), updated_at=now()
    WHERE id=v_job.id AND status IN ('open','assigned');
    UPDATE public.dispatch_offers SET status='cancelled', responded_at=now()
    WHERE job_id=v_job.id AND status IN ('offered','accepted');
  END IF;

  UPDATE public.orders SET status='cancelled', cancellation_actor='employer',
    cancellation_reason=v_reason, cancelled_at=now()
  WHERE id=v_order.id RETURNING * INTO v_order;
  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_order(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order(uuid,text) TO authenticated;

-- Participants follow the same canonical lifecycle. Transactional operations
-- remain performed by guarded server RPCs; this trigger only protects status edits.
CREATE OR REPLACE FUNCTION public.protect_participant_order_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_admin boolean := EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id=v_uid AND p.role='admin'
  );
  v_old text := public.canonical_order_status(OLD.status);
  v_new text := public.canonical_order_status(NEW.status);
BEGIN
  IF v_admin OR auth.role()='service_role' THEN RETURN NEW; END IF;
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF (to_jsonb(NEW)-'status') IS DISTINCT FROM (to_jsonb(OLD)-'status') THEN
    RAISE EXCEPTION 'Order ownership and billing fields are server-controlled';
  END IF;

  IF v_uid=OLD.employer_id THEN
    IF NOT ((v_old='open' AND v_new IN ('assigned','cancelled')) OR
            (v_old='assigned' AND v_new='cancelled') OR (v_old=v_new)) THEN
      RAISE EXCEPTION 'Invalid employer order status transition: % -> %',OLD.status,NEW.status;
    END IF;
    RETURN NEW;
  END IF;

  IF v_uid=OLD.worker_id THEN
    IF NOT ((v_old='assigned' AND v_new='in-progress') OR
            (v_old='in-progress' AND v_new='completed') OR (v_old=v_new)) THEN
      RAISE EXCEPTION 'Invalid worker order status transition: % -> %',OLD.status,NEW.status;
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Order participant authorization required';
END;
$function$;

COMMIT;
