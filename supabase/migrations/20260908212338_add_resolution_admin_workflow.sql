ALTER PUBLICATION supabase_realtime ADD TABLE public.resolutions;
REVOKE EXECUTE ON FUNCTION public.update_resolution_timestamp() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.admin_decide_resolution(p_resolution_id uuid, p_decision text, p_amount numeric, p_rationale text)
RETURNS public.resolutions LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_resolution public.resolutions; v_decision public.resolution_decisions; v_old_status text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN RAISE EXCEPTION 'Admin authorization required'; END IF;
  IF p_decision NOT IN ('refund_employer','pay_worker','partial_settlement','no_change','reject','cancel') THEN RAISE EXCEPTION 'Invalid resolution decision'; END IF;
  IF COALESCE(p_amount,0) < 0 THEN RAISE EXCEPTION 'Invalid resolution amount'; END IF;
  IF char_length(trim(COALESCE(p_rationale,''))) < 10 OR char_length(trim(p_rationale)) > 5000 THEN RAISE EXCEPTION 'Resolution rationale must be 10-5000 characters'; END IF;
  SELECT * INTO v_resolution FROM public.resolutions WHERE id = p_resolution_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Resolution not found'; END IF;
  IF v_resolution.status IN ('resolved','rejected','cancelled') THEN RAISE EXCEPTION 'Resolution is already closed'; END IF;
  v_old_status := v_resolution.status;
  INSERT INTO public.resolution_decisions(resolution_id, decided_by, decision, amount, rationale) VALUES (p_resolution_id, auth.uid(), p_decision, COALESCE(p_amount,0), trim(p_rationale)) RETURNING * INTO v_decision;
  UPDATE public.resolutions SET status = CASE p_decision WHEN 'reject' THEN 'rejected' WHEN 'cancel' THEN 'cancelled' ELSE 'resolved' END, resolved_at = now(), updated_at = now() WHERE id = p_resolution_id RETURNING * INTO v_resolution;
  INSERT INTO public.audit_logs(table_name, record_id, action, performed_by, old_data, new_data) VALUES ('resolutions', v_resolution.id, 'ADMIN_DECISION', auth.uid()::text, jsonb_build_object('status',v_old_status), jsonb_build_object('status',v_resolution.status,'decision',p_decision,'amount',COALESCE(p_amount,0),'decision_id',v_decision.id));
  IF v_resolution.job_id IS NOT NULL THEN INSERT INTO public.job_events(job_id, order_id, actor_id, event_type, metadata) VALUES (v_resolution.job_id, v_resolution.order_id, auth.uid(), 'RESOLUTION_DECIDED', jsonb_build_object('resolution_id',v_resolution.id,'decision',p_decision,'amount',COALESCE(p_amount,0))); END IF;
  RETURN v_resolution;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_decide_resolution(uuid,text,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_decide_resolution(uuid,text,numeric,text) TO authenticated;