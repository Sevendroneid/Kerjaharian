-- KerjaHarian operational trust/safety layer.
-- Policy is data-driven; AI may advise but never becomes the source of truth.
-- Protection/insurance rates intentionally default to zero until a real provider/legal agreement is configured.

CREATE TABLE IF NOT EXISTS public.platform_policy_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  worker_minimum_price integer NOT NULL DEFAULT 75000 CHECK (worker_minimum_price >= 0),
  overtime_multiplier numeric(6,3) NOT NULL DEFAULT 1.500 CHECK (overtime_multiplier >= 1),
  employer_cancel_before_accept_fee integer NOT NULL DEFAULT 0 CHECK (employer_cancel_before_accept_fee >= 0),
  worker_cancel_before_start_fee integer NOT NULL DEFAULT 0 CHECK (worker_cancel_before_start_fee >= 0),
  arrival_compensation_enabled boolean NOT NULL DEFAULT true,
  gps_soft_radius_meters integer NOT NULL DEFAULT 100 CHECK (gps_soft_radius_meters BETWEEN 25 AND 1000),
  gps_hard_radius_meters integer NOT NULL DEFAULT 250 CHECK (gps_hard_radius_meters BETWEEN 50 AND 2000),
  no_show_warning_threshold integer NOT NULL DEFAULT 2 CHECK (no_show_warning_threshold >= 1),
  no_show_review_threshold integer NOT NULL DEFAULT 3 CHECK (no_show_review_threshold >= 1),
  protection_enabled boolean NOT NULL DEFAULT false,
  protection_fee_default integer NOT NULL DEFAULT 0 CHECK (protection_fee_default >= 0),
  updated_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.platform_policy_config(id) VALUES (true) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.platform_policy_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_policy_admin_select ON public.platform_policy_config;
CREATE POLICY platform_policy_admin_select ON public.platform_policy_config FOR SELECT TO authenticated USING (is_admin());
DROP POLICY IF EXISTS platform_policy_admin_update ON public.platform_policy_config;
CREATE POLICY platform_policy_admin_update ON public.platform_policy_config FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS cancellation_actor text,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS scope_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS safety_level text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS gps_confidence text,
  ADD COLUMN IF NOT EXISTS incident_open boolean NOT NULL DEFAULT false;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancellation_actor text,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS scope_snapshot jsonb;

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_safety_level_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_safety_level_check CHECK (safety_level IN ('standard','elevated','high'));
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_cancellation_actor_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_cancellation_actor_check CHECK (cancellation_actor IS NULL OR cancellation_actor IN ('worker','employer','admin','system'));
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_cancellation_actor_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_cancellation_actor_check CHECK (cancellation_actor IS NULL OR cancellation_actor IN ('worker','employer','admin','system'));

