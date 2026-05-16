-- Снимок объявлений и статистики Авито (на подключение OAuth).

create table if not exists public.avito_snapshot (
  connection_id uuid primary key references public.avito_oauth (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  sync_status text not null default 'pending',
  error_message text,
  synced_at timestamptz not null default now()
);

create index if not exists avito_snapshot_synced_at_idx
  on public.avito_snapshot (synced_at desc);

alter table public.avito_snapshot enable row level security;
