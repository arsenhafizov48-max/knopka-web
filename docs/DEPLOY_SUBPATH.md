# Деплой КНОПКА по пути `/knopka` (подпапка на своём домене)

Если основной сайт уже занят (WordPress, лендинг и т.д.), приложение Next.js можно повесить **в подпапку**, например `https://ваш-домен.ru/knopka`. Ниже — шаблон настроек; подставь **свой** домен и префикс, никакие чужие URL в код не подставляются.

## 1. Переменные окружения на сервере

Создай `.env.production` или задай переменные в панели хостинга / PM2 / Vercel:

```env
NEXT_PUBLIC_BASE_PATH=/knopka

NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# при необходимости: TURNSTILE_SECRET_KEY, NEXT_PUBLIC_TURNSTILE_SITE_KEY
```

**Локально** `NEXT_PUBLIC_BASE_PATH` не указывай — приложение будет с корня `http://localhost:3000`.

## 2. Сборка и запуск Node

На сервере (Ubuntu и т.п.):

```bash
cd /var/www/knopka   # или свой путь
git pull
npm ci
npm run build
```

Запуск (порт 3000 внутри сервера):

```bash
PORT=3000 npm run start
```

Удобно через **PM2**:

```bash
npm install -g pm2
pm2 start npm --name knopka -- start
pm2 save
```

## 3. Nginx: прокси на Next с префиксом `/knopka`

Запросы с `https://ваш-домен.ru/knopka/...` должны уходить на Node **с тем же путём** (у Next включён `basePath: '/knopka'`).

Пример фрагмента `server` для SSL-сайта:

```nginx
location /knopka/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

Проверь `nginx -t` и перезагрузи nginx.

**Важно:** не отрезай префикс `/knopka` в `proxy_pass`, иначе Next не найдёт маршруты.

## 4. Supabase

В [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **URL Configuration**:

| Поле | Значение |
|------|----------|
| **Site URL** | `https://ваш-домен.ru/knopka` |
| **Redirect URLs** | `https://ваш-домен.ru/knopka/auth/callback` |

Добавь тот же callback в **Google / Yandex / VK** OAuth (если используешь), в поля redirect URI у провайдера.

## 5. Проверка

1. Открой `https://ваш-домен.ru/knopka` — как настроишь редиректы/главную.
2. `https://ваш-домен.ru/knopka/login` — вход.
3. OAuth и письма должны возвращать на `.../knopka/auth/callback`.

## Альтернатива без подпапки

Если проще выдать **поддомен** (`knopka.ваш-домен.ru`), можно **не** задавать `NEXT_PUBLIC_BASE_PATH`, повесить DNS на Vercel/сервер и в Supabase указать `https://knopka.ваш-домен.ru` — тогда приложение с корня поддомена, без префикса в пути.
