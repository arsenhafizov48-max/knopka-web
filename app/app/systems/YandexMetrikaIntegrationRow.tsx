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

type Conn = {
  id: string;
  expiresAt: string | null;
  yandexAccount: YandexAccount | null;
  counters: CounterRow[];
};

type MetrikaState =
  | { kind: "loading" }
  | {
      kind: "ok";
      serverError?: string;
      connections: Conn[];
    }
  | { kind: "error"; message: string };

const ICON = {
  tint: "bg-blue-50 text-blue-700 border-blue-100",
  fallback: "Я",
} as const;

function accountLabel(ya: YandexAccount | null): string | null {
  if (!ya) return null;
  if (ya.email && ya.login) return `${ya.email} (@${ya.login})`;
  if (ya.email) return ya.email;
  if (ya.login) return `@${ya.login}`;
  return null;
}

export function YandexMetrikaIntegrationRow() {
  const [st, setSt] = useState<MetrikaState>({ kind: "loading" });
  const [flash, setFlash] = useState<{ text: string; kind: "ok" | "err" | "warn" } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [counterDrafts, setCounterDrafts] = useState<Record<string, string>>({});
  const [addingFor, setAddingFor] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setSt({ kind: "loading" });
    fetch(resolveSameOriginApiUrl("/api/yandex-metrika/status"), { credentials: "include" })
      .then(async (res) => {
        const j = (await res.json()) as {
          authenticated?: boolean;
          error?: string;
          connections?: Conn[];
        };
        if (!res.ok) {
          setSt({
            kind: "ok",
            serverError: j.error || `HTTP ${res.status}`,
            connections: [],
          });
          return;
        }
        if (!j.authenticated) {
          setSt({ kind: "ok", connections: [] });
          return;
        }
        setSt({
          kind: "ok",
          serverError: j.error,
          connections: Array.isArray(j.connections) ? j.connections : [],
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

  const onSync = async (connectionId: string) => {
    setBusyId(connectionId);
    try {
      const res = await fetch(resolveSameOriginApiUrl("/api/yandex-metrika/sync"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
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
      setBusyId(null);
    }
  };

  const onDisconnect = async (connectionId: string) => {
    setBusyId(connectionId);
    try {
      const res = await fetch(resolveSameOriginApiUrl("/api/yandex-metrika/disconnect"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setFlash({ text: j.error || "Не удалось отключить", kind: "err" });
        return;
      }
      setFlash({ text: "Подключение Метрики отключено.", kind: "ok" });
      refresh();
    } finally {
      setBusyId(null);
    }
  };

  const onAddCounter = async (connectionId: string) => {
    const draft = (counterDrafts[connectionId] ?? "").replace(/\s/g, "");
    const n = Number(draft);
    if (!Number.isFinite(n) || n <= 0) {
      setFlash({ text: "Введите номер счётчика (цифры).", kind: "err" });
      return;
    }
    setAddingFor(connectionId);
    try {
      const res = await fetch(resolveSameOriginApiUrl("/api/yandex-metrika/counters"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ counterId: n, connectionId }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setFlash({ text: j.error || `HTTP ${res.status}`, kind: "err" });
        return;
      }
      if (j.ok) {
        setFlash({ text: "Счётчик добавлен, данные выгружены.", kind: "ok" });
        setCounterDrafts((prev) => ({ ...prev, [connectionId]: "" }));
      } else {
        setFlash({ text: j.error || "Не удалось добавить счётчик", kind: "err" });
      }
      refresh();
    } finally {
      setAddingFor(null);
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

  let topPill: { status: Status; text: string } = { status: "manual", text: "Проверка…" };
  let topMeta = "";

  if (st.kind === "loading") {
    topPill = { status: "manual", text: "Проверка…" };
    topMeta = "Запрашиваем статус подключения…";
  } else if (st.kind === "error") {
    topPill = { status: "disconnected", text: "Ошибка" };
    topMeta = st.message;
  } else if (st.serverError === "service_role_missing") {
    topPill = { status: "partial", text: "Сервер" };
    topMeta = "Задайте SUPABASE_SERVICE_ROLE_KEY на Vercel — иначе токен не сохранить.";
  } else if (st.connections.length === 0) {
    topPill = { status: "disconnected", text: "Не подключено" };
    topMeta = "OAuth: доступ к API Метрики (чтение отчётов).";
  } else {
    const totalCounters = st.connections.reduce((s, c) => s + c.counters.length, 0);
    const anyErr = st.connections.some((c) => c.counters.some((x) => x.sync_status === "error"));
    topPill =
      totalCounters === 0
        ? { status: "partial", text: "Нет счётчика" }
        : anyErr
          ? { status: "partial", text: "Есть ошибки" }
          : { status: "connected", text: "Подключено" };
    topMeta = `${st.connections.length} OAuth-аккаунт(ов), ${totalCounters} счётчик(ов).`;
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

      <div className="rounded-xl border border-neutral-200 bg-white px-3 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
              <div className="mt-1 text-xs text-neutral-500">{topMeta}</div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <StatusPill status={topPill.status} text={topPill.text} />
            {st.kind === "ok" && st.serverError !== "service_role_missing" && st.connections.length === 0 ? (
              <a
                href={withBasePathResolved("/api/yandex-metrika/authorize")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 sm:justify-end"
              >
                Подключить <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        </div>

        {st.kind === "ok" && st.connections.length > 0 ? (
          <div className="mt-4 space-y-3 border-t border-neutral-100 pt-3">
            {st.connections.map((c) => {
              const acc = accountLabel(c.yandexAccount);
              const syncing = busyId === c.id;
              const adding = addingFor === c.id;
              return (
                <div
                  key={c.id}
                  className="space-y-2 rounded-lg border border-neutral-100 bg-neutral-50/50 px-3 py-2"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      {acc ? (
                        <div className="text-xs font-medium text-neutral-800">{acc}</div>
                      ) : (
                        <div className="text-xs text-neutral-600">Аккаунт Яндекса</div>
                      )}
                      <div className="text-xs text-neutral-500">
                        Токен до{" "}
                        {c.expiresAt
                          ? new Date(c.expiresAt).toLocaleString("ru-RU", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "—"}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:items-end">
                      <button
                        type="button"
                        disabled={syncing || c.counters.length === 0}
                        onClick={() => void onSync(c.id)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-60 sm:justify-end"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                        {syncing ? "Синхронизация…" : "Синхронизировать"}
                      </button>
                      <button
                        type="button"
                        disabled={syncing}
                        onClick={() => void onDisconnect(c.id)}
                        className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium hover:bg-neutral-50 disabled:opacity-60"
                      >
                        Отключить этот аккаунт
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end gap-2">
                    <div>
                      <label className="sr-only" htmlFor={`ym-counter-${c.id}`}>
                        Номер счётчика
                      </label>
                      <input
                        id={`ym-counter-${c.id}`}
                        type="text"
                        inputMode="numeric"
                        placeholder="Номер счётчика"
                        value={counterDrafts[c.id] ?? ""}
                        onChange={(e) =>
                          setCounterDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))
                        }
                        className="w-40 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={adding}
                      onClick={() => void onAddCounter(c.id)}
                      className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs font-medium hover:bg-neutral-100 disabled:opacity-60"
                    >
                      {adding ? "Добавляем…" : "Добавить счётчик"}
                    </button>
                  </div>

                  {c.counters.length > 0 ? (
                    <ul className="space-y-1 text-xs text-neutral-600">
                      {c.counters.map((x) => (
                        <li key={x.id} className="flex flex-wrap items-center gap-2">
                          <span>
                            #{x.counter_id} {x.site_name ? `· ${x.site_name}` : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() => void onRemoveCounter(x.id)}
                            className="text-rose-600 hover:underline"
                          >
                            Убрать
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
            <a
              href={withBasePathResolved("/api/yandex-metrika/authorize?intent=add")}
              className="inline-flex w-full items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50 sm:w-auto"
            >
              + Подключить ещё аккаунт (другая почта)
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
