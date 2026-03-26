"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Check, Download, Loader2, Users } from "lucide-react";

import type { ProjectFact } from "@/app/app/lib/projectFact";
import { buildStrategyDocument } from "@/app/app/lib/strategy/buildFromFact";
import { applyCompetitorsToStrategy } from "@/app/app/lib/strategy/applyCompetitorsToStrategy";
import {
  channelLabelRu,
  downloadMapsTableCsv,
  downloadSitesTableCsv,
} from "@/app/app/lib/strategy/competitorExport";
import type {
  CompetitorAnalysisPayload,
  CompetitorMapRow,
  CompetitorSiteRow,
} from "@/app/app/lib/strategy/competitorTypes";
import { saveStrategy } from "@/app/app/lib/strategy/storage";
import type { StrategyDocument } from "@/app/app/lib/strategy/types";
import { resolveSameOriginApiUrl } from "@/app/lib/publicBasePath";

type MapTab = "yandex" | "gis2";

const COMPETITOR_PROGRESS_STEPS = [
  "Читаю фактуру бизнеса (ниша, гео, услуги)…",
  "Собираю промпт для GigaChat (сайты, карты)…",
  "Отправляю запрос на сервер…",
  "Жду ответ модели (таблицы «Сайты», «Яндекс.Карты», «2ГИС»)…",
] as const;

type Props = {
  fact: ProjectFact;
  doc: StrategyDocument | null;
  setDoc: (d: StrategyDocument) => void;
  gapsOk: boolean;
};

function UrlCell({ href }: { href: string }) {
  const u = href.trim();
  if (!u || u === "—") return <>—</>;
  const safe = u.startsWith("http") ? u : `https://${u}`;
  return (
    <a href={safe} target="_blank" rel="noopener noreferrer" className="break-all text-[#2563EB] underline">
      {u}
    </a>
  );
}

