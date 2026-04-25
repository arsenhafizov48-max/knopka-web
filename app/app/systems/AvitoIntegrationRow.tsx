"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, RefreshCw, Trash2 } from "lucide-react";

import { resolveSameOriginApiUrl, withBasePathResolved } from "@/app/lib/publicBasePath";

type Conn = { id: string; expiresAt: string | null; updatedAt: string | null };

type State =
  | { kind: "loading" }
  | { kind: "ok"; connections: Conn[]; serverError?: string }
  | { kind: "error"; message: string };

function pill(text: string, tone: "ok" | "warn" | "bad" | "info") {
  const cls =
    tone === "ok"
      ? "bg-green-50 text-green-700 border-green-200"
      : tone === "warn"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : tone === "bad"
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : "bg-neutral-50 text-neutral-700 border-neutral-200";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}>{text}</span>;
}

export function AvitoIntegrationRow() {
  const [st, setSt] = useState<State>({ kind: "loading" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ text: string; tone: "ok" | "warn" | "bad" | "info" } | null>(null);

  const load = useCallback(() => {
    setSt({ kind: "loading" });
    fetch(resolveSameOriginApiUrl("/api/avito/status"), { credentials: "include" })
      .then(async (res) => {
        const j = (await res.json()) as { error?: string; connections?: Conn[] };
        if (!res.ok) {
          setSt({ kind: "error", message: j.error || `HTTP ${res.status}` });
          return;
        }
        setSt({ kind: "ok", connections: Array.isArray(j.connections) ? j.connections : [] });
      })
      .catch((e: unknown) => setSt({ kind: "error", message: e instanceof Error ? e.message : "Ошибка" }));
  }, []);

  useEffect(() => {
    load();
    const on = () => load();
    window.addEventListener("knopka:integrationsRefresh", on);
    return () => window.removeEventListener("knopka:integrationsRefresh", on);
  }, [load]);

  const disconnect = async (id: string) => {
    setBusyId(id);
    setFlash(null);
    try {
      const res = await fetch(resolveSameOriginApiUrl("/api/avito/disconnect"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      setFlash({ text: "Авито отключено", tone: "info" });
      load();
      window.dispatchEvent(new Event("knopka:integrationsRefresh"));
    } catch (e) {
      setFlash({ text: e instanceof Error ? e.message : "Ошибка", tone: "bad" });
    } finally {
      setBusyId(null);
    }
  };

  const connectedCount = st.kind === "ok" ? st.connections.length : 0;

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-neutral-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-neutral-900">Авито</div>
            {st.kind === "loading"
              ? pill("Проверка…", "info")
              : st.kind === "error"
                ? pill("Ошибка", "bad")
                : connectedCount > 0
                  ? pill(`Подключено: ${connectedCount}`, "ok")
                  : pill("Не подключено", "warn")}
          </div>
          <p className="mt-1 text-sm text-neutral-600">
            Подключение через OAuth. После подключения появится доступ к данным и статистике вашего аккаунта Авито.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={withBasePathResolved("/api/avito/authorize")}
            className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
          >
            Подключить
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            <RefreshCw className="h-4 w-4" />
            Обновить
          </button>
        </div>
      </div>

      <div className="px-4 py-4">
        {flash ? (
          <div
            className={`mb-3 rounded-xl px-3 py-2 text-xs ${
              flash.tone === "bad"
                ? "bg-rose-50 text-rose-800"
                : flash.tone === "ok"
                  ? "bg-green-50 text-green-800"
                  : flash.tone === "warn"
                    ? "bg-amber-50 text-amber-900"
                    : "bg-neutral-100 text-neutral-800"
            }`}
          >
            {flash.text}
          </div>
        ) : null}

        {st.kind === "error" ? <p className="text-sm text-rose-700">{st.message}</p> : null}

        {st.kind === "ok" && st.connections.length > 0 ? (
          <div className="space-y-2">
            {st.connections.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-neutral-50/40 px-3 py-2">
                <div className="text-xs text-neutral-700">
                  <span className="font-semibold text-neutral-900">Подключение</span>{" "}
                  <span className="font-mono">{c.id.slice(0, 8)}</span>
                  {c.expiresAt ? (
                    <span className="text-neutral-500"> · токен до {new Date(c.expiresAt).toLocaleString("ru-RU")}</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={busyId === c.id}
                  onClick={() => void disconnect(c.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Отключить
                </button>
              </div>
            ))}
          </div>
        ) : st.kind === "ok" ? (
          <p className="text-sm text-neutral-600">Нет подключений. Нажмите «Подключить».</p>
        ) : null}
      </div>
    </section>
  );
}

