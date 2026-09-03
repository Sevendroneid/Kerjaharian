create table if not exists public.admin_pin_credentials (
  admin_user_id uuid primary key references auth.users(id) on delete cascade,
  pin_salt text not null,
  pin_hash text not null,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_pin_credentials enable row level security;
revoke all on public.admin_pin_credentials from anon, authenticated;

insert into public.admin_pin_credentials (admin_user_id, pin_salt, pin_hash)
values (
  'd2f36cd1-55bb-46b8-8949-262152018cb3',
  '2a8b977f4d1a10e10e7ff4d53ece6608',
  '11d6e69f73dfca604b3a01bdc686c43f2d2c28f70a5ef172f5851d4e6659df46'
)
on conflict (admin_user_id) do nothing;

create index if not exists idx_admin_pin_credentials_locked_until on public.admin_pin_credentials (locked_until);
