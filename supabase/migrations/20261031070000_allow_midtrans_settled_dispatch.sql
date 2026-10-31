-- Allow the direct Midtrans settlement state to pass the dispatch payment gate.
-- Keep the legacy reserved-funds path unchanged. Refund/cancel/pending states remain blocked.
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
  v_req jsonb;
  v_stage smallint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Login diperlukan';
  END IF;

  v_limit := greatest(1, least(coalesce(p_limit, 10), 50));

  SELECT *
  INTO v_job
  FROM public.jobs
  WHERE id = p_job_id
    AND employer_id = auth.uid()
    AND status = 'open'
    AND (
      payment_status = 'funds_reserved'
      OR (payment_status = 'settled' AND payment_required IS TRUE)
    )
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order tidak tersedia, bukan milik employer, atau pembayaran belum berhasil';
  END IF;

  v_req := coalesce(v_job.matching_requirements, '{}'::jsonb);
  IF coalesce((v_req->>'confirmed')::boolean, false) IS NOT TRUE THEN
    RETURN 0;
  END IF;

  IF v_job.dispatch_started_at IS NULL THEN
    UPDATE public.jobs
    SET dispatch_started_at = now(), dispatch_stage = 1, updated_at = now()
    WHERE id = p_job_id
    RETURNING * INTO v_job;
  END IF;

  v_stage := CASE
    WHEN extract(epoch FROM now() - v_job.dispatch_started_at) < 8 THEN 1
    WHEN extract(epoch FROM now() - v_job.dispatch_started_at) < 15 THEN 2
    ELSE 3
  END;

  IF v_stage <> v_job.dispatch_stage THEN
    UPDATE public.jobs SET dispatch_stage = v_stage, updated_at = now()
    WHERE id = p_job_id;
  END IF;

  SELECT ol.lat, ol.lng
  INTO v_lat, v_lng
  FROM public.order_locations ol
  WHERE ol.order_id = v_job.order_id
    AND ol.lat IS NOT NULL
    AND ol.lng IS NOT NULL
  ORDER BY ol.updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_lat IS NULL OR v_lng IS NULL THEN
    RAISE EXCEPTION 'Koordinat lokasi pekerjaan belum tersedia';
  END IF;

  SELECT coalesce(jp.pickup_radius_km * 1000, 10000)
  INTO v_radius_meters
  FROM public.orders o
  LEFT JOIN public.job_prices jp ON jp.id = o.job_price_id
  WHERE o.id = v_job.order_id;

  v_radius_meters := greatest(1000, least(coalesce(v_radius_meters, 10000), 10000));

  UPDATE public.dispatch_offers
  SET status = 'expired', responded_at = now()
  WHERE job_id = p_job_id
    AND status = 'offered'
    AND expires_at <= now();

  INSERT INTO public.dispatch_offers (
    job_id, worker_id, rank, distance_meters, score, trust_tier_snapshot,
    golden_window_stage, offered_at, expires_at
  )
  SELECT
    v_job.id, r.id,
    row_number() OVER (ORDER BY r.score DESC, r.distance_meters, r.rating DESC),
    r.distance_meters, r.score, r.trust_tier, v_stage, now(), now() + interval '8 seconds'
  FROM (
    SELECT
      p.id,
      p.rating,
      coalesce(wt.trust_tier, 'new') trust_tier,
      (6371000 * 2 * asin(sqrt(
        power(sin(radians(st_y(wl.location::geometry) - v_lat) / 2), 2)
        + cos(radians(v_lat)) * cos(radians(st_y(wl.location::geometry)))
        * power(sin(radians(st_x(wl.location::geometry) - v_lng) / 2), 2)
      ))) distance_meters,
      (coalesce(wt.trust_score, 50) + coalesce(p.rating, 5) * 10
        - least(40, coalesce(rel.no_show_count, 0) * 5 + coalesce(rel.cancel_count, 0) * 3)) score
    FROM public.profiles p
    JOIN public.worker_locations wl ON wl.worker_id = p.id
    LEFT JOIN public.worker_trust_profiles wt ON wt.worker_id = p.id
    LEFT JOIN LATERAL (
      SELECT
        count(*) FILTER (WHERE event_type = 'worker_no_show')::numeric no_show_count,
        count(*) FILTER (WHERE event_type = 'worker_late_cancel')::numeric cancel_count
      FROM public.job_reliability_events rr
      WHERE rr.worker_id = p.id
        AND rr.created_at > now() - interval '90 days'
    ) rel ON true
    WHERE p.role = 'worker'
      AND p.is_online = true
      AND p.kyc_verified = true
      AND wl.location IS NOT NULL
      AND wl.updated_at > now() - interval '5 minutes'
      AND NOT EXISTS (
        SELECT 1 FROM public.jobs aj
        WHERE aj.worker_id = p.id AND aj.status = 'assigned' AND aj.completed_at IS NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.dispatch_offers d
        WHERE d.job_id = p_job_id AND d.worker_id = p.id
          AND d.status IN ('offered', 'accepted')
      )
      AND coalesce(wt.cooldown_until, 'epoch'::timestamptz) <= now()
      AND CASE WHEN wt.jobs_today_date = current_date THEN coalesce(wt.jobs_today, 0) ELSE 0 END < 10
      AND (
        v_stage = 3
        OR (v_stage = 1 AND coalesce(wt.trust_tier, 'new') = 'trusted')
        OR (v_stage = 2 AND coalesce(wt.trust_tier, 'new') IN ('trusted', 'active'))
      )
  ) r
  WHERE r.distance_meters <= v_radius_meters
    AND r.score > 0
  ORDER BY
    CASE r.trust_tier WHEN 'trusted' THEN 1 WHEN 'active' THEN 2 ELSE 3 END,
    r.score DESC, r.distance_meters, r.rating DESC
  LIMIT v_limit;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.job_events(job_id, order_id, actor_id, event_type, metadata)
  VALUES (
    v_job.id, v_job.order_id, auth.uid(), 'DISPATCH_CREATED',
    jsonb_build_object(
      'offers', v_count,
      'radius_meters', v_radius_meters,
      'golden_window_stage', v_stage,
      'windows', 'trusted 0-8s; active 8-15s; new >15s',
      'daily_cap', 10,
      'cooldown_seconds', 30,
      'payment_gate', 'funds_reserved_or_midtrans_settled'
    )
  );

  RETURN v_count;
END;
$function$;
