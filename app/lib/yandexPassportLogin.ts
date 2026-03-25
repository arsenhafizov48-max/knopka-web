/**
 * Профиль Яндекс ID: логин, почта — для UI и заголовка Client-Login в Direct API.
 * @see https://yandex.ru/dev/id/doc/ru/user-information
 */
export type YandexPassportProfile = {
  login: string | null;
  defaultEmail: string | null;
};

export async function getYandexPassportProfile(
  accessToken: string
): Promise<YandexPassportProfile> {
  const headerVariants = [
    { Authorization: `OAuth ${accessToken}` },
    { Authorization: `Bearer ${accessToken}` },
  ];

  for (const headers of headerVariants) {
    const res = await fetch("https://login.yandex.ru/info?format=json", { headers });
    if (!res.ok) continue;
    const j = (await res.json()) as { login?: string; default_email?: string };
    const login = typeof j.login === "string" && j.login.length > 0 ? j.login : null;
    const defaultEmail =
      typeof j.default_email === "string" && j.default_email.length > 0
        ? j.default_email
        : null;
    if (login || defaultEmail) {
      return { login, defaultEmail };
    }
  }

  return { login: null, defaultEmail: null };
}

export async function getYandexLogin(accessToken: string): Promise<string | null> {
  const p = await getYandexPassportProfile(accessToken);
  return p.login;
}
