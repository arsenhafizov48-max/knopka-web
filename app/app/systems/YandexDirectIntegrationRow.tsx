"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";

import BrandIcon from "@/app/components/BrandIcon";
import { resolveSameOriginApiUrl, withBasePathResolved } from "@/app/lib/publicBasePath";

type Status = "connected" | "partial" | "disconnected" | "manual";

function StatusPill({ status, text }: { status: Status; text: string }) {
  const map: Record<Status, string> = {
    connected: "bg-green-50 text-green-700 border-green-200",
    partial: "bg-amber-50 text-amber-700 border-amber-200",
    disconnected: "bg-rose-50 text-rose-700 border-rose-200",
    manual: "bg-neutral-50 text-neutral-700 border-neutral-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${map[status]}`}
    >
      {text}
    </span>
  );
}

type YandexState =
  | { kind: "loading" }
  | { kind: "ok"; connected: boolean; expiresAt: string | null; serverError?: string }
  | { kind: "error"; message: string };

const ICON = {
  slug: "yandex",
  color: "#2563eb",
  tint: "bg-blue-50 text-blue-700 border-blue-100",
  fallback: "Я",
} as const;

export function YandexDirectIntegrationRow() {
  const [st, setSt] = useState<YandexState>({ kind: "loading" });
  const [flash, setFlash] = useState<{ text: string; kind: "ok" | "err" } | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const refresh = useCallback(() => {
    setSt({ kind: "loading" });
    fetch(resolveSameOriginApiUrl("/api/yandex-direct/status"), { credentials: "include" })
      .then(async (res) => {
        const j = (await res.json()) as {
          connected?: boolean;
          authenticated?: boolean;
          expiresAt?: string | null;
          error?: string;
        };
        if (!res.ok) {
          setSt({
            kind: "ok",
            connected: false,
            expiresAt: null,
            serverError: j.error || `HTTP ${res.status}`,
          });
          return;
        }
        if (!j.authenticated) {
          setSt({ kind: "ok", connected: false, expiresAt: null });
          return;
        }
        setSt({
          kind: "ok",
          connected: !!j.connected,
          expiresAt: j.expiresAt ?? null,
          serverError: j.error,
        });
      })
      .catch((e: unknown) => {
        setSt({
          kind: "error",
          message: e instanceof Error ? e.message : "Не удалось загрузить статус",
        });
      });
  }, []);

  useEffect(() => {
    refresh();
    const onRefresh = () => refresh();
    window.addEventListener("knopka:integrationsRefresh", onRefresh);
    return () => window.removeEventListener("knopka:integrationsRefresh", onRefresh);
  }, [refresh]);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const yd = sp.get("yd");
    const ydError = sp.get("yd_error");
    if (yd === "connected") {
      setFlash({ text: "Яндекс Директ подключён.", kind: "ok" });
      refresh();
    } else if (ydError) {
      setFlash({ text: ydError, kind: "err" });
    }
    if (yd || ydError) {
      sp.delete("yd");
      sp.delete("yd_error");
      const qs = sp.toString();
      const path = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.replaceState(null, "", path);
    }
  }, [refresh]);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 12000);
    return () => window.clearTimeout(t);
  }, [flash]);

  const onDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch(resolveSameOriginApiUrl("/api/yandex-direct/disconnect"), {
        method: "POST",
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setFlash({ text: j.error || "Не удалось отключить", kind: "err" });
        return;
      }
      setFlash({ text: "Яндекс Директ отключён.", kind: "ok" });
      refresh();
    } finally {
      setDisconnecting(false);
    }
  };

  let pill: { status: Status; text: string };
  let meta: string;

  if (st.kind === "loading") {
    pill = { status: "manual", text: "Проверка…" };
    meta = "Запрашиваем статус подключения…";
  } else if (st.kind === "error") {
    pill = { status: "disconnected", text: "Ошибка" };
    meta = st.message;
  } else if (st.serverError === "service_role_missing") {
    pill = { status: "partial", text: "Сервер" };
    meta = "Задайте SUPABASE_SERVICE_ROLE_KEY на Vercel — иначе токен не сохранить.";
  } else if (!st.connected) {
    pill = { status: "disconnected", text: "Не подключено" };
    meta = "OAuth: доступ к API Директа для вашего аккаунта.";
  } else {
    pill = { status: "connected", text: "Подключено" };
    meta = st.expiresAt
      ? `Токен до ${new Date(st.expiresAt).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}`
      : "Аккаунт привязан. Импорт кампаний — в следующих версиях.";
  }

  return (
    <div className="space-y-2">
      {flash ? (
        <div
          className={
            flash.kind === "ok"
              ? "rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-900"
              : "rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900"
          }
          role="status"
        >
          {flash.text}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${ICON.tint}`}
          >
            <BrandIcon
              slug={ICON.slug}
              className="h-5 w-5"
              color={ICON.color}
              fallbackText={ICON.fallback}
            />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium">Яндекс Директ</div>
              <div className="text-xs text-neutral-500">Реклама</div>
            </div>
            <div className="mt-1 text-xs text-neutral-500">{meta}</div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <StatusPill status={pill.status} text={pill.text} />

          {st.kind === "ok" && st.serverError !== "service_role_missing" && !st.connected ? (
            <a
              href={withBasePathResolved("/api/yandex-direct/authorize")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 sm:justify-end"
            >
              Подключить <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          ) : null}

          {st.kind === "ok" && st.connected ? (
            <button
              type="button"
              disabled={disconnecting}
              onClick={() => void onDisconnect()}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium hover:bg-neutral-50 disabled:opacity-60"
            >
              {disconnecting ? "Отключаем…" : "Отключить"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
