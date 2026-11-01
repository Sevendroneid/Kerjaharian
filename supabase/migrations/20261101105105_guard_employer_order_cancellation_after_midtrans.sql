-- Prevent order cancellation after a Midtrans transaction has been initiated or settled.
-- Cancellation remains available before a Snap transaction exists; refunds/disputes use Resolution Center.
CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id uuid, p_reason text DEFAULT 'Dibatalkan oleh Employer'::text)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_order public.orders;
  v_job public.jobs;
  v_reason text := trim(coalesce(p_reason, ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Login diperlukan';
  END IF;
  IF char_length(v_reason) < 3 THEN
    RAISE EXCEPTION 'Alasan pembatalan wajib diisi';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id AND employer_id = auth.uid()
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order tidak ditemukan atau bukan milik Employer';
  END IF;
  IF public.canonical_order_status(v_order.status) NOT IN ('open', 'assigned') THEN
    RAISE EXCEPTION 'Order sudah tidak dapat dibatalkan pada status %', v_order.status;
  END IF;

  SELECT * INTO v_job
  FROM public.jobs
  WHERE order_id = v_order.id
  LIMIT 1
  FOR UPDATE;

  IF v_job.id IS NOT NULL AND (
    v_job.payment_status = 'settled'
    OR lower(coalesce(v_job.midtrans_transaction_status, '')) IN ('pending', 'authorize')
  ) THEN
    RAISE EXCEPTION 'Pembayaran Midtrans sudah dimulai. Gunakan Pusat Resolusi untuk permintaan pembatalan.';
  END IF;

  IF v_job.id IS NOT NULL THEN
    UPDATE public.jobs
    SET status = 'cancelled', workflow_status = 'cancelled',
        cancellation_actor = 'employer', cancellation_reason = v_reason,
        cancelled_at = now(), updated_at = now()
    WHERE id = v_job.id AND status IN ('open', 'assigned');

    UPDATE public.dispatch_offers
    SET status = 'cancelled', responded_at = now()
    WHERE job_id = v_job.id AND status IN ('offered', 'accepted');
  END IF;

  UPDATE public.orders
  SET status = 'cancelled', cancellation_actor = 'employer',
      cancellation_reason = v_reason, cancelled_at = now()
  WHERE id = v_order.id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$function$;
