-- Employers must save verified coordinates through an ownership/payment-guarded RPC.
CREATE OR REPLACE FUNCTION public.set_employer_order_location(
  p_order_id uuid,
  p_lat numeric,
  p_lng numeric
)
RETURNS public.order_locations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_order public.orders;
  v_job public.jobs;
  v_location public.order_locations;
  v_location_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Login diperlukan';
  END IF;
  IF p_lat IS NULL OR p_lng IS NULL OR p_lat < -90 OR p_lat > 90 OR p_lng < -180 OR p_lng > 180 THEN
    RAISE EXCEPTION 'Koordinat lokasi tidak valid';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
    AND employer_id = auth.uid()
    AND status IN ('open', 'Pending')
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order tidak ditemukan atau bukan milik Employer';
  END IF;

  SELECT * INTO v_job
  FROM public.jobs
  WHERE order_id = v_order.id
    AND employer_id = auth.uid()
    AND status = 'open'
    AND worker_id IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pekerjaan tidak tersedia untuk perubahan lokasi';
  END IF;

  IF v_job.payment_status = 'settled'
     OR v_job.midtrans_order_id IS NOT NULL
     OR lower(coalesce(v_job.midtrans_transaction_status, '')) IN ('pending', 'authorize') THEN
    RAISE EXCEPTION 'Lokasi tidak dapat diubah setelah transaksi Midtrans dimulai';
  END IF;

  SELECT id INTO v_location_id
  FROM public.order_locations
  WHERE order_id = p_order_id AND worker_id IS NULL
  ORDER BY updated_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_location_id IS NULL THEN
    INSERT INTO public.order_locations(order_id, lat, lng, worker_id, updated_at)
    VALUES (p_order_id, p_lat, p_lng, NULL, now())
    RETURNING * INTO v_location;
  ELSE
    UPDATE public.order_locations
    SET lat = p_lat, lng = p_lng, updated_at = now()
    WHERE id = v_location_id
    RETURNING * INTO v_location;
  END IF;

  RETURN v_location;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_employer_order_location(uuid, numeric, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_employer_order_location(uuid, numeric, numeric) TO authenticated;
