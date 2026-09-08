BEGIN;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.resolution_decisions FROM authenticated;

CREATE OR REPLACE FUNCTION public.admin_decide_resolution(
  p_resolution_id uuid,
  p_decision text,
  p_amount numeric,
  p_rationale text
)
RETURNS public.resolutions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_resolution public.resolutions;
  v_old_status text;
  v_decision public.resolution_decisions;
  v_status text;
  v_amount numeric := COALESCE(p_amount, 0);
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN
    RAISE EXCEPTION 'Admin authorization required';
  END IF;
  IF p_decision NOT IN ('refund_employer','pay_worker','partial_settlement','no_change','reject','cancel') THEN
    RAISE EXCEPTION 'Invalid resolution decision';
  END IF;
  IF v_amount < 0 THEN RAISE EXCEPTION 'Invalid resolution amount'; END IF;
  IF char_length(trim(COALESCE(p_rationale,''))) < 10 OR char_length(trim(p_rationale)) > 5000 THEN
    RAISE EXCEPTION 'Resolution rationale must be 10-5000 characters';
  END IF;

  SELECT * INTO v_resolution
  FROM public.resolutions
  WHERE id = p_resolution_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Resolution not found'; END IF;
  v_old_status := v_resolution.status;

  IF v_old_status IN ('resolved','rejected','cancelled') THEN
    RAISE EXCEPTION 'Resolution is already closed';
  END IF;

  IF p_decision IN ('refund_employer','pay_worker','partial_settlement') THEN
    IF v_amount <= 0 THEN RAISE EXCEPTION 'A monetary resolution requires an amount greater than zero'; END IF;
    IF v_amount > COALESCE(v_resolution.disputed_amount,0) THEN
      RAISE EXCEPTION 'Resolution amount exceeds disputed amount';
    END IF;
  ELSE
    v_amount := 0;
  END IF;

  INSERT INTO public.resolution_decisions(resolution_id, decided_by, decision, amount, rationale)
  VALUES (p_resolution_id, auth.uid(), p_decision, v_amount, trim(p_rationale))
  RETURNING * INTO v_decision;

  v_status := CASE p_decision WHEN 'reject' THEN 'rejected' WHEN 'cancel' THEN 'cancelled' ELSE 'resolved' END;
  UPDATE public.resolutions
  SET status = v_status, resolved_at = now(), updated_at = now()
  WHERE id = p_resolution_id
  RETURNING * INTO v_resolution;

  INSERT INTO public.audit_logs(table_name, record_id, action, performed_by, old_data, new_data)
  VALUES (
    'resolutions',
    v_resolution.id,
    'ADMIN_DECISION',
    auth.uid()::text,
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', v_resolution.status, 'decision', p_decision, 'amount', v_amount, 'decision_id', v_decision.id)
  );

  IF v_resolution.job_id IS NOT NULL THEN
    INSERT INTO public.job_events(job_id, order_id, actor_id, event_type, metadata)
    VALUES (
      v_resolution.job_id,
      v_resolution.order_id,
      auth.uid(),
      'RESOLUTION_DECIDED',
      jsonb_build_object('resolution_id', v_resolution.id, 'decision', p_decision, 'amount', v_amount)
    );
  END IF;

  RETURN v_resolution;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_decide_resolution(uuid, text, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_decide_resolution(uuid, text, numeric, text) TO authenticated;

COMMIT;
