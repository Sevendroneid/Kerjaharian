BEGIN;

-- The storage policy correctly restricts uploads to a user's folder, but the
-- RPC must also prevent a caller from attaching another existing object to a
-- job. Otherwise a participant could make a different user's object visible
-- through the job-attendance participant-read policy.
CREATE OR REPLACE FUNCTION public.worker_check_in(p_job_id uuid,p_lat numeric,p_lng numeric,p_photo_path text DEFAULT NULL)
RETURNS public.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $function$
DECLARE v_job public.jobs; v_lat numeric; v_lng numeric; v_distance numeric; v_soft integer; v_hard integer; v_confidence text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login diperlukan'; END IF;
 SELECT * INTO v_job FROM public.jobs WHERE id=p_job_id AND worker_id=auth.uid() AND status='assigned' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan tidak ditemukan atau bukan milik mitra'; END IF;
 IF v_job.worker_checked_in_at IS NOT NULL THEN RETURN v_job; END IF;
 IF p_photo_path IS NOT NULL AND p_photo_path <> '' AND p_photo_path NOT LIKE auth.uid()::text || '/attendance/' || p_job_id::text || '-%' THEN RAISE EXCEPTION 'Foto kehadiran tidak terkait dengan pekerjaan ini'; END IF;
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
 SELECT * INTO v_job FROM public.jobs WHERE id=p_job_id AND employer_id=auth.uid() AND status='assigned' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan tidak ditemukan atau bukan milik pemberi kerja'; END IF;
 IF v_job.employer_checked_in_at IS NOT NULL THEN RETURN v_job; END IF;
 IF p_photo_path IS NOT NULL AND p_photo_path <> '' AND p_photo_path NOT LIKE auth.uid()::text || '/attendance/' || p_job_id::text || '-%' THEN RAISE EXCEPTION 'Foto kehadiran tidak terkait dengan pekerjaan ini'; END IF;
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
REVOKE EXECUTE ON FUNCTION public.worker_check_in(uuid,numeric,numeric,text) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.employer_check_in(uuid,numeric,numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.worker_check_in(uuid,numeric,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.employer_check_in(uuid,numeric,numeric,text) TO authenticated;
COMMIT;
