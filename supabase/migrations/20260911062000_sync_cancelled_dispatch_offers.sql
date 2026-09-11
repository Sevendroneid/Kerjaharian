BEGIN;

CREATE OR REPLACE FUNCTION public.cancel_assigned_job(p_job_id uuid, p_reason text)
RETURNS public.jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE v_job public.jobs; v_actor text; v_event text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login diperlukan'; END IF;
 SELECT * INTO v_job FROM public.jobs WHERE id=p_job_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan tidak ditemukan'; END IF;
 IF v_job.status <> 'assigned' OR v_job.worker_id IS NULL THEN RAISE EXCEPTION 'Pembatalan langsung hanya tersedia untuk pekerjaan yang sudah ditugaskan dan belum dimulai'; END IF;
 IF v_job.started_at IS NOT NULL THEN RAISE EXCEPTION 'Pekerjaan sudah dimulai. Gunakan Pusat Resolusi untuk sengketa atau penghentian'; END IF;
 IF auth.uid()=v_job.worker_id THEN v_actor:='worker'; v_event:='worker_late_cancel'; ELSIF auth.uid()=v_job.employer_id THEN v_actor:='employer'; v_event:=CASE WHEN v_job.worker_checked_in_at IS NOT NULL THEN 'employer_cancel_after_arrival' ELSE 'employer_cancel_after_accept' END; ELSIF NOT is_admin() THEN RAISE EXCEPTION 'Tidak berwenang membatalkan pekerjaan ini'; ELSE v_actor:='admin'; v_event:='employer_cancel_after_accept'; END IF;
 IF char_length(trim(COALESCE(p_reason,''))) < 3 THEN RAISE EXCEPTION 'Alasan pembatalan wajib diisi'; END IF;
 UPDATE public.jobs SET status='cancelled',workflow_status='cancelled',cancellation_actor=v_actor,cancellation_reason=trim(p_reason),cancelled_at=now(),updated_at=now() WHERE id=v_job.id RETURNING * INTO v_job;
 UPDATE public.dispatch_offers SET status='cancelled',responded_at=COALESCE(responded_at,now()) WHERE job_id=v_job.id AND status IN ('offered','accepted','pending','sent');
 UPDATE public.dispatch_confirmations SET status='expired',responded_at=COALESCE(responded_at,now()) WHERE job_id=v_job.id AND status='pending';
 IF v_job.order_id IS NOT NULL THEN UPDATE public.orders SET status='cancelled',cancellation_actor=v_actor,cancellation_reason=trim(p_reason),cancelled_at=now() WHERE id=v_job.order_id AND status NOT IN ('completed','cancelled'); END IF;
 INSERT INTO public.job_reliability_events(job_id,worker_id,employer_id,actor_id,event_type,severity,metadata) VALUES(v_job.id,v_job.worker_id,v_job.employer_id,auth.uid(),v_event,CASE WHEN v_event='employer_cancel_after_arrival' THEN 3 ELSE 2 END,jsonb_build_object('reason',trim(p_reason),'actor',v_actor));
 INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata) VALUES(v_job.id,v_job.order_id,auth.uid(),'JOB_CANCELLED',jsonb_build_object('actor',v_actor,'reason',trim(p_reason)));
 RETURN v_job;
END;
$$;
GRANT EXECUTE ON FUNCTION public.cancel_assigned_job(uuid,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_assigned_job(uuid,text) FROM PUBLIC,anon;
COMMIT;
