-- Admin-controlled pricing + timing policy.
-- Overtime default is 150% of the normal per-minute base rate.
CREATE OR REPLACE FUNCTION public.admin_set_job_pricing(
  p_job_price_id uuid,
  p_base_price integer,
  p_minimum_price integer,
  p_duration_minutes integer,
  p_overtime_rate_per_minute integer
)
RETURNS public.job_prices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_row public.job_prices;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Akses admin diperlukan';
  END IF;
  IF p_base_price < 0 THEN RAISE EXCEPTION 'Base price tidak boleh negatif'; END IF;
  IF p_minimum_price < 0 THEN RAISE EXCEPTION 'Minimum harga tidak boleh negatif'; END IF;
  IF p_duration_minutes <= 0 THEN RAISE EXCEPTION 'Durasi harus lebih dari 0 menit'; END IF;
  IF p_overtime_rate_per_minute < 0 THEN RAISE EXCEPTION 'Tarif overtime tidak boleh negatif'; END IF;
  IF p_base_price < p_minimum_price THEN RAISE EXCEPTION 'Base price tidak boleh di bawah minimum price'; END IF;

  UPDATE public.job_prices
  SET base_price = p_base_price,
      minimum_price = p_minimum_price,
      duration_minutes = p_duration_minutes,
      overtime_rate_per_minute = p_overtime_rate_per_minute
  WHERE id = p_job_price_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN RAISE EXCEPTION 'Jenis pekerjaan tidak ditemukan'; END IF;
  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_job_pricing(uuid, integer, integer, integer) TO authenticated;

UPDATE public.job_prices
SET overtime_rate_per_minute = CEIL((base_price::numeric / NULLIF(duration_minutes, 0)) * 1.5)::integer
WHERE duration_minutes IS NOT NULL AND duration_minutes > 0;
