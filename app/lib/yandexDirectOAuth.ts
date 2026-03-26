import { withBasePath } from "@/app/lib/publicBasePath";

export const YANDEX_DIRECT_OAUTH_STATE_COOKIE = "yandex_direct_oauth_state";
/** `add` — всегда новая строка OAuth; иначе только если ещё нет подключений. */
export const YANDEX_DIRECT_OAUTH_INTENT_COOKIE = "yandex_direct_oauth_intent";
export const YANDEX_DIRECT_SCOPE = "direct:api";

/** Redirect URI должен совпадать с тем, что в кабинете OAuth-приложения Яндекса. */
export function getYandexDirectRedirectUri(requestUrl: string): string {
  const explicit = process.env.YANDEX_DIRECT_OAUTH_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const origin = new URL(requestUrl).origin;
  return `${origin}${withBasePath("/auth/yandex-direct/callback")}`;
}
