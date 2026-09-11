-- Reconcile the production hardening applied after the repository's previous
-- payment/reliability migration. This migration is intentionally idempotent.
-- Payment is post-completion; dispatch/claim must never require settlement.

CREATE OR REPLACE FUNCTION public.claim_job(p_job_id uuid)
RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_job public.jobs;
  v_jobs_today integer;
  v_cooldown timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login diperlukan'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='worker' AND is_online=true AND kyc_verified=true) THEN
    RAISE EXCEPTION 'Mitra harus sudah terverifikasi KTP dan Online';
  END IF;
  INSERT INTO public.worker_trust_profiles(worker_id,jobs_today,jobs_today_date,cooldown_until)
  VALUES(auth.uid(),0,current_date,NULL)
  ON CONFLICT(worker_id) DO NOTHING;
  SELECT jobs_today,cooldown_until INTO v_jobs_today,v_cooldown FROM public.worker_trust_profiles WHERE worker_id=auth.uid() FOR UPDATE;
  IF COALESCE(v_cooldown,'epoch'::timestamptz)>now() THEN RAISE EXCEPTION 'Mitra masih dalam jeda pengambilan pekerjaan'; END IF;
  IF COALESCE((SELECT jobs_today FROM public.worker_trust_profiles WHERE worker_id=auth.uid() AND jobs_today_date=current_date),0)>=10 THEN RAISE EXCEPTION 'Batas 10 pekerjaan per hari tercapai'; END IF;
  SELECT * INTO v_job FROM public.jobs WHERE id=p_job_id AND status='open' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan sudah diambil mitra lain'; END IF;
  UPDATE public.jobs SET worker_id=auth.uid(),status='assigned',workflow_status='assigned',assigned_at=COALESCE(assigned_at,now()),arrival_deadline_at=COALESCE(arrival_deadline_at,now()+interval '60 minutes'),updated_at=now()
  WHERE id=p_job_id AND status='open' AND worker_id IS NULL RETURNING * INTO v_job;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan sudah diambil mitra lain'; END IF;
  IF v_job.order_id IS NOT NULL THEN UPDATE public.orders SET worker_id=auth.uid(),status='assigned' WHERE id=v_job.order_id AND status IN ('open','Pending'); END IF;
  UPDATE public.worker_trust_profiles SET jobs_today=CASE WHEN jobs_today_date=current_date THEN jobs_today+1 ELSE 1 END,jobs_today_date=current_date,cooldown_until=now()+interval '30 seconds',updated_at=now() WHERE worker_id=auth.uid();
  INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata) VALUES(v_job.id,v_job.order_id,auth.uid(),'JOB_CLAIMED',jsonb_build_object('source','claim_job','arrival_deadline_at',v_job.arrival_deadline_at,'daily_cap',10,'cooldown_seconds',30));
  RETURN v_job;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_dispatch_offer(p_offer_id uuid)
RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_offer public.dispatch_offers; v_job public.jobs;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login diperlukan'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='worker' AND is_online=true AND kyc_verified=true) THEN RAISE EXCEPTION 'Mitra harus sudah terverifikasi KTP dan Online'; END IF;
  SELECT * INTO v_offer FROM public.dispatch_offers WHERE id=p_offer_id AND worker_id=auth.uid() AND status='offered' AND expires_at>now() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Panggilan kerja sudah tidak tersedia'; END IF;
  SELECT * INTO v_job FROM public.jobs WHERE id=v_offer.job_id AND status='open' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan sudah diambil mitra lain'; END IF;
  UPDATE public.jobs SET worker_id=auth.uid(),status='assigned',workflow_status='assigned',assigned_at=coalesce(assigned_at,now()),arrival_deadline_at=coalesce(arrival_deadline_at,now()+interval '60 minutes'),updated_at=now() WHERE id=v_job.id AND status='open' AND worker_id is null RETURNING * INTO v_job;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan sudah diambil mitra lain'; END IF;
  IF v_job.order_id IS NOT NULL THEN UPDATE public.orders SET worker_id=auth.uid(),status='assigned' WHERE id=v_job.order_id AND status IN ('open','Pending'); END IF;
  UPDATE public.dispatch_offers SET status='accepted',responded_at=now() WHERE id=v_offer.id;
  UPDATE public.dispatch_offers SET status='cancelled',responded_at=now() WHERE job_id=v_offer.job_id AND id<>v_offer.id AND status='offered';
  INSERT INTO public.worker_trust_profiles(worker_id,jobs_today,jobs_today_date,cooldown_until) VALUES(auth.uid(),1,current_date,now()+interval '30 seconds') ON CONFLICT(worker_id) DO UPDATE SET jobs_today=CASE WHEN worker_trust_profiles.jobs_today_date=current_date THEN worker_trust_profiles.jobs_today+1 ELSE 1 END,jobs_today_date=current_date,cooldown_until=now()+interval '30 seconds',updated_at=now();
  INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata) VALUES(v_job.id,v_job.order_id,auth.uid(),'DISPATCH_ACCEPTED',jsonb_build_object('offer_id',v_offer.id,'arrival_deadline_at',v_job.arrival_deadline_at,'trust_tier',v_offer.trust_tier_snapshot,'golden_window_stage',v_offer.golden_window_stage));
  RETURN v_job;
