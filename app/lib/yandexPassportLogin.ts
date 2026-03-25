/**
 * Логин Яндекса для заголовка Client-Login в Direct API.
 * @see https://yandex.ru/dev/id/doc/ru/user-information
 */
export async function getYandexLogin(accessToken: string): Promise<string | null> {
  const res = await fetch("https://login.yandex.ru/info?format=json", {
    headers: { Authorization: `OAuth ${accessToken}` },
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { login?: string };
  return typeof j.login === "string" && j.login.length > 0 ? j.login : null;
}
