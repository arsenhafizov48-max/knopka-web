"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  ChevronRight,
  Megaphone,
  Rocket,
  Sparkles,
  Store,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

import type { IntegrationCard } from "@/app/lib/integrationsContext";
import { resolveSameOriginApiUrl, withBasePath } from "@/app/lib/publicBasePath";
import { buildSnapshot, getRollingPeriodLastDays } from "@/app/app/lib/data/compute";
import { loadProjectFact, type ProjectFact } from "@/app/app/lib/projectFact";
import { getStrategyGaps } from "@/app/app/lib/strategy/gaps";
import { loadStrategy } from "@/app/app/lib/strategy/storage";

import {
  aiCommentText,
  buildChannelTrends,
  buildRevenueSeries,
  buildSignals,
  buildWeeklyPriorities,
  estimateMonthsToGoal,
  facturaStatus,
  formatInt,
  formatRub,
  goalProgressPercent,
  pickPointValues,
} from "./lib/dashboardMetrics";

function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[#12192B]/90 shadow-[0_8px_32px_rgba(0,0,0,0.25)] ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 72;
  const h = 28;
  const max = Math.max(...values, 1);
  const pts =
    values.length < 2
      ? `0,${h / 2} ${w},${h / 2}`
      : values
          .map((v, i) => {
            const x = (i / (values.length - 1)) * w;
            const y = h - (v / max) * (h - 4) - 2;
            return `${x},${y}`;
          })
          .join(" ");

  return (
    <svg width={w} height={h} className="shrink-0 overflow-visible">
      <polyline fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" points={pts} />
    </svg>
  );
}

function RevenueChart({ points }: { points: { date: string; revenue: number }[] }) {
  const w = 280;
  const h = 100;
  const max = Math.max(...points.map((p) => p.revenue), 1);
  const path =
    points.length < 2
      ? ""
      : points
          .map((p, i) => {
            const x = (i / (points.length - 1)) * w;
            const y = h - (p.revenue / max) * (h - 8) - 4;
            return `${i === 0 ? "M" : "L"}${x},${y}`;
          })
          .join(" ");
  const last = points[points.length - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-[100px] w-full">
        {path ? (
          <>
            <path d={`${path} L${w},${h} L0,${h} Z`} fill="rgba(59,130,246,0.15)" />
            <path d={path} fill="none" stroke="#60A5FA" strokeWidth="2.5" />
          </>
        ) : null}
      </svg>
      {last ? (
        <p className="mt-1 text-[11px] text-slate-400">
          Последняя точка: {formatRub(last.revenue)} · {last.date}
        </p>
      ) : (
        <p className="mt-1 text-[11px] text-slate-500">Внесите выручку в «Системы и данные» → ручной ввод</p>
      )}
    </div>
  );
}

const SIGNAL_CLS = {
  blue: "text-sky-400 bg-sky-500/15",
  amber: "text-amber-400 bg-amber-500/15",
  violet: "text-violet-400 bg-violet-500/15",
  emerald: "text-emerald-400 bg-emerald-500/15",
} as const;

