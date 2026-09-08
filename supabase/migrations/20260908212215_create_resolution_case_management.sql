CREATE TABLE IF NOT EXISTS public.resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  job_id uuid NULL REFERENCES public.jobs(id) ON DELETE SET NULL,
  opened_by uuid NOT NULL REFERENCES auth.users(id),
  employer_id uuid NOT NULL REFERENCES profiles(id),
  worker_id uuid NULL REFERENCES profiles(id),
  category text NOT NULL CHECK (category IN ('payment','work_quality','work_incomplete','worker_no_show','employer_cancelled','attendance','safety','other')),
  description text NOT NULL CHECK (char_length(trim(description)) BETWEEN 10 AND 5000),
  disputed_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (disputed_amount >= 0),
  requested_resolution text NULL CHECK (requested_resolution IS NULL OR char_length(trim(requested_resolution)) <= 3000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','waiting_response','under_review','waiting_evidence','negotiation','resolved','rejected','cancelled')),
  resolution_due_at timestamptz NULL,
  resolved_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS resolutions_one_active_per_order_idx ON public.resolutions(order_id) WHERE status IN ('open','waiting_response','under_review','waiting_evidence','negotiation');
CREATE INDEX IF NOT EXISTS resolutions_order_id_idx ON public.resolutions(order_id);
CREATE INDEX IF NOT EXISTS resolutions_status_created_idx ON public.resolutions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS resolutions_employer_id_idx ON public.resolutions(employer_id);
CREATE INDEX IF NOT EXISTS resolutions_worker_id_idx ON public.resolutions(worker_id);
CREATE TABLE IF NOT EXISTS public.resolution_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), resolution_id uuid NOT NULL REFERENCES public.resolutions(id) ON DELETE CASCADE, sender_id uuid NOT NULL REFERENCES auth.users(id), message text NOT NULL CHECK (char_length(trim(message)) BETWEEN 1 AND 3000), created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS resolution_messages_resolution_created_idx ON public.resolution_messages(resolution_id, created_at);
CREATE TABLE IF NOT EXISTS public.resolution_evidence (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), resolution_id uuid NOT NULL REFERENCES public.resolutions(id) ON DELETE CASCADE, uploaded_by uuid NOT NULL REFERENCES auth.users(id), file_path text NOT NULL CHECK (char_length(trim(file_path)) BETWEEN 1 AND 1000), file_name text NULL CHECK (file_name IS NULL OR char_length(file_name) <= 255), mime_type text NULL CHECK (mime_type IS NULL OR char_length(mime_type) <= 100), file_size_bytes bigint NULL CHECK (file_size_bytes IS NULL OR file_size_bytes BETWEEN 1 AND 10485760), created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS resolution_evidence_resolution_created_idx ON public.resolution_evidence(resolution_id, created_at);
CREATE TABLE IF NOT EXISTS public.resolution_decisions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), resolution_id uuid NOT NULL REFERENCES public.resolutions(id) ON DELETE CASCADE, decided_by uuid NOT NULL REFERENCES auth.users(id), decision text NOT NULL CHECK (decision IN ('refund_employer','pay_worker','partial_settlement','no_change','reject','cancel')), amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount >= 0), rationale text NOT NULL CHECK (char_length(trim(rationale)) BETWEEN 10 AND 5000), created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS resolution_one_final_decision_idx ON public.resolution_decisions(resolution_id);
ALTER TABLE public.resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolution_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolution_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resolution_decisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS resolution_participants_select ON public.resolutions;
CREATE POLICY resolution_participants_select ON public.resolutions FOR SELECT TO authenticated USING (auth.uid() = employer_id OR auth.uid() = worker_id OR is_admin());
DROP POLICY IF EXISTS resolution_admin_update ON public.resolutions;
CREATE POLICY resolution_admin_update ON public.resolutions FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS resolution_messages_select ON public.resolution_messages;
CREATE POLICY resolution_messages_select ON public.resolution_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.resolutions r WHERE r.id = resolution_id AND (r.employer_id = auth.uid() OR r.worker_id = auth.uid() OR is_admin())));
DROP POLICY IF EXISTS resolution_messages_insert ON public.resolution_messages;
CREATE POLICY resolution_messages_insert ON public.resolution_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.resolutions r WHERE r.id = resolution_id AND (r.employer_id = auth.uid() OR r.worker_id = auth.uid() OR is_admin()) AND r.status NOT IN ('resolved','rejected','cancelled')));
DROP POLICY IF EXISTS resolution_evidence_select ON public.resolution_evidence;
CREATE POLICY resolution_evidence_select ON public.resolution_evidence FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.resolutions r WHERE r.id = resolution_id AND (r.employer_id = auth.uid() OR r.worker_id = auth.uid() OR is_admin())));
DROP POLICY IF EXISTS resolution_evidence_insert ON public.resolution_evidence;
CREATE POLICY resolution_evidence_insert ON public.resolution_evidence FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid() AND EXISTS (SELECT 1 FROM public.resolutions r WHERE r.id = resolution_id AND (r.employer_id = auth.uid() OR r.worker_id = auth.uid() OR is_admin()) AND r.status NOT IN ('resolved','rejected','cancelled')));
DROP POLICY IF EXISTS resolution_decisions_select ON public.resolution_decisions;
CREATE POLICY resolution_decisions_select ON public.resolution_decisions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.resolutions r WHERE r.id = resolution_id AND (r.employer_id = auth.uid() OR r.worker_id = auth.uid() OR is_admin())));
CREATE OR REPLACE FUNCTION public.update_resolution_timestamp() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS resolutions_updated_at ON public.resolutions;
CREATE TRIGGER resolutions_updated_at BEFORE UPDATE ON public.resolutions FOR EACH ROW EXECUTE FUNCTION public.update_resolution_timestamp();
ALTER PUBLICATION supabase_realtime ADD TABLE public.resolution_messages;