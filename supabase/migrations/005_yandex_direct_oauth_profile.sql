-- Почта и логин Яндекса (какой аккаунт подключили к Директу) — для UI в блоке интеграции.

alter table public.yandex_direct_oauth
  add column if not exists yandex_login text;

alter table public.yandex_direct_oauth
  add column if not exists yandex_email text;
