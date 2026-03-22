# Почему Google показывает `xxx.supabase.co` вместо «КНОПКА»

Окно **«Выберите аккаунт»** рисует **Google**, а подзаголовок **«Переход в приложение …»** берётся из **настроек OAuth-приложения** в Google Cloud, а не из кода сайта.

## Что сделать

### 1. Свой OAuth-клиент Google (рекомендуется)

1. [Google Cloud Console](https://console.cloud.google.com/) → проект → **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID** (Web).
2. **Authorized redirect URIs** — добавь точный URL из Supabase:  
   **Dashboard → Authentication → Providers → Google → Callback URL** (вида `https://<project-ref>.supabase.co/auth/v1/callback`).
3. Скопируй **Client ID** и **Client secret** в Supabase:  
   **Authentication → Providers → Google** — включи провайдер и вставь свои ключи (не дефолтные общие).

### 2. Экран согласия OAuth (название и ссылки)

**APIs & Services → OAuth consent screen**

- **App name** — например **КНОПКА** (так часто и показывается пользователю).
- **User support email**, **Developer contact**.
- **App domain** (при публикации приложения): домен сайта, если уже есть.
- **Privacy policy link** — URL твоей политики, например `https://твой-домен.ru/legal/privacy`.
- **Terms of service link** — например `https://твой-домен.ru/legal/terms`.

Текст про «ознакомиться с политикой конфиденциальности и условиями» на экране Google появляется, когда в consent screen **заполнены эти ссылки** и приложение проходит проверки Google (для внешних пользователей может понадобиться статус **Testing** / **Production**).

### 3. Почему было `eqkkyvufty…supabase.co`

Пока используются **встроенные ключи Supabase** или не заполнен **App name** в своём OAuth consent screen, Google может показывать **технический идентификатор** (хост Supabase), а не бренд.

---

Локально ссылки могут быть `http://localhost:3000/legal/privacy` — для продакшена укажи **боевой домен** в consent screen.
