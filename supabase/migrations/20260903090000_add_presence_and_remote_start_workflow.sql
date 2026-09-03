BEGIN;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS workflow_status text NOT NULL DEFAULT 'assigned',
  ADD COLUMN IF NOT EXISTS worker_checked_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS worker_checkin_lat numeric,
  ADD COLUMN IF NOT EXISTS worker_checkin_lng numeric,
  ADD COLUMN IF NOT EXISTS worker_checkin_photo_path text,
  ADD COLUMN IF NOT EXISTS employer_checked_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS employer_checkin_lat numeric,
  ADD COLUMN IF NOT EXISTS employer_checkin_lng numeric,
  ADD COLUMN IF NOT EXISTS employer_checkin_photo_path text,
  ADD COLUMN IF NOT EXISTS employer_start_authorized_at timestamptz,
  ADD COLUMN IF NOT EXISTS employer_start_authorization_mode text,
  ADD COLUMN IF NOT EXISTS presence_radius_meters integer NOT NULL DEFAULT 100;

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_workflow_status_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_workflow_status_check CHECK (workflow_status IN ('assigned','worker_checked_in','employer_checked_in','ready_to_start','active','overtime','completed','cancelled'));
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_start_authorization_mode_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_start_authorization_mode_check CHECK (employer_start_authorization_mode IS NULL OR employer_start_authorization_mode IN ('physical','remote'));
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_presence_radius_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_presence_radius_check CHECK (presence_radius_meters BETWEEN 25 AND 500);

UPDATE public.jobs SET workflow_status = CASE
  WHEN status = 'completed' THEN 'completed'
  WHEN status = 'cancelled' OR status = 'deleted' THEN 'cancelled'
  WHEN started_at IS NOT NULL THEN CASE WHEN completion_decision = 'continued' AND completed_at IS NULL THEN 'overtime' ELSE 'active' END
  WHEN worker_checked_in_at IS NOT NULL AND employer_checked_in_at IS NOT NULL THEN 'ready_to_start'
  WHEN worker_checked_in_at IS NOT NULL THEN 'worker_checked_in'
  WHEN employer_checked_in_at IS NOT NULL THEN 'employer_checked_in'
  ELSE 'assigned'
END
WHERE workflow_status = 'assigned';

CREATE TABLE IF NOT EXISTS public.job_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  order_id uuid, actor_id uuid, event_type text NOT NULL, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_events_job_id_created_at_idx ON public.job_events(job_id, created_at DESC);
ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.job_events TO authenticated;
DROP POLICY IF EXISTS "job participants can view job events" ON public.job_events;
CREATE POLICY "job participants can view job events" ON public.job_events FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_events.job_id AND (j.worker_id = (select auth.uid()) OR j.employer_id = (select auth.uid())))
);

INSERT INTO storage.buckets (id,name,public) VALUES ('job-attendance','job-attendance',false) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "job attendance upload own folder" ON storage.objects;
CREATE POLICY "job attendance upload own folder" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'job-attendance' AND (storage.foldername(name))[1] = (select auth.uid())::text);
DROP POLICY IF EXISTS "job attendance read participants" ON storage.objects;
CREATE POLICY "job attendance read participants" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'job-attendance' AND ((storage.foldername(name))[1] = (select auth.uid())::text OR EXISTS (
    SELECT 1 FROM public.jobs j WHERE (j.worker_id = (select auth.uid()) OR j.employer_id = (select auth.uid()))
      AND (j.worker_checkin_photo_path = name OR j.employer_checkin_photo_path = name)
  ))
);

