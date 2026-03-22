/**
 * Префикс приложения на проде (например /knopka на https://metlab-a.ru/knopka).
 * Должен совпадать с basePath в next.config.ts.
 * Локально в .env.local оставь пустым или не задавай.
 */
export function getPublicBasePath(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
  if (!raw || raw === "/") return "";
  return raw.startsWith("/") ? raw.replace(/\/$/, "") : `/${raw.replace(/\/$/, "")}`;
}

/** Путь с префиксом: "/login" → "/knopka/login" */
export function withBasePath(path: string): string {
  const base = getPublicBasePath();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
