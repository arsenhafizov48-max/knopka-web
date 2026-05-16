"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import type { MetrikaSnapshotPayloadV1 } from "@/app/lib/yandexMetrikaSync";
import { resolveSameOriginApiUrl, withBasePath } from "@/app/lib/publicBasePath";

function fmtInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(n));
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const pct = n <= 1 ? n * 100 : n;
  return `${pct.toFixed(1)}%`;
}

function MetrikaDataInner() {
  const searchParams = useSearchParams();
  const counterRowId = searchParams.get("counterRowId")?.trim() ?? "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [counterId, setCounterId] = useState<number | null>(null);
  const [siteName, setSiteName] = useState<string | null>(null);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [payload, setPayload] = useState<MetrikaSnapshotPayloadV1 | null>(null);

  useEffect(() => {
    let alive = true;
    const qs = counterRowId ? `?counterRowId=${encodeURIComponent(counterRowId)}` : "";
    fetch(resolveSameOriginApiUrl(`/api/yandex-metrika/snapshot${qs}`), { credentials: "include" })
      .then(async (res) => {
        const j = (await res.json()) as {
          error?: string;
          hint?: string;
          counterId?: number;
          siteName?: string | null;
          syncedAt?: string | null;
          payload?: MetrikaSnapshotPayloadV1 | null;
        };
        if (!alive) return;
        if (!res.ok) {
          setErr(j.hint || j.error || `HTTP ${res.status}`);
          setLoading(false);
          return;
        }
        setCounterId(j.counterId ?? null);
        setSiteName(j.siteName ?? null);
        setSyncedAt(j.syncedAt ?? null);
        setPayload(j.payload ?? null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Ошибка загрузки");
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [counterRowId]);

  const t = payload?.totals;
  const sources = payload?.byTrafficSource ?? [];

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-6 py-6">
      <Link
        href={withBasePath("/app/integration-data")}
        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft className="h-4 w-4" /> Все интеграции
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">
        Яндекс Метрика{counterId != null ? ` · #${counterId}` : ""}
      </h1>
      <p className="text-sm text-neutral-600">
        {siteName ? `Сайт: ${siteName}. ` : null}
        Показатели за последние 30 дней из API Метрики.
      </p>

      {loading ? (
        <div className="text-sm text-neutral-600">Загрузка…</div>
      ) : err ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{err}</div>
      ) : (
        <>
          {syncedAt ? (
            <div className="text-xs text-neutral-500">
              Снимок от{" "}
              {new Date(syncedAt).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })}
              {payload ? ` · период ${payload.date1} – ${payload.date2}` : null}
            </div>
          ) : null}

          {t ? (
            <section className="grid gap-3 sm:grid-cols-4">
              {[
                { label: "Визиты", value: fmtInt(t.visits) },
                { label: "Просмотры", value: fmtInt(t.pageviews) },
                { label: "Отказы", value: fmtPct(t.bounceRate) },
                {
                  label: "Время на сайте",
                  value: t.avgVisitDurationSeconds != null ? `${Math.round(t.avgVisitDurationSeconds)} с` : "—",
                },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border border-neutral-200 bg-white p-4">
                  <div className="text-xs text-neutral-500">{m.label}</div>
                  <div className="mt-1 text-xl font-semibold">{m.value}</div>
                </div>
              ))}
            </section>
          ) : (
            <p className="text-sm text-neutral-600">Нет данных — синхронизируйте счётчик в «Системах».</p>
          )}

          {sources.length > 0 ? (
            <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold">
                Источники трафика
              </div>
              <div className="max-h-[min(60vh,480px)] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 border-b border-neutral-200 bg-white text-xs text-neutral-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Источник</th>
                      <th className="px-4 py-2 font-medium">Визиты</th>
                      <th className="px-4 py-2 font-medium">Отказы</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {sources.map((s) => (
                      <tr key={s.source}>
                        <td className="px-4 py-2">{s.source}</td>
                        <td className="px-4 py-2">{fmtInt(s.visits)}</td>
                        <td className="px-4 py-2">{fmtPct(s.bounceRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

export default function MetrikaDataPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1100px] px-6 py-6 text-sm text-neutral-600">Загрузка…</div>}>
      <MetrikaDataInner />
    </Suspense>
  );
}