function SitesTable({ rows }: { rows: CompetitorSiteRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] border-collapse text-xs text-neutral-800">
        <thead>
          <tr>
            {[
              "№",
              "ТОП",
              "Название",
              "Сайт",
              "Сегмент",
              "Цена-якорь",
              "Позиционирование",
              "Сильные стороны",
              "Слабые места",
              "Источник",
              "SEO/реклама",
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
              <td className="border border-neutral-200 px-2 py-2 align-top max-w-[14rem]">
                <UrlCell href={r.siteUrl} />
              </td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.segment}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.priceAnchor}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.positioning}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.strengths}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.weaknesses}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top text-neutral-600">{r.source}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{channelLabelRu(r.channel)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MapsTable({ rows }: { rows: CompetitorMapRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-xs text-neutral-800">
        <thead>
          <tr>
            {[
              "№",
              "ТОП",
              "Название",
              "Ссылка",
              "Локация",
              "★",
              "Оценок",
              "Отзывов",
              "Сводка",
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
              <td className="border border-neutral-200 px-2 py-2 align-top max-w-[12rem]">
                <UrlCell href={r.mapUrl} />
              </td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.location}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.ratingStars}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.ratingsCount}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.reviewsCount}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top text-neutral-600">{r.rating}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.cardSnippet}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.strengthMaps}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top">{r.weakness}</td>
              <td className="border border-neutral-200 px-2 py-2 align-top text-neutral-600">{r.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StrategyCompetitorAnalysis({ fact, doc, setDoc, gapsOk }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [persistWarn, setPersistWarn] = useState<string | null>(null);
  const [data, setData] = useState<CompetitorAnalysisPayload | null>(null);
  const [mapTab, setMapTab] = useState<MapTab>("yandex");
  const [progressPhase, setProgressPhase] = useState(0);

  useEffect(() => {
    if (!loading) {
      setProgressPhase(0);
      return;
    }
    setProgressPhase(0);
    const id = window.setInterval(() => {
      setProgressPhase((p) => (p < COMPETITOR_PROGRESS_STEPS.length - 1 ? p + 1 : p));
    }, 900);
    return () => window.clearInterval(id);
  }, [loading]);

  const baseExportName = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `konkurenty-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  };

  const run = async () => {
    setLoading(true);
    setErr(null);
    setOk(null);
    setPersistWarn(null);
    try {
      const apiUrl = resolveSameOriginApiUrl("/api/strategy/competitor-analyze");
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fact }),
        credentials: "same-origin",
      });
      const rawText = await res.text();
      let json: {
        error?: string;
        warning?: string;
        persisted?: boolean;
        sites?: CompetitorSiteRow[];
        yandexMaps?: CompetitorMapRow[];
        gis2?: CompetitorMapRow[];
        id?: string | null;
      };
      try {
        json = JSON.parse(rawText) as typeof json;
      } catch {
        setErr(rawText.slice(0, 240));
        return;
      }
      if (!res.ok) {
        setErr(json.error || `Ошибка ${res.status}`);
        return;
      }
      if (!json.sites?.length && !json.yandexMaps?.length && !json.gis2?.length) {
        setErr("Пустой ответ модели");
        return;
      }
      const payload: CompetitorAnalysisPayload = {
        sites: json.sites ?? [],
        yandexMaps: json.yandexMaps ?? [],
        gis2: json.gis2 ?? [],
      };
      setData(payload);

      const base = doc ?? buildStrategyDocument(fact);
      const next = applyCompetitorsToStrategy(base, payload);
      saveStrategy(next);
      setDoc(next);
      window.dispatchEvent(new Event("knopka:strategyUpdated"));

      if (json.persisted === false && json.warning) {
        setPersistWarn(json.warning);
        setOk("Таблицы добавлены в раздел стратегии «4. Анализ конкурентов» — ниже можно скачать CSV.");
      } else {
        setOk("Таблицы добавлены в стратегию и сохранены в истории анализов.");
      }
    } finally {
      setLoading(false);
    }
  };

  const mapsRows = mapTab === "yandex" ? data?.yandexMaps ?? [] : data?.gis2 ?? [];

  return (
    <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 to-white p-5 ring-1 ring-emerald-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-neutral-900">Конкуренты (GigaChat)</div>
            <p className="mt-1 max-w-xl text-sm text-neutral-600">
              Запуск добавляет таблицы в документ стратегии (раздел «4. Анализ конкурентов»). Здесь же — превью и CSV.
            </p>
          </div>
        </div>
        <Link
          href="/app/strategy/history"
          className="shrink-0 text-sm font-medium text-emerald-800 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-950"
        >
          История анализов
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!gapsOk || loading}
          onClick={run}
          className="inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
          Запустить анализ конкурентов
        </button>
      </div>

      {!gapsOk ? (
        <p className="mt-3 text-sm text-amber-900/90">
          Сначала заполните обязательные поля фактуры — иначе анализ будет непригоден.
        </p>
      ) : null}

      {err ? <p className="mt-3 text-sm text-red-700">{err}</p> : null}
      {persistWarn ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {persistWarn}
        </p>
      ) : null}
      {ok ? <p className="mt-3 rounded-xl bg-emerald-50/90 px-3 py-2 text-sm text-emerald-950">{ok}</p> : null}

      {loading ? (
        <div className="mt-4 rounded-2xl border border-emerald-300/40 bg-white px-4 py-3 text-left shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-neutral-800">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-700" aria-hidden />
            Идёт анализ конкурентов…
          </div>
          <ol className="space-y-1.5 text-[11px] leading-snug text-neutral-600">
            {COMPETITOR_PROGRESS_STEPS.map((label, i) => {
              const done = i < progressPhase;
              const current = i === progressPhase;
              return (
                <li key={label} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0" aria-hidden>
                    {done ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : current ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-700" />
                    ) : (
                      <span className="inline-block h-3.5 w-3.5 rounded-full border border-neutral-300" />
                    )}
                  </span>
                  <span
                    className={
                      current ? "font-medium text-neutral-900" : done ? "text-neutral-500" : "text-neutral-400"
                    }
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
          {data ? (
            <p className="mt-2 text-[10px] text-neutral-500">
              Таблицы ниже — от прошлого запуска; после ответа они обновятся.
            </p>
          ) : (
            <p className="mt-2 text-[10px] text-neutral-500">
              Обычно 30–90 секунд. Не закрывайте вкладку.
            </p>
          )}
        </div>
      ) : null}

      {data ? (
        <div className="mt-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Анализ сайты</div>
            <button
              type="button"
              disabled={data.sites.length === 0}
              onClick={() => downloadSitesTableCsv(data.sites, baseExportName())}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              CSV (Excel)
            </button>
          </div>
          {data.sites.length === 0 ? (
            <p className="text-sm text-neutral-500">Нет строк «Сайты».</p>
          ) : (
            <SitesTable rows={data.sites} />
          )}

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Анализ карты</div>
              <div className="flex flex-wrap gap-1 rounded-xl border border-neutral-200 bg-neutral-50/80 p-1">
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
              <button
                type="button"
                onClick={() =>
                  downloadMapsTableCsv(mapsRows, baseExportName(), mapTab === "yandex" ? "yandex" : "gis2")
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-50"
              >
                <Download className="h-3.5 w-3.5" />
                CSV (Excel)
              </button>
            </div>
            {mapsRows.length === 0 ? (
              <p className="text-sm text-neutral-500">Нет строк для выбранной вкладки.</p>
            ) : (
              <MapsTable rows={mapsRows} />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