CREATE TABLE IF NOT EXISTS public.job_reliability_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  worker_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  employer_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('worker_no_show','worker_late_cancel','employer_cancel_after_accept','employer_cancel_after_arrival','scope_change','overtime_accepted','safety_incident','gps_exception')),
  severity smallint NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_reliability_worker_idx ON public.job_reliability_events(worker_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS job_reliability_employer_idx ON public.job_reliability_events(employer_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS job_reliability_job_idx ON public.job_reliability_events(job_id, created_at DESC);
ALTER TABLE public.job_reliability_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reliability_participant_select ON public.job_reliability_events;
CREATE POLICY reliability_participant_select ON public.job_reliability_events FOR SELECT TO authenticated USING (auth.uid() = worker_id OR auth.uid() = employer_id OR is_admin());
DROP POLICY IF EXISTS reliability_admin_insert ON public.job_reliability_events;
CREATE POLICY reliability_admin_insert ON public.job_reliability_events FOR INSERT TO authenticated WITH CHECK (is_admin() OR actor_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.job_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  order_id uuid NULL REFERENCES public.orders(id) ON DELETE SET NULL,
  reported_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  incident_type text NOT NULL CHECK (incident_type IN ('injury','threat','violence','unsafe_condition','scope_violation','payment_issue','other')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  description text NOT NULL CHECK (char_length(trim(description)) BETWEEN 10 AND 5000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','triage','under_review','resolved','closed')),
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_incidents_status_idx ON public.job_incidents(status, created_at DESC);
CREATE INDEX IF NOT EXISTS job_incidents_job_idx ON public.job_incidents(job_id, created_at DESC);
ALTER TABLE public.job_incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS incident_participant_select ON public.job_incidents;
CREATE POLICY incident_participant_select ON public.job_incidents FOR SELECT TO authenticated USING (reported_by = auth.uid() OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND (j.worker_id = auth.uid() OR j.employer_id = auth.uid())) OR is_admin());
DROP POLICY IF EXISTS incident_participant_insert ON public.job_incidents;
CREATE POLICY incident_participant_insert ON public.job_incidents FOR INSERT TO authenticated WITH CHECK (reported_by = auth.uid() AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND (j.worker_id = auth.uid() OR j.employer_id = auth.uid())));
DROP POLICY IF EXISTS incident_admin_update ON public.job_incidents;
CREATE POLICY incident_admin_update ON public.job_incidents FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE OR REPLACE FUNCTION public.admin_update_operational_policy(
  p_worker_minimum_price integer,
  p_overtime_multiplier numeric,
  p_gps_soft_radius_meters integer,
  p_gps_hard_radius_meters integer,
  p_no_show_warning_threshold integer,
  p_no_show_review_threshold integer,
  p_protection_enabled boolean,
  p_protection_fee_default integer
)
RETURNS public.platform_policy_config
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE v_row public.platform_policy_config;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Akses admin diperlukan'; END IF;
  IF p_worker_minimum_price < 75000 THEN RAISE EXCEPTION 'Minimum upah pekerja tidak boleh di bawah Rp75.000'; END IF;
  IF p_overtime_multiplier < 1 THEN RAISE EXCEPTION 'Multiplier overtime tidak valid'; END IF;
  IF p_gps_hard_radius_meters < p_gps_soft_radius_meters THEN RAISE EXCEPTION 'Hard GPS radius harus >= soft radius'; END IF;
  IF p_no_show_review_threshold < p_no_show_warning_threshold THEN RAISE EXCEPTION 'Threshold review harus >= threshold warning'; END IF;
  IF p_protection_fee_default < 0 THEN RAISE EXCEPTION 'Protection fee tidak boleh negatif'; END IF;
  UPDATE public.platform_policy_config SET
    worker_minimum_price=p_worker_minimum_price,
    overtime_multiplier=p_overtime_multiplier,
    gps_soft_radius_meters=p_gps_soft_radius_meters,
    gps_hard_radius_meters=p_gps_hard_radius_meters,
    no_show_warning_threshold=p_no_show_warning_threshold,
    no_show_review_threshold=p_no_show_review_threshold,
    protection_enabled=p_protection_enabled,
    protection_fee_default=p_protection_fee_default,
    updated_by=auth.uid(), updated_at=now()
  WHERE id=true RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_update_operational_policy(integer,numeric,integer,integer,integer,integer,boolean,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_job_incident(
  p_job_id uuid,
  p_incident_type text,
  p_severity text,
  p_description text
)
RETURNS public.job_incidents
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE v_job public.jobs; v_row public.job_incidents;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id=p_job_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan tidak ditemukan'; END IF;
  IF auth.uid() <> v_job.worker_id AND auth.uid() <> v_job.employer_id AND NOT is_admin() THEN RAISE EXCEPTION 'Tidak berwenang melaporkan insiden pekerjaan ini'; END IF;
  INSERT INTO public.job_incidents(job_id,order_id,reported_by,incident_type,severity,description)
  VALUES(p_job_id,v_job.order_id,auth.uid(),p_incident_type,p_severity,trim(p_description)) RETURNING * INTO v_row;
  UPDATE public.jobs SET incident_open=true WHERE id=p_job_id;
  INSERT INTO public.job_reliability_events(job_id,worker_id,employer_id,actor_id,event_type,severity,metadata)
  VALUES(p_job_id,v_job.worker_id,v_job.employer_id,auth.uid(),'safety_incident',CASE p_severity WHEN 'critical' THEN 5 WHEN 'high' THEN 4 WHEN 'medium' THEN 3 ELSE 1 END,jsonb_build_object('incident_id',v_row.id,'type',p_incident_type));
  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.record_job_incident(uuid,text,text,text) TO authenticated;

-- Keep hourly catalog rates intact. The floor applies to the minimum transaction/worker floor,
-- not by rewriting a valid hourly rate into Rp75.000.
UPDATE public.job_prices
SET minimum_price = GREATEST(COALESCE(minimum_price, 0), 75000)
WHERE COALESCE(minimum_price,0) < 75000;

COMMENT ON TABLE public.platform_policy_config IS 'Operational policy source of truth. AI can explain/recommend but cannot override it.';
COMMENT ON TABLE public.job_reliability_events IS 'Non-punitive reliability history used for review and dispatch signals.';
COMMENT ON TABLE public.job_incidents IS 'Safety, abuse, scope and payment incident intake for human review.';
