import { withBasePath } from "@/app/lib/publicBasePath";

export const YANDEX_METRIKA_OAUTH_STATE_COOKIE = "yandex_metrika_oauth_state";
export const YANDEX_METRIKA_SCOPE = "metrika:read";

export function getYandexMetrikaRedirectUri(requestUrl: string): string {
  const explicit = process.env.YANDEX_METRIKA_OAUTH_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const origin = new URL(requestUrl).origin;
  return `${origin}${withBasePath("/auth/yandex-metrika/callback")}`;
}
