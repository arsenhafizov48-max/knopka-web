"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

import {
  buildSnapshot,
  deltaPercent,
  getRollingPeriodLastDays,
} from "@/app/app/lib/data/compute";
import { listDaily } from "@/app/app/lib/data/storage";
import {
  describeProductService,
  getFactStatus,
  loadProjectFact,
  type ProjectFact,
} from "@/app/app/lib/projectFact";
import { getStrategyGaps } from "@/app/app/lib/strategy/gaps";
import { loadStrategy } from "@/app/app/lib/strategy/storage";

function formatInt(n: number) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(n));
}

function formatMoneyRub(n: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDeltaPct(current: number, previous: number): string | null {
  const d = deltaPercent(current, previous);
  if (d === null) return null;
  const pct = Math.round(d * 100);
  if (pct === 0) return "без изменений к прошлому периоду";
  return `${pct > 0 ? "+" : ""}${pct}% к прошлому периоду`;
}

function toneFromDelta(current: number, previous: number): "good" | "warn" | "neutral" {
  const d = deltaPercent(current, previous);
  if (d === null) return "neutral";
  if (d > 0) return "good";
  if (d < 0) return "warn";
  return "neutral";
}

function StatCard({
  title,
  value,
  sub,
  subTone = "neutral",
}: {
  title: string;
  value: string;
  sub?: string;
  subTone?: "neutral" | "good" | "warn";
}) {
  const toneClass =
    subTone === "good"
      ? "text-emerald-600"
      : subTone === "warn"
        ? "text-orange-600"
        : "text-neutral-500";

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="text-xs text-neutral-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {sub ? <div className={`mt-1 text-xs ${toneClass}`}>{sub}</div> : null}
    </div>
  );
}

function daysBetweenIso(a: string, b: string) {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  const A = new Date(y1, (m1 || 1) - 1, d1 || 1).getTime();
  const B = new Date(y2, (m2 || 1) - 1, d2 || 1).getTime();
  return Math.round((B - A) / (1000 * 60 * 60 * 24));
}

