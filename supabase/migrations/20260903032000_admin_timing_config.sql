-- Admin-only configuration for job duration, minimum price and overtime.
ALTER TABLE public.job_prices
  ADD COLUMN IF NOT EXISTS minimum_price integer,
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS overtime_rate_per_minute integer;

UPDATE public.job_prices
SET minimum_price = COALESCE(minimum_price, base_price)
WHERE minimum_price IS NULL;

ALTER TABLE public.job_prices
  ADD CONSTRAINT job_prices_minimum_price_nonnegative CHECK (minimum_price IS NULL OR minimum_price >= 0);

-- Prevent clients from changing timing policy through direct table writes.
REVOKE UPDATE ON public.job_prices FROM authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_job_timing(
  p_job_price_id uuid,
  p_duration_minutes integer,
  p_minimum_price integer,
  p_overtime_rate_per_minute integer
)
RETURNS public.job_prices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_row public.job_prices;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Akses admin diperlukan';
  END IF;

  IF p_duration_minutes <= 0 THEN RAISE EXCEPTION 'Durasi harus lebih dari 0 menit'; END IF;
  IF p_minimum_price < 0 THEN RAISE EXCEPTION 'Minimum harga tidak boleh negatif'; END IF;
  IF p_overtime_rate_per_minute < 0 THEN RAISE EXCEPTION 'Tarif overtime tidak boleh negatif'; END IF;

  UPDATE public.job_prices
  SET duration_minutes = p_duration_minutes,
      minimum_price = p_minimum_price,
      overtime_rate_per_minute = p_overtime_rate_per_minute
  WHERE id = p_job_price_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN RAISE EXCEPTION 'Jenis pekerjaan tidak ditemukan'; END IF;
  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_job_timing(uuid, integer, integer, integer) TO authenticated;

-- Read timing configuration through a stable RPC so the Admin UI does not need broad table access.
CREATE OR REPLACE FUNCTION public.admin_list_job_timing()
RETURNS SETOF public.job_prices
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT jp.* FROM public.job_prices jp
  WHERE EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ORDER BY jp.category_id, jp.job_name;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_job_timing() TO authenticated;
