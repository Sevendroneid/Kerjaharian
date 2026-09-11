BEGIN;

REVOKE UPDATE ON TABLE public.job_incidents FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_job_incident_status(
  p_incident_id uuid,
  p_status text,
  p_note text DEFAULT NULL
)
RETURNS public.job_incidents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_incident public.job_incidents;
  v_old_status text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') THEN
    RAISE EXCEPTION 'Admin authorization required';
  END IF;
  IF p_status NOT IN ('open','triage','under_review') THEN
    RAISE EXCEPTION 'Invalid incident status';
  END IF;
  IF p_note IS NOT NULL AND char_length(trim(p_note)) > 5000 THEN
    RAISE EXCEPTION 'Incident note too long';
  END IF;

  SELECT * INTO v_incident FROM public.job_incidents WHERE id = p_incident_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Incident not found'; END IF;
  v_old_status := v_incident.status;
  IF v_old_status = 'resolved' THEN RAISE EXCEPTION 'Resolved incident cannot be reopened or changed'; END IF;

  UPDATE public.job_incidents
  SET status = p_status, updated_at = now()
  WHERE id = p_incident_id
  RETURNING * INTO v_incident;

  INSERT INTO public.audit_logs(table_name, record_id, action, performed_by, old_data, new_data)
  VALUES (
    'job_incidents', v_incident.id, 'ADMIN_INCIDENT_STATUS', auth.uid()::text,
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', v_incident.status, 'note', NULLIF(trim(COALESCE(p_note,'')),''))
  );

  INSERT INTO public.job_events(job_id, order_id, actor_id, event_type, metadata)
  VALUES (
    v_incident.job_id, v_incident.order_id, auth.uid(), 'INCIDENT_STATUS_UPDATED',
    jsonb_build_object('old_status', v_old_status, 'status', v_incident.status, 'note', NULLIF(trim(COALESCE(p_note,'')),''))
  );

  RETURN v_incident;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_update_job_incident_status(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_job_incident_status(uuid,text,text) TO authenticated;

COMMIT;
