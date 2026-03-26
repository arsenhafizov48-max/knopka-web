-- OAuth Яндекс Метрики + счётчики и снимки отчётов (Reporting API).
-- Выполни в Supabase SQL Editor после деплоя кода с SUPABASE_SERVICE_ROLE_KEY.

create table if not exists public.yandex_metrika_oauth (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  yandex_login text,
  yandex_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists yandex_metrika_oauth_updated_at_idx
  on public.yandex_metrika_oauth (updated_at desc);

alter table public.yandex_metrika_oauth enable row level security;

create table if not exists public.yandex_metrika_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  counter_id bigint not null,
  site_name text,
  payload jsonb,
  sync_status text,
  error_message text,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, counter_id)
);

create index if not exists yandex_metrika_counters_user_idx
  on public.yandex_metrika_counters (user_id);

alter table public.yandex_metrika_counters enable row level security;
