-- OAuth-токены Авито (несколько подключений на пользователя).
-- RLS без политик — строки читает/пишет только service_role (Route Handlers).

create table if not exists public.avito_oauth (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists avito_oauth_user_id_idx
  on public.avito_oauth (user_id);

create index if not exists avito_oauth_updated_at_idx
  on public.avito_oauth (updated_at desc);

alter table public.avito_oauth enable row level security;

