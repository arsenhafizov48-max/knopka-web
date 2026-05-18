"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ChevronRight,
  Megaphone,
  MessageSquare,
  Rocket,
  Sparkles,
  Store,
  Target,
  TrendingUp,
} from "lucide-react";

import type { IntegrationCard } from "@/app/lib/integrationsContext";
import { resolveSameOriginApiUrl, withBasePath } from "@/app/lib/publicBasePath";
import { buildSnapshot, getRollingPeriodLastDays } from "@/app/app/lib/data/compute";
import { loadProjectFact, type ProjectFact } from "@/app/app/lib/projectFact";
import { getStrategyGaps } from "@/app/app/lib/strategy/gaps";
import { loadStrategy } from "@/app/app/lib/strategy/storage";

import {
  HeroIllustration,
  KnopkaBotAvatar,
  PointABConnector,
  RevenueChart,
  Sparkline,
} from "./DashboardVisuals";
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
  type ChannelTrend,
  type DashboardSignal,
} from "./lib/dashboardMetrics";

function Card({
  className = "",
  children,
  glow,
}: {
  className?: string;
  children: React.ReactNode;
  glow?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.08] bg-[#0f1528]/95 shadow-[0_8px_40px_rgba(0,0,0,0.35)] ${
        glow ? "shadow-[0_0_40px_rgba(59,130,246,0.08)]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

const SIGNAL_ICON: Record<DashboardSignal["tone"], React.ReactNode> = {
  blue: <TrendingUp className="h-4 w-4" />,
  amber: <AlertTriangle className="h-4 w-4" />,
  violet: <Megaphone className="h-4 w-4" />,
  emerald: <MessageSquare className="h-4 w-4" />,
};

const SIGNAL_CLS: Record<DashboardSignal["tone"], string> = {
  blue: "text-sky-300 bg-sky-500/20 border-sky-500/20",
  amber: "text-amber-300 bg-amber-500/20 border-amber-500/20",
  violet: "text-violet-300 bg-violet-500/20 border-violet-500/20",
  emerald: "text-emerald-300 bg-emerald-500/20 border-emerald-500/20",
};

const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_28px_rgba(59,130,246,0.45)] transition hover:shadow-[0_0_36px_rgba(59,130,246,0.55)] hover:brightness-105";

const BTN_GHOST =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-white/[0.08]";

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
  const signals = buildSignals(fact, cards);
  const priorities = buildWeeklyPriorities(fact);
  const channelTrends = useMemo(() => {
    const live = buildChannelTrends();
    if (live.length > 0) return live;
    return [
      { id: "site", title: "Сайт / лендинг", deltaPct: null, spark: [4, 6, 5, 8, 7, 9], color: "#60A5FA" },
      { id: "yandex_direct", title: "Яндекс Директ", deltaPct: null, spark: [3, 4, 4, 5, 4, 6], color: "#FBBF24" },
      { id: "social", title: "Соцсети", deltaPct: null, spark: [5, 4, 3, 4, 3, 3], color: "#F87171" },
      { id: "avito", title: "Авито", deltaPct: null, spark: [2, 3, 4, 5, 6, 7], color: "#34D399" },
    ] satisfies ChannelTrend[];
  }, [rev]);

  const revenueSeries = buildRevenueSeries(14);
  const gaps = getStrategyGaps(fact);
  const hasStrategy = Boolean(loadStrategy());
  const comment = aiCommentText(fact);

  const staticIntegrations = useMemo(
    () => [
      { name: "Google Analytics / GA4", status: "Подключить", tone: "warn" as const },
      { name: "Google Search Console", status: "Не подключено", tone: "bad" as const },
      { name: "amoCRM", status: "Подключить", tone: "warn" as const },
    ],
    []
  );

  const openAi = () => window.dispatchEvent(new Event("knopka:openAssistant"));

  return (
    <div className="space-y-5 pb-2 text-slate-100">
      {/* Герой */}
      <Card glow className="relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -left-20 top-0 h-56 w-56 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-48 w-48 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Дашборд</p>
            <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-white sm:text-[1.75rem] lg:text-[2rem]">
              Центр управления
              <br className="hidden sm:block" />
              <span className="sm:ml-0"> развитием бизнеса</span>
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                  factura.ok
                    ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
                    : "border-amber-500/30 bg-amber-500/15 text-amber-200"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${factura.ok ? "bg-emerald-400" : "bg-amber-400"}`} />
                {factura.label}
              </span>
              <span className="text-sm text-slate-400">{factura.sub}</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={withBasePath("/app/strategy")} className={BTN_PRIMARY}>
                <Sparkles className="h-4 w-4" />
                {hasStrategy ? "Открыть стратегию" : "Создать стратегию"}
              </Link>
              <Link href={withBasePath("/app/plans")} className={BTN_GHOST}>
                Перейти к плану
                <ArrowRight className="h-4 w-4 opacity-80" />
              </Link>
            </div>
          </div>
          <HeroIllustration />
        </div>
      </Card>

      {/* Точка А → Б · ИИ · Сигналы */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-white">Точка А → Точка Б</h2>
            <Link href={withBasePath("/app/fact")} className="text-xs font-medium text-blue-400 hover:text-blue-300">
              Изменить
            </Link>
          </div>
          <PointABBlock aRev={aRev} aCli={aCli} bRev={bRev} bCli={bCli} progress={progress} monthsLine={monthsLine} />
        </Card>

        <Card className="flex flex-col p-5 sm:p-6">
          <h2 className="text-center text-[15px] font-semibold text-white">Комментарий КНОПКИ</h2>
          <div className="mt-5 flex flex-1 flex-col">
            <KnopkaBotAvatar />
            <p className="mt-5 text-left text-sm leading-relaxed text-slate-300">{comment}</p>
          </div>
          <button type="button" onClick={openAi} className={`mt-5 w-full ${BTN_GHOST}`}>
            Спросить у ИИ
          </button>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold text-white">Главные сигналы</h2>
          <ul className="mt-4 space-y-2.5">
            {signals.map((s) => (
              <li key={s.id}>
                <Link
                  href={withBasePath(s.href)}
                  className="group flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-white/10 hover:bg-white/[0.05]"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${SIGNAL_CLS[s.tone]}`}
                  >
                    {SIGNAL_ICON[s.tone]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-100 group-hover:text-white">
                      {s.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-slate-400">{s.subtitle}</span>
                  </span>
                  <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-600 group-hover:text-slate-400" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Нижний ряд — 4 колонки как на макете */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <h2 className="text-[15px] font-semibold text-white">Системы и данные</h2>
          <ul className="mt-4 space-y-3">
            {cards.map((c) => (
              <li key={c.id} className="flex items-center gap-2.5 text-sm">
                <IntegrationDot tone={c.tone} />
                <IntegrationIcon source={c.source} />
                <span className="min-w-0 flex-1 truncate text-slate-200">{c.title}</span>
                <span className="max-w-[42%] shrink-0 truncate text-right text-xs text-slate-500">
                  {shortStatus(c.statusText)}
                </span>
              </li>
            ))}
            {staticIntegrations.map((row) => (
              <li key={row.name} className="flex items-center gap-2.5 text-sm">
                <IntegrationDot tone={row.tone} />
                <span className="h-4 w-4 shrink-0 rounded bg-white/10" />
                <span className="min-w-0 flex-1 text-slate-200">{row.name}</span>
                <span className="text-xs text-slate-500">{row.status}</span>
              </li>
            ))}
          </ul>
          <Link
            href={withBasePath("/app/systems")}
            className="mt-4 inline-flex text-xs font-medium text-blue-400 hover:text-blue-300"
          >
            Перейти в «Системы и данные» →
          </Link>
        </Card>

        <Card className="p-5">
          <h2 className="text-[15px] font-semibold text-white">Каналы роста</h2>
          <ul className="mt-4 space-y-3.5">
            {channelTrends.map((ch) => (
              <li key={ch.id} className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-200">{ch.title}</span>
                <ChannelTrendCell ch={ch} />
              </li>
            ))}
          </ul>
          <Link
            href={withBasePath("/app/channels")}
            className="mt-4 inline-flex text-xs font-medium text-blue-400 hover:text-blue-300"
          >
            Все каналы →
          </Link>
        </Card>

        <Card className="p-5">
          <h2 className="text-[15px] font-semibold text-white">Приоритеты недели</h2>
          {priorities.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Заполните фактуру или соберите стратегию.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {priorities.map((p) => (
                <li key={p.n}>
                  <Link href={withBasePath(p.href)} className="group -m-1 flex gap-3 rounded-xl p-1 hover:bg-white/5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600/40 to-violet-600/30 text-sm font-bold text-blue-200">
                      {p.n}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-snug text-slate-100 group-hover:text-white">
                        {p.title}
                      </span>
                      <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span>до {p.due}</span>
                        <PriorityBadge priority={p.priority} />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-white">Последняя динамика</h2>
            <span className="rounded-lg border border-white/10 bg-[#1a2540] px-2.5 py-1 text-[11px] font-medium text-slate-300">
              Выручка ▾
            </span>
          </div>
          <div className="mt-3">
            <RevenueChart points={revenueSeries} formatRub={formatRub} />
          </div>
          <Link
            href={withBasePath("/app/systems?tab=manual")}
            className="mt-3 inline-flex text-xs font-medium text-blue-400 hover:text-blue-300"
          >
            Ручной ввод данных →
          </Link>
        </Card>
      </div>

      {/* Футер CTA */}
      <Card className="relative overflow-hidden border-blue-500/25 bg-gradient-to-r from-[#0f1528] via-[#12102a] to-[#0f1528] p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-blue-600/10 to-transparent" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Следующий шаг</p>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-400">
                {!gaps.ok
                  ? "Дозаполните фактуру — затем соберите стратегию роста и зафиксируйте 3 приоритета на неделю."
                  : hasStrategy
                    ? "Обновите план и приоритеты по свежим данным за 30 дней."
                    : "Создайте стратегию роста на основе фактуры и выберите 3 приоритета на неделю."}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href={withBasePath("/app/strategy")} className={BTN_PRIMARY}>
              <Sparkles className="h-4 w-4" />
              Создать стратегию
            </Link>
            <Link href={withBasePath("/app/plans")} className={BTN_GHOST}>
              Перейти к плану
            </Link>
          </div>
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
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="flex-1 rounded-xl border border-white/10 bg-[#0a1020] p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Точка А (сейчас)</p>
          <p className="mt-3 text-[11px] text-slate-500">Выручка в месяц</p>
          <p className="text-xl font-bold text-white">{formatRub(aRev)}</p>
          <p className="mt-2 text-[11px] text-slate-500">Продажи в месяц</p>
          <p className="text-lg font-semibold text-white">{formatInt(aCli)}</p>
        </div>
        <div className="flex items-center justify-center py-1 sm:flex-col sm:py-0">
          <PointABConnector />
          <Rocket className="h-6 w-6 text-violet-400 drop-shadow-[0_0_8px_rgba(139,92,246,0.6)] sm:hidden" />
        </div>
        <div className="flex-1 rounded-xl border border-violet-500/35 bg-gradient-to-br from-violet-600/15 to-blue-600/5 p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-300/90">Точка Б (цель)</p>
          <p className="mt-3 text-[11px] text-violet-200/70">Выручка в месяц</p>
          <p className="text-xl font-bold text-white">{formatRub(bRev)}</p>
          <p className="mt-2 text-[11px] text-violet-200/70">Продажи в месяц</p>
          <p className="text-lg font-semibold text-white">{formatInt(bCli)}</p>
        </div>
      </div>
      <div className="mt-5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-300">Путь к цели</span>
          <span className="font-bold text-white">{progress}%</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-violet-500 shadow-[0_0_12px_rgba(96,165,250,0.5)]"
            style={{ width: `${Math.max(progress, 2)}%` }}
          />
        </div>
        <p className="mt-2.5 text-xs leading-relaxed text-slate-400">{monthsLine}</p>
      </div>
    </>
  );
}

function PriorityBadge({ priority }: { priority: "high" | "medium" | "low" }) {
  if (priority === "high") {
    return (
      <span className="rounded-md bg-violet-600/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200">
        Высокий
      </span>
    );
  }
  if (priority === "medium") {
    return (
      <span className="rounded-md bg-cyan-600/25 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
        Средний
      </span>
    );
  }
  return (
    <span className="rounded-md bg-slate-600/30 px-2 py-0.5 text-[10px] font-medium text-slate-400">Низкий</span>
  );
}

function shortStatus(text: string): string {
  const part = text.split("·")[0]?.trim() ?? text;
  if (part.length > 28) return `${part.slice(0, 26)}…`;
  return part;
}

function IntegrationDot({ tone }: { tone: IntegrationCard["tone"] }) {
  const c =
    tone === "ok"
      ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
      : tone === "bad"
        ? "bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.5)]"
        : tone === "warn"
          ? "bg-amber-400"
          : "bg-slate-500";
  return <span className={`h-2 w-2 shrink-0 rounded-full ${c}`} />;
}

function IntegrationIcon({ source }: { source: IntegrationCard["source"] }) {
  if (source === "metrika") return <BarChart3 className="h-4 w-4 shrink-0 text-sky-400" />;
  if (source === "avito") return <Store className="h-4 w-4 shrink-0 text-emerald-400" />;
  return <Megaphone className="h-4 w-4 shrink-0 text-violet-400" />;
}

function ChannelTrendCell({ ch }: { ch: ChannelTrend }) {
  const pct = ch.deltaPct;
  const positive = pct != null && pct >= 0;
  return (
    <div className="flex items-center gap-2">
      <Sparkline values={ch.spark.length ? ch.spark : [1, 1]} stroke={ch.color} />
      <span
        className={`min-w-[3rem] text-right text-xs font-semibold ${
          pct == null ? "text-slate-500" : positive ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        {pct == null ? "—" : `${positive ? "+" : ""}${Math.round(pct * 100)}%`}
      </span>
    </div>
  );
}
