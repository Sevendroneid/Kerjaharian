DROP TRIGGER IF EXISTS trg_mark_order_payment_pending ON public.orders;
DROP TRIGGER IF EXISTS zz_mark_order_payment_pending ON public.orders;
CREATE TRIGGER zz_mark_order_payment_pending AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.mark_order_payment_pending();
