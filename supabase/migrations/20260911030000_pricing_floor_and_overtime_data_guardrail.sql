UPDATE public.job_prices SET minimum_price=GREATEST(COALESCE(minimum_price,0),75000) WHERE is_active;
UPDATE public.job_prices SET overtime_rate_per_minute=GREATEST(1,CEIL((GREATEST(base_price,75000)::numeric / duration_minutes) * 1.5)) WHERE is_active AND (overtime_rate_per_minute IS NULL OR overtime_rate_per_minute < 0) AND duration_minutes > 0;
ALTER TABLE public.job_prices ADD CONSTRAINT job_prices_minimum_price_guard CHECK (minimum_price IS NULL OR minimum_price >= 75000) NOT VALID;
ALTER TABLE public.job_prices VALIDATE CONSTRAINT job_prices_minimum_price_guard;
