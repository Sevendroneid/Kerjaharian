-- Payment-provider settlement must not be blocked by legal consent checks.
-- The provider event is authoritative for payment state; we record whether the
-- employer had the current account-level legal consent at settlement time.
CREATE OR REPLACE FUNCTION public.record_job_payment_consent()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE v_legal_consent boolean;
BEGIN
  IF NEW.payment_status = 'settled' AND COALESCE(OLD.payment_status,'') <> 'settled' THEN
    v_legal_consent := EXISTS (SELECT 1 FROM public.platform_consents WHERE user_id=NEW.employer_id AND role='employer' AND consent_type='platform_terms' AND document_version='1.0')
      AND EXISTS (SELECT 1 FROM public.platform_consents WHERE user_id=NEW.employer_id AND role='employer' AND consent_type='employer_role_notice' AND document_version='1.0');
    INSERT INTO public.platform_consents(user_id,role,consent_type,document_key,document_version,order_id,job_id,metadata)
    VALUES(NEW.employer_id,'employer','payment_confirmation','payment_confirmation','1.0',NEW.order_id,NEW.id,jsonb_build_object('source','midtrans_authoritative_settlement','midtrans_transaction_status',NEW.midtrans_transaction_status,'amount',COALESCE(NEW.final_amount,NEW.employer_total,NEW.total),'legal_account_consent_present',v_legal_consent));
  END IF;
  RETURN NEW;
END;
$$;
