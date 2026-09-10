DROP FUNCTION IF EXISTS public.dispatch_open_job(uuid,integer);

CREATE FUNCTION public.dispatch_open_job(p_job_id uuid,p_limit integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_job public.jobs; v_lat numeric; v_lng numeric; v_radius_meters numeric:=10000; v_count integer:=0; v_limit integer; v_req jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login diperlukan'; END IF;
  v_limit:=GREATEST(1,LEAST(COALESCE(p_limit,10),50));
  SELECT * INTO v_job FROM public.jobs WHERE id=p_job_id AND employer_id=auth.uid() AND status='open' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order tidak tersedia atau bukan milik employer'; END IF;
  v_req:=COALESCE(v_job.matching_requirements,'{}'::jsonb);
  IF COALESCE((v_req->>'confirmed')::boolean,false) IS NOT TRUE THEN RETURN 0; END IF;
  SELECT ol.lat,ol.lng INTO v_lat,v_lng FROM public.order_locations ol WHERE ol.order_id=v_job.order_id AND ol.lat IS NOT NULL AND ol.lng IS NOT NULL ORDER BY ol.updated_at DESC NULLS LAST LIMIT 1;
  IF v_lat IS NULL OR v_lng IS NULL THEN RAISE EXCEPTION 'Koordinat lokasi pekerjaan belum tersedia'; END IF;
  SELECT COALESCE(jp.pickup_radius_km*1000,10000) INTO v_radius_meters FROM public.orders o LEFT JOIN public.job_prices jp ON jp.id=o.job_price_id WHERE o.id=v_job.order_id;
  v_radius_meters:=GREATEST(1000,LEAST(COALESCE(v_radius_meters,10000),10000));
  UPDATE public.dispatch_offers SET status='expired',responded_at=now() WHERE job_id=p_job_id AND status='offered' AND expires_at<=now();
  IF EXISTS (SELECT 1 FROM public.dispatch_confirmations WHERE job_id=p_job_id AND status='pending' AND expires_at>now()) THEN RETURN 0; END IF;
  INSERT INTO public.dispatch_offers(job_id,worker_id,rank,distance_meters,score)
  SELECT v_job.id,r.id,row_number() OVER (ORDER BY r.score DESC,r.distance_meters,r.rating DESC),r.distance_meters,r.score
  FROM (
    SELECT p.id,p.rating,
      (6371000*2*asin(sqrt(power(sin(radians(ST_Y(wl.location::geometry)-v_lat)/2),2)+cos(radians(v_lat))*cos(radians(ST_Y(wl.location::geometry)))*power(sin(radians(ST_X(wl.location::geometry)-v_lng)/2),2)))) AS distance_meters,
      (COALESCE(p.rating,5)*20
       + CASE WHEN coalesce((v_req->>'heavy_lifting_kg')::int,0)=0 OR coalesce(p.lifting_capacity_kg,0)>=(v_req->>'heavy_lifting_kg')::int THEN 10 ELSE -100 END
       + CASE WHEN coalesce((v_req->>'night_work')::boolean,false)=false OR p.night_work_ok THEN 10 ELSE -100 END
       + CASE WHEN coalesce((v_req->>'private_home')::boolean,false)=false OR p.private_home_ok THEN 10 ELSE -100 END
       + CASE WHEN coalesce(v_req->>'required_skill','')='' OR coalesce(v_req->>'required_skill','')=ANY(p.matching_skills) THEN 10 ELSE -20 END
       - LEAST(40,COALESCE(rel.no_show_count,0)*5+COALESCE(rel.cancel_count,0)*3)) AS score
    FROM public.profiles p JOIN public.worker_locations wl ON wl.worker_id=p.id
    LEFT JOIN LATERAL (SELECT COUNT(*) FILTER (WHERE event_type='worker_no_show')::numeric AS no_show_count,COUNT(*) FILTER (WHERE event_type='worker_late_cancel')::numeric AS cancel_count FROM public.job_reliability_events rr WHERE rr.worker_id=p.id AND rr.created_at>now()-interval '90 days') rel ON true
    WHERE p.role='worker' AND p.is_online=true AND p.kyc_verified=true AND wl.location IS NOT NULL AND wl.updated_at>now()-interval '5 minutes'
      AND NOT EXISTS (SELECT 1 FROM public.jobs aj WHERE aj.worker_id=p.id AND aj.status='assigned' AND aj.completed_at IS NULL)
      AND NOT EXISTS (SELECT 1 FROM public.dispatch_offers d WHERE d.job_id=p_job_id AND d.worker_id=p.id AND d.status IN ('offered','accepted'))
  ) r
  WHERE r.distance_meters<=v_radius_meters AND r.score>0
  ORDER BY r.score DESC,r.distance_meters,r.rating DESC LIMIT v_limit;
  GET DIAGNOSTICS v_count=ROW_COUNT;
  INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata) VALUES(v_job.id,v_job.order_id,auth.uid(),'DISPATCH_CREATED',jsonb_build_object('offers',v_count,'radius_meters',v_radius_meters,'ranking','requirements_plus_rating_plus_reliability','discrimination_guard','gender_and_age_ignored'));
  RETURN v_count;
END; $$;

REVOKE ALL ON FUNCTION public.dispatch_open_job(uuid,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dispatch_open_job(uuid,integer) TO authenticated;
