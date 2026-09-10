BEGIN;

-- Employer rematch flow: an employer may reject an assigned worker for a
-- job-fit/safety/attendance reason without discriminating by protected or
-- irrelevant personal characteristics. The worker is released and the order
-- becomes open again. A server-side RPC keeps the transition atomic.

CREATE TABLE IF NOT EXISTS public.order_rematch_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  employer_id uuid NOT NULL REFERENCES public.profiles(id),
  previous_worker_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (reason IN ('job_fit','worker_no_show','late','communication','safety_concern','other')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_rematch_events_order_idx
  ON public.order_rematch_events(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS order_rematch_events_employer_idx
  ON public.order_rematch_events(employer_id, created_at DESC);

ALTER TABLE public.order_rematch_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_rematch_events_employer_select ON public.order_rematch_events;
CREATE POLICY order_rematch_events_employer_select
  ON public.order_rematch_events
  FOR SELECT TO authenticated
  USING (employer_id = auth.uid() OR is_admin());

-- No direct client insert/update/delete. The RPC below is the only mutation path.
REVOKE INSERT, UPDATE, DELETE ON public.order_rematch_events FROM authenticated;
GRANT SELECT ON public.order_rematch_events TO authenticated;

CREATE OR REPLACE FUNCTION public.employer_request_rematch(
  p_order_id uuid,
  p_reason text
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_order public.orders;
  v_old_worker uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_reason NOT IN ('job_fit','worker_no_show','late','communication','safety_concern','other') THEN
    RAISE EXCEPTION 'Alasan rematch tidak valid';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
    AND employer_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pesanan tidak ditemukan atau bukan milik pemberi kerja';
  END IF;

  -- Never detach a worker after the paid/active work has started. At that point
  -- the case belongs in Resolution Center instead of silent rematching.
  IF v_order.status <> 'assigned' OR v_order.worker_id IS NULL THEN
    RAISE EXCEPTION 'Rematch hanya tersedia sebelum pekerjaan dimulai';
  END IF;

  v_old_worker := v_order.worker_id;

  INSERT INTO public.order_rematch_events (
    order_id, employer_id, previous_worker_id, reason
  ) VALUES (
    v_order.id, auth.uid(), v_old_worker, p_reason
  );

  UPDATE public.orders
  SET worker_id = NULL,
      status = 'open'
  WHERE id = v_order.id;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  RETURN v_order;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.employer_request_rematch(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employer_request_rematch(uuid, text) TO authenticated;

COMMIT;
