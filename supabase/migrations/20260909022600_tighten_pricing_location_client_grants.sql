REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.job_prices FROM anon, authenticated;
GRANT SELECT ON TABLE public.job_prices TO anon, authenticated;
REVOKE INSERT, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.order_locations FROM authenticated;
GRANT SELECT, UPDATE ON TABLE public.order_locations TO authenticated;
