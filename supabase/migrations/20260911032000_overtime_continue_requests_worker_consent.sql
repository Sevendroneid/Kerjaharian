CREATE OR REPLACE FUNCTION public.resolve_job_duration(p_job_id uuid,p_decision text)
RETURNS public.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_job public.jobs; v_now timestamptz:=now(); v_overtime integer:=0; v_overtime_amount integer:=0; v_worker_base integer:=0; v_worker_amount integer:=0; v_platform_fee integer:=0; v_protection_fee integer:=0; v_tax_amount integer:=0; v_deal_total integer:=0; v_employer_total integer:=0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='employer') THEN RAISE EXCEPTION 'Akses pemberi kerja diperlukan'; END IF;
  IF p_decision NOT IN ('finished','continued') THEN RAISE EXCEPTION 'Keputusan tidak valid'; END IF;
  SELECT * INTO v_job FROM public.jobs WHERE id=p_job_id AND employer_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan tidak ditemukan'; END IF;
  IF v_job.status<>'assigned' THEN RAISE EXCEPTION 'Pekerjaan sudah diselesaikan'; END IF;
  IF v_job.started_at IS NULL OR v_job.scheduled_end_at IS NULL THEN RAISE EXCEPTION 'Pekerjaan belum dimulai'; END IF;
  v_worker_base:=GREATEST(0,COALESCE(v_job.worker_base_amount,v_job.wage,0)); v_platform_fee:=GREATEST(0,COALESCE(v_job.platform_fee,COALESCE((v_job.fee_breakdown->>'platform')::integer,0))); v_protection_fee:=GREATEST(0,COALESCE(v_job.protection_fee,COALESCE((v_job.fee_breakdown->>'insurance')::integer,0))); v_tax_amount:=GREATEST(0,COALESCE(v_job.tax_amount,COALESCE((v_job.fee_breakdown->>'tax')::integer,0))); v_deal_total:=GREATEST(0,COALESCE(v_job.total,v_worker_base+v_platform_fee+v_protection_fee+v_tax_amount));
  IF p_decision='continued' AND v_job.overtime_consent_status<>'confirmed' THEN
    IF v_job.overtime_consent_status='declined' THEN RAISE EXCEPTION 'Mitra tidak menyetujui lembur'; END IF;
    UPDATE public.jobs SET overtime_consent_status='requested',overtime_requested_at=COALESCE(overtime_requested_at,v_now),updated_at=v_now WHERE id=p_job_id RETURNING * INTO v_job;
    INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata) VALUES(v_job.id,v_job.order_id,auth.uid(),'OVERTIME_REQUESTED',jsonb_build_object('requested_at',v_job.overtime_requested_at,'source','resolve_job_duration'));
    RETURN v_job;
  END IF;
  IF p_decision='continued' THEN
    v_overtime:=GREATEST(0,FLOOR(EXTRACT(EPOCH FROM (v_now-v_job.scheduled_end_at))/60)::integer); v_overtime_amount:=v_overtime*GREATEST(0,COALESCE(v_job.overtime_rate_per_minute,0));
    UPDATE public.jobs SET overtime_minutes=v_overtime,overtime_amount=v_overtime_amount,worker_base_amount=v_worker_base,worker_overtime_amount=v_overtime_amount,worker_amount=v_worker_base+v_overtime_amount,platform_fee=v_platform_fee,protection_fee=v_protection_fee,tax_amount=v_tax_amount,employer_total=v_deal_total+v_overtime_amount,final_amount=NULL,completion_decision='continued',workflow_status='overtime',updated_at=v_now WHERE id=p_job_id RETURNING * INTO v_job;
    INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata) VALUES(v_job.id,v_job.order_id,auth.uid(),'OVERTIME_STARTED',jsonb_build_object('minutes',v_overtime,'amount',v_overtime_amount,'worker_confirmed',true)); RETURN v_job;
  END IF;
  v_overtime:=CASE WHEN v_job.overtime_consent_status='confirmed' THEN GREATEST(0,COALESCE(v_job.overtime_minutes,0)) ELSE 0 END; v_overtime_amount:=CASE WHEN v_job.overtime_consent_status='confirmed' THEN GREATEST(0,COALESCE(v_job.overtime_amount,0)) ELSE 0 END; v_worker_amount:=v_worker_base+v_overtime_amount; v_employer_total:=v_deal_total+v_overtime_amount;
  UPDATE public.jobs SET overtime_minutes=v_overtime,overtime_amount=v_overtime_amount,worker_base_amount=v_worker_base,worker_overtime_amount=v_overtime_amount,worker_amount=v_worker_amount,platform_fee=v_platform_fee,protection_fee=v_protection_fee,tax_amount=v_tax_amount,employer_total=v_employer_total,completion_decision='finished',final_amount=v_employer_total,payment_status='pending',completed_at=v_now,status='completed',workflow_status='completed',updated_at=v_now WHERE id=p_job_id RETURNING * INTO v_job;
  IF v_job.order_id IS NOT NULL THEN UPDATE public.orders SET status='Completed',total=v_employer_total,total_price=v_employer_total WHERE id=v_job.order_id; END IF;
  INSERT INTO public.job_events(job_id,order_id,actor_id,event_type,metadata) VALUES(v_job.id,v_job.order_id,auth.uid(),'JOB_COMPLETED',jsonb_build_object('overtime_minutes',v_overtime,'final_amount',v_employer_total)); RETURN v_job;
END; $$;
