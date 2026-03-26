"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";

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

type CounterRow = {
  id: string;
  counter_id: number;
  site_name: string | null;
  sync_status: string | null;
  error_message: string | null;
  synced_at: string | null;
};

type YandexAccount = { login: string | null; email: string | null };

type MetrikaState =
  | { kind: "loading" }
  | {
      kind: "ok";
      connected: boolean;
      expiresAt: string | null;
      serverError?: string;
      yandexAccount: YandexAccount | null;
      counters: CounterRow[];
    }
  | { kind: "error"; message: string };

const ICON = {
  tint: "bg-blue-50 text-blue-700 border-blue-100",
  fallback: "Я",
} as const;

export function YandexMetrikaIntegrationRow() {
  const [st, setSt] = useState<MetrikaState>({ kind: "loading" });
  const [flash, setFlash] = useState<{ text: string; kind: "ok" | "err" | "warn" } | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [counterDraft, setCounterDraft] = useState("");
  const [adding, setAdding] = useState(false);

  const refresh = useCallback(() => {
    setSt({ kind: "loading" });
    fetch(resolveSameOriginApiUrl("/api/yandex-metrika/status"), { credentials: "include" })
      .then(async (res) => {
        const j = (await res.json()) as {
          connected?: boolean;
          authenticated?: boolean;
          expiresAt?: string | null;
          error?: string;
          yandexAccount?: YandexAccount | null;
          counters?: CounterRow[];
        };
        if (!res.ok) {
          setSt({
            kind: "ok",
            connected: false,
            expiresAt: null,
            serverError: j.error || `HTTP ${res.status}`,
            yandexAccount: null,
            counters: [],
          });
          return;
        }
        if (!j.authenticated) {
          setSt({
            kind: "ok",
            connected: false,
            expiresAt: null,
            yandexAccount: null,
            counters: [],
          });
          return;
        }
        const ya = j.yandexAccount;
        setSt({
          kind: "ok",
          connected: !!j.connected,
          expiresAt: j.expiresAt ?? null,
          serverError: j.error,
          yandexAccount:
            ya && (ya.email || ya.login)
              ? { login: ya.login ?? null, email: ya.email ?? null }
              : null,
          counters: Array.isArray(j.counters) ? j.counters : [],
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
    const ym = sp.get("ym");
    const ymError = sp.get("ym_error");
    if (ym === "connected") {
      setFlash({ text: "Яндекс Метрика подключена. Добавьте номер счётчика ниже.", kind: "ok" });
      refresh();
    } else if (ymError) {
      setFlash({ text: ymError, kind: "err" });
    }
    if (ym || ymError) {
      sp.delete("ym");
      sp.delete("ym_error");
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

  const onSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(resolveSameOriginApiUrl("/api/yandex-metrika/sync"), {
        method: "POST",
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        partial?: boolean;
      };
      if (!res.ok) {
        setFlash({ text: j.error || `HTTP ${res.status}`, kind: "err" });
        return;
      }
      if (j.ok) {
        setFlash({
          text: j.partial
            ? "Синхронизация завершена с предупреждениями по части счётчиков."
            : "Данные Метрики обновлены.",
          kind: j.partial ? "warn" : "ok",
        });
      } else {
        setFlash({ text: j.error || "Синхронизация не удалась", kind: "err" });
      }
      refresh();
    } finally {
      setSyncing(false);
    }
  };

  const onDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch(resolveSameOriginApiUrl("/api/yandex-metrika/disconnect"), {
        method: "POST",
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setFlash({ text: j.error || "Не удалось отключить", kind: "err" });
        return;
      }
      setFlash({ text: "Яндекс Метрика отключена.", kind: "ok" });
      refresh();
    } finally {
      setDisconnecting(false);
    }
  };

  const onAddCounter = async () => {
    const n = Number(counterDraft.replace(/\s/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      setFlash({ text: "Введите номер счётчика (цифры).", kind: "err" });
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(resolveSameOriginApiUrl("/api/yandex-metrika/counters"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counterId: n }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setFlash({ text: j.error || `HTTP ${res.status}`, kind: "err" });
        return;
      }
      if (j.ok) {
        setFlash({ text: "Счётчик добавлен, данные выгружены.", kind: "ok" });
        setCounterDraft("");
      } else {
        setFlash({ text: j.error || "Не удалось добавить счётчик", kind: "err" });
      }
      refresh();
    } finally {
      setAdding(false);
    }
  };

  const onRemoveCounter = async (id: string) => {
    const res = await fetch(
      resolveSameOriginApiUrl(`/api/yandex-metrika/counters?id=${encodeURIComponent(id)}`),
      { method: "DELETE", credentials: "include" }
    );
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setFlash({ text: j.error || "Не удалось удалить счётчик", kind: "err" });
      return;
    }
    refresh();
  };

  let pill: { status: Status; text: string };
  let meta: string;
  let accountLine: string | null = null;

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
    meta = "OAuth: доступ к API Метрики (чтение отчётов).";
  } else {
    const ya = st.yandexAccount;
    if (ya) {
      if (ya.email && ya.login) {
        accountLine = `${ya.email} (@${ya.login})`;
      } else if (ya.email) {
        accountLine = ya.email;
      } else if (ya.login) {
        accountLine = `@${ya.login}`;
      }
    }
    const hasCounters = st.counters.length > 0;
    const anyErr = st.counters.some((c) => c.sync_status === "error");
    const anyPartial = st.counters.some((c) => c.sync_status && c.sync_status !== "ok");
    pill = !hasCounters
      ? { status: "partial", text: "Нет счётчика" }
      : anyErr
        ? { status: "partial", text: "Есть ошибки" }
        : anyPartial
          ? { status: "partial", text: "Частично" }
          : { status: "connected", text: "Подключено" };

    const tokenLine = st.expiresAt
      ? `Токен до ${new Date(st.expiresAt).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}.`
      : "Аккаунт привязан.";

    let countersLine = " Добавьте номер счётчика — без него отчёты не выгрузятся.";
    if (hasCounters) {
      countersLine = st.counters
        .map((c) => {
          const t = c.synced_at
            ? new Date(c.synced_at).toLocaleString("ru-RU", {
                dateStyle: "short",
                timeStyle: "short",
              })
            : "—";
          const err = c.error_message ? ` ошибка: ${c.error_message}` : "";
          return `Счётчик ${c.counter_id} (${c.site_name ?? "сайт"}) — выгрузка ${t}.${err}`;
        })
        .join(" ");
    }
    meta = `${tokenLine} ${countersLine}`;
  }

  return (
    <div className="space-y-2">
      {flash ? (
        <div
          className={
            flash.kind === "ok"
              ? "rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-900"
              : flash.kind === "warn"
                ? "rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
                : "rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900"
          }
          role="status"
        >
          {flash.text}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-sm font-semibold ${ICON.tint}`}
            title="Яндекс"
          >
            {ICON.fallback}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium">Яндекс Метрика</div>
              <div className="text-xs text-neutral-500">Аналитика сайта</div>
            </div>
            {st.kind === "ok" && st.connected && accountLine ? (
              <div className="mt-0.5 text-xs text-neutral-800">
                Подключён аккаунт: <span className="font-medium">{accountLine}</span>
              </div>
            ) : null}
            <div className="mt-1 text-xs text-neutral-500">{meta}</div>

            {st.kind === "ok" && st.connected ? (
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <div>
                  <label className="sr-only" htmlFor="ym-counter-id">
                    Номер счётчика
                  </label>
                  <input
                    id="ym-counter-id"
                    type="text"
                    inputMode="numeric"
                    placeholder="Номер счётчика"
                    value={counterDraft}
                    onChange={(e) => setCounterDraft(e.target.value)}
                    className="w-40 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs"
                  />
                </div>
                <button
                  type="button"
                  disabled={adding}
                  onClick={() => void onAddCounter()}
                  className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-xs font-medium hover:bg-neutral-100 disabled:opacity-60"
                >
                  {adding ? "Добавляем…" : "Добавить счётчик"}
                </button>
              </div>
            ) : null}

            {st.kind === "ok" && st.connected && st.counters.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs text-neutral-600">
                {st.counters.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-2">
                    <span>
                      #{c.counter_id} {c.site_name ? `· ${c.site_name}` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => void onRemoveCounter(c.id)}
                      className="text-rose-600 hover:underline"
                    >
                      Убрать
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <StatusPill status={pill.status} text={pill.text} />

          {st.kind === "ok" && st.serverError !== "service_role_missing" && !st.connected ? (
            <a
              href={withBasePathResolved("/api/yandex-metrika/authorize")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 sm:justify-end"
            >
              Подключить <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          ) : null}

          {st.kind === "ok" && st.connected ? (
            <>
              <button
                type="button"
                disabled={syncing || st.counters.length === 0}
                onClick={() => void onSync()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-60 sm:justify-end"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Синхронизация…" : "Синхронизировать"}
              </button>
              <button
                type="button"
                disabled={disconnecting}
                onClick={() => void onDisconnect()}
                className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium hover:bg-neutral-50 disabled:opacity-60"
              >
                {disconnecting ? "Отключаем…" : "Отключить"}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