END;
$$;

CREATE OR REPLACE FUNCTION public.dispatch_open_job(p_job_id uuid, p_limit integer)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_job public.jobs; v_lat numeric; v_lng numeric; v_radius_meters numeric:=10000; v_count integer:=0; v_limit integer; v_req jsonb; v_stage smallint;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login diperlukan'; END IF;
  v_limit:=greatest(1,least(coalesce(p_limit,10),50));
  SELECT * INTO v_job FROM public.jobs WHERE id=p_job_id AND employer_id=auth.uid() AND status='open' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order tidak tersedia atau bukan milik employer'; END IF;
  v_req:=coalesce(v_job.matching_requirements,'{}'::jsonb); IF coalesce((v_req->>'confirmed')::boolean,false) IS NOT TRUE THEN RETURN 0; END IF;
  IF v_job.dispatch_started_at IS NULL THEN UPDATE public.jobs SET dispatch_started_at=now(),dispatch_stage=1,updated_at=now() WHERE id=p_job_id RETURNING * INTO v_job; END IF;
  v_stage:=CASE WHEN extract(epoch from now()-v_job.dispatch_started_at)<8 THEN 1 WHEN extract(epoch from now()-v_job.dispatch_started_at)<15 THEN 2 ELSE 3 END;
  IF v_stage<>v_job.dispatch_stage THEN UPDATE public.jobs SET dispatch_stage=v_stage,updated_at=now() WHERE id=p_job_id; END IF;
  SELECT ol.lat,ol.lng INTO v_lat,v_lng FROM public.order_locations ol WHERE ol.order_id=v_job.order_id AND ol.lat IS NOT NULL AND ol.lng IS NOT NULL ORDER BY ol.updated_at DESC NULLS LAST LIMIT 1;
  IF v_lat IS NULL OR v_lng IS NULL THEN RAISE EXCEPTION 'Koordinat lokasi pekerjaan belum tersedia'; END IF;
  SELECT coalesce(jp.pickup_radius_km*1000,10000) INTO v_radius_meters FROM public.orders o LEFT JOIN public.job_prices jp ON jp.id=o.job_price_id WHERE o.id=v_job.order_id;
  v_radius_meters:=greatest(1000,least(coalesce(v_radius_meters,10000),10000));
  UPDATE public.dispatch_offers SET status='expired',responded_at=now() WHERE job_id=p_job_id AND status='offered' AND expires_at<=now();
  INSERT INTO public.dispatch_offers(job_id,worker_id,rank,distance_meters,score,trust_tier_snapshot,golden_window_stage,offered_at,expires_at)
  SELECT v_job.id,r.id,row_number() over(order by r.score desc,r.distance_meters,r.rating desc),r.distance_meters,r.score,r.trust_tier,v_stage,now(),now()+interval '8 seconds'
  FROM (SELECT p.id,p.rating,coalesce(wt.trust_tier,'new') trust_tier,(6371000*2*asin(sqrt(power(sin(radians(st_y(wl.location::geometry)-v_lat)/2),2)+cos(radians(v_lat))*cos(radians(st_y(wl.location::geometry)))*power(sin(radians(st_x(wl.location::geometry)-v_lng)/2),2)))) distance_meters,(coalesce(wt.trust_score,50)+coalesce(p.rating,5)*10-least(40,coalesce(rel.no_show_count,0)*5+coalesce(rel.cancel_count,0)*3)) score
    FROM public.profiles p JOIN public.worker_locations wl ON wl.worker_id=p.id LEFT JOIN public.worker_trust_profiles wt ON wt.worker_id=p.id
    LEFT JOIN LATERAL (SELECT count(*) filter(where event_type='worker_no_show')::numeric no_show_count,count(*) filter(where event_type='worker_late_cancel')::numeric cancel_count FROM public.job_reliability_events rr WHERE rr.worker_id=p.id AND rr.created_at>now()-interval '90 days') rel ON true
    WHERE p.role='worker' AND p.is_online=true AND p.kyc_verified=true AND wl.location IS NOT NULL AND wl.updated_at>now()-interval '5 minutes'
      AND NOT EXISTS(select 1 from public.jobs aj where aj.worker_id=p.id and aj.status='assigned' and aj.completed_at is null)
      AND NOT EXISTS(select 1 from public.dispatch_offers d where d.job_id=p_job_id and d.worker_id=p.id and d.status in ('offered','accepted'))
      AND coalesce(wt.cooldown_until,'epoch'::timestamptz)<=now() AND case when wt.jobs_today_date=current_date then coalesce(wt.jobs_today,0) else 0 end<10
      AND case when v_stage=3 then true when v_stage=1 then coalesce(wt.trust_tier,'new')='trusted' when v_stage=2 then coalesce(wt.trust_tier,'new') in ('trusted','active') end) r
  WHERE r.distance_meters<=v_radius_meters AND r.score>0
  ORDER BY case r.trust_tier when 'trusted' then 1 when 'active' then 2 else 3 end,r.score desc,r.distance_meters,r.rating desc LIMIT v_limit;
  GET DIAGNOSTICS v_count=row_count;
  INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata) VALUES(v_job.id,v_job.order_id,auth.uid(),'DISPATCH_CREATED',jsonb_build_object('offers',v_count,'radius_meters',v_radius_meters,'golden_window_stage',v_stage,'windows','trusted 0-8s; active 8-15s; new >15s','daily_cap',10,'cooldown_seconds',30,'payment_gate','post_completion'));
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.detect_expired_worker_arrivals()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_count integer:=0; v_job public.jobs;
BEGIN
  FOR v_job IN SELECT * FROM public.jobs WHERE status='assigned' AND worker_id IS NOT NULL AND started_at IS NULL AND arrival_deadline_at IS NOT NULL AND arrival_deadline_at<now() FOR UPDATE SKIP LOCKED LOOP
    UPDATE public.jobs SET status='cancelled',workflow_status='cancelled',cancellation_actor='system',cancellation_reason='worker_arrival_deadline_expired',cancelled_at=now(),updated_at=now() WHERE id=v_job.id AND status='assigned' AND started_at IS NULL;
    IF FOUND THEN
      IF v_job.order_id IS NOT NULL THEN UPDATE public.orders SET status='cancelled',cancellation_actor='system',cancellation_reason='worker_arrival_deadline_expired',cancelled_at=now() WHERE id=v_job.order_id AND status NOT IN ('completed','cancelled'); END IF;
      UPDATE public.dispatch_offers SET status='cancelled',responded_at=now() WHERE job_id=v_job.id AND status IN ('offered','accepted');
      UPDATE public.dispatch_confirmations SET status='expired',responded_at=now() WHERE job_id=v_job.id AND status='pending';
      INSERT INTO public.job_reliability_events(job_id,worker_id,employer_id,actor_id,event_type,severity,metadata) VALUES(v_job.id,v_job.worker_id,v_job.employer_id,NULL,'worker_no_show',3,jsonb_build_object('arrival_deadline_at',v_job.arrival_deadline_at,'detected_at',now(),'automatic',true));
      INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata) VALUES(v_job.id,v_job.order_id,NULL,'WORKER_NO_SHOW_DETECTED',jsonb_build_object('arrival_deadline_at',v_job.arrival_deadline_at,'automatic',true,'order_status','cancelled'));
      v_count:=v_count+1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.worker_check_in(p_job_id uuid,p_lat numeric,p_lng numeric,p_photo_path text)
RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_job public.jobs; v_lat numeric; v_lng numeric; v_distance numeric; v_soft integer; v_hard integer; v_confidence text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login diperlukan'; END IF;
  SELECT * INTO v_job FROM public.jobs WHERE id=p_job_id AND worker_id=auth.uid() AND status='assigned' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan tidak ditemukan atau bukan milik mitra'; END IF;
  IF v_job.worker_checked_in_at IS NOT NULL THEN RETURN v_job; END IF;
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
$$;

CREATE OR REPLACE FUNCTION public.employer_check_in(p_job_id uuid,p_lat numeric,p_lng numeric,p_photo_path text DEFAULT NULL)
RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_job public.jobs; v_lat numeric; v_lng numeric; v_distance numeric; v_soft integer; v_hard integer; v_confidence text;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id=p_job_id AND employer_id=auth.uid() AND status='assigned' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan tidak ditemukan atau bukan milik pemberi kerja'; END IF;
  IF v_job.employer_checked_in_at IS NOT NULL THEN RETURN v_job; END IF;
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
$$;

CREATE OR REPLACE FUNCTION public.start_job(p_job_id uuid)
RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_job public.jobs;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id=p_job_id AND employer_id=auth.uid() AND status='assigned' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job tidak dapat dimulai atau bukan milik pemberi kerja'; END IF;
  IF v_job.started_at IS NOT NULL THEN RETURN v_job; END IF;
  IF v_job.worker_id IS NULL OR v_job.worker_checked_in_at IS NULL THEN RAISE EXCEPTION 'Mitra belum terverifikasi hadir'; END IF;
  IF v_job.employer_checked_in_at IS NULL AND v_job.employer_start_authorized_at IS NULL THEN RAISE EXCEPTION 'Pemberi kerja harus hadir di lokasi atau menyetujui mulai secara remote'; END IF;
  IF v_job.duration_minutes IS NULL OR v_job.duration_minutes<=0 THEN RAISE EXCEPTION 'Durasi pekerjaan belum dikonfigurasi'; END IF;
  UPDATE public.jobs SET started_at=now(),scheduled_end_at=now()+make_interval(mins=>duration_minutes),workflow_status='active',updated_at=now() WHERE id=p_job_id RETURNING * INTO v_job;
  IF v_job.order_id IS NOT NULL THEN UPDATE public.orders SET status='In-Progress' WHERE id=v_job.order_id AND worker_id=v_job.worker_id; END IF;
  INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata) VALUES(v_job.id,v_job.order_id,auth.uid(),'JOB_STARTED',jsonb_build_object('authorization_mode',COALESCE(v_job.employer_start_authorization_mode,'physical')));
  RETURN v_job;
