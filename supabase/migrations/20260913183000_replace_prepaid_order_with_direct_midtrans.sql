CREATE OR REPLACE FUNCTION public.create_prepaid_order(
  p_job_price_id uuid,p_title text,p_location text,p_wage integer,
  p_night_shift boolean,p_needs_tools boolean,p_hours integer
)
RETURNS TABLE(order_id uuid,total_price bigint,available_balance bigint,reserved_balance bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_uid uuid:=auth.uid(); v_price public.job_prices; v_order uuid;
  v_base integer; v_night integer; v_fee integer; v_insurance integer:=3227;
  v_total integer; v_existing integer;
BEGIN
  IF v_uid IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.profiles WHERE id=v_uid AND role='employer' AND kyc_verified=true
  ) THEN RAISE EXCEPTION 'Employer terverifikasi diperlukan'; END IF;
  IF p_location IS NULL OR btrim(p_location)='' THEN RAISE EXCEPTION 'Lokasi pengerjaan wajib diisi'; END IF;
  SELECT * INTO v_price FROM public.job_prices WHERE id=p_job_price_id AND is_active=true FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Jenis pekerjaan tidak ditemukan atau tidak aktif'; END IF;
  IF COALESCE(v_price.duration_minutes,0)<=0 THEN RAISE EXCEPTION 'Durasi pekerjaan belum dikonfigurasi'; END IF;
  v_base:=COALESCE(v_price.base_price,v_price.minimum_price);
  IF v_base IS NULL OR v_base<=0 THEN RAISE EXCEPTION 'Harga pekerjaan belum dikonfigurasi'; END IF;
  IF p_wage IS NOT NULL AND p_wage<>v_base THEN RAISE EXCEPTION 'Harga pekerjaan ditetapkan oleh sistem'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text,271828182));
  SELECT count(*) INTO v_existing FROM public.orders WHERE employer_id=v_uid AND status IN ('open','assigned');
  IF v_existing>=5 THEN RAISE EXCEPTION 'Maksimal 5 pesanan aktif'; END IF;
  v_night:=CASE WHEN COALESCE(p_night_shift,false) THEN round(v_base*0.20) ELSE 0 END;
  v_fee:=round((v_base+v_night)*0.05);
  v_total:=round((v_base+v_night+v_fee+v_insurance)::numeric/1000)*1000;
  PERFORM set_config('kh.prepaid_order','on',true);
  INSERT INTO public.orders(
    employer_id,worker_id,job_price_id,status,hours,wage,total,night_shift,
    needs_tools,title,location,subtotal,admin_fee,ppn,insurance,total_price
  ) VALUES(
    v_uid,null,p_job_price_id,'open',
    greatest(1,coalesce(p_hours,ceil(v_price.duration_minutes/60.0)::integer)),
    v_base,v_total,coalesce(p_night_shift,false),coalesce(p_needs_tools,false),
    coalesce(nullif(btrim(p_title),''),v_price.job_name),btrim(p_location),
    v_base+v_night,v_fee,0,v_insurance,v_total
  ) RETURNING id INTO v_order;
  UPDATE public.orders SET matching_requirements=jsonb_set(
    coalesce(matching_requirements,'{}'::jsonb),'{payment_gate}','midtrans_pending'::jsonb,true
  ) WHERE id=v_order;
  RETURN QUERY SELECT v_order::uuid,v_total::bigint,0::bigint,0::bigint;
END;
$$;
