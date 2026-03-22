-- Запусти в Supabase: SQL Editor → New query → вставь и Run
-- Хранилище кабинета КНОПКА: фактура, стратегия, ежедневные данные (JSON)

create table if not exists public.knopka_workspace (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists knopka_workspace_updated_at_idx
  on public.knopka_workspace (updated_at desc);

alter table public.knopka_workspace enable row level security;

create policy "knopka_workspace_select_own"
  on public.knopka_workspace
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "knopka_workspace_insert_own"
  on public.knopka_workspace
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "knopka_workspace_update_own"
  on public.knopka_workspace
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "knopka_workspace_delete_own"
  on public.knopka_workspace
  for delete
  to authenticated
  using (auth.uid() = user_id);
