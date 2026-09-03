-- Bring the live jobs schema in line with the server-authoritative timer/billing engine.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS employer_id uuid,
  ADD COLUMN IF NOT EXISTS worker_id uuid,
  ADD COLUMN IF NOT EXISTS job_type_id uuid,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS wage_type text NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS estimated_hours integer,
  ADD COLUMN IF NOT EXISTS fee integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS total integer,
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS overtime_rate_per_minute integer,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_end_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS overtime_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completion_decision text,
  ADD COLUMN IF NOT EXISTS worker_base_amount integer,
  ADD COLUMN IF NOT EXISTS worker_overtime_amount integer,
  ADD COLUMN IF NOT EXISTS worker_amount integer,
  ADD COLUMN IF NOT EXISTS platform_fee integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS protection_fee integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS employer_total integer;

UPDATE public.jobs
SET duration_minutes = COALESCE(duration_minutes, 480),
    overtime_rate_per_minute = COALESCE(overtime_rate_per_minute, GREATEST(0, CEIL(COALESCE(wage,0)::numeric / 480)::integer)),
    overtime_minutes = COALESCE(overtime_minutes, 0),
    overtime_amount = COALESCE(overtime_amount, 0),
    fee_breakdown = COALESCE(fee_breakdown, '{}'::jsonb),
    platform_fee = COALESCE(platform_fee, COALESCE((fee_breakdown->>'platform')::integer,0)),
    protection_fee = COALESCE(protection_fee, COALESCE((fee_breakdown->>'insurance')::integer,0)),
    tax_amount = COALESCE(tax_amount, COALESCE((fee_breakdown->>'tax')::integer,0));

UPDATE public.jobs
SET worker_base_amount = COALESCE(worker_base_amount, GREATEST(0,wage)),
    worker_overtime_amount = COALESCE(worker_overtime_amount, GREATEST(0,overtime_amount)),
    worker_amount = COALESCE(worker_amount, GREATEST(0,wage) + GREATEST(0,overtime_amount)),
    employer_total = COALESCE(employer_total, GREATEST(0,wage) + GREATEST(0,overtime_amount) + COALESCE(platform_fee,0) + COALESCE(protection_fee,0) + COALESCE(tax_amount,0));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='jobs_duration_positive') THEN ALTER TABLE public.jobs ADD CONSTRAINT jobs_duration_positive CHECK (duration_minutes IS NULL OR duration_minutes > 0); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='jobs_overtime_rate_nonnegative') THEN ALTER TABLE public.jobs ADD CONSTRAINT jobs_overtime_rate_nonnegative CHECK (overtime_rate_per_minute IS NULL OR overtime_rate_per_minute >= 0); END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_jobs_worker_status ON public.jobs(worker_id,status);
CREATE INDEX IF NOT EXISTS idx_jobs_employer_status ON public.jobs(employer_id,status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_order_id_unique ON public.jobs(order_id) WHERE order_id IS NOT NULL;

-- Prevent duplicate jobs when an employer edits an open order.
CREATE OR REPLACE FUNCTION public.sync_order_to_job()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_job_price public.job_prices; v_duration integer; v_overtime integer; v_category text; v_job public.jobs;
BEGIN
  IF NEW.status NOT IN ('open','Pending') THEN RETURN NEW; END IF;
  SELECT * INTO v_job_price FROM public.job_prices WHERE id=NEW.job_price_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Jenis pekerjaan tidak ditemukan'; END IF;
  v_duration:=COALESCE(v_job_price.duration_minutes,GREATEST(60,COALESCE(NEW.hours,8)*60));
  v_overtime:=COALESCE(v_job_price.overtime_rate_per_minute,GREATEST(0,CEIL(v_job_price.base_price::numeric/NULLIF(v_duration,0)))::integer);
  v_category:=CASE v_job_price.category_id WHEN 'logistik' THEN 'logistik' WHEN 'tukang' THEN 'tukang' WHEN 'kebersihan' THEN 'kebersihan' ELSE 'serabutan' END;
  SELECT * INTO v_job FROM public.jobs WHERE order_id=NEW.id FOR UPDATE;
  IF FOUND THEN
    UPDATE public.jobs SET title=COALESCE(NULLIF(NEW.title,''),v_job_price.job_name),location=COALESCE(NULLIF(NEW.location,''),'Lokasi belum ditentukan'),wage=GREATEST(75000,COALESCE(NEW.wage,NEW.total_price::integer,v_job_price.base_price)),estimated_hours=CEIL(v_duration/60.0)::integer,duration_minutes=v_duration,overtime_rate_per_minute=v_overtime,fee=COALESCE(NEW.admin_fee,0)::integer+COALESCE(NEW.insurance,0)::integer+COALESCE(NEW.ppn,0)::integer,fee_breakdown=jsonb_build_object('insurance',COALESCE(NEW.insurance,0),'tax',COALESCE(NEW.ppn,0),'platform',COALESCE(NEW.admin_fee,0)),total=COALESCE(NEW.total_price,NEW.total,NEW.wage,v_job_price.base_price)::integer,updated_at=now() WHERE id=v_job.id;
    RETURN NEW;
  END IF;
  INSERT INTO public.jobs(employer_id,category,job_type_id,title,location,wage,wage_type,estimated_hours,fee,fee_breakdown,total,status,duration_minutes,overtime_rate_per_minute,order_id)
  VALUES(NEW.employer_id,v_category,NULL,COALESCE(NULLIF(NEW.title,''),v_job_price.job_name),COALESCE(NULLIF(NEW.location,''),'Lokasi belum ditentukan'),GREATEST(75000,COALESCE(NEW.wage,NEW.total_price::integer,v_job_price.base_price)),'daily',CEIL(v_duration/60.0)::integer,COALESCE(NEW.admin_fee,0)::integer+COALESCE(NEW.insurance,0)::integer+COALESCE(NEW.ppn,0)::integer,jsonb_build_object('insurance',COALESCE(NEW.insurance,0),'tax',COALESCE(NEW.ppn,0),'platform',COALESCE(NEW.admin_fee,0)),COALESCE(NEW.total_price,NEW.total,NEW.wage,v_job_price.base_price)::integer,'open',v_duration,v_overtime,NEW.id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_order_to_job ON public.orders;
CREATE TRIGGER trg_sync_order_to_job AFTER INSERT OR UPDATE OF status,job_price_id,employer_id,title,location,wage,total_price,total ON public.orders FOR EACH ROW EXECUTE FUNCTION public.sync_order_to_job();