CREATE OR REPLACE FUNCTION public.worker_check_in(p_job_id uuid, p_lat numeric, p_lng numeric, p_photo_path text DEFAULT NULL)
RETURNS public.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $function$
DECLARE v_job public.jobs; v_lat numeric; v_lng numeric; v_distance numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login diperlukan'; END IF;
  SELECT * INTO v_job FROM public.jobs WHERE id=p_job_id AND worker_id=auth.uid() AND status='assigned' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan tidak ditemukan atau bukan milik mitra'; END IF;
  IF p_lat IS NULL OR p_lng IS NULL OR p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Lokasi GPS tidak valid'; END IF;
  SELECT ol.lat,ol.lng INTO v_lat,v_lng FROM public.order_locations ol WHERE ol.order_id=v_job.order_id AND ol.lat IS NOT NULL AND ol.lng IS NOT NULL ORDER BY ol.updated_at DESC NULLS LAST LIMIT 1;
  IF v_lat IS NULL OR v_lng IS NULL THEN RAISE EXCEPTION 'Koordinat lokasi pekerjaan belum tersedia'; END IF;
  v_distance := 6371000 * 2 * asin(sqrt(power(sin(radians(p_lat-v_lat)/2),2) + cos(radians(v_lat))*cos(radians(p_lat))*power(sin(radians(p_lng-v_lng)/2),2)));
  IF v_distance > v_job.presence_radius_meters THEN RAISE EXCEPTION 'Anda masih %.0f meter dari lokasi pekerjaan. Maksimal %s meter',v_distance,v_job.presence_radius_meters; END IF;
  UPDATE public.jobs SET worker_checked_in_at=now(),worker_checkin_lat=p_lat,worker_checkin_lng=p_lng,worker_checkin_photo_path=NULLIF(p_photo_path,''),workflow_status=CASE WHEN employer_checked_in_at IS NOT NULL THEN 'ready_to_start' ELSE 'worker_checked_in' END,updated_at=now() WHERE id=p_job_id RETURNING * INTO v_job;
  INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata) VALUES (v_job.id,v_job.order_id,auth.uid(),'WORKER_CHECKED_IN',jsonb_build_object('distance_meters',round(v_distance::numeric,1),'latitude',p_lat,'longitude',p_lng,'photo',p_photo_path IS NOT NULL));
  RETURN v_job;
END;
$function$;

CREATE OR REPLACE FUNCTION public.employer_check_in(p_job_id uuid, p_lat numeric, p_lng numeric, p_photo_path text DEFAULT NULL)
RETURNS public.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $function$
DECLARE v_job public.jobs; v_lat numeric; v_lng numeric; v_distance numeric;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id=p_job_id AND employer_id=auth.uid() AND status='assigned' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan tidak ditemukan atau bukan milik pemberi kerja'; END IF;
  IF p_lat IS NULL OR p_lng IS NULL OR p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Lokasi GPS tidak valid'; END IF;
  SELECT ol.lat,ol.lng INTO v_lat,v_lng FROM public.order_locations ol WHERE ol.order_id=v_job.order_id AND ol.lat IS NOT NULL AND ol.lng IS NOT NULL ORDER BY ol.updated_at DESC NULLS LAST LIMIT 1;
  IF v_lat IS NULL OR v_lng IS NULL THEN RAISE EXCEPTION 'Koordinat lokasi pekerjaan belum tersedia'; END IF;
  v_distance := 6371000 * 2 * asin(sqrt(power(sin(radians(p_lat-v_lat)/2),2) + cos(radians(v_lat))*cos(radians(p_lat))*power(sin(radians(p_lng-v_lat)/2),2)));
  IF v_distance > v_job.presence_radius_meters THEN RAISE EXCEPTION 'Anda masih %.0f meter dari lokasi pekerjaan. Maksimal %s meter',v_distance,v_job.presence_radius_meters; END IF;
  UPDATE public.jobs SET employer_checked_in_at=now(),employer_checkin_lat=p_lat,employer_checkin_lng=p_lng,employer_checkin_photo_path=NULLIF(p_photo_path,''),workflow_status=CASE WHEN worker_checked_in_at IS NOT NULL THEN 'ready_to_start' ELSE 'employer_checked_in' END,updated_at=now() WHERE id=p_job_id RETURNING * INTO v_job;
  INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata) VALUES (v_job.id,v_job.order_id,auth.uid(),'EMPLOYER_CHECKED_IN',jsonb_build_object('distance_meters',round(v_distance::numeric,1),'latitude',p_lat,'longitude',p_lng,'photo',p_photo_path IS NOT NULL));
  RETURN v_job;
