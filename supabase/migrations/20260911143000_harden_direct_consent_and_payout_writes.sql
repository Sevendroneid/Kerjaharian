-- Consent and payout records are authoritative server-side ledgers.
-- Clients must use guarded RPCs; direct table writes are disabled.
revoke all on table public.platform_consents from anon, public, authenticated;
grant select on table public.platform_consents to authenticated;
revoke all on table public.worker_payouts from anon, public, authenticated;
grant select on table public.worker_payouts to authenticated;
