-- KerjaHarian: bridge Employer orders into the server-authoritative jobs/timer flow.
-- Duration and overtime rate are configured at job-price level by admin/service role.

ALTER TABLE public.job_prices
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS overtime_rate_per_minute integer;

UPDATE public.job_prices
SET duration_minutes = CASE
  WHEN lower(job_name) LIKE '%cuci ac%' THEN 120
  WHEN lower(job_name) LIKE '%cuci piring%' THEN 360
  ELSE 480
END
WHERE duration_minutes IS NULL;

UPDATE public.job_prices
SET overtime_rate_per_minute = GREATEST(0, CEIL(base_price::numeric / NULLIF(duration_minutes, 0)))::integer
WHERE overtime_rate_per_minute IS NULL;

ALTER TABLE public.job_prices
  ADD CONSTRAINT job_prices_duration_positive CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  ADD CONSTRAINT job_prices_overtime_nonnegative CHECK (overtime_rate_per_minute IS NULL OR overtime_rate_per_minute >= 0);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (
  status = ANY (ARRAY['open'::text,'assigned'::text,'completed'::text,'cancelled'::text,
    'Pending'::text,'Accepted'::text,'In-Progress'::text,'Completed'::text])
);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS wage integer,
  ADD COLUMN IF NOT EXISTS total integer;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_order_id_unique ON public.jobs(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_prices_timing ON public.job_prices(category_id, is_active, duration_minutes);

CREATE OR REPLACE FUNCTION public.sync_order_to_job()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_price public.job_prices;
  v_duration integer;
  v_overtime integer;
  v_category text;
BEGIN
  IF NEW.status NOT IN ('open','Pending') THEN RETURN NEW; END IF;

  SELECT * INTO v_price FROM public.job_prices WHERE id = NEW.job_price_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Jenis pekerjaan tidak ditemukan'; END IF;

  v_duration := COALESCE(v_price.duration_minutes, GREATEST(60, COALESCE(NEW.hours, 8) * 60));
  v_overtime := COALESCE(v_price.overtime_rate_per_minute,
    GREATEST(0, CEIL(v_price.base_price::numeric / NULLIF(v_duration,0)))::integer);
  v_category := CASE v_price.category_id
    WHEN 'logistik' THEN 'logistik' WHEN 'tukang' THEN 'tukang'
    WHEN 'kebersihan' THEN 'kebersihan' ELSE 'serabutan' END;

  INSERT INTO public.jobs (
    employer_id, category, title, location, wage, wage_type, estimated_hours,
    fee, fee_breakdown, total, status, duration_minutes, overtime_rate_per_minute, order_id
  ) VALUES (
    NEW.employer_id, v_category, COALESCE(NULLIF(NEW.title,''),v_price.job_name),
    COALESCE(NULLIF(NEW.location,''),'Lokasi belum ditentukan'),
    GREATEST(75000,COALESCE(NEW.wage,NEW.total_price::integer,v_price.base_price)),
    'daily', CEIL(v_duration/60.0)::integer,
    (COALESCE(NEW.admin_fee,0)+COALESCE(NEW.insurance,0)+COALESCE(NEW.ppn,0))::integer,
    jsonb_build_object('insurance',COALESCE(NEW.insurance,0),'tax',COALESCE(NEW.ppn,0),'platform',COALESCE(NEW.admin_fee,0)),
    COALESCE(NEW.total_price,NEW.total,NEW.wage,v_price.base_price)::integer,
    'open',v_duration,v_overtime,NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_order_to_job ON public.orders;
CREATE TRIGGER trg_sync_order_to_job
AFTER INSERT OR UPDATE OF status,job_price_id,employer_id,title,location,wage,total_price,total
ON public.orders FOR EACH ROW EXECUTE FUNCTION public.sync_order_to_job();

CREATE OR REPLACE FUNCTION public.claim_job(p_job_id uuid)
RETURNS public.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_job public.jobs;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='worker' AND kyc_verified=true AND is_online=true) THEN
    RAISE EXCEPTION 'Worker harus terverifikasi dan online';
  END IF;
  UPDATE public.jobs SET worker_id=auth.uid(),status='assigned'
  WHERE id=p_job_id AND status='open' AND worker_id IS NULL RETURNING * INTO v_job;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan sudah diambil atau tidak tersedia'; END IF;
  IF v_job.order_id IS NOT NULL THEN
    UPDATE public.orders SET worker_id=auth.uid(),status='assigned'
    WHERE id=v_job.order_id AND status IN ('open','Pending');
  END IF;
  RETURN v_job;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_job(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.start_job(p_job_id uuid)
RETURNS public.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_job public.jobs;
BEGIN
  UPDATE public.jobs SET started_at=COALESCE(started_at,now()),scheduled_end_at=COALESCE(scheduled_end_at,now()+make_interval(mins=>duration_minutes))
  WHERE id=p_job_id AND status='assigned' AND duration_minutes>0 AND employer_id=auth.uid() AND worker_id IS NOT NULL
  RETURNING * INTO v_job;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job tidak dapat dimulai, belum ada pekerja, atau bukan milik pemberi kerja'; END IF;
  IF v_job.order_id IS NOT NULL THEN UPDATE public.orders SET status='In-Progress' WHERE id=v_job.order_id AND worker_id=v_job.worker_id; END IF;
  RETURN v_job;
END;
$$;
GRANT EXECUTE ON FUNCTION public.start_job(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.resolve_job_duration(p_job_id uuid,p_decision text)
RETURNS public.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_job public.jobs;
BEGIN
  IF p_decision NOT IN ('finished','continued') THEN RAISE EXCEPTION 'Invalid completion decision'; END IF;
  UPDATE public.jobs SET
    overtime_minutes=GREATEST(0,FLOOR(EXTRACT(EPOCH FROM(now()-scheduled_end_at))/60)::integer),
    overtime_amount=GREATEST(0,FLOOR(EXTRACT(EPOCH FROM(now()-scheduled_end_at))/60)::integer)*COALESCE(overtime_rate_per_minute,0),
    completion_decision=p_decision, completed_at=CASE WHEN p_decision='finished' THEN now() ELSE NULL END,
    status=CASE WHEN p_decision='finished' THEN 'completed' ELSE status END
  WHERE id=p_job_id AND employer_id=auth.uid() AND started_at IS NOT NULL AND scheduled_end_at IS NOT NULL
  RETURNING * INTO v_job;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job tidak dapat diselesaikan atau bukan milik pemberi kerja'; END IF;
  IF v_job.order_id IS NOT NULL AND p_decision='finished' THEN UPDATE public.orders SET status='Completed' WHERE id=v_job.order_id; END IF;
  RETURN v_job;
END;
$$;
GRANT EXECUTE ON FUNCTION public.resolve_job_duration(uuid,text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.claim_job(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.start_job(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_job_duration(uuid,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_order_to_job() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_order_to_job() FROM authenticated;
