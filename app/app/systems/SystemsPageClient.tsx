"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BrandIcon from "@/app/components/BrandIcon";

import type { IntegrationPanelsPayload, IntegrationTone } from "@/app/lib/integrationsPanels";

import { IntegrationsRefreshButton } from "@/app/app/systems/IntegrationsRefreshButton";
import { AvitoIntegrationRow } from "@/app/app/systems/AvitoIntegrationRow";
import { YandexDirectIntegrationRow } from "@/app/app/systems/YandexDirectIntegrationRow";
import { YandexMetrikaIntegrationRow } from "@/app/app/systems/YandexMetrikaIntegrationRow";
import { resolveSameOriginApiUrl } from "@/app/lib/publicBasePath";

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

function Dot({ tone }: { tone: IntegrationTone }) {
  const c =
    tone === "ok"
      ? "bg-green-500"
      : tone === "warn"
        ? "bg-amber-500"
        : tone === "bad"
          ? "bg-rose-500"
          : "bg-blue-500";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${c}`} />;
}

type IconMeta = {
  slug: string;
  color: string;
  tint: string;
  fallback: string;
};

type Item = {
  name: string;
  sub: string;
  status: Status;
  statusText: string;
  meta: string;
  icon: IconMeta;
};

const integrations: Item[] = [
  {
    name: "Google Analytics / GA4",
    sub: "Аналитика сайта",
    status: "disconnected",
    statusText: "Не подключено",
    meta: "Данные не используются",
    icon: {
      slug: "googleanalytics",
      color: "#111827",
      tint: "bg-neutral-50 text-neutral-700 border-neutral-100",
      fallback: "G",
    },
  },
  {
    name: "Яндекс Вебмастер",
    sub: "Поисковая выдача",
    status: "connected",
    statusText: "Подключено",
    meta: "Проверка: 1 день назад",
    icon: {
      slug: "yandex",
      color: "#2563eb",
      tint: "bg-blue-50 text-blue-700 border-blue-100",
      fallback: "Я",
    },
  },
  {
    name: "Google Search Console",
    sub: "Поисковая выдача",
    status: "disconnected",
    statusText: "Не подключено",
    meta: "Часть органики не видна",
    icon: {
      slug: "googlesearchconsole",
      color: "#111827",
      tint: "bg-neutral-50 text-neutral-700 border-neutral-100",
      fallback: "G",
    },
  },
  {
    name: "Авито",
    sub: "Площадка / лиды",
    status: "partial",
    statusText: "Подключено частично",
    meta: "Нет связи с CRM по сделкам",
    icon: {
      slug: "avito",
      color: "#f59e0b",
      tint: "bg-amber-50 text-amber-700 border-amber-100",
      fallback: "A",
    },
  },
];

const crm: Item[] = [
  {
    name: "amoCRM",
    sub: "Основная CRM",
    status: "connected",
    statusText: "Подключено",
    meta: "Передаются сделки и этапы",
    icon: {
      slug: "amocrm",
      color: "#2563eb",
      tint: "bg-blue-50 text-blue-700 border-blue-100",
      fallback: "a",
    },
  },
  {
    name: "Битрикс24",
    sub: "CRM / продажи",
    status: "disconnected",
    statusText: "Не подключено",
    meta: "Можно подключить при необходимости",
    icon: {
      slug: "bitrix24",
      color: "#111827",
      tint: "bg-neutral-50 text-neutral-700 border-neutral-100",
      fallback: "Б",
    },
  },
  {
    name: "YClients",
    sub: "Онлайн-запись / салоны",
    status: "connected",
    statusText: "Подключено",
    meta: "Записи и визиты передаются",
    icon: {
      slug: "yclients",
      color: "#2563eb",
      tint: "bg-blue-50 text-blue-700 border-blue-100",
      fallback: "Y",
    },
  },
  {
    name: "Офлайн-выручка",
    sub: "Касса / 1C / Excel",
    status: "manual",
    statusText: "Только импорт вручную",
    meta: "Загрузите файл или подключите кассу",
    icon: {
      slug: "cashapp",
      color: "#f59e0b",
      tint: "bg-amber-50 text-amber-700 border-amber-100",
      fallback: "₽",
    },
  },
];

const HISTORY_VISIBLE_DEFAULT = 4;

export function SystemsPageClient() {
  const [panels, setPanels] = useState<IntegrationPanelsPayload | null>(null);
  const [panelsErr, setPanelsErr] = useState<string | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  useEffect(() => {
    let alive = true;
    const loadPanels = () => {
      fetch(resolveSameOriginApiUrl("/api/integrations/panels"), { credentials: "include" })
        .then(async (res) => {
          const j = (await res.json()) as IntegrationPanelsPayload & { error?: string };
          if (!alive) return;
          if (!res.ok) {
            setPanelsErr(j.error || `HTTP ${res.status}`);
            return;
          }
          setPanels(j);
          setPanelsErr(null);
        })
        .catch((e: unknown) => {
          if (!alive) return;
          setPanelsErr(e instanceof Error ? e.message : "Не удалось загрузить блоки");
        });
    };
    loadPanels();
    window.addEventListener("knopka:integrationsRefresh", loadPanels);
    return () => {
      alive = false;
      window.removeEventListener("knopka:integrationsRefresh", loadPanels);
    };
  }, []);

  const IconBox = ({ icon }: { icon: IconMeta }) => (
    <div className={`grid h-9 w-9 place-items-center rounded-xl border ${icon.tint}`}>
      <BrandIcon slug={icon.slug} className="h-5 w-5" color={icon.color} fallbackText={icon.fallback} />
    </div>
  );

  const knopkaSees = panels?.knopkaSees ?? [];
  const priorities = panels?.priorities ?? [];
  const history = panels?.history ?? [];
  const usedInReports = panels?.usedInReports ?? [];

  const historyVisible = useMemo(() => {
    if (historyExpanded || history.length <= HISTORY_VISIBLE_DEFAULT) return history;
    return history.slice(0, HISTORY_VISIBLE_DEFAULT);
  }, [history, historyExpanded]);

  const historyMoreCount = Math.max(0, history.length - HISTORY_VISIBLE_DEFAULT);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Системы и данные</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Статус интеграций</h2>
              <IntegrationsRefreshButton />
            </div>

            <div className="mt-4 space-y-2">
              <YandexMetrikaIntegrationRow />
              {integrations.slice(0, 3).map((x) => (
                <div
                  key={x.name}
                  className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-3"
                >
                  <div className="flex items-center gap-3">
                    <IconBox icon={x.icon} />

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium">{x.name}</div>
                        <div className="text-xs text-neutral-500">{x.sub}</div>
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">{x.meta}</div>
                    </div>
                  </div>

                  <StatusPill status={x.status} text={x.statusText} />
                </div>
              ))}
              <YandexDirectIntegrationRow />
              <AvitoIntegrationRow />
              {integrations.slice(3).map((x) => (
                <div
                  key={x.name}
                  className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-3"
                >
                  <div className="flex items-center gap-3">
                    <IconBox icon={x.icon} />

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium">{x.name}</div>
                        <div className="text-xs text-neutral-500">{x.sub}</div>
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">{x.meta}</div>
                    </div>
                  </div>

                  <StatusPill status={x.status} text={x.statusText} />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-semibold">CRM и офлайн-данные</h2>

            <div className="mt-4 space-y-2">
              {crm.map((x) => (
                <div
                  key={x.name}
                  className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-3"
                >
                  <div className="flex items-center gap-3">
                    <IconBox icon={x.icon} />

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium">{x.name}</div>
                        <div className="text-xs text-neutral-500">{x.sub}</div>
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">{x.meta}</div>
                    </div>
                  </div>

                  <StatusPill status={x.status} text={x.statusText} />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-semibold">Какие данные КНОПКА реально использует в отчётах</h2>
            <p className="mt-1 text-xs text-neutral-600">
              Если источник не подключён, эти показатели будут считаться неточно или вообще не появятся.
            </p>

            <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200">
              <div className="grid grid-cols-[220px_1fr_120px] bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-600">
                <div>Показатель</div>
                <div>Источник</div>
                <div className="text-right">Статус</div>
              </div>

              <div className="divide-y divide-neutral-200">
                {panelsErr ? (
                  <div className="px-3 py-3 text-sm text-rose-600">{panelsErr}</div>
                ) : !panels ? (
                  <div className="px-3 py-3 text-sm text-neutral-500">Загрузка…</div>
                ) : (
                  usedInReports.map((r) => (
                    <div
                      key={r.kpi}
                      className="grid grid-cols-[220px_1fr_120px] items-center gap-3 px-3 py-3 text-sm"
                    >
                      <div className="font-medium">{r.kpi}</div>
                      <div className="text-sm text-neutral-600">{r.sources}</div>
                      <div className="flex items-center justify-end gap-2">
                        <Dot tone={r.status} />
                        <span className="text-xs font-medium text-neutral-700">{r.statusText}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-semibold">Что КНОПКА видит по данным сейчас</h2>
            {panelsErr ? (
              <p className="mt-3 text-sm text-rose-600">{panelsErr}</p>
            ) : !panels ? (
              <p className="mt-3 text-sm text-neutral-500">Загрузка…</p>
            ) : (
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-neutral-700">
                {knopkaSees.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-semibold">Приоритетные задачи по данным (предлагает КНОПКА)</h2>

            {panelsErr ? (
              <p className="mt-3 text-sm text-rose-600">{panelsErr}</p>
            ) : !panels ? (
              <p className="mt-3 text-sm text-neutral-500">Загрузка…</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm text-neutral-700">
                {priorities.map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-neutral-400" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4">
              <Link href="/app/setup" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Открыть пошаговый чек-лист по настройке данных →
              </Link>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <h2 className="text-base font-semibold">История подключений и ошибок</h2>
            <p className="mt-1 text-xs text-neutral-600">
              События копятся в журнале и не пропадают после удачных попыток. Время в МСК. По умолчанию
              видно {HISTORY_VISIBLE_DEFAULT} последних — остальные можно раскрыть.
            </p>

            <div className="mt-4 space-y-2">
              {panelsErr ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-900">
                  {panelsErr}
                </div>
              ) : !panels ? (
                <div className="text-sm text-neutral-500">Загрузка…</div>
              ) : history.length === 0 ? (
                <div className="text-sm text-neutral-500">
                  Пока нет событий — появятся после подключений и синхронизаций.
                </div>
              ) : (
                <>
                  {historyVisible.map((h) => (
                    <div
                      key={h.id}
                      className="rounded-xl border border-neutral-200 bg-white px-3 py-3"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Dot tone={h.tone} />
                        <span>{h.title}</span>
                      </div>
                      <div className="mt-1 text-xs text-neutral-600">{h.text}</div>
                    </div>
                  ))}
                  {historyMoreCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => setHistoryExpanded((v) => !v)}
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-800 hover:bg-neutral-100"
                    >
                      {historyExpanded
                        ? "Свернуть список"
                        : `Показать ещё (${historyMoreCount})`}
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
