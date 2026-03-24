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

/**
 * В браузере: если NEXT_PUBLIC_BASE_PATH не попал в бандл, но сайт открыт как /knopka/app/...,
 * выводим префикс из pathname — иначе fetch на /api/... даёт 404 HTML вместо JSON.
 */
function inferClientBasePathFromPathname(): string {
  if (typeof window === "undefined") return getPublicBasePath();

  const segs = window.location.pathname.split("/").filter(Boolean);
  if (segs.length === 0) return getPublicBasePath();

  if (segs[0] === "app") return "";

  const knownSecond = new Set([
    "app",
    "login",
    "sign-up",
    "forgot-password",
    "demo",
    "dev-nav",
    "auth",
    "legal",
  ]);
  if (segs.length >= 2 && knownSecond.has(segs[1]!)) {
    return `/${segs[0]}`;
  }

  return getPublicBasePath();
}

/** Для fetch() с клиента — путь к API/страницам с учётом basePath даже при расхождении env в бандле. */
export function withBasePathResolved(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") return withBasePath(path);
  const base = inferClientBasePathFromPathname();
  return `${base}${p}`;
}
