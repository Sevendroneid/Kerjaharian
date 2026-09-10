BEGIN;

-- Reliability is a dispatch signal, not a punishment. Recent no-shows/cancellations
-- reduce ranking modestly; they never create an automatic ban or suspension.
CREATE INDEX IF NOT EXISTS job_reliability_worker_recent_idx
  ON public.job_reliability_events(worker_id, created_at DESC)
  WHERE worker_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.dispatch_open_job(p_job_id uuid, p_limit integer DEFAULT 10)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $function$
DECLARE
  v_job public.jobs;
  v_lat numeric;
  v_lng numeric;
  v_radius_meters numeric := 10000;
  v_count integer := 0;
  v_limit integer;
  v_req jsonb;
BEGIN
  v_limit := GREATEST(1, LEAST(COALESCE(p_limit,10),50));
  SELECT * INTO v_job FROM public.jobs
  WHERE id=p_job_id AND employer_id=auth.uid() AND status='open' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order tidak tersedia atau bukan milik employer'; END IF;

  -- Dispatch remains gated by the existing employer confirmation workflow.
  v_req := COALESCE(v_job.matching_requirements,'{}'::jsonb);
  IF COALESCE((v_req->>'confirmed')::boolean,false) IS NOT TRUE THEN RETURN 0; END IF;
  UPDATE public.dispatch_confirmations
  SET status='expired', responded_at=now()
  WHERE job_id=p_job_id AND status='pending' AND expires_at<=now();
  IF EXISTS (
    SELECT 1 FROM public.dispatch_confirmations
    WHERE job_id=p_job_id AND status='pending' AND expires_at>now()
  ) THEN RETURN 0; END IF;

  SELECT ol.lat,ol.lng INTO v_lat,v_lng
  FROM public.order_locations ol
  WHERE ol.order_id=v_job.order_id AND ol.lat IS NOT NULL AND ol.lng IS NOT NULL
  ORDER BY ol.updated_at DESC NULLS LAST LIMIT 1;
  IF v_lat IS NULL OR v_lng IS NULL THEN RAISE EXCEPTION 'Koordinat lokasi pekerjaan belum tersedia'; END IF;

  SELECT COALESCE(jp.pickup_radius_km*1000,10000) INTO v_radius_meters
  FROM public.orders o LEFT JOIN public.job_prices jp ON jp.id=o.job_price_id
  WHERE o.id=v_job.order_id;
  v_radius_meters := GREATEST(1000, LEAST(COALESCE(v_radius_meters,10000),10000));

  UPDATE public.dispatch_offers
  SET status='expired',responded_at=now()
  WHERE job_id=p_job_id AND status='offered' AND expires_at<=now();

  INSERT INTO public.dispatch_offers(job_id,worker_id,rank,distance_meters,score)
  SELECT v_job.id,r.id,
    row_number() OVER (ORDER BY r.score DESC,r.distance_meters,r.rating DESC),
    r.distance_meters,r.score
  FROM (
    SELECT p.id,p.rating,
      (6371000*2*asin(sqrt(
        power(sin(radians(ST_Y(wl.location::geometry)-v_lat)/2),2) +
        cos(radians(v_lat))*cos(radians(ST_Y(wl.location::geometry))) *
        power(sin(radians(ST_X(wl.location::geometry)-v_lng)/2),2)
      ))) AS distance_meters,
      (
        COALESCE(p.rating,5)*20
        + CASE WHEN coalesce(v_req->>'gender','any')='any' OR p.gender=v_req->>'gender' OR p.gender IS NULL THEN 10 ELSE -100 END
        + CASE WHEN (v_req->>'age_min') IS NULL OR p.birth_year IS NULL THEN 0
               WHEN extract(year from now())-p.birth_year BETWEEN (v_req->>'age_min')::int AND coalesce((v_req->>'age_max')::int,120) THEN 10 ELSE -100 END
        + CASE WHEN coalesce((v_req->>'heavy_lifting_kg')::int,0)=0 OR coalesce(p.lifting_capacity_kg,0)>=(v_req->>'heavy_lifting_kg')::int THEN 10 ELSE -100 END
        + CASE WHEN coalesce((v_req->>'night_work')::boolean,false)=false OR p.night_work_ok THEN 10 ELSE -100 END
        + CASE WHEN coalesce((v_req->>'private_home')::boolean,false)=false OR p.private_home_ok THEN 10 ELSE -100 END
        + CASE WHEN coalesce(v_req->>'required_skill','')='' OR coalesce(v_req->>'required_skill','')=ANY(p.matching_skills) THEN 10 ELSE -20 END
        - LEAST(40,
            COALESCE(rel.no_show_count,0)*5 + COALESCE(rel.cancel_count,0)*3
          )
      ) AS score
    FROM public.profiles p
    JOIN public.worker_locations wl ON wl.worker_id=p.id
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (WHERE event_type='worker_no_show')::numeric AS no_show_count,
        COUNT(*) FILTER (WHERE event_type='worker_late_cancel')::numeric AS cancel_count
      FROM public.job_reliability_events r
      WHERE r.worker_id=p.id AND r.created_at>now()-interval '90 days'
    ) rel ON true
    WHERE p.role='worker' AND p.is_online=true AND p.kyc_verified=true
      AND wl.location IS NOT NULL AND wl.updated_at>now()-interval '5 minutes'
      AND NOT EXISTS (
        SELECT 1 FROM public.jobs aj
        WHERE aj.worker_id=p.id AND aj.status='assigned' AND aj.completed_at IS NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.dispatch_offers d
        WHERE d.job_id=p_job_id AND d.worker_id=p.id AND d.status IN ('offered','accepted')
      )
  ) r
  WHERE r.distance_meters<=v_radius_meters AND r.score>0
  ORDER BY r.score DESC,r.distance_meters,r.rating DESC
  LIMIT v_limit;

  GET DIAGNOSTICS v_count=ROW_COUNT;
  INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata)
  VALUES(v_job.id,v_job.order_id,auth.uid(),'DISPATCH_CREATED',jsonb_build_object(
    'offers',v_count,'radius_meters',v_radius_meters,'ranking','requirements_plus_rating_plus_reliability'
  ));
  RETURN v_count;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.dispatch_open_job(uuid,integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.dispatch_open_job(uuid,integer) FROM PUBLIC,anon;

-- GPS confidence: soft radius is normal; hard radius is a controlled fallback for
-- dense/indoor conditions and is recorded for later review.
CREATE OR REPLACE FUNCTION public.worker_check_in(p_job_id uuid,p_lat numeric,p_lng numeric,p_photo_path text DEFAULT NULL)
RETURNS public.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $function$
DECLARE v_job public.jobs; v_lat numeric; v_lng numeric; v_distance numeric; v_soft integer; v_hard integer; v_confidence text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login diperlukan'; END IF;
  SELECT * INTO v_job FROM public.jobs WHERE id=p_job_id AND worker_id=auth.uid() AND status='assigned' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan tidak ditemukan atau bukan milik mitra'; END IF;
  IF p_lat IS NULL OR p_lng IS NULL OR p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Lokasi GPS tidak valid'; END IF;
  SELECT ol.lat,ol.lng INTO v_lat,v_lng FROM public.order_locations ol WHERE ol.order_id=v_job.order_id AND ol.lat IS NOT NULL AND ol.lng IS NOT NULL ORDER BY ol.updated_at DESC NULLS LAST LIMIT 1;
  IF v_lat IS NULL OR v_lng IS NULL THEN RAISE EXCEPTION 'Koordinat lokasi pekerjaan belum tersedia'; END IF;
  SELECT gps_soft_radius_meters,gps_hard_radius_meters INTO v_soft,v_hard FROM public.platform_policy_config WHERE id=true;
  v_soft:=COALESCE(v_soft,v_job.presence_radius_meters,100); v_hard:=GREATEST(v_soft,COALESCE(v_hard,v_soft*2));
  v_distance:=6371000*2*asin(sqrt(power(sin(radians(p_lat-v_lat)/2),2)+cos(radians(v_lat))*cos(radians(p_lat))*power(sin(radians(p_lng-v_lng)/2),2)));
  IF v_distance>v_hard THEN RAISE EXCEPTION 'Anda masih %.0f meter dari lokasi pekerjaan. Maksimal %s meter',v_distance,v_hard; END IF;
  v_confidence:=CASE WHEN v_distance<=v_soft THEN 'high' ELSE 'medium' END;
  UPDATE public.jobs SET worker_checked_in_at=now(),worker_checkin_lat=p_lat,worker_checkin_lng=p_lng,worker_checkin_photo_path=NULLIF(p_photo_path,''),gps_confidence=v_confidence,presence_radius_meters=v_hard,workflow_status=CASE WHEN employer_checked_in_at IS NOT NULL THEN 'ready_to_start' ELSE 'worker_checked_in' END,updated_at=now() WHERE id=p_job_id RETURNING * INTO v_job;
  IF v_confidence='medium' THEN INSERT INTO public.job_reliability_events(job_id,worker_id,employer_id,actor_id,event_type,severity,metadata) VALUES(v_job.id,v_job.worker_id,v_job.employer_id,auth.uid(),'gps_exception',1,jsonb_build_object('distance_meters',round(v_distance::numeric,1),'soft_radius_meters',v_soft,'hard_radius_meters',v_hard)); END IF;
  INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata) VALUES(v_job.id,v_job.order_id,auth.uid(),'WORKER_CHECKED_IN',jsonb_build_object('distance_meters',round(v_distance::numeric,1),'gps_confidence',v_confidence,'photo',p_photo_path IS NOT NULL));
  RETURN v_job;
