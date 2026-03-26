"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, Loader2 } from "lucide-react";

import {
  downloadMapsTableCsv,
  downloadSitesTableCsv,
} from "@/app/app/lib/strategy/competitorExport";
import type {
  CompetitorAnalysisPayload,
  CompetitorMapRow,
  CompetitorSiteRow,
} from "@/app/app/lib/strategy/competitorTypes";
import { resolveSameOriginApiUrl } from "@/app/lib/publicBasePath";

function SitesTableReadonly({ rows }: { rows: CompetitorSiteRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-neutral-500">Нет строк «Сайты».</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-xs text-neutral-800">
        <thead>
          <tr>
            {[
              "№",
              "ТОП",
              "Конкурент",
              "Сегмент",
              "Цена-якорь",
              "Позиционирование",
              "Сильные стороны",
              "Слабые места",
              "Источник",
            ].map((c) => (
              <th
                key={c}
                className="border border-neutral-200 bg-neutral-50 px-2 py-2 text-left font-medium"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.num}>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.num}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.top}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.competitor}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.segment}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.priceAnchor}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.positioning}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.strengths}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.weaknesses}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top text-neutral-600">
                {r.source}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MapsTableReadonly({ rows }: { rows: CompetitorMapRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-neutral-500">Нет строк.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse text-xs text-neutral-800">
        <thead>
          <tr>
            {[
              "№",
              "ТОП",
              "Конкурент",
              "Локация",
              "Рейтинг / отзывы",
              "Карточка",
              "Сильная сторона",
              "Куда бить",
              "Источник",
            ].map((c) => (
              <th
                key={c}
                className="border border-neutral-200 bg-neutral-50 px-2 py-2 text-left font-medium"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.num}>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.num}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.top}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.competitor}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.location}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.rating}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.cardSnippet}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.strengthMaps}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.weakness}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top text-neutral-600">
                {r.source}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StrategyHistoryDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [dbMissing, setDbMissing] = useState(false);
  const [dbWarning, setDbWarning] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [payload, setPayload] = useState<CompetitorAnalysisPayload | null>(null);
  const [mapTab, setMapTab] = useState<"yandex" | "gis2">("yandex");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      setDbMissing(false);
      setDbWarning(null);
      try {
        const url = resolveSameOriginApiUrl(`/api/strategy/competitor-runs?id=${encodeURIComponent(id)}`);
        const res = await fetch(url, { credentials: "same-origin" });
        const raw = await res.text();
        let data: {
          error?: string;
          dbMissing?: boolean;
          warning?: string;
          run?: {
            createdAt: string;
            sites: CompetitorSiteRow[];
            yandexMaps: CompetitorMapRow[];
            gis2: CompetitorMapRow[];
          };
        };
        try {
          data = JSON.parse(raw) as typeof data;
        } catch {
          if (!cancelled) setErr("Некорректный ответ сервера");
          return;
        }
        if (!res.ok) {
          if (!cancelled) setErr(data.error || `Ошибка ${res.status}`);
          return;
        }
        if (data.dbMissing) {
          if (!cancelled) {
            setDbMissing(true);
            setDbWarning(
              data.warning ??
                "Таблица истории в Supabase не создана. Сохранённые запуски недоступны; новый анализ в стратегии работает."
            );
          }
          return;
        }
        const run = data.run;
        if (!run) {
          if (!cancelled) setErr("Нет данных");
          return;
        }
        if (!cancelled) {
          setCreatedAt(run.createdAt);
          setPayload({
            sites: run.sites ?? [],
            yandexMaps: run.yandexMaps ?? [],
            gis2: run.gis2 ?? [],
          });
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Ошибка");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const exportBase = () => `konkurenty-${id.slice(0, 8)}`;

  const mapsRows = mapTab === "yandex" ? payload?.yandexMaps ?? [] : payload?.gis2 ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href="/app/strategy/history"
          className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" />
          К списку
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка…
        </div>
      ) : err ? (
        <p className="text-sm text-red-700">{err}</p>
      ) : dbMissing ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
          {dbWarning}
          <span className="mt-2 block">
            <Link href="/app/strategy" className="font-medium text-violet-700 underline underline-offset-2">
              Вернуться к стратегии
            </Link>
          </span>
        </div>
      ) : payload ? (
        <>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Анализ конкурентов</h1>
            {createdAt ? (
              <p className="mt-1 text-sm text-neutral-500">
                {new Date(createdAt).toLocaleString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadSitesTableCsv(payload.sites, exportBase())}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
            >
              <Download className="h-3.5 w-3.5" />
              CSV «Сайты»
            </button>
            <button
              type="button"
              onClick={() => downloadMapsTableCsv(payload.yandexMaps, exportBase(), "yandex")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
            >
              <Download className="h-3.5 w-3.5" />
              CSV «Яндекс.Карты»
            </button>
            <button
              type="button"
              onClick={() => downloadMapsTableCsv(payload.gis2, exportBase(), "gis2")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
            >
              <Download className="h-3.5 w-3.5" />
              CSV «2ГИС»
            </button>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Анализ сайты
            </div>
            <SitesTableReadonly rows={payload.sites} />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Анализ карты
              </div>
              <div className="flex gap-1 rounded-xl border border-neutral-200 bg-neutral-50/80 p-1">
                <button
                  type="button"
                  onClick={() => setMapTab("yandex")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    mapTab === "yandex"
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  Яндекс.Карты
                </button>
                <button
                  type="button"
                  onClick={() => setMapTab("gis2")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    mapTab === "gis2"
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  2ГИС
                </button>
              </div>
            </div>
            <MapsTableReadonly rows={mapsRows} />
          </div>

          <p className="text-sm text-neutral-600">
            Новый анализ с актуальной фактурой — в чате на странице{" "}
            <Link href="/app/strategy" className="font-medium text-violet-700 underline underline-offset-2">
              Стратегия
            </Link>{" "}
            (кнопка «Анализ конкурентов»).
          </p>
        </>
      ) : null}
    </div>
  );
}
