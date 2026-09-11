-- Avoid per-row auth() re-evaluation in operational RLS policies.
ALTER POLICY ai_action_logs_insert_own ON public.ai_action_logs WITH CHECK ((actor_id = (select auth.uid())) AND (role = (select p.role from public.profiles p where p.id = (select auth.uid()))));
ALTER POLICY ai_action_logs_select_own ON public.ai_action_logs USING ((actor_id = (select auth.uid())) OR EXISTS (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role='admin'));
ALTER POLICY dispatch_confirmations_employer_select ON public.dispatch_confirmations USING (employer_id = (select auth.uid()));
ALTER POLICY dispatch_confirmations_worker_select ON public.dispatch_confirmations USING (worker_id = (select auth.uid()));
ALTER POLICY incident_participant_insert ON public.job_incidents WITH CHECK ((reported_by = (select auth.uid())) AND EXISTS (select 1 from public.jobs j where j.id=job_incidents.job_id and (j.worker_id=(select auth.uid()) or j.employer_id=(select auth.uid()))));
ALTER POLICY incident_participant_select ON public.job_incidents USING ((reported_by = (select auth.uid())) OR EXISTS (select 1 from public.jobs j where j.id=job_incidents.job_id and (j.worker_id=(select auth.uid()) or j.employer_id=(select auth.uid()))) OR (select public.is_admin()));
ALTER POLICY payment_events_participant_select ON public.job_payment_events USING (EXISTS (select 1 from public.jobs j where j.id=job_payment_events.job_id and (j.employer_id=(select auth.uid()) or j.worker_id=(select auth.uid()) or (select public.is_admin()))));
ALTER POLICY reliability_admin_insert ON public.job_reliability_events WITH CHECK ((select public.is_admin()) OR actor_id=(select auth.uid()));
ALTER POLICY reliability_participant_select ON public.job_reliability_events USING ((select auth.uid())=worker_id OR (select auth.uid())=employer_id OR (select public.is_admin()));
ALTER POLICY order_rematch_events_employer_select ON public.order_rematch_events USING ((employer_id=(select auth.uid())) OR (select public.is_admin()));
ALTER POLICY privacy_request_own_insert ON public.privacy_requests WITH CHECK (user_id=(select auth.uid()));
ALTER POLICY privacy_request_own_select ON public.privacy_requests USING ((user_id=(select auth.uid())) OR (select public.is_admin()));
ALTER POLICY worker_trust_self ON public.worker_trust_profiles USING (worker_id=(select auth.uid()));
