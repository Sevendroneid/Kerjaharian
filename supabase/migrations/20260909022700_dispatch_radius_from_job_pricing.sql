CREATE OR REPLACE FUNCTION public.dispatch_open_job(p_job_id uuid, p_limit integer DEFAULT 10)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_job public.jobs;
  v_lat numeric;
  v_lng numeric;
  v_radius_meters numeric := 10000;
  v_count integer := 0;
  v_limit integer;
BEGIN
  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 10), 50));

  SELECT * INTO v_job
  FROM public.jobs
  WHERE id = p_job_id AND employer_id = auth.uid() AND status = 'open'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order tidak tersedia atau bukan milik employer'; END IF;

  SELECT ol.lat, ol.lng INTO v_lat, v_lng
  FROM public.order_locations ol
  WHERE ol.order_id = v_job.order_id
    AND ol.lat IS NOT NULL AND ol.lng IS NOT NULL
  ORDER BY ol.updated_at DESC NULLS LAST
  LIMIT 1;
  IF v_lat IS NULL OR v_lng IS NULL THEN RAISE EXCEPTION 'Koordinat lokasi pekerjaan belum tersedia'; END IF;

  SELECT COALESCE(jp.pickup_radius_km * 1000, 10000)
  INTO v_radius_meters
  FROM public.orders o
  LEFT JOIN public.job_prices jp ON jp.id = o.job_price_id
  WHERE o.id = v_job.order_id;

  v_radius_meters := GREATEST(1000, LEAST(COALESCE(v_radius_meters, 10000), 10000));

  UPDATE public.dispatch_offers
  SET status = 'expired', responded_at = now()
  WHERE job_id = p_job_id AND status = 'offered' AND expires_at <= now();

  INSERT INTO public.dispatch_offers(job_id, worker_id, rank, distance_meters, score)
  SELECT
    v_job.id,
    ranked.id,
    row_number() OVER (ORDER BY ranked.distance_meters, ranked.rating DESC),
    ranked.distance_meters,
    ranked.rating
  FROM (
    SELECT
      p.id,
      p.rating,
      (6371000 * 2 * asin(sqrt(
        power(sin(radians(wl.lat - v_lat) / 2), 2) +
        cos(radians(v_lat)) * cos(radians(wl.lat)) * power(sin(radians(wl.lng - v_lng) / 2), 2)
      ))) AS distance_meters
    FROM public.profiles p
    JOIN public.worker_locations wl ON wl.worker_id = p.id
    WHERE p.role = 'worker'
      AND p.is_online = true
      AND p.kyc_verified = true
      AND wl.updated_at > now() - interval '5 minutes'
      AND NOT EXISTS (
        SELECT 1 FROM public.jobs aj
        WHERE aj.worker_id = p.id AND aj.status = 'assigned' AND aj.completed_at IS NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.dispatch_offers d
        WHERE d.job_id = p_job_id AND d.worker_id = p.id AND d.status IN ('offered','accepted')
      )
  ) ranked
  WHERE ranked.distance_meters <= v_radius_meters
  ORDER BY ranked.distance_meters, ranked.rating DESC
  LIMIT v_limit;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.job_events(job_id, order_id, actor_id, event_type, metadata)
  VALUES (
    v_job.id,
    v_job.order_id,
    auth.uid(),
    'DISPATCH_CREATED',
    jsonb_build_object('offers', v_count, 'radius_meters', v_radius_meters)
  );

  RETURN v_count;
END;
$function$;
