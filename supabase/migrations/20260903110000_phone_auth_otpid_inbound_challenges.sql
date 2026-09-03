create table if not exists public.phone_auth_otpid_challenges (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  otp_id text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists phone_auth_otpid_challenges_phone_created_idx
  on public.phone_auth_otpid_challenges(phone, created_at desc);

alter table public.phone_auth_otpid_challenges enable row level security;
revoke all on public.phone_auth_otpid_challenges from anon, authenticated;
