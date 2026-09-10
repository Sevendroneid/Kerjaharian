CREATE OR REPLACE FUNCTION public.normalize_order_billing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE v_base_wage numeric; v_night_add numeric; v_physical_add numeric; v_tool_add numeric; v_platform_fee numeric; v_vat numeric; v_insurance numeric; v_total numeric; v_job_price public.job_prices; v_admin_fee_percent numeric; v_vat_percent numeric; v_physical_load_percent numeric; v_wage_floor numeric;
BEGIN
  IF NEW.job_price_id IS NOT NULL THEN SELECT * INTO v_job_price FROM public.job_prices WHERE id=NEW.job_price_id; END IF;
  SELECT value INTO v_admin_fee_percent FROM public.admin_settings WHERE key='admin_fee_percent';
  SELECT value INTO v_vat_percent FROM public.admin_settings WHERE key='vat_percent';
  SELECT value INTO v_insurance FROM public.admin_settings WHERE key='insurance_fee';
  SELECT value INTO v_tool_add FROM public.admin_settings WHERE key='tool_allowance_amount';
  SELECT value INTO v_physical_load_percent FROM public.admin_settings WHERE key='physical_load_percent';
  v_admin_fee_percent:=COALESCE(v_admin_fee_percent,10); v_vat_percent:=COALESCE(v_vat_percent,11); v_insurance:=COALESCE(v_insurance,1000); v_tool_add:=COALESCE(v_tool_add,35000); v_physical_load_percent:=COALESCE(v_physical_load_percent,15);
  v_wage_floor:=GREATEST(75000,COALESCE(v_job_price.minimum_price,75000));
  NEW.wage:=GREATEST(v_wage_floor,COALESCE(NEW.wage,v_job_price.base_price,0));
  NEW.hours:=COALESCE(NEW.hours,CEIL(COALESCE(v_job_price.duration_minutes,60)/60.0)::integer,1);
  NEW.tier:=COALESCE(NULLIF(NEW.tier,''),'standard'); NEW.needs_tools:=COALESCE(NEW.needs_tools,false); NEW.night_shift:=COALESCE(NEW.night_shift,false); NEW.physical_load:=COALESCE(NEW.physical_load,false);
  v_night_add:=CASE WHEN NEW.night_shift THEN ROUND(NEW.wage*0.20) ELSE 0 END; v_physical_add:=CASE WHEN NEW.physical_load THEN ROUND(NEW.wage*v_physical_load_percent/100.0) ELSE 0 END; NEW.tool_allowance:=CASE WHEN NEW.needs_tools THEN v_tool_add ELSE 0 END;
  v_base_wage:=NEW.wage+v_night_add+v_physical_add+NEW.tool_allowance; v_platform_fee:=ROUND(v_base_wage*v_admin_fee_percent/100.0); v_vat:=ROUND(v_platform_fee*v_vat_percent/100.0); v_total:=ROUND((v_base_wage+v_platform_fee+v_vat+v_insurance)/1000.0)*1000;
  NEW.subtotal:=v_base_wage; NEW.admin_fee:=v_platform_fee; NEW.ppn:=v_vat; NEW.insurance:=v_insurance; NEW.total_price:=v_total; NEW.total:=v_total::integer;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.sync_order_to_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE v_job_price public.job_prices; v_existing_job public.jobs; v_duration integer; v_overtime integer; v_category text; v_employer_phone text; v_worker_base integer; v_platform_fee integer; v_protection_fee integer; v_tax_amount integer; v_employer_total integer; v_wage_floor integer;