END;
$function$;

CREATE OR REPLACE FUNCTION public.authorize_remote_job_start(p_job_id uuid)
RETURNS public.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $function$
DECLARE v_job public.jobs;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id=p_job_id AND employer_id=auth.uid() AND status='assigned' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan tidak ditemukan atau bukan milik pemberi kerja'; END IF;
  IF v_job.worker_checked_in_at IS NULL THEN RAISE EXCEPTION 'Mitra belum terverifikasi hadir di lokasi'; END IF;
  IF v_job.worker_checkin_photo_path IS NULL THEN RAISE EXCEPTION 'Foto kehadiran mitra wajib tersedia untuk persetujuan jarak jauh'; END IF;
  UPDATE public.jobs SET employer_start_authorized_at=now(),employer_start_authorization_mode='remote',workflow_status='ready_to_start',updated_at=now() WHERE id=p_job_id RETURNING * INTO v_job;
  INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata) VALUES (v_job.id,v_job.order_id,auth.uid(),'EMPLOYER_REMOTE_START_AUTHORIZED',jsonb_build_object('worker_checkin_at',v_job.worker_checked_in_at));
  RETURN v_job;
END;
$function$;

CREATE OR REPLACE FUNCTION public.start_job(p_job_id uuid)
RETURNS public.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $function$
DECLARE v_job public.jobs;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id=p_job_id AND employer_id=auth.uid() AND status='assigned' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job tidak dapat dimulai atau bukan milik pemberi kerja'; END IF;
  IF v_job.worker_id IS NULL OR v_job.worker_checked_in_at IS NULL THEN RAISE EXCEPTION 'Mitra belum terverifikasi hadir'; END IF;
  IF v_job.employer_checked_in_at IS NULL AND v_job.employer_start_authorized_at IS NULL THEN RAISE EXCEPTION 'Pemberi kerja harus hadir di lokasi atau menyetujui mulai secara remote'; END IF;
  IF v_job.duration_minutes IS NULL OR v_job.duration_minutes <= 0 THEN RAISE EXCEPTION 'Durasi pekerjaan belum dikonfigurasi'; END IF;
  UPDATE public.jobs SET started_at=COALESCE(started_at,now()),scheduled_end_at=COALESCE(scheduled_end_at,now()+make_interval(mins=>duration_minutes)),workflow_status='active',updated_at=now() WHERE id=p_job_id RETURNING * INTO v_job;
  IF v_job.order_id IS NOT NULL THEN UPDATE public.orders SET status='In-Progress' WHERE id=v_job.order_id AND worker_id=v_job.worker_id; END IF;
  INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata) VALUES (v_job.id,v_job.order_id,auth.uid(),'JOB_STARTED',jsonb_build_object('authorization_mode',COALESCE(v_job.employer_start_authorization_mode,'physical')));
  RETURN v_job;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_job_duration(p_job_id uuid, p_decision text)
