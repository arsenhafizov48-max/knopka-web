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

/**
 * Абсолютный URL для fetch к Route Handlers /api/* на том же origin.
 * Считается через относительный путь от текущей страницы — не зависит от NEXT_PUBLIC_BASE_PATH
 * в клиентском чанке и корректно работает с кириллическим basePath (/кнопка/...).
 */
export function resolveSameOriginApiUrl(apiPath: string): string {
  const p = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  if (!p.startsWith("/api")) {
    return typeof window !== "undefined"
      ? `${window.location.origin}${withBasePathResolved(p)}`
      : `${getPublicBasePath()}${p}`;
  }

  if (typeof window === "undefined") {
    return `${getPublicBasePath()}${p}`;
  }

  const origin = window.location.origin;
  const pathname = window.location.pathname.replace(/\/$/, "") || "/";
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0) {
    return `${origin}${getPublicBasePath()}${p}`;
  }

  const first = parts[0]!;
  const ups = PATH_ROOT_FIRST_SEGMENTS.has(first) ? parts.length : parts.length - 1;
  const tail = p.replace(/^\/api\/?/, "");
  const upPart = ups > 0 ? "../".repeat(ups) : "";
  const rel = tail ? `${upPart}api/${tail}` : `${upPart}api`;

  const baseDirUrl = `${origin}${pathname}/`;
  try {
    return new URL(rel, baseDirUrl).href;
  } catch {
    return `${origin}${withBasePathResolved(p)}`;
  }
}
