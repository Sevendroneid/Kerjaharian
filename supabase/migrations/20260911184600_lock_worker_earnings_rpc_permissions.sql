BEGIN;
REVOKE EXECUTE ON FUNCTION public.get_worker_earnings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_worker_earnings() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.request_worker_withdrawal(integer,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_worker_withdrawal(integer,text,text,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_worker_withdrawal_paid() FROM PUBLIC, anon, authenticated;
COMMIT;