RETURNS public.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE v_job public.jobs; v_now timestamptz:=now(); v_overtime integer:=0; v_overtime_amount integer:=0; v_worker_base integer:=0; v_worker_amount integer:=0; v_platform_fee integer:=0; v_protection_fee integer:=0; v_tax_amount integer:=0; v_deal_total integer:=0; v_employer_total integer:=0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='employer') THEN RAISE EXCEPTION 'Akses pemberi kerja diperlukan'; END IF;
  IF p_decision NOT IN ('finished','continued') THEN RAISE EXCEPTION 'Keputusan tidak valid'; END IF;
  SELECT * INTO v_job FROM public.jobs WHERE id=p_job_id AND employer_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan tidak ditemukan'; END IF;
  IF v_job.status<>'assigned' THEN RAISE EXCEPTION 'Pekerjaan sudah diselesaikan'; END IF;
  IF v_job.started_at IS NULL OR v_job.scheduled_end_at IS NULL THEN RAISE EXCEPTION 'Pekerjaan belum dimulai'; END IF;
  v_worker_base:=GREATEST(0,COALESCE(v_job.worker_base_amount,v_job.wage,0)); v_platform_fee:=GREATEST(0,COALESCE(v_job.platform_fee,COALESCE((v_job.fee_breakdown->>'platform')::integer,0))); v_protection_fee:=GREATEST(0,COALESCE(v_job.protection_fee,COALESCE((v_job.fee_breakdown->>'insurance')::integer,0))); v_tax_amount:=GREATEST(0,COALESCE(v_job.tax_amount,COALESCE((v_job.fee_breakdown->>'tax')::integer,0))); v_deal_total:=GREATEST(0,COALESCE(v_job.total,v_worker_base+v_platform_fee+v_protection_fee+v_tax_amount)); v_overtime:=GREATEST(0,FLOOR(EXTRACT(EPOCH FROM (v_now-v_job.scheduled_end_at))/60)::integer); v_overtime_amount:=v_overtime*GREATEST(0,COALESCE(v_job.overtime_rate_per_minute,0));
  IF p_decision='continued' THEN
    IF v_job.completion_decision='finished' OR v_job.status='completed' THEN RAISE EXCEPTION 'Pekerjaan sudah diselesaikan'; END IF;
    UPDATE public.jobs SET completion_decision='continued',overtime_minutes=v_overtime,overtime_amount=v_overtime_amount,worker_base_amount=v_worker_base,worker_overtime_amount=v_overtime_amount,worker_amount=v_worker_base+v_overtime_amount,platform_fee=v_platform_fee,protection_fee=v_protection_fee,tax_amount=v_tax_amount,employer_total=v_deal_total+v_overtime_amount,final_amount=NULL,completed_at=NULL,workflow_status='overtime',updated_at=now() WHERE id=p_job_id RETURNING * INTO v_job;
    INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata) VALUES (v_job.id,v_job.order_id,auth.uid(),'OVERTIME_STARTED',jsonb_build_object('minutes',v_overtime,'amount',v_overtime_amount)); RETURN v_job;
  END IF;
  v_worker_amount:=v_worker_base+v_overtime_amount; v_employer_total:=v_deal_total+v_overtime_amount;
  UPDATE public.jobs SET overtime_minutes=v_overtime,overtime_amount=v_overtime_amount,worker_base_amount=v_worker_base,worker_overtime_amount=v_overtime_amount,worker_amount=v_worker_amount,platform_fee=v_platform_fee,protection_fee=v_protection_fee,tax_amount=v_tax_amount,employer_total=v_employer_total,completion_decision='finished',final_amount=v_employer_total,payment_status='pending',completed_at=v_now,status='completed',workflow_status='completed',updated_at=v_now WHERE id=p_job_id RETURNING * INTO v_job;
  IF v_job.order_id IS NOT NULL THEN UPDATE public.orders SET status='Completed',total=v_employer_total,total_price=v_employer_total WHERE id=v_job.order_id; END IF;
  INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata) VALUES (v_job.id,v_job.order_id,auth.uid(),'JOB_COMPLETED',jsonb_build_object('overtime_minutes',v_overtime,'final_amount',v_employer_total)); RETURN v_job;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.worker_check_in(uuid,numeric,numeric,text) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.employer_check_in(uuid,numeric,numeric,text) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.authorize_remote_job_start(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.worker_check_in(uuid,numeric,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.employer_check_in(uuid,numeric,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_remote_job_start(uuid) TO authenticated;
GRANT SELECT ON public.jobs TO authenticated;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='job_events') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.job_events; END IF;
END $$;
COMMIT;
