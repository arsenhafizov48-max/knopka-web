-- Токены Яндекс.Директа на пользователя. RLS без политик — строки читает/пишет только service_role (Route Handlers).
-- Выполни в Supabase SQL Editor после деплоя кода с SUPABASE_SERVICE_ROLE_KEY.

create table if not exists public.yandex_direct_oauth (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists yandex_direct_oauth_updated_at_idx
  on public.yandex_direct_oauth (updated_at desc);

alter table public.yandex_direct_oauth enable row level security;
