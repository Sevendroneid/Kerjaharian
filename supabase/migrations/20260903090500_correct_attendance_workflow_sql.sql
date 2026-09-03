BEGIN;

CREATE OR REPLACE FUNCTION public.employer_check_in(p_job_id uuid, p_lat numeric, p_lng numeric, p_photo_path text DEFAULT NULL)
RETURNS public.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $function$
DECLARE v_job public.jobs; v_lat numeric; v_lng numeric; v_distance numeric;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id=p_job_id AND employer_id=auth.uid() AND status='assigned' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan tidak ditemukan atau bukan milik pemberi kerja'; END IF;
  IF p_lat IS NULL OR p_lng IS NULL OR p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Lokasi GPS tidak valid'; END IF;
  SELECT ol.lat,ol.lng INTO v_lat,v_lng FROM public.order_locations ol WHERE ol.order_id=v_job.order_id AND ol.lat IS NOT NULL AND ol.lng IS NOT NULL ORDER BY ol.updated_at DESC NULLS LAST LIMIT 1;
  IF v_lat IS NULL OR v_lng IS NULL THEN RAISE EXCEPTION 'Koordinat lokasi pekerjaan belum tersedia'; END IF;
  v_distance := 6371000 * 2 * asin(sqrt(power(sin(radians(p_lat-v_lat)/2),2) + cos(radians(v_lat))*cos(radians(p_lat))*power(sin(radians(p_lng-v_lng)/2),2)));
  IF v_distance > v_job.presence_radius_meters THEN RAISE EXCEPTION 'Anda masih %.0f meter dari lokasi pekerjaan. Maksimal %s meter',v_distance,v_job.presence_radius_meters; END IF;
  UPDATE public.jobs SET employer_checked_in_at=now(),employer_checkin_lat=p_lat,employer_checkin_lng=p_lng,employer_checkin_photo_path=NULLIF(p_photo_path,''),workflow_status=CASE WHEN worker_checked_in_at IS NOT NULL THEN 'ready_to_start' ELSE 'employer_checked_in' END,updated_at=now() WHERE id=p_job_id RETURNING * INTO v_job;
  INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata) VALUES (v_job.id,v_job.order_id,auth.uid(),'EMPLOYER_CHECKED_IN',jsonb_build_object('distance_meters',round(v_distance::numeric,1),'latitude',p_lat,'longitude',p_lng,'photo',p_photo_path IS NOT NULL));
  RETURN v_job;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.log_job_event(uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.log_job_event(uuid,text,jsonb) TO authenticated;
COMMIT;