END;
$function$;

CREATE OR REPLACE FUNCTION public.employer_check_in(p_job_id uuid,p_lat numeric,p_lng numeric,p_photo_path text DEFAULT NULL)
RETURNS public.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $function$
DECLARE v_job public.jobs; v_lat numeric; v_lng numeric; v_distance numeric; v_soft integer; v_hard integer; v_confidence text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login diperlukan'; END IF;
  SELECT * INTO v_job FROM public.jobs WHERE id=p_job_id AND employer_id=auth.uid() AND status='assigned' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan tidak ditemukan atau bukan milik pemberi kerja'; END IF;
  IF p_lat IS NULL OR p_lng IS NULL OR p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Lokasi GPS tidak valid'; END IF;
  SELECT ol.lat,ol.lng INTO v_lat,v_lng FROM public.order_locations ol WHERE ol.order_id=v_job.order_id AND ol.lat IS NOT NULL AND ol.lng IS NOT NULL ORDER BY ol.updated_at DESC NULLS LAST LIMIT 1;
  IF v_lat IS NULL OR v_lng IS NULL THEN RAISE EXCEPTION 'Koordinat lokasi pekerjaan belum tersedia'; END IF;
  SELECT gps_soft_radius_meters,gps_hard_radius_meters INTO v_soft,v_hard FROM public.platform_policy_config WHERE id=true;
  v_soft:=COALESCE(v_soft,v_job.presence_radius_meters,100); v_hard:=GREATEST(v_soft,COALESCE(v_hard,v_soft*2));
  v_distance:=6371000*2*asin(sqrt(power(sin(radians(p_lat-v_lat)/2),2)+cos(radians(v_lat))*cos(radians(p_lat))*power(sin(radians(p_lng-v_lng)/2),2)));
  IF v_distance>v_hard THEN RAISE EXCEPTION 'Anda masih %.0f meter dari lokasi pekerjaan. Maksimal %s meter',v_distance,v_hard; END IF;
  v_confidence:=CASE WHEN v_distance<=v_soft THEN 'high' ELSE 'medium' END;
  UPDATE public.jobs SET employer_checked_in_at=now(),employer_checkin_lat=p_lat,employer_checkin_lng=p_lng,employer_checkin_photo_path=NULLIF(p_photo_path,''),gps_confidence=COALESCE(gps_confidence,v_confidence),presence_radius_meters=v_hard,workflow_status=CASE WHEN worker_checked_in_at IS NOT NULL THEN 'ready_to_start' ELSE 'employer_checked_in' END,updated_at=now() WHERE id=p_job_id RETURNING * INTO v_job;
  IF v_confidence='medium' THEN INSERT INTO public.job_reliability_events(job_id,worker_id,employer_id,actor_id,event_type,severity,metadata) VALUES(v_job.id,v_job.worker_id,v_job.employer_id,auth.uid(),'gps_exception',1,jsonb_build_object('distance_meters',round(v_distance::numeric,1),'soft_radius_meters',v_soft,'hard_radius_meters',v_hard)); END IF;
  INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata) VALUES(v_job.id,v_job.order_id,auth.uid(),'EMPLOYER_CHECKED_IN',jsonb_build_object('distance_meters',round(v_distance::numeric,1),'gps_confidence',v_confidence,'photo',p_photo_path IS NOT NULL));
  RETURN v_job;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.worker_check_in(uuid,numeric,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.employer_check_in(uuid,numeric,numeric,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.worker_check_in(uuid,numeric,numeric,text) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.employer_check_in(uuid,numeric,numeric,text) FROM PUBLIC,anon;
COMMIT;
