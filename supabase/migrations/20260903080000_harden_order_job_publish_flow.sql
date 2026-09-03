-- KerjaHarian: final hardening for Employer -> Worker -> Timer -> Settlement flow.
-- This migration reconciles the current application model with legacy live-schema columns.

-- -----------------------------------------------------------------------------
-- Profiles: fields required by the Worker UI and worker RPCs.
-- KYC remains optional for the current real-world test phase.
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS kyc_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rating numeric NOT NULL DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS jobs_done integer NOT NULL DEFAULT 0;

UPDATE public.profiles SET phone = COALESCE(phone, whatsapp) WHERE phone IS NULL AND whatsapp IS NOT NULL;

-- -----------------------------------------------------------------------------
-- Orders: neutral defaults for legacy required columns.
-- The BEFORE trigger below remains the financial source of truth.
-- -----------------------------------------------------------------------------
ALTER TABLE public.orders
  ALTER COLUMN tier SET DEFAULT 'standard',
  ALTER COLUMN subtotal SET DEFAULT 0,
  ALTER COLUMN admin_fee SET DEFAULT 0,
  ALTER COLUMN ppn SET DEFAULT 0,
  ALTER COLUMN insurance SET DEFAULT 0,
  ALTER COLUMN total_price SET DEFAULT 0,
  ALTER COLUMN tool_allowance SET DEFAULT 0,
  ALTER COLUMN hours SET DEFAULT 1;

CREATE OR REPLACE FUNCTION public.normalize_order_billing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_base_wage numeric;
  v_night_add numeric;
  v_platform_fee numeric;
  v_insurance numeric := 3227;
  v_total numeric;
  v_job_price public.job_prices;
BEGIN
  IF NEW.job_price_id IS NOT NULL THEN
    SELECT * INTO v_job_price FROM public.job_prices WHERE id=NEW.job_price_id;
  END IF;

  NEW.wage := GREATEST(0,COALESCE(NEW.wage,v_job_price.base_price,0));
  NEW.hours := COALESCE(NEW.hours,CEIL(COALESCE(v_job_price.duration_minutes,60)/60.0)::integer,1);
  NEW.tier := COALESCE(NULLIF(NEW.tier,''),'standard');
  NEW.needs_tools := COALESCE(NEW.needs_tools,false);
  NEW.tool_allowance := 0;
  NEW.night_shift := COALESCE(NEW.night_shift,false);

  v_night_add := CASE WHEN NEW.night_shift THEN ROUND(NEW.wage*0.20) ELSE 0 END;
  v_base_wage := NEW.wage+v_night_add;
  v_platform_fee := ROUND(v_base_wage*0.05);
  v_total := ROUND((v_base_wage+v_platform_fee+v_insurance)/1000.0)*1000;

  NEW.subtotal := v_base_wage;
  NEW.admin_fee := v_platform_fee;
  NEW.ppn := 0;
  NEW.insurance := v_insurance;
  NEW.total_price := v_total;
  NEW.total := v_total::integer;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_order_billing ON public.orders;
CREATE TRIGGER trg_normalize_order_billing
BEFORE INSERT OR UPDATE OF wage,night_shift,job_price_id,subtotal,admin_fee,ppn,insurance,total_price,total
ON public.orders FOR EACH ROW EXECUTE FUNCTION public.normalize_order_billing();

-- -----------------------------------------------------------------------------
-- Jobs: the live table still has legacy NOT NULL/check constraints used by old UI.
-- Align them with the timer workflow.
-- -----------------------------------------------------------------------------
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check CHECK (
  status = ANY (ARRAY['open'::text,'assigned'::text,'completed'::text,'cancelled'::text,'filled'::text,'deleted'::text])
);

DROP INDEX IF EXISTS public.unique_active_job_per_phone;

-- A broken legacy audit trigger previously referenced a missing table.
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.audit_logs FROM anon,authenticated;

