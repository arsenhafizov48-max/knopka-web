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
 * Первый сегмент URL после домена — это basePath, если это НЕ корневой маршрут Next-приложения.
 * Так работает и /knopka/app/strategy, и /кнопка/onboarding/step-1, и /кнопка/fact (раньше ломалось:
 * второй сегмент не был в whitelist → падали на пустой env → fetch на /api/... → HTML 404).
 */
const PATH_ROOT_FIRST_SEGMENTS = new Set([
  "app",
  "login",
  "sign-up",
  "forgot-password",
  "demo",
  "dev-nav",
  "auth",
  "legal",
  "_next",
  "api",
]);

function inferClientBasePathFromPathname(): string {
  if (typeof window === "undefined") return getPublicBasePath();

  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length === 0) return getPublicBasePath();

  const head = parts[0]!;
  if (PATH_ROOT_FIRST_SEGMENTS.has(head)) {
    return "";
  }

  return `/${head}`;
}

type WindowWithBase = Window & { __KNOPKA_BASE_PATH__?: string | null };

/**
 * Непустая строка — префикс из билда (как next.config).
 * null — в билде префикса нет, смотрим URL.
 * undefined — скрипт не выполнился.
 */
function getBasePathFromDocument(): string | null | undefined {
  if (typeof window === "undefined") return undefined;
  if (!("__KNOPKA_BASE_PATH__" in (window as WindowWithBase))) return undefined;
  const v = (window as WindowWithBase).__KNOPKA_BASE_PATH__;
  if (v === null) return null;
  if (typeof v === "string" && v.length > 0) return v;
  return undefined;
}

/** Для fetch() с клиента — путь к API/страницам с учётом basePath. */
export function withBasePathResolved(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") return withBasePath(path);

  const fromDoc = getBasePathFromDocument();
  if (typeof fromDoc === "string") {
    return `${fromDoc}${p}`;
  }

  const base = inferClientBasePathFromPathname();
  return `${base}${p}`;
}
