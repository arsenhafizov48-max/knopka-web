import { withBasePath } from "@/app/lib/publicBasePath";

export const AVITO_OAUTH_STATE_COOKIE = "avito_oauth_state";

/** Redirect URI должен совпадать с тем, что в кабинете Avito Developers. */
export function getAvitoRedirectUri(requestUrl: string): string {
  const url = new URL(requestUrl);
  const origin = url.origin;
  return `${origin}${withBasePath("/auth/avito/callback")}`;
}

