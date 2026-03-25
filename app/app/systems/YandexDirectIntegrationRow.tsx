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

type YandexState =
  | { kind: "loading" }
  | {
      kind: "ok";
      connected: boolean;
      expiresAt: string | null;
      serverError?: string;
      yandexAccount: YandexAccount | null;
      snapshot: SnapshotInfo | null;
    }
  | { kind: "error"; message: string };

const ICON = {
  tint: "bg-blue-50 text-blue-700 border-blue-100",
  fallback: "Я",
} as const;

export function YandexDirectIntegrationRow() {
  const [st, setSt] = useState<YandexState>({ kind: "loading" });
  const [flash, setFlash] = useState<{ text: string; kind: "ok" | "err" | "warn" } | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(() => {
    setSt({ kind: "loading" });
    fetch(resolveSameOriginApiUrl("/api/yandex-direct/status"), { credentials: "include" })
      .then(async (res) => {
        const j = (await res.json()) as {
          connected?: boolean;
          authenticated?: boolean;
          expiresAt?: string | null;
          error?: string;
          yandexAccount?: YandexAccount | null;
          snapshot?: {
            syncedAt: string | null;
            status: string | null;
            errorMessage: string | null;
            counts: SnapshotInfo["counts"];
          } | null;
        };
        if (!res.ok) {
          setSt({
            kind: "ok",
            connected: false,
            expiresAt: null,
            serverError: j.error || `HTTP ${res.status}`,
            yandexAccount: null,
            snapshot: null,
          });
          return;
        }
        if (!j.authenticated) {
          setSt({
            kind: "ok",
            connected: false,
            expiresAt: null,
            yandexAccount: null,
            snapshot: null,
          });
          return;
        }
        const snap = j.snapshot;
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
          snapshot: snap
            ? {
                syncedAt: snap.syncedAt ?? null,
                status: snap.status ?? null,
                errorMessage: snap.errorMessage ?? null,
                counts: snap.counts ?? null,
              }
            : null,
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

  const onSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(resolveSameOriginApiUrl("/api/yandex-direct/sync"), {
        method: "POST",
        credentials: "include",
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
      setSyncing(false);
    }
  };

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
    meta = "OAuth: доступ к API Директа для вашего аккаунта.";
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
    const snap = st.snapshot;
    const isPartial = snap?.status === "partial";
    pill = isPartial
      ? { status: "partial", text: "Частично" }
      : { status: "connected", text: "Подключено" };
    const tokenLine = st.expiresAt
      ? `Токен до ${new Date(st.expiresAt).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}.`
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
        const c = snap.counts;
        const cnt = c
          ? `кампаний ${c.campaigns}, групп ${c.adGroups}, объявлений ${c.ads}, фраз ${c.keywords}. `
          : "";
        snapLine = ` Выгрузка ${t}: ${cnt}Не всё выгрузилось: ${snap.errorMessage}`;
      } else if (snap.counts) {
        snapLine = ` Выгрузка ${t}: кампаний ${snap.counts.campaigns}, групп ${snap.counts.adGroups}, объявлений ${snap.counts.ads}, фраз ${snap.counts.keywords}.`;
      } else {
        snapLine = ` Выгрузка ${t}.`;
      }
    }
    meta = tokenLine + snapLine;
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

      <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
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
            {st.kind === "ok" && st.connected && accountLine ? (
              <div className="mt-0.5 text-xs text-neutral-800">
                Подключён аккаунт: <span className="font-medium">{accountLine}</span>
              </div>
            ) : null}
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
            <>
              <button
                type="button"
                disabled={syncing}
                onClick={() => void onSync()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-60 sm:justify-end"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Синхронизация…" : "Синхронизировать"}
              </button>
              <Link
                href="/app/yandex-direct-data"
                className="text-center text-xs font-medium text-blue-600 hover:text-blue-700 sm:text-right"
              >
                Открыть выгруженные данные →
              </Link>
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
