CREATE INDEX IF NOT EXISTS resolution_decisions_decided_by_idx ON public.resolution_decisions(decided_by);
CREATE INDEX IF NOT EXISTS resolution_evidence_uploaded_by_idx ON public.resolution_evidence(uploaded_by);
CREATE INDEX IF NOT EXISTS resolution_messages_sender_id_idx ON public.resolution_messages(sender_id);
CREATE INDEX IF NOT EXISTS resolutions_job_id_idx ON public.resolutions(job_id);
CREATE INDEX IF NOT EXISTS resolutions_opened_by_idx ON public.resolutions(opened_by);

DROP POLICY IF EXISTS resolution_messages_select ON public.resolution_messages;
CREATE POLICY resolution_messages_select ON public.resolution_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.resolutions r WHERE r.id = resolution_messages.resolution_id AND (r.employer_id = (SELECT auth.uid()) OR r.worker_id = (SELECT auth.uid()) OR (SELECT is_admin()))));
DROP POLICY IF EXISTS resolution_messages_insert ON public.resolution_messages;
CREATE POLICY resolution_messages_insert ON public.resolution_messages FOR INSERT TO authenticated WITH CHECK (sender_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.resolutions r WHERE r.id = resolution_messages.resolution_id AND (r.employer_id = (SELECT auth.uid()) OR r.worker_id = (SELECT auth.uid()) OR (SELECT is_admin())) AND r.status NOT IN ('resolved','rejected','cancelled')));

DROP POLICY IF EXISTS resolution_evidence_select ON public.resolution_evidence;
CREATE POLICY resolution_evidence_select ON public.resolution_evidence FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.resolutions r WHERE r.id = resolution_evidence.resolution_id AND (r.employer_id = (SELECT auth.uid()) OR r.worker_id = (SELECT auth.uid()) OR (SELECT is_admin()))));
DROP POLICY IF EXISTS resolution_evidence_insert ON public.resolution_evidence;
CREATE POLICY resolution_evidence_insert ON public.resolution_evidence FOR INSERT TO authenticated WITH CHECK (uploaded_by = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.resolutions r WHERE r.id = resolution_evidence.resolution_id AND (r.employer_id = (SELECT auth.uid()) OR r.worker_id = (SELECT auth.uid()) OR (SELECT is_admin())) AND r.status NOT IN ('resolved','rejected','cancelled')));

DROP POLICY IF EXISTS resolution_decisions_select ON public.resolution_decisions;
CREATE POLICY resolution_decisions_select ON public.resolution_decisions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.resolutions r WHERE r.id = resolution_decisions.resolution_id AND (r.employer_id = (SELECT auth.uid()) OR r.worker_id = (SELECT auth.uid()) OR (SELECT is_admin()))));
DROP POLICY IF EXISTS resolution_decisions_insert_admin ON public.resolution_decisions;
CREATE POLICY resolution_decisions_insert_admin ON public.resolution_decisions FOR INSERT TO authenticated WITH CHECK (decided_by = (SELECT auth.uid()) AND (SELECT is_admin()) AND EXISTS (SELECT 1 FROM public.resolutions r WHERE r.id = resolution_decisions.resolution_id));

DROP POLICY IF EXISTS resolution_participants_select ON public.resolutions;
CREATE POLICY resolution_participants_select ON public.resolutions FOR SELECT TO authenticated USING ((employer_id = (SELECT auth.uid())) OR (worker_id = (SELECT auth.uid())) OR (SELECT is_admin()));
DROP POLICY IF EXISTS resolution_creator_delete_open ON public.resolutions;
CREATE POLICY resolution_creator_delete_open ON public.resolutions FOR DELETE TO authenticated USING (opened_by = (SELECT auth.uid()) AND status = 'waiting_response');
DROP POLICY IF EXISTS resolution_participants_insert ON public.resolutions;
CREATE POLICY resolution_participants_insert ON public.resolutions FOR INSERT TO authenticated WITH CHECK ((opened_by = (SELECT auth.uid())) AND job_id IS NULL AND ((employer_id = (SELECT auth.uid())) OR (worker_id = (SELECT auth.uid()))) AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = resolutions.order_id AND o.employer_id = resolutions.employer_id AND (o.worker_id = resolutions.worker_id OR (resolutions.worker_id IS NULL AND o.worker_id IS NULL)) AND (o.employer_id = (SELECT auth.uid()) OR o.worker_id = (SELECT auth.uid()))));