export default function DashboardLiveBlocks() {
  const [fact, setFact] = useState<ProjectFact>(() => loadProjectFact());
  /** Счётчик перерисовки после событий (данные/стратегия), без мемоизации снимка */
  const [rev, setRev] = useState(0);

  const bump = useCallback(() => setRev((t) => t + 1), []);

  useEffect(() => {
    const onFact = () => setFact(loadProjectFact());
    const onDaily = () => bump();
    const onStr = () => bump();
    window.addEventListener("knopka:projectFactUpdated", onFact);
    window.addEventListener("knopka:dailyDataUpdated", onDaily);
    window.addEventListener("knopka:strategyUpdated", onStr);
    return () => {
      window.removeEventListener("knopka:projectFactUpdated", onFact);
      window.removeEventListener("knopka:dailyDataUpdated", onDaily);
      window.removeEventListener("knopka:strategyUpdated", onStr);
    };
  }, [bump]);

  const snap = buildSnapshot(getRollingPeriodLastDays(30));
  void rev;

  const leadsMetric =
    snap.current.sum.funnelNewLeads > 0
      ? { value: snap.current.sum.funnelNewLeads, label: "Лиды (воронка)" as const }
      : { value: snap.current.sum.leads, label: "Лиды (каналы)" as const };

  const dealsMetric = snap.current.sum.sales + snap.current.sum.funnelClosedWon;
  const prevLeads =
    snap.current.sum.funnelNewLeads > 0 ? snap.previous.sum.funnelNewLeads : snap.previous.sum.leads;
  const prevDeals = snap.previous.sum.sales + snap.previous.sum.funnelClosedWon;

  const gaps = getStrategyGaps(fact);
  const { missing, missingCount } = getFactStatus();
  const strategyDoc = loadStrategy();

  const daily = listDaily();
  const latest = daily[0]?.date;
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  let dataReminder: { stale: boolean; text: string };
  if (!latest) {
    dataReminder = { stale: true, text: "Дневные данные ещё не вносились — зайдите в «Данные»." };
  } else {
    const diff = daysBetweenIso(latest, iso);
    if (diff > 7) {
      dataReminder = {
        stale: true,
        text: `Последний день в данных: ${latest} (${diff} дн. назад). Обновите «Данные».`,
      };
    } else {
      dataReminder = { stale: false, text: `Последнее обновление данных: ${latest}.` };
    }
  }

  const productLine = describeProductService(fact) || "—";
  const goalLine = fact.goal?.trim() || fact.goals?.join(", ") || "—";

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title={leadsMetric.label}
          value={formatInt(leadsMetric.value)}
          sub={formatDeltaPct(leadsMetric.value, prevLeads) ?? undefined}
          subTone={toneFromDelta(leadsMetric.value, prevLeads)}
        />
        <StatCard
          title="Сделки"
          value={formatInt(dealsMetric)}
          sub={formatDeltaPct(dealsMetric, prevDeals) ?? undefined}
          subTone={toneFromDelta(dealsMetric, prevDeals)}
        />
        <StatCard
          title="Выручка"
          value={formatMoneyRub(snap.current.sum.revenue)}
          sub={formatDeltaPct(snap.current.sum.revenue, snap.previous.sum.revenue) ?? undefined}
          subTone={toneFromDelta(snap.current.sum.revenue, snap.previous.sum.revenue)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="text-sm font-semibold">Сводка по фактуре</div>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-neutral-500">Проект</dt>
                <dd className="font-medium text-neutral-900">{fact.projectName?.trim() || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Ниша</dt>
                <dd className="font-medium text-neutral-900">{fact.niche?.trim() || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">География</dt>
                <dd className="font-medium text-neutral-900">{fact.geo?.trim() || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Цель</dt>
                <dd className="font-medium text-neutral-900">{goalLine}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-neutral-500">Продукт / услуги</dt>
                <dd className="font-medium text-neutral-900">{productLine}</dd>
              </div>
            </dl>
            <Link href="/app/fact" className="mt-4 inline-block text-xs font-medium text-blue-700 hover:underline">
              Открыть фактуру →
            </Link>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="text-sm font-semibold">Что сделать дальше</div>
            <div className="mt-1 text-xs text-neutral-500">
              Пробелы для стратегии и следующий шаг по кабинету.
            </div>
            <ul className="mt-3 space-y-2">
              {!gaps.ok ? (
                gaps.items.slice(0, 6).map((it) => (
                  <li key={it.href + it.label}>
                    <Link href={it.href} className="text-sm text-blue-700 hover:underline">
                      {it.label}
                    </Link>
                  </li>
                ))
              ) : strategyDoc ? (
                <li className="text-sm text-neutral-700">
                  Стратегия сохранена — можно уточнить формулировки и опереться на неё в отчётах.{" "}
                  <Link href="/app/strategy" className="font-medium text-blue-700 hover:underline">
                    Открыть стратегию →
                  </Link>
                </li>
              ) : (
                <li className="text-sm text-neutral-700">
                  Соберите стратегию из фактуры — это займёт пару минут.{" "}
                  <Link href="/app/strategy" className="font-medium text-blue-700 hover:underline">
                    Перейти к стратегии →
                  </Link>
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MessageCircle className="h-4 w-4 text-neutral-600" />
              ИИ-разбор
            </div>
            <p className="mt-2 text-sm text-neutral-700">
              Автоматических выводов по цифрам пока нет — это честная заглушка. Когда подключим модель, ответы
              будут опираться на фактуру, стратегию и дневные данные.
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              Уже сейчас можно открыть боковой чат: кнопка{" "}
              <span className="font-medium text-neutral-800">«Чат с ИИ»</span> в шапке кабинета.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="text-sm font-semibold">Быстрые действия</div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Link
                href="/app/data"
                className="rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50"
              >
                <div className="text-sm font-medium">Внести данные за день</div>
                <div className="mt-1 text-xs text-neutral-500">Лиды, воронка, выручка — основа дашборда.</div>
              </Link>
              <Link
                href="/app/channels"
                className="rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50"
              >
                <div className="text-sm font-medium">Каналы</div>
                <div className="mt-1 text-xs text-neutral-500">Сверить расходы и заявки по источникам.</div>
              </Link>
              <Link
                href="/app/reports"
                className="rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50"
              >
                <div className="text-sm font-medium">Отчёты</div>
                <div className="mt-1 text-xs text-neutral-500">Период и динамика по внесённым метрикам.</div>
              </Link>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="text-sm font-semibold">Заметки</div>
            <div className="mt-1 text-xs text-neutral-500">До трёх пробелов в фактуре + напоминание по данным.</div>
            <ul className="mt-3 space-y-2 text-sm text-neutral-700">
              {missingCount === 0 ? (
                <li className="text-emerald-700">Ключевые поля фактуры заполнены.</li>
              ) : (
                missing.slice(0, 3).map((m) => (
                  <li key={m}>
                    <Link href="/app/onboarding/step-1" className="text-blue-700 hover:underline">
                      {m}
                    </Link>
                  </li>
                ))
              )}
            </ul>
            <div
              className={`mt-4 rounded-xl border p-3 text-xs ${
                dataReminder.stale
                  ? "border-amber-200 bg-amber-50 text-amber-950"
                  : "border-neutral-200 bg-neutral-50 text-neutral-700"
              }`}
            >
              {dataReminder.text}
            </div>
            {dataReminder.stale ? (
              <Link
                href="/app/data"
                className="mt-3 inline-block text-xs font-medium text-blue-700 hover:underline"
              >
                Перейти в «Данные» →
              </Link>
            ) : null}
          </div>
        </aside>
      </div>
    </>
  );
}
