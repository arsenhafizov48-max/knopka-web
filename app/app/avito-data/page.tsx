"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import type { AvitoSnapshotPayloadV1 } from "@/app/lib/avitoSync";
import { resolveSameOriginApiUrl, withBasePath } from "@/app/lib/publicBasePath";

function fmtInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(n));
}

function AvitoDataInner() {
  const searchParams = useSearchParams();
  const connectionId = searchParams.get("connectionId")?.trim() ?? "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [payload, setPayload] = useState<AvitoSnapshotPayloadV1 | null>(null);

  useEffect(() => {
    let alive = true;
    const qs = connectionId ? `?connectionId=${encodeURIComponent(connectionId)}` : "";
    fetch(resolveSameOriginApiUrl(`/api/avito/snapshot${qs}`), { credentials: "include" })
      .then(async (res) => {
        const j = (await res.json()) as {
          error?: string;
          hint?: string;
          syncedAt?: string | null;
          payload?: AvitoSnapshotPayloadV1 | null;
        };
        if (!alive) return;
        if (!res.ok) {
          setErr(j.hint || j.error || `HTTP ${res.status}`);
          setLoading(false);
          return;
        }
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
  }, [connectionId]);

  const items = [...(payload?.items ?? [])].sort((a, b) => (b.uniqViews ?? 0) - (a.uniqViews ?? 0));
  const totals = payload?.totals;

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-6 py-6">
      <Link
        href={withBasePath("/app/integration-data")}
        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft className="h-4 w-4" /> Все интеграции
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Авито — объявления и статистика</h1>
      <p className="text-sm text-neutral-600">
        Просмотры и контакты за период из API Авито. Синхронизация — в «Системы и данные».
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
              {payload ? ` · период ${payload.dateFrom} – ${payload.dateTo}` : null}
            </div>
          ) : null}

          {totals ? (
            <section className="grid gap-3 sm:grid-cols-4">
              {[
                { label: "Объявлений", value: fmtInt(totals.itemsListed) },
                { label: "Просмотры (уник.)", value: fmtInt(totals.uniqViews) },
                { label: "Контакты (уник.)", value: fmtInt(totals.uniqContacts) },
                { label: "В избранное", value: fmtInt(totals.uniqFavorites) },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border border-neutral-200 bg-white p-4">
                  <div className="text-xs text-neutral-500">{m.label}</div>
                  <div className="mt-1 text-xl font-semibold">{m.value}</div>
                </div>
              ))}
            </section>
          ) : (
            <p className="text-sm text-neutral-600">Нет снимка — нажмите «Синхронизировать» в «Системах».</p>
          )}

          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold">
              Объявления
            </div>
            {items.length === 0 ? (
              <div className="p-4 text-sm text-neutral-600">Список пуст.</div>
            ) : (
              <div className="max-h-[min(70vh,720px)] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 border-b border-neutral-200 bg-white text-xs text-neutral-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Название</th>
                      <th className="px-4 py-2 font-medium">Статус</th>
                      <th className="px-4 py-2 font-medium">Просмотры</th>
                      <th className="px-4 py-2 font-medium">Контакты</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {items.map((it) => (
                      <tr key={it.id}>
                        <td className="px-4 py-2">
                          {it.url ? (
                            <a href={it.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                              {it.title ?? `#${it.id}`}
                            </a>
                          ) : (
                            (it.title ?? `#${it.id}`)
                          )}
                        </td>
                        <td className="px-4 py-2 text-neutral-600">{it.status ?? "—"}</td>
                        <td className="px-4 py-2">{fmtInt(it.uniqViews)}</td>
                        <td className="px-4 py-2">{fmtInt(it.uniqContacts)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default function AvitoDataPage() {
  return (
    <Suspense
      fallback={<AvitoDataFallback />}
    >
      <AvitoDataInner />
    </Suspense>
  );
}

function AvitoDataFallback() {
  return <div className="mx-auto max-w-[1100px] px-6 py-6 text-sm text-neutral-600">Загрузка…</div>;
}
