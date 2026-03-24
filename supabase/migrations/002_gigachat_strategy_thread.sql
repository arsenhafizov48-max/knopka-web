-- История чата GigaChat на странице «Стратегия»: одна строка на пользователя (JSONB).
-- Масштаб: RLS + индекс по updated_at; в приложении ограничиваем длину массива сообщений.
-- Запуск: Supabase → SQL Editor → Run.

create table if not exists public.gigachat_strategy_thread (
  user_id uuid primary key references auth.users (id) on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists gigachat_strategy_thread_updated_at_idx
  on public.gigachat_strategy_thread (updated_at desc);

alter table public.gigachat_strategy_thread enable row level security;

create policy "gigachat_strategy_thread_select_own"
  on public.gigachat_strategy_thread
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "gigachat_strategy_thread_insert_own"
  on public.gigachat_strategy_thread
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "gigachat_strategy_thread_update_own"
  on public.gigachat_strategy_thread
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "gigachat_strategy_thread_delete_own"
  on public.gigachat_strategy_thread
  for delete
  to authenticated
  using (auth.uid() = user_id);
