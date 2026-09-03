CREATE OR REPLACE FUNCTION public.authorize_remote_job_start(p_job_id uuid)
RETURNS public.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $function$
DECLARE v_job public.jobs;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id=p_job_id AND employer_id=auth.uid() AND status='assigned' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan tidak ditemukan atau bukan milik pemberi kerja'; END IF;
  IF v_job.worker_checked_in_at IS NULL THEN RAISE EXCEPTION 'Mitra belum terverifikasi hadir di lokasi'; END IF;
  IF v_job.worker_checkin_photo_path IS NULL THEN RAISE EXCEPTION 'Foto kehadiran mitra wajib tersedia untuk persetujuan jarak jauh'; END IF;
  IF v_job.duration_minutes IS NULL OR v_job.duration_minutes <= 0 THEN RAISE EXCEPTION 'Durasi pekerjaan belum dikonfigurasi'; END IF;
  UPDATE public.jobs SET employer_start_authorized_at=now(),employer_start_authorization_mode='remote',started_at=COALESCE(started_at,now()),scheduled_end_at=COALESCE(scheduled_end_at,now()+make_interval(mins=>duration_minutes)),workflow_status='active',updated_at=now() WHERE id=p_job_id RETURNING * INTO v_job;
  IF v_job.order_id IS NOT NULL THEN UPDATE public.orders SET status='In-Progress' WHERE id=v_job.order_id AND worker_id=v_job.worker_id; END IF;
  INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata) VALUES (v_job.id,v_job.order_id,auth.uid(),'REMOTE_JOB_STARTED',jsonb_build_object('worker_checkin_at',v_job.worker_checked_in_at,'authorization_mode','remote'));
  RETURN v_job;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.authorize_remote_job_start(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.authorize_remote_job_start(uuid) TO authenticated;