BEGIN
  IF NEW.status NOT IN ('open','Pending') THEN RETURN NEW; END IF;
  SELECT * INTO v_job_price FROM public.job_prices WHERE id=NEW.job_price_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Jenis pekerjaan tidak ditemukan'; END IF;
  SELECT COALESCE(whatsapp,'') INTO v_employer_phone FROM public.profiles WHERE id=NEW.employer_id;
  v_wage_floor:=GREATEST(75000,COALESCE(v_job_price.minimum_price,75000));
  v_duration:=COALESCE(v_job_price.duration_minutes,GREATEST(60,COALESCE(NEW.hours,8)*60));
  v_overtime:=COALESCE(v_job_price.overtime_rate_per_minute,GREATEST(0,CEIL(GREATEST(v_job_price.base_price,v_wage_floor)::numeric/NULLIF(v_duration,0)*1.5))::integer);
  v_category:=CASE v_job_price.category_id WHEN 'logistik' THEN 'logistik' WHEN 'tukang' THEN 'tukang' WHEN 'kebersihan' THEN 'kebersihan' ELSE 'serabutan' END;
  v_worker_base:=GREATEST(v_wage_floor,COALESCE(NEW.subtotal,NEW.wage,v_job_price.base_price))::integer;
  v_platform_fee:=COALESCE(NEW.admin_fee,0)::integer; v_protection_fee:=COALESCE(NEW.insurance,0)::integer; v_tax_amount:=COALESCE(NEW.ppn,0)::integer; v_employer_total:=COALESCE(NEW.total_price,NEW.total,NEW.wage,v_job_price.base_price)::integer;
  SELECT * INTO v_existing_job FROM public.jobs WHERE order_id=NEW.id FOR UPDATE;
  IF FOUND THEN
    UPDATE public.jobs SET category=v_category,title=COALESCE(NULLIF(NEW.title,''),v_job_price.job_name),location=COALESCE(NULLIF(NEW.location,''),'Lokasi belum ditentukan'),location_address=COALESCE(NULLIF(NEW.location,''),'Lokasi belum ditentukan'),wage=GREATEST(v_wage_floor,COALESCE(NEW.wage,v_job_price.base_price)),estimated_hours=CEIL(v_duration/60.0)::integer,fee=v_platform_fee+v_protection_fee+v_tax_amount,fee_breakdown=jsonb_build_object('insurance',v_protection_fee,'tax',v_tax_amount,'platform',v_platform_fee),total=v_employer_total,duration_minutes=v_duration,overtime_rate_per_minute=v_overtime,employer_phone_hash=public.hash_phone(COALESCE(v_employer_phone,'')),employer_phone_plain=COALESCE(v_employer_phone,''),night_shift=COALESCE(NEW.night_shift,false),needs_tools=COALESCE(NEW.needs_tools,false),worker_base_amount=v_worker_base,worker_overtime_amount=COALESCE(v_existing_job.worker_overtime_amount,0),worker_amount=v_worker_base+COALESCE(v_existing_job.worker_overtime_amount,0),platform_fee=v_platform_fee,protection_fee=v_protection_fee,tax_amount=v_tax_amount,employer_total=v_employer_total,updated_at=now() WHERE id=v_existing_job.id;
    RETURN NEW;
  END IF;
  INSERT INTO public.jobs (employer_id,category,title,location,location_address,wage,wage_type,estimated_hours,fee,fee_breakdown,total,status,duration_minutes,overtime_rate_per_minute,order_id,employer_phone_hash,employer_phone_plain,night_shift,needs_tools,worker_base_amount,worker_overtime_amount,worker_amount,platform_fee,protection_fee,tax_amount,employer_total)
  VALUES (NEW.employer_id,v_category,COALESCE(NULLIF(NEW.title,''),v_job_price.job_name),COALESCE(NULLIF(NEW.location,''),'Lokasi belum ditentukan'),COALESCE(NULLIF(NEW.location,''),'Lokasi belum ditentukan'),GREATEST(v_wage_floor,COALESCE(NEW.wage,v_job_price.base_price)),'daily',CEIL(v_duration/60.0)::integer,v_platform_fee+v_protection_fee+v_tax_amount,jsonb_build_object('insurance',v_protection_fee,'tax',v_tax_amount,'platform',v_platform_fee),v_employer_total,'open',v_duration,v_overtime,NEW.id,public.hash_phone(COALESCE(v_employer_phone,'')),COALESCE(v_employer_phone,''),COALESCE(NEW.night_shift,false),COALESCE(NEW.needs_tools,false),v_worker_base,0,v_worker_base,v_platform_fee,v_protection_fee,v_tax_amount,v_employer_total);
  RETURN NEW;
END; $$;
