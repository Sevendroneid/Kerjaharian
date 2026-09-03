-- KerjaHarian: fix the order -> job bridge so field mapping is correct.
-- The previous bridge accidentally placed the order location into jobs.wage on INSERT.
-- Keep duration and overtime authoritative from job_prices.

CREATE OR REPLACE FUNCTION public.sync_order_to_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_job_price public.job_prices;
  v_duration integer;
  v_overtime integer;
  v_category text;
  v_job public.jobs;
  v_wage integer;
  v_platform_fee integer;
  v_protection_fee integer;
  v_tax_amount integer;
  v_total integer;
BEGIN
  IF NEW.status NOT IN ('open','Pending') THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_job_price
  FROM public.job_prices
  WHERE id = NEW.job_price_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jenis pekerjaan tidak ditemukan';
  END IF;

  v_duration := COALESCE(
    v_job_price.duration_minutes,
    GREATEST(60, COALESCE(NEW.hours, 8) * 60)
  );
  v_overtime := COALESCE(
    v_job_price.overtime_rate_per_minute,
    GREATEST(0, CEIL(v_job_price.base_price::numeric / NULLIF(v_duration, 0)))::integer
  );
  v_category := CASE v_job_price.category_id
    WHEN 'logistik' THEN 'logistik'
    WHEN 'tukang' THEN 'tukang'
    WHEN 'kebersihan' THEN 'kebersihan'
    ELSE 'serabutan'
  END;
  v_wage := GREATEST(75000, COALESCE(NEW.wage, NEW.total_price::integer, v_job_price.base_price));
  v_platform_fee := COALESCE(NEW.admin_fee, 0)::integer;
  v_protection_fee := COALESCE(NEW.insurance, 0)::integer;
  v_tax_amount := COALESCE(NEW.ppn, 0)::integer;
  v_total := COALESCE(NEW.total_price, NEW.total, NEW.wage, v_job_price.base_price)::integer;

  SELECT * INTO v_job
  FROM public.jobs
  WHERE order_id = NEW.id
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.jobs
    SET employer_id = NEW.employer_id,
        worker_id = NEW.worker_id,
        category = v_category,
        title = COALESCE(NULLIF(NEW.title, ''), v_job_price.job_name),
        location = COALESCE(NULLIF(NEW.location, ''), 'Lokasi belum ditentukan'),
        wage = v_wage,
        wage_type = 'daily',
        estimated_hours = CEIL(v_duration / 60.0)::integer,
        duration_minutes = v_duration,
        overtime_rate_per_minute = v_overtime,
        fee = v_platform_fee + v_protection_fee + v_tax_amount,
        fee_breakdown = jsonb_build_object(
          'insurance', v_protection_fee,
          'tax', v_tax_amount,
          'platform', v_platform_fee
        ),
        total = v_total,
        updated_at = now()
    WHERE id = v_job.id;
    RETURN NEW;
  END IF;

  INSERT INTO public.jobs (
    employer_id,
    worker_id,
    category,
    job_type_id,
    title,
    location,
    wage,
    wage_type,
    estimated_hours,
    fee,
    fee_breakdown,
    total,
    status,
    duration_minutes,
    overtime_rate_per_minute,
    order_id
  ) VALUES (
    NEW.employer_id,
    NEW.worker_id,
    v_category,
    NULL,
    COALESCE(NULLIF(NEW.title, ''), v_job_price.job_name),
    COALESCE(NULLIF(NEW.location, ''), 'Lokasi belum ditentukan'),
    v_wage,
    'daily',
    CEIL(v_duration / 60.0)::integer,
    v_platform_fee + v_protection_fee + v_tax_amount,
    jsonb_build_object(
      'insurance', v_protection_fee,
      'tax', v_tax_amount,
      'platform', v_platform_fee
    ),
    v_total,
    'open',
    v_duration,
    v_overtime,
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_order_to_job ON public.orders;
CREATE TRIGGER trg_sync_order_to_job
AFTER INSERT OR UPDATE OF status,job_price_id,employer_id,worker_id,title,location,wage,total_price,total
ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_to_job();

-- Keep worker assignment synchronized if an existing order changes worker.
CREATE OR REPLACE FUNCTION public.sync_order_worker_to_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.worker_id IS DISTINCT FROM OLD.worker_id THEN
    UPDATE public.jobs
    SET worker_id = NEW.worker_id,
        status = CASE
          WHEN NEW.worker_id IS NULL AND status = 'assigned' THEN 'open'
          WHEN NEW.worker_id IS NOT NULL AND status = 'open' THEN 'assigned'
          ELSE status
        END,
        updated_at = now()
    WHERE order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_order_worker_to_job ON public.orders;
CREATE TRIGGER trg_sync_order_worker_to_job
AFTER UPDATE OF worker_id ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_order_worker_to_job();
