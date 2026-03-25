-- Снимок структуры Директа (кампании, группы, объявления, фразы) для ИИ и отчётов.
-- RLS без политик — читает/пишет только service_role.

create table if not exists public.yandex_direct_snapshot (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  sync_status text not null default 'pending',
  error_message text,
  synced_at timestamptz not null default now()
);

create index if not exists yandex_direct_snapshot_synced_at_idx
  on public.yandex_direct_snapshot (synced_at desc);

alter table public.yandex_direct_snapshot enable row level security;
