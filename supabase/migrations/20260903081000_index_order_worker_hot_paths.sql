-- Hot-path indexes for Employer publication, Worker claim/radar, and order-location lookups.
CREATE INDEX IF NOT EXISTS idx_orders_employer_status ON public.orders(employer_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_worker_status ON public.orders(worker_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_job_price_id ON public.orders(job_price_id);
CREATE INDEX IF NOT EXISTS idx_orders_job_id ON public.orders(job_id);
CREATE INDEX IF NOT EXISTS idx_order_locations_order_id ON public.order_locations(order_id);
CREATE INDEX IF NOT EXISTS idx_order_locations_worker_id ON public.order_locations(worker_id);