CREATE OR REPLACE FUNCTION public.fn_audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    INSERT INTO public.audit_logs(table_name,record_id,action,new_data)
    VALUES(TG_TABLE_NAME,NEW.id,'INSERT',to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP='UPDATE' THEN
    INSERT INTO public.audit_logs(table_name,record_id,action,old_data,new_data)
    VALUES(TG_TABLE_NAME,NEW.id,'UPDATE',to_jsonb(OLD),to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP='DELETE' THEN
    INSERT INTO public.audit_logs(table_name,record_id,action,old_data)
    VALUES(TG_TABLE_NAME,OLD.id,'DELETE',to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.fn_audit_trigger() FROM PUBLIC,anon,authenticated;

-- -----------------------------------------------------------------------------
-- Order -> Job bridge. It fills every legacy required job field and mirrors the
-- authoritative rounded order bill. Existing open jobs are updated instead of
-- creating duplicate jobs.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_order_to_job()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_job_price public.job_prices;
  v_existing_job public.jobs;
  v_duration integer;
  v_overtime integer;
  v_category text;
  v_employer_phone text;
  v_worker_base integer;
  v_platform_fee integer;
  v_protection_fee integer;
  v_tax_amount integer;
  v_employer_total integer;
BEGIN
  IF NEW.status NOT IN ('open','Pending') THEN RETURN NEW; END IF;
  SELECT * INTO v_job_price FROM public.job_prices WHERE id=NEW.job_price_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Jenis pekerjaan tidak ditemukan'; END IF;
  SELECT COALESCE(whatsapp,'') INTO v_employer_phone FROM public.profiles WHERE id=NEW.employer_id;

  v_duration := COALESCE(v_job_price.duration_minutes,GREATEST(60,COALESCE(NEW.hours,8)*60));
  v_overtime := COALESCE(v_job_price.overtime_rate_per_minute,GREATEST(0,CEIL(v_job_price.base_price::numeric/NULLIF(v_duration,0)))::integer);
  v_category := CASE v_job_price.category_id
    WHEN 'logistik' THEN 'Logistik' WHEN 'tukang' THEN 'Tukang'
    WHEN 'kebersihan' THEN 'Kebersihan' ELSE 'Serabutan' END;
  v_worker_base := GREATEST(75000,COALESCE(NEW.subtotal,NEW.wage,v_job_price.base_price))::integer;
  v_platform_fee := COALESCE(NEW.admin_fee,0)::integer;
  v_protection_fee := COALESCE(NEW.insurance,0)::integer;
  v_tax_amount := COALESCE(NEW.ppn,0)::integer;
  v_employer_total := COALESCE(NEW.total_price,NEW.total,NEW.wage,v_job_price.base_price)::integer;

  SELECT * INTO v_existing_job FROM public.jobs WHERE order_id=NEW.id FOR UPDATE;
  IF FOUND THEN
    UPDATE public.jobs SET
      category=v_category,
      title=COALESCE(NULLIF(NEW.title,''),v_job_price.job_name),
      location=COALESCE(NULLIF(NEW.location,''),'Lokasi belum ditentukan'),
      location_address=COALESCE(NULLIF(NEW.location,''),'Lokasi belum ditentukan'),
      wage=GREATEST(75000,COALESCE(NEW.wage,v_job_price.base_price)),
      estimated_hours=CEIL(v_duration/60.0)::integer,
      fee=v_platform_fee+v_protection_fee+v_tax_amount,
      fee_breakdown=jsonb_build_object('insurance',v_protection_fee,'tax',v_tax_amount,'platform',v_platform_fee),
      total=v_employer_total,
      duration_minutes=v_duration,
      overtime_rate_per_minute=v_overtime,
      employer_phone_hash=md5(COALESCE(v_employer_phone,'')),
      employer_phone_plain=COALESCE(v_employer_phone,''),
      night_shift=COALESCE(NEW.night_shift,false),
      needs_tools=COALESCE(NEW.needs_tools,false),
      worker_base_amount=v_worker_base,
      worker_overtime_amount=COALESCE(v_existing_job.worker_overtime_amount,0),
      worker_amount=v_worker_base+COALESCE(v_existing_job.worker_overtime_amount,0),
      platform_fee=v_platform_fee,
      protection_fee=v_protection_fee,
      tax_amount=v_tax_amount,
      employer_total=v_employer_total,
      updated_at=now()
    WHERE id=v_existing_job.id;
    RETURN NEW;
  END IF;

  INSERT INTO public.jobs (
    employer_id,category,title,location,location_address,wage,wage_type,estimated_hours,
    fee,fee_breakdown,total,status,duration_minutes,overtime_rate_per_minute,order_id,
    employer_phone_hash,employer_phone_plain,night_shift,needs_tools,
    worker_base_amount,worker_overtime_amount,worker_amount,platform_fee,protection_fee,tax_amount,employer_total
  ) VALUES (
    NEW.employer_id,v_category,COALESCE(NULLIF(NEW.title,''),v_job_price.job_name),
    COALESCE(NULLIF(NEW.location,''),'Lokasi belum ditentukan'),
    COALESCE(NULLIF(NEW.location,''),'Lokasi belum ditentukan'),
    GREATEST(75000,COALESCE(NEW.wage,v_job_price.base_price)),'daily',CEIL(v_duration/60.0)::integer,
    v_platform_fee+v_protection_fee+v_tax_amount,
    jsonb_build_object('insurance',v_protection_fee,'tax',v_tax_amount,'platform',v_platform_fee),
    v_employer_total,'open',v_duration,v_overtime,NEW.id,
    md5(COALESCE(v_employer_phone,'')),COALESCE(v_employer_phone,''),
    COALESCE(NEW.night_shift,false),COALESCE(NEW.needs_tools,false),
    v_worker_base,0,v_worker_base,v_platform_fee,v_protection_fee,v_tax_amount,v_employer_total
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_order_to_job ON public.orders;
CREATE TRIGGER trg_sync_order_to_job
AFTER INSERT OR UPDATE OF status,job_price_id,employer_id,title,location,wage,total_price,total
ON public.orders FOR EACH ROW EXECUTE FUNCTION public.sync_order_to_job();
REVOKE EXECUTE ON FUNCTION public.sync_order_to_job() FROM PUBLIC,anon,authenticated;

-- -----------------------------------------------------------------------------
-- Worker test mode: KTP/KYC is optional during the current controlled test.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_worker_status(p_is_online boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='worker') THEN
    RAISE EXCEPTION 'Hanya profil Mitra Pekerja yang dapat mengubah status online';
  END IF;
  UPDATE public.profiles SET is_online=p_is_online WHERE id=auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_worker_status(boolean) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.update_worker_status(boolean) FROM anon;

CREATE OR REPLACE FUNCTION public.claim_job(p_job_id uuid)
RETURNS public.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_job public.jobs;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='worker' AND is_online=true) THEN
    RAISE EXCEPTION 'Mitra harus berprofil pekerja dan Online';
  END IF;
  UPDATE public.jobs SET worker_id=auth.uid(),status='assigned',updated_at=now()
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
REVOKE EXECUTE ON FUNCTION public.claim_job(uuid) FROM anon;

-- -----------------------------------------------------------------------------
-- Server-authoritative completion state machine.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_job_duration(p_job_id uuid,p_decision text)
RETURNS public.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_job public.jobs;
  v_now timestamptz:=now();
  v_overtime integer:=0;
  v_overtime_amount integer:=0;
  v_worker_base integer:=0;
  v_worker_amount integer:=0;
  v_platform_fee integer:=0;
  v_protection_fee integer:=0;
  v_tax_amount integer:=0;
  v_deal_total integer:=0;
  v_employer_total integer:=0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='employer') THEN RAISE EXCEPTION 'Akses pemberi kerja diperlukan'; END IF;
  IF p_decision NOT IN ('finished','continued') THEN RAISE EXCEPTION 'Keputusan tidak valid'; END IF;
  SELECT * INTO v_job FROM public.jobs WHERE id=p_job_id AND employer_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan tidak ditemukan'; END IF;
  IF v_job.status<>'assigned' THEN RAISE EXCEPTION 'Pekerjaan belum dalam status aktif'; END IF;
  IF v_job.started_at IS NULL OR v_job.scheduled_end_at IS NULL THEN RAISE EXCEPTION 'Pekerjaan belum dimulai'; END IF;

  v_worker_base:=GREATEST(0,COALESCE(v_job.worker_base_amount,v_job.wage,0));
  v_platform_fee:=GREATEST(0,COALESCE(v_job.platform_fee,COALESCE((v_job.fee_breakdown->>'platform')::integer,0)));
  v_protection_fee:=GREATEST(0,COALESCE(v_job.protection_fee,COALESCE((v_job.fee_breakdown->>'insurance')::integer,0)));
  v_tax_amount:=GREATEST(0,COALESCE(v_job.tax_amount,COALESCE((v_job.fee_breakdown->>'tax')::integer,0)));
  v_deal_total:=GREATEST(0,COALESCE(v_job.total,v_worker_base+v_platform_fee+v_protection_fee+v_tax_amount));
  v_overtime:=GREATEST(0,FLOOR(EXTRACT(EPOCH FROM (v_now-v_job.scheduled_end_at))/60)::integer);
  v_overtime_amount:=v_overtime*COALESCE(v_job.overtime_rate_per_minute,0);

  IF p_decision='continued' THEN
    UPDATE public.jobs SET completion_decision='continued',overtime_minutes=v_overtime,overtime_amount=v_overtime_amount,
      worker_base_amount=v_worker_base,worker_overtime_amount=v_overtime_amount,worker_amount=v_worker_base+v_overtime_amount,
      platform_fee=v_platform_fee,protection_fee=v_protection_fee,tax_amount=v_tax_amount,
      employer_total=v_deal_total+v_overtime_amount,final_amount=NULL,completed_at=NULL
    WHERE id=p_job_id RETURNING * INTO v_job;
    RETURN v_job;
  END IF;

  v_worker_amount:=v_worker_base+v_overtime_amount;
  v_employer_total:=v_deal_total+v_overtime_amount;
  UPDATE public.jobs SET overtime_minutes=v_overtime,overtime_amount=v_overtime_amount,
    worker_base_amount=v_worker_base,worker_overtime_amount=v_overtime_amount,worker_amount=v_worker_amount,
    platform_fee=v_platform_fee,protection_fee=v_protection_fee,tax_amount=v_tax_amount,
    employer_total=v_employer_total,completion_decision='finished',final_amount=v_employer_total,
    payment_status='pending',completed_at=v_now,status='completed'
  WHERE id=p_job_id RETURNING * INTO v_job;
  IF v_job.order_id IS NOT NULL THEN UPDATE public.orders SET status='Completed',total=v_employer_total WHERE id=v_job.order_id; END IF;
  RETURN v_job;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.resolve_job_duration(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.resolve_job_duration(uuid,text) TO authenticated;