export default function DashboardControlCenter() {
  const [fact, setFact] = useState<ProjectFact>(() => loadProjectFact());
  const [rev, setRev] = useState(0);
  const [cards, setCards] = useState<IntegrationCard[]>([]);

  const reload = useCallback(() => {
    setFact(loadProjectFact());
    setRev((t) => t + 1);
  }, []);

  useEffect(() => {
    const onFact = () => reload();
    const onData = () => setRev((t) => t + 1);
    window.addEventListener("knopka:projectFactUpdated", onFact);
    window.addEventListener("knopka:dailyDataUpdated", onData);
    window.addEventListener("knopka:strategyUpdated", onData);
    window.addEventListener("knopka:integrationsRefresh", onData);
    return () => {
      window.removeEventListener("knopka:projectFactUpdated", onFact);
      window.removeEventListener("knopka:dailyDataUpdated", onData);
      window.removeEventListener("knopka:strategyUpdated", onData);
      window.removeEventListener("knopka:integrationsRefresh", onData);
    };
  }, [reload]);

  useEffect(() => {
    fetch(resolveSameOriginApiUrl("/api/integrations/overview"), { credentials: "include" })
      .then(async (res) => {
        const j = (await res.json()) as { cards?: IntegrationCard[] };
        if (res.ok && Array.isArray(j.cards)) setCards(j.cards);
      })
      .catch(() => {});
  }, [rev]);

  void rev;

  const { aRev, aCli, bRev, bCli } = pickPointValues(fact);
  const progress = Math.max(goalProgressPercent(aRev, bRev), goalProgressPercent(aCli, bCli));
  const snap = buildSnapshot(getRollingPeriodLastDays(30));
  const monthlyRevDelta = snap.current.sum.revenue - snap.previous.sum.revenue;
  const monthsLine = estimateMonthsToGoal(aRev, bRev, monthlyRevDelta > 0 ? monthlyRevDelta : null);

  const factura = facturaStatus();
  const signals = buildSignals(fact);
  const priorities = buildWeeklyPriorities(fact);
  const channelTrends = buildChannelTrends();
  const revenueSeries = buildRevenueSeries(14);
  const gaps = getStrategyGaps(fact);
  const hasStrategy = Boolean(loadStrategy());
  const comment = aiCommentText(fact);

  const staticIntegrations = useMemo(
    () => [
      { name: "Google Analytics / GA4", status: "Подключить", tone: "warn" as const },
      { name: "Google Search Console", status: "Не подключено", tone: "bad" as const },
    ],
    []
  );

  const openAi = () => window.dispatchEvent(new Event("knopka:openAssistant"));

  return (
    <div className="space-y-5 text-slate-100">
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="relative overflow-hidden p-6 lg:col-span-2">
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Дашборд</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-[1.65rem]">
                Центр управления развитием бизнеса
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    factura.ok ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-200"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${factura.ok ? "bg-emerald-400" : "bg-amber-400"}`} />
                  {factura.label}
                </span>
                <span className="text-xs text-slate-400">{factura.sub}</span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={withBasePath("/app/strategy")}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 hover:opacity-95"
                >
                  <Sparkles className="h-4 w-4" />
                  {hasStrategy ? "Открыть стратегию" : "Создать стратегию"}
                </Link>
                <Link
                  href={withBasePath("/app/plans")}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10"
                >
                  Перейти к плану
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="hidden shrink-0 sm:block">
              <div className="relative rounded-2xl border border-white/10 bg-white/5 p-6">
                <BarChart3 className="h-16 w-16 text-blue-400/80" />
                <TrendingUp className="absolute -bottom-1 -right-1 h-10 w-10 text-violet-400/70" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold text-white">Главные сигналы</h2>
          <ul className="mt-3 space-y-2">
            {signals.map((s) => (
              <li key={s.id}>
                <Link
                  href={withBasePath(s.href)}
                  className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 transition hover:bg-white/[0.06]"
                >
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${SIGNAL_CLS[s.tone]}`}>
                    <Zap className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-100">{s.title}</span>
                    <span className="mt-0.5 block text-xs text-slate-400">{s.subtitle}</span>
                  </span>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-500" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">Точка А → Точка Б</h2>
            <Link href={withBasePath("/app/fact")} className="text-xs font-medium text-blue-400 hover:text-blue-300">
              Изменить
            </Link>
          </div>
          <PointABBlock aRev={aRev} aCli={aCli} bRev={bRev} bCli={bCli} progress={progress} monthsLine={monthsLine} />
        </Card>

        <Card className="flex flex-col p-5">
          <h2 className="text-sm font-semibold text-white">Комментарий КНОПКИ</h2>
          <div className="mt-4 flex flex-1 flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/30 to-violet-500/30 text-2xl">
              🤖
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">{comment}</p>
          </div>
          <button
            type="button"
            onClick={openAi}
            className="mt-4 w-full rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-slate-100 hover:bg-white/10"
          >
            Спросить у ИИ
          </button>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-white">Приоритеты недели</h2>
          {priorities.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Заполните фактуру или соберите стратегию.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {priorities.map((p) => (
                <li key={p.n}>
                  <Link href={withBasePath(p.href)} className="-m-1 flex gap-3 rounded-xl p-1 hover:bg-white/5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-sm font-semibold text-blue-300">
                      {p.n}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-slate-100">{p.title}</span>
                      <span className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                        до {p.due}
                        <span
                          className={
                            p.priority === "high"
                              ? "rounded-full bg-rose-500/20 px-2 py-0.5 text-rose-300"
                              : "rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-200"
                          }
                        >
                          {p.priority === "high" ? "Высокий" : "Средний"}
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-white">Системы и данные</h2>
          <ul className="mt-4 space-y-2.5">
            {cards.map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-sm">
                <IntegrationDot tone={c.tone} />
                <IntegrationIcon source={c.source} />
                <span className="min-w-0 flex-1 truncate text-slate-200">{c.title}</span>
                <span className="shrink-0 text-xs text-slate-500">{c.statusText.split("·")[0]?.trim()}</span>
              </li>
            ))}
            {staticIntegrations.map((row) => (
              <li key={row.name} className="flex items-center gap-2 text-sm">
                <IntegrationDot tone={row.tone} />
                <span className="min-w-0 flex-1 text-slate-200">{row.name}</span>
                <span className="text-xs text-slate-500">{row.status}</span>
              </li>
            ))}
          </ul>
          <Link href={withBasePath("/app/systems")} className="mt-4 inline-flex text-xs font-medium text-blue-400">
            Перейти в «Системы и данные» →
          </Link>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-white">Каналы роста</h2>
          {channelTrends.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Внесите данные по каналам — появятся тренды.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {channelTrends.map((ch) => (
                <li key={ch.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-200">{ch.title}</span>
                  <ChannelTrendCell ch={ch} />
                </li>
              ))}
            </ul>
          )}
          <Link href={withBasePath("/app/channels")} className="mt-4 inline-flex text-xs font-medium text-blue-400">
            Все каналы →
          </Link>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">Последняя динамика</h2>
            <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-400">
              Выручка
            </span>
          </div>
          <div className="mt-3">
            <RevenueChart points={revenueSeries} />
          </div>
          <Link href={withBasePath("/app/systems?tab=manual")} className="mt-3 inline-flex text-xs font-medium text-blue-400">
            Ручной ввод данных →
          </Link>
        </Card>
      </div>

      <Card className="flex flex-col gap-4 border-blue-500/20 bg-gradient-to-r from-[#12192B] to-[#1a1040]/80 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Target className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
          <div>
            <p className="text-sm font-medium text-white">Следующий шаг</p>
            <p className="mt-1 text-sm text-slate-400">
              {!gaps.ok
                ? "Дозаполните фактуру — затем соберите стратегию и двигайтесь к точке Б."
                : hasStrategy
                  ? "Обновите план и приоритеты по свежим данным."
                  : "Создайте стратегию роста на основе фактуры."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={withBasePath("/app/strategy")}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Создать стратегию
          </Link>
          <Link
            href={withBasePath("/app/plans")}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-slate-200"
          >
            Перейти к плану
          </Link>
        </div>
      </Card>
    </div>
  );
}

function PointABBlock({
  aRev,
  aCli,
  bRev,
  bCli,
  progress,
  monthsLine,
}: {
  aRev: number | null;
  aCli: number | null;
  bRev: number | null;
  bCli: number | null;
  progress: number;
  monthsLine: string;
}) {
  return (
    <>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-[#0d1322] p-3">
          <p className="text-xs font-medium text-slate-400">Точка А (сейчас)</p>
          <p className="mt-2 text-xs text-slate-500">Выручка в месяц</p>
          <p className="text-lg font-semibold text-white">{formatRub(aRev)}</p>
          <p className="mt-2 text-xs text-slate-500">Продажи в месяц</p>
          <p className="text-lg font-semibold text-white">{formatInt(aCli)}</p>
        </div>
        <PointBBox bRev={bRev} bCli={bCli} />
      </div>
      <div className="mt-4 flex items-center justify-center gap-2 text-violet-300">
        <Rocket className="h-5 w-5" />
        <span className="text-xs">Путь к цели</span>
      </div>
      <div className="mt-2">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Прогресс</span>
          <span className="font-medium text-slate-200">{progress}%</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">{monthsLine}</p>
      </div>
    </>
  );
}

function PointBBox({ bRev, bCli }: { bRev: number | null; bCli: number | null }) {
  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3">
      <p className="text-xs font-medium text-violet-200/90">Точка Б (цель)</p>
      <p className="mt-2 text-xs text-violet-200/80">Выручка в месяц</p>
      <p className="text-lg font-semibold text-white">{formatRub(bRev)}</p>
      <p className="mt-2 text-xs text-violet-200/80">Продажи в месяц</p>
      <p className="text-lg font-semibold text-white">{formatInt(bCli)}</p>
    </div>
  );
}

function IntegrationDot({ tone }: { tone: IntegrationCard["tone"] }) {
  const c =
    tone === "ok" ? "bg-emerald-400" : tone === "bad" ? "bg-rose-400" : tone === "warn" ? "bg-amber-400" : "bg-slate-500";
  return <span className={`h-2 w-2 shrink-0 rounded-full ${c}`} />;
}

function IntegrationIcon({ source }: { source: IntegrationCard["source"] }) {
  if (source === "metrika") return <BarChart3 className="h-4 w-4 text-sky-400" />;
  if (source === "avito") return <Store className="h-4 w-4 text-orange-400" />;
  return <Megaphone className="h-4 w-4 text-violet-400" />;
}

function ChannelTrendCell({ ch }: { ch: { spark: number[]; deltaPct: number | null } }) {
  return (
    <div className="flex items-center gap-3">
      <Sparkline values={ch.spark.length ? ch.spark : [0, 0]} />
      <span
        className={`text-xs font-medium ${
          ch.deltaPct != null && ch.deltaPct < 0 ? "text-rose-400" : "text-emerald-400"
        }`}
      >
        {ch.deltaPct == null ? "—" : `${ch.deltaPct > 0 ? "+" : ""}${Math.round(ch.deltaPct * 100)}%`}
      </span>
    </div>
  );
}

