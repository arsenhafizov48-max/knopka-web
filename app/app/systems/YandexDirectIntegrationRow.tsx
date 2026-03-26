"use client";

import Link from "next/link";
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

type SnapshotInfo = {
  syncedAt: string | null;
  status: string | null;
  errorMessage: string | null;
  counts: { campaigns: number; adGroups: number; ads: number; keywords: number } | null;
};

type YandexAccount = { login: string | null; email: string | null };

type Conn = {
  id: string;
  expiresAt: string | null;
  yandexAccount: YandexAccount | null;
  snapshot: SnapshotInfo | null;
};

type YandexState =
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

function oneCardMeta(c: Conn): { pill: { status: Status; text: string }; meta: string } {
  const ya = c.yandexAccount;
  const accountLine = accountLabel(ya);
  const snap = c.snapshot;
  const isPartial = snap?.status === "partial";
  const pill = !c.yandexAccount?.email && !c.yandexAccount?.login
    ? { status: "partial" as const, text: "Подключено" }
    : isPartial
      ? { status: "partial" as const, text: "Частично" }
      : { status: "connected" as const, text: "Подключено" };

  const tokenLine = c.expiresAt
    ? `Токен до ${new Date(c.expiresAt).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}.`
    : "Аккаунт привязан.";
  let snapLine = " Снимок структуры: ещё не выгружали — нажмите «Синхронизировать».";
  if (snap?.syncedAt) {
    const t = new Date(snap.syncedAt).toLocaleString("ru-RU", {
      dateStyle: "short",
      timeStyle: "short",
    });
    if (snap.status === "error" && snap.errorMessage) {
      snapLine = ` Последняя выгрузка ${t}: ошибка — ${snap.errorMessage}`;
    } else if (isPartial && snap.errorMessage) {
      const co = snap.counts;
      const cnt = co
        ? `кампаний ${co.campaigns}, групп ${co.adGroups}, объявлений ${co.ads}, фраз ${co.keywords}. `
        : "";
      snapLine = ` Выгрузка ${t}: ${cnt}Не всё выгрузилось: ${snap.errorMessage}`;
    } else if (snap.counts) {
      snapLine = ` Выгрузка ${t}: кампаний ${snap.counts.campaigns}, групп ${snap.counts.adGroups}, объявлений ${snap.counts.ads}, фраз ${snap.counts.keywords}.`;
    } else {
      snapLine = ` Выгрузка ${t}.`;
    }
  }
  return { pill, meta: tokenLine + snapLine + (accountLine ? "" : "") };
}

export function YandexDirectIntegrationRow() {
  const [st, setSt] = useState<YandexState>({ kind: "loading" });
  const [flash, setFlash] = useState<{ text: string; kind: "ok" | "err" | "warn" } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setSt({ kind: "loading" });
    fetch(resolveSameOriginApiUrl("/api/yandex-direct/status"), { credentials: "include" })
      .then(async (res) => {
        const j = (await res.json()) as {
          authenticated?: boolean;
          error?: string;
          connections?: Array<{
            id: string;
            expiresAt?: string | null;
            yandexAccount?: YandexAccount | null;
            snapshot?: {
              syncedAt: string | null;
              status: string | null;
              errorMessage: string | null;
              counts: SnapshotInfo["counts"];
            } | null;
          }>;
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
        const list = Array.isArray(j.connections) ? j.connections : [];
        setSt({
          kind: "ok",
          serverError: j.error,
          connections: list.map((row) => ({
            id: row.id,
            expiresAt: row.expiresAt ?? null,
            yandexAccount: row.yandexAccount ?? null,
            snapshot: row.snapshot
              ? {
                  syncedAt: row.snapshot.syncedAt ?? null,
                  status: row.snapshot.status ?? null,
                  errorMessage: row.snapshot.errorMessage ?? null,
                  counts: row.snapshot.counts ?? null,
                }
              : null,
          })),
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

  const onSync = async (connectionId: string) => {
    setBusyId(connectionId);
    try {
      const res = await fetch(resolveSameOriginApiUrl("/api/yandex-direct/sync"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        partial?: boolean;
        warnings?: string[];
        counts?: SnapshotInfo["counts"];
      };
      if (!res.ok) {
        setFlash({ text: j.error || `HTTP ${res.status}`, kind: "err" });
        return;
      }
      if (j.ok) {
        const c = j.counts;
        const line = c
          ? `Снимок обновлён: кампаний ${c.campaigns}, групп ${c.adGroups}, объявлений ${c.ads}, фраз ${c.keywords}.`
          : "Снимок обновлён.";
        if (j.partial && j.warnings?.length) {
          setFlash({
            text: `${line} Не выгрузили: ${j.warnings.join(" ")}`,
            kind: "warn",
          });
        } else {
          setFlash({ text: line, kind: "ok" });
        }
      } else {
        setFlash({ text: j.error || "Синхронизация не удалась", kind: "err" });
      }
      refresh();
    } finally {
      setBusyId(null);
      window.dispatchEvent(new Event("knopka:integrationsRefresh"));
    }
  };

  const onDisconnect = async (connectionId: string) => {
    setBusyId(connectionId);
    try {
      const res = await fetch(resolveSameOriginApiUrl("/api/yandex-direct/disconnect"), {
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
      setFlash({ text: "Подключение Директа отключено.", kind: "ok" });
      refresh();
    } finally {
      setBusyId(null);
      window.dispatchEvent(new Event("knopka:integrationsRefresh"));
    }
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
    topMeta = "OAuth: доступ к API Директа для вашего аккаунта.";
  } else {
    topPill = { status: "connected", text: `${st.connections.length} аккаунт(ов)` };
    topMeta = "Несколько кабинетов Директа можно подключить с разных Яндекс-аккаунтов.";
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
                <div className="font-medium">Яндекс Директ</div>
                <div className="text-xs text-neutral-500">Реклама</div>
              </div>
              <div className="mt-1 text-xs text-neutral-500">{topMeta}</div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <StatusPill status={topPill.status} text={topPill.text} />
            {st.kind === "ok" && st.serverError !== "service_role_missing" && st.connections.length === 0 ? (
              <a
                href={withBasePathResolved("/api/yandex-direct/authorize")}
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
              const { pill, meta } = oneCardMeta(c);
              const acc = accountLabel(c.yandexAccount);
              const syncing = busyId === c.id;
              return (
                <div
                  key={c.id}
                  className="flex flex-col gap-2 rounded-lg border border-neutral-100 bg-neutral-50/50 px-3 py-2 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    {acc ? (
                      <div className="text-xs font-medium text-neutral-800">{acc}</div>
                    ) : (
                      <div className="text-xs text-neutral-600">Аккаунт Яндекса</div>
                    )}
                    <div className="mt-0.5 text-xs text-neutral-500">{meta}</div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    <StatusPill status={pill.status} text={pill.text} />
                    <button
                      type="button"
                      disabled={syncing}
                      onClick={() => void onSync(c.id)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-60 sm:justify-end"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                      {syncing ? "Синхронизация…" : "Синхронизировать"}
                    </button>
                    <Link
                      href={`/app/yandex-direct-data?connectionId=${encodeURIComponent(c.id)}`}
                      className="text-center text-xs font-medium text-blue-600 hover:text-blue-700 sm:text-right"
                    >
                      Открыть выгруженные данные →
                    </Link>
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
              );
            })}
            <a
              href={withBasePathResolved("/api/yandex-direct/authorize?intent=add")}
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
