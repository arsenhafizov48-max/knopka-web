"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { resolveSameOriginApiUrl } from "@/app/lib/publicBasePath";

type CampaignRow = { Id?: number; Name?: string; State?: string; Status?: string; Type?: string };

export default function YandexDirectDataPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [counts, setCounts] = useState<{
    campaigns: number;
    adGroups: number;
    ads: number;
    keywords: number;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(resolveSameOriginApiUrl("/api/yandex-direct/snapshot"), { credentials: "include" })
      .then(async (res) => {
        const j = (await res.json()) as {
          error?: string;
          hint?: string;
          syncedAt?: string;
          payload?: {
            campaigns?: CampaignRow[];
            counts?: typeof counts;
          };
        };
        if (!alive) return;
        if (!res.ok) {
          setErr(j.hint || j.error || `HTTP ${res.status}`);
          setLoading(false);
          return;
        }
        setSyncedAt(j.syncedAt ?? null);
        const p = j.payload;
        setCampaigns(Array.isArray(p?.campaigns) ? p!.campaigns! : []);
        setCounts(p?.counts ?? null);
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
  }, []);

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-6 py-6">
      <div>
        <Link
          href="/app/systems"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" /> Назад к системам и данным
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Яндекс Директ — выгруженная структура</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Данные подтягиваются из API раз в сутки (cron) или по кнопке «Синхронизировать». Здесь — кампании;
          полный JSON содержит группы, объявления и ключевые фразы (для ИИ и отчётов).
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-neutral-600">Загрузка…</div>
      ) : err ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {err}
        </div>
      ) : (
        <>
          {syncedAt ? (
            <div className="text-xs text-neutral-500">
              Снимок от{" "}
              {new Date(syncedAt).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })}
              {counts
                ? ` · кампаний ${counts.campaigns}, групп ${counts.adGroups}, объявлений ${counts.ads}, фраз ${counts.keywords}`
                : null}
            </div>
          ) : null}

          <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold">
              Кампании
            </div>
            {campaigns.length === 0 ? (
              <div className="p-4 text-sm text-neutral-600">В снимке нет кампаний или список пуст.</div>
            ) : (
              <div className="max-h-[min(70vh,720px)] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 border-b border-neutral-200 bg-white text-xs text-neutral-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">ID</th>
                      <th className="px-4 py-2 font-medium">Название</th>
                      <th className="px-4 py-2 font-medium">Тип</th>
                      <th className="px-4 py-2 font-medium">Статус</th>
                      <th className="px-4 py-2 font-medium">Состояние</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {campaigns.map((c, i) => (
                      <tr key={c.Id != null ? String(c.Id) : `row-${i}`}>
                        <td className="px-4 py-2 font-mono text-xs">{c.Id ?? "—"}</td>
                        <td className="px-4 py-2">{c.Name ?? "—"}</td>
                        <td className="px-4 py-2 text-neutral-600">{c.Type ?? "—"}</td>
                        <td className="px-4 py-2 text-neutral-600">{c.Status ?? "—"}</td>
                        <td className="px-4 py-2 text-neutral-600">{c.State ?? "—"}</td>
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
