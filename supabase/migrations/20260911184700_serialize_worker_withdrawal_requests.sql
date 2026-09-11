BEGIN;
CREATE OR REPLACE FUNCTION public.request_worker_withdrawal(p_amount integer,p_payout_method text,p_destination_name text DEFAULT NULL,p_destination_account text DEFAULT NULL)
RETURNS public.worker_withdrawals LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public' AS $$
DECLARE v_available integer; v_withdrawal public.worker_withdrawals;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Login diperlukan'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='worker') THEN RAISE EXCEPTION 'Akses pekerja diperlukan'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Nominal penarikan tidak valid'; END IF;
  IF p_payout_method NOT IN ('bank_transfer','ewallet','cash') THEN RAISE EXCEPTION 'Metode pencairan tidak valid'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 918273645));
  SELECT available INTO v_available FROM public.get_worker_earnings();
  IF p_amount > v_available THEN RAISE EXCEPTION 'Saldo yang dapat ditarik tidak mencukupi'; END IF;
  INSERT INTO public.worker_withdrawals(worker_id,amount,payout_method,destination_name,destination_account)
  VALUES(auth.uid(),p_amount,p_payout_method,NULLIF(trim(p_destination_name),''),NULLIF(trim(p_destination_account),''))
  RETURNING * INTO v_withdrawal;
  RETURN v_withdrawal;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.request_worker_withdrawal(integer,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_worker_withdrawal(integer,text,text,text) TO authenticated;
COMMIT;
