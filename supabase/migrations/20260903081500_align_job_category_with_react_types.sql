-- Canonical job category values are lowercase IDs used by the React app.
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_category_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_category_check CHECK (
  category = ANY (ARRAY['logistik'::text,'tukang'::text,'kebersihan'::text,'serabutan'::text])
);

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
    WHEN 'logistik' THEN 'logistik' WHEN 'tukang' THEN 'tukang'
    WHEN 'kebersihan' THEN 'kebersihan' ELSE 'serabutan' END;
  v_worker_base := GREATEST(75000,COALESCE(NEW.subtotal,NEW.wage,v_job_price.base_price))::integer;
  v_platform_fee := COALESCE(NEW.admin_fee,0)::integer;
  v_protection_fee := COALESCE(NEW.insurance,0)::integer;
  v_tax_amount := COALESCE(NEW.ppn,0)::integer;
  v_employer_total := COALESCE(NEW.total_price,NEW.total,NEW.wage,v_job_price.base_price)::integer;

  SELECT * INTO v_existing_job FROM public.jobs WHERE order_id=NEW.id FOR UPDATE;
  IF FOUND THEN
    UPDATE public.jobs SET category=v_category,title=COALESCE(NULLIF(NEW.title,''),v_job_price.job_name),
      location=COALESCE(NULLIF(NEW.location,''),'Lokasi belum ditentukan'),location_address=COALESCE(NULLIF(NEW.location,''),'Lokasi belum ditentukan'),
      wage=GREATEST(75000,COALESCE(NEW.wage,v_job_price.base_price)),estimated_hours=CEIL(v_duration/60.0)::integer,
      fee=v_platform_fee+v_protection_fee+v_tax_amount,
      fee_breakdown=jsonb_build_object('insurance',v_protection_fee,'tax',v_tax_amount,'platform',v_platform_fee),
      total=v_employer_total,duration_minutes=v_duration,overtime_rate_per_minute=v_overtime,
      employer_phone_hash=md5(COALESCE(v_employer_phone,'')),employer_phone_plain=COALESCE(v_employer_phone,''),
      night_shift=COALESCE(NEW.night_shift,false),needs_tools=COALESCE(NEW.needs_tools,false),worker_base_amount=v_worker_base,
      worker_overtime_amount=COALESCE(v_existing_job.worker_overtime_amount,0),worker_amount=v_worker_base+COALESCE(v_existing_job.worker_overtime_amount,0),
      platform_fee=v_platform_fee,protection_fee=v_protection_fee,tax_amount=v_tax_amount,employer_total=v_employer_total,updated_at=now()
    WHERE id=v_existing_job.id;
    RETURN NEW;
  END IF;

  INSERT INTO public.jobs (
    employer_id,category,title,location,location_address,wage,wage_type,estimated_hours,fee,fee_breakdown,total,status,duration_minutes,overtime_rate_per_minute,order_id,
    employer_phone_hash,employer_phone_plain,night_shift,needs_tools,worker_base_amount,worker_overtime_amount,worker_amount,platform_fee,protection_fee,tax_amount,employer_total
  ) VALUES (
    NEW.employer_id,v_category,COALESCE(NULLIF(NEW.title,''),v_job_price.job_name),COALESCE(NULLIF(NEW.location,''),'Lokasi belum ditentukan'),COALESCE(NULLIF(NEW.location,''),'Lokasi belum ditentukan'),
    GREATEST(75000,COALESCE(NEW.wage,v_job_price.base_price)),'daily',CEIL(v_duration/60.0)::integer,v_platform_fee+v_protection_fee+v_tax_amount,
    jsonb_build_object('insurance',v_protection_fee,'tax',v_tax_amount,'platform',v_platform_fee),v_employer_total,'open',v_duration,v_overtime,NEW.id,
    md5(COALESCE(v_employer_phone,'')),COALESCE(v_employer_phone,''),COALESCE(NEW.night_shift,false),COALESCE(NEW.needs_tools,false),v_worker_base,0,v_worker_base,
    v_platform_fee,v_protection_fee,v_tax_amount,v_employer_total
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_order_to_job ON public.orders;
CREATE TRIGGER trg_sync_order_to_job
AFTER INSERT OR UPDATE OF status,job_price_id,employer_id,title,location,wage,total_price,total
ON public.orders FOR EACH ROW EXECUTE FUNCTION public.sync_order_to_job();
REVOKE EXECUTE ON FUNCTION public.sync_order_to_job() FROM PUBLIC,anon,authenticated;
