CREATE OR REPLACE FUNCTION public.mark_order_payment_pending()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.jobs SET payment_required=true, payment_status='pending', updated_at=now() WHERE order_id=NEW.id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_marl_order_payment_pending ON public.orders;
CREATE TRIGGER trg_mark_order_payment_pending
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.mark_order_payment_pending();
REVOKE EXECUTE ON FUNCTION public.mark_order_payment_pending() FROM PUBLIC,anon,authenticated;
