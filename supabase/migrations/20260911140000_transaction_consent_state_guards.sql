-- Transaction-level consent evidence tied to actual state transitions.
-- The transition itself is the user's explicit action (claim/start/finish/payment); the
-- server records the exact event and refuses protected transitions when legal consent is missing.
-- Overtime remains a separate explicit two-party consent.

CREATE OR REPLACE FUNCTION public.require_role_legal_consent(p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.platform_consents WHERE user_id=p_user_id AND role=p_role AND consent_type='platform_terms' AND document_version='1.0')
     OR NOT EXISTS (SELECT 1 FROM public.platform_consents WHERE user_id=p_user_id AND role=p_role AND consent_type=CASE WHEN p_role='worker' THEN 'worker_role_notice' ELSE 'employer_role_notice' END AND document_version='1.0') THEN
    RAISE EXCEPTION 'Persetujuan legal akun belum lengkap. Silakan setujui Syarat & Ketentuan dan peran Anda terlebih dahulu.';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.require_role_legal_consent(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.require_role_legal_consent(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_transaction_consent_event(p_user_id uuid,p_role text,p_consent_type text,p_order_id uuid,p_job_id uuid,p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.platform_consents(user_id,role,consent_type,document_key,document_version,order_id,job_id,metadata)
  VALUES(p_user_id,p_role,p_consent_type,p_consent_type,'1.0',p_order_id,p_job_id,COALESCE(p_metadata,'{}'::jsonb));
END;
$$;
REVOKE ALL ON FUNCTION public.record_transaction_consent_event(uuid,text,text,uuid,uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_transaction_consent_event(uuid,text,text,uuid,uuid,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_job_transaction_consent()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.worker_id IS NOT NULL AND OLD.worker_id IS NULL THEN
    PERFORM public.require_role_legal_consent(NEW.worker_id,'worker');
    PERFORM public.record_transaction_consent_event(NEW.worker_id,'worker','job_accept',NEW.order_id,NEW.id,jsonb_build_object('source','job_assignment_transition','explicit_action','accept_or_claim'));
  END IF;

  IF NEW.started_at IS NOT NULL AND OLD.started_at IS NULL THEN
    PERFORM public.require_role_legal_consent(NEW.employer_id,'employer');
    IF NEW.worker_id IS NOT NULL THEN PERFORM public.require_role_legal_consent(NEW.worker_id,'worker'); END IF;
    PERFORM public.record_transaction_consent_event(NEW.employer_id,'employer','job_start',NEW.order_id,NEW.id,jsonb_build_object('source','job_start_transition'));
  END IF;

  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    PERFORM public.require_role_legal_consent(NEW.employer_id,'employer');
    IF NEW.worker_id IS NOT NULL THEN PERFORM public.require_role_legal_consent(NEW.worker_id,'worker'); END IF;
    PERFORM public.record_transaction_consent_event(NEW.employer_id,'employer','job_completion',NEW.order_id,NEW.id,jsonb_build_object('source','job_completion_transition','overtime_consent_status',NEW.overtime_consent_status));
  END IF;

  IF NEW.overtime_minutes IS NOT NULL AND NEW.overtime_minutes > 0 AND NEW.overtime_consent_status <> 'confirmed' THEN
    RAISE EXCEPTION 'Perpanjangan waktu belum mendapat persetujuan eksplisit Pekerja';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_job_transaction_consent ON public.jobs;
CREATE TRIGGER trg_guard_job_transaction_consent BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.guard_job_transaction_consent();

CREATE OR REPLACE FUNCTION public.record_job_payment_consent()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.payment_status = 'settled' AND COALESCE(OLD.payment_status,'') <> 'settled' THEN
    PERFORM public.require_role_legal_consent(NEW.employer_id,'employer');
    INSERT INTO public.platform_consents(user_id,role,consent_type,document_key,document_version,order_id,job_id,metadata)
    VALUES(NEW.employer_id,'employer','payment_confirmation','payment_confirmation','1.0',NEW.order_id,NEW.id,jsonb_build_object('source','midtrans_authoritative_settlement','midtrans_transaction_status',NEW.midtrans_transaction_status,'amount',COALESCE(NEW.final_amount,NEW.employer_total,NEW.total)));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_job_payment_consent ON public.jobs;
CREATE TRIGGER trg_record_job_payment_consent AFTER UPDATE OF payment_status ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.record_job_payment_consent();