END;
$$;

CREATE OR REPLACE FUNCTION public.authorize_remote_job_start(p_job_id uuid)
RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_job public.jobs;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id=p_job_id AND employer_id=auth.uid() AND status='assigned' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan tidak ditemukan atau bukan milik pemberi kerja'; END IF;
  IF v_job.started_at IS NOT NULL THEN RETURN v_job; END IF;
  IF v_job.worker_checked_in_at IS NULL THEN RAISE EXCEPTION 'Mitra belum terverifikasi hadir di lokasi'; END IF;
  IF v_job.worker_checkin_photo_path IS NULL THEN RAISE EXCEPTION 'Foto kehadiran mitra wajib tersedia untuk persetujuan jarak jauh'; END IF;
  IF v_job.duration_minutes IS NULL OR v_job.duration_minutes<=0 THEN RAISE EXCEPTION 'Durasi pekerjaan belum dikonfigurasi'; END IF;
  UPDATE public.jobs SET employer_start_authorized_at=now(),employer_start_authorization_mode='remote',started_at=now(),scheduled_end_at=now()+make_interval(mins=>duration_minutes),workflow_status='active',updated_at=now() WHERE id=p_job_id RETURNING * INTO v_job;
  IF v_job.order_id IS NOT NULL THEN UPDATE public.orders SET status='In-Progress' WHERE id=v_job.order_id AND worker_id=v_job.worker_id; END IF;
  INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata) VALUES(v_job.id,v_job.order_id,auth.uid(),'REMOTE_JOB_STARTED',jsonb_build_object('worker_checkin_at',v_job.worker_checked_in_at,'authorization_mode','remote'));
  RETURN v_job;
END;
$$;

-- Direct client mutation of sensitive audit/event tables is prohibited.
REVOKE ALL ON TABLE public.job_payment_events FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.job_payment_events FROM authenticated;
GRANT SELECT ON TABLE public.job_payment_events TO authenticated;
REVOKE ALL ON TABLE public.job_reliability_events FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.job_reliability_events FROM authenticated;
GRANT SELECT ON TABLE public.job_reliability_events TO authenticated;
REVOKE ALL ON TABLE public.worker_trust_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.worker_trust_profiles FROM authenticated;
GRANT SELECT ON TABLE public.worker_trust_profiles TO authenticated;

-- Keep the authoritative state model explicit for future maintainers.
COMMENT ON FUNCTION public.claim_job(uuid) IS 'Worker claim path; payment is post-completion and settlement is never a prerequisite.';
COMMENT ON FUNCTION public.dispatch_open_job(uuid,integer) IS 'Dispatch path; payment is post-completion and settlement is never a prerequisite.';
