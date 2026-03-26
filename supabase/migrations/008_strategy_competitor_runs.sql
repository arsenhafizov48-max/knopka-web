-- Запуски анализа конкурентов (GigaChat): таблицы «Сайты», «Яндекс.Карты», «2ГИС».
-- Запуск: Supabase → SQL Editor → Run.

create table if not exists public.strategy_competitor_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  geo text not null default '',
  niche text not null default '',
  fact_snapshot jsonb not null default '{}'::jsonb,
  sites jsonb not null default '[]'::jsonb,
  yandex_maps jsonb not null default '[]'::jsonb,
  gis2 jsonb not null default '[]'::jsonb,
  raw_model_text text
);

create index if not exists strategy_competitor_runs_user_created_idx
  on public.strategy_competitor_runs (user_id, created_at desc);

alter table public.strategy_competitor_runs enable row level security;

create policy "strategy_competitor_runs_select_own"
  on public.strategy_competitor_runs
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "strategy_competitor_runs_insert_own"
  on public.strategy_competitor_runs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "strategy_competitor_runs_delete_own"
  on public.strategy_competitor_runs
  for delete
  to authenticated
  using (auth.uid() = user_id);
