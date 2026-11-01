-- OTP challenge and AI pricing worker tables are server-only.
REVOKE ALL PRIVILEGES ON TABLE public.otp_codes FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.phone_auth_otpid_challenges FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.pricing_recalc_queue FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.pricing_worker_runs FROM PUBLIC, anon, authenticated;
