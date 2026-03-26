-- Несколько подключений Яндекс Директ / Метрика на пользователя + журнал событий для UI.

-- --- Яндекс Директ: первичный ключ id, несколько строк на user_id ---
alter table public.yandex_direct_oauth add column if not exists id uuid;

update public.yandex_direct_oauth set id = gen_random_uuid() where id is null;

alter table public.yandex_direct_oauth alter column id set not null;

alter table public.yandex_direct_oauth drop constraint if exists yandex_direct_oauth_pkey;

alter table public.yandex_direct_oauth add primary key (id);

create index if not exists yandex_direct_oauth_user_id_idx
  on public.yandex_direct_oauth (user_id);

-- --- Снимок Директа: привязка к подключению ---
alter table public.yandex_direct_snapshot add column if not exists connection_id uuid;

update public.yandex_direct_snapshot s
set connection_id = o.id
from public.yandex_direct_oauth o
where o.user_id = s.user_id and s.connection_id is null;

alter table public.yandex_direct_snapshot drop constraint if exists yandex_direct_snapshot_pkey;

alter table public.yandex_direct_snapshot drop constraint if exists yandex_direct_snapshot_user_id_fkey;

alter table public.yandex_direct_snapshot drop column if exists user_id;

alter table public.yandex_direct_snapshot alter column connection_id set not null;

alter table public.yandex_direct_snapshot add primary key (connection_id);

alter table public.yandex_direct_snapshot
  add constraint yandex_direct_snapshot_connection_id_fkey
  foreign key (connection_id) references public.yandex_direct_oauth (id) on delete cascade;

-- --- Яндекс Метрика OAuth: id ---
alter table public.yandex_metrika_oauth add column if not exists id uuid;

update public.yandex_metrika_oauth set id = gen_random_uuid() where id is null;

alter table public.yandex_metrika_oauth alter column id set not null;

alter table public.yandex_metrika_oauth drop constraint if exists yandex_metrika_oauth_pkey;

alter table public.yandex_metrika_oauth add primary key (id);

create index if not exists yandex_metrika_oauth_user_id_idx
  on public.yandex_metrika_oauth (user_id);

-- --- Счётчики Метрики: привязка к подключению ---
alter table public.yandex_metrika_counters add column if not exists connection_id uuid;

update public.yandex_metrika_counters c
set connection_id = o.id
from public.yandex_metrika_oauth o
where o.user_id = c.user_id and c.connection_id is null;

alter table public.yandex_metrika_counters drop constraint if exists yandex_metrika_counters_user_id_counter_id_key;

alter table public.yandex_metrika_counters alter column connection_id set not null;

alter table public.yandex_metrika_counters
  add constraint yandex_metrika_counters_connection_counter_key unique (connection_id, counter_id);

alter table public.yandex_metrika_counters
  add constraint yandex_metrika_counters_connection_id_fkey
  foreign key (connection_id) references public.yandex_metrika_oauth (id) on delete cascade;

-- --- Журнал для блока «История» ---
create table if not exists public.integration_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null,
  message text not null,
  tone text not null default 'info',
  created_at timestamptz not null default now()
);

create index if not exists integration_activity_user_created_idx
  on public.integration_activity (user_id, created_at desc);

alter table public.integration_activity enable row level security;
