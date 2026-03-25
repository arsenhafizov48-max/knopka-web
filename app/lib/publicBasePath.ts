/**
 * Префикс приложения на проде (например /knopka на https://домен/knopka).
 * Должен совпадать с basePath в next.config.ts (переменная NEXT_PUBLIC_BASE_PATH при сборке).
 */
export function getPublicBasePath(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
  if (!raw || raw === "/") return "";
  return raw.startsWith("/") ? raw.replace(/\/$/, "") : `/${raw.replace(/\/$/, "")}`;
}

/** Путь с префиксом из env (сервер / статический бандл). */
export function withBasePath(path: string): string {
  const base = getPublicBasePath();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/** Сегменты, с которых начинается приложение БЕЗ внешнего basePath. */
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

type WindowWithBase = Window & { __KNOPKA_BASE_PATH__?: string | null };

/**
 * Префикс путей для fetch в браузере (должен совпадать с basePath в next.config).
 *
 * 1) window.__KNOPKA_BASE_PATH__ из root layout — значение с сервера при сборке.
 * 2) Иначе первый сегмент URL, если это не app/login/… (подходит для /кнопка/app/…).
 * 3) Иначе пусто или getPublicBasePath() из бандла.
 */
export function getClientFetchBasePath(): string {
  if (typeof window === "undefined") return getPublicBasePath();

  const w = window as WindowWithBase;
  if (
    "__KNOPKA_BASE_PATH__" in w &&
    typeof w.__KNOPKA_BASE_PATH__ === "string" &&
    w.__KNOPKA_BASE_PATH__.length > 0
  ) {
    return w.__KNOPKA_BASE_PATH__.replace(/\/$/, "");
  }

  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length === 0) return getPublicBasePath();

  const head = parts[0]!;
  if (PATH_ROOT_FIRST_SEGMENTS.has(head)) {
    return getPublicBasePath();
  }

  return `/${head}`;
}

/** Путь с префиксом на клиенте (страницы, ссылки, если нужен полный путь). */
export function withBasePathResolved(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") return withBasePath(path);
  return `${getClientFetchBasePath()}${p}`;
}

/** Полный URL для Route Handlers /api/* на текущем origin. */
export function resolveSameOriginApiUrl(apiPath: string): string {
  const p = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  if (typeof window === "undefined") {
    return `${getPublicBasePath()}${p}`;
  }
  if (!p.startsWith("/api")) {
    return `${window.location.origin}${withBasePathResolved(p)}`;
  }
  const base = getClientFetchBasePath();
  return `${window.location.origin}${base}${p}`;
}
