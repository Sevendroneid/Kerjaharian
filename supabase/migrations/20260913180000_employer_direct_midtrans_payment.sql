BEGIN;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS payment_required boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.claim_job(p_job_id uuid)
RETURNS public.jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_job public.jobs;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='worker' AND is_online=true) THEN
    RAISE EXCEPTION 'Mitra harus berprofil pekerja dan Online';
  END IF;
  UPDATE public.jobs SET worker_id=auth.uid(),status='assigned',updated_at=now()
  WHERE id=p_job_id AND status='open' AND worker_id IS NULL
    AND (payment_status='settled' OR payment_status IS NULL)
  RETURNING * INTO v_job;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pekerjaan belum dibayar atau sudah diambil mitra lain'; END IF;
  IF v_job.order_id IS NOT NULL THEN
    UPDATE public.orders SET worker_id=auth.uid(),status='assigned'
    WHERE id=v_job.order_id AND status IN ('open','Pending');
  END IF;
  RETURN v_job;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_job(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_job(uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.mark_order_payment_pending()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.jobs SET payment_status='pending', updated_at=now() WHERE order_id=NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_order_payment_pending ON public.orders;
CREATE TRIGGER trg_mark_order_payment_pending
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.mark_order_payment_pending();
REVOKE EXECUTE ON FUNCTION public.mark_order_payment_pending() FROM PUBLIC,anon,authenticated;

COMMIT;
