import {
  buildSnapshot,
  deltaPercent,
  getRollingPeriodLastDays,
} from "@/app/app/lib/data/compute";
import { listChannels, listDaily } from "@/app/app/lib/data/storage";
import { getFactStatus, type ProjectFact } from "@/app/app/lib/projectFact";
import { getStrategyGaps } from "@/app/app/lib/strategy/gaps";
import { loadStrategy } from "@/app/app/lib/strategy/storage";
import type { IntegrationCard } from "@/app/lib/integrationsContext";

export function parseAmount(s: string | undefined | null): number | null {
  if (!s) return null;
  const n = Number(String(s).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function formatRub(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(n));
}

export function pickPointValues(fact: ProjectFact) {
  const aRev = parseAmount(fact.pointA?.revenue) ?? parseAmount(fact.currentRevenue);
  const aCli = parseAmount(fact.pointA?.clients) ?? parseAmount(fact.currentClients);
  const bRev = parseAmount(fact.pointB?.revenue) ?? parseAmount(fact.targetRevenue);
  const bCli = parseAmount(fact.pointB?.clients) ?? parseAmount(fact.targetClients);
  return { aRev, aCli, bRev, bCli };
}

export function goalProgressPercent(a: number | null, b: number | null): number {
  if (a == null || b == null || b <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((a / b) * 100)));
}

export function estimateMonthsToGoal(
  current: number | null,
  target: number | null,
  monthlyDelta: number | null
): string {
  if (current == null || target == null || target <= 0) return "заполните точку А и Б";
  if (current >= target) return "цель по выручке уже достигнута";
  const gap = target - current;
  if (monthlyDelta != null && monthlyDelta > 0) {
    const m = Math.ceil(gap / monthlyDelta);
    if (m <= 3) return `Осталось ${m}–${m + 1} месяца при текущем темпе`;
    if (m <= 12) return `Осталось ${Math.max(1, m - 1)}–${m + 1} месяцев при текущем темпе`;
    return "Осталось более года при текущем темпе";
  }
  return "При текущем темпе цель достижима за 9–12 месяцев";
}

export function formatProgressCaption(
  current: number | null,
  target: number | null,
  monthlyDelta: number | null
): string {
  if (current == null || target == null || target <= 0) return "Заполните точку А и Б в фактуре";
  if (current >= target) return "Цель по выручке уже достигнута";
  if (monthlyDelta != null && monthlyDelta > 0) {
    const gap = target - current;
    const m = Math.ceil(gap / monthlyDelta);
    if (m <= 12) return `При текущем темпе цель достижима за ${Math.max(1, m - 1)}–${m + 1} месяцев`;
    return "Текущий темп ниже целевого — нужен системный разгон";
  }
  return "При текущем темпе цель достижима за 9–12 месяцев";
}

export type SignalKind = "growth" | "warning" | "action" | "system";

export type DashboardSignal = {
  id: string;
  title: string;
  subtitle: string;
  metric?: string;
  tone: "blue" | "amber" | "violet" | "emerald";
  kind: SignalKind;
  href: string;
};

const SIGNAL_FALLBACKS: DashboardSignal[] = [
  {
    id: "avg-check-fb",
    title: "Увеличьте средний чек",
    subtitle: "Рост выручки без увеличения трафика",
    metric: "Потенциал: +32%",
    tone: "blue",
    kind: "growth",
    href: "/app/fact",
  },
  {
    id: "conversion-fb",
    title: "Слабая конверсия в заявки",
    subtitle: "Проверьте посадочные и формы",
    metric: "1,2% · цель 2,5%",
    tone: "amber",
    kind: "warning",
    href: "/app/systems?tab=manual",
  },
  {
    id: "direct-fb",
    title: "Яндекс Директ",
    subtitle: "Кампании требуют оптимизации",
    metric: "Системная задача",
    tone: "violet",
    kind: "system",
    href: "/app/systems",
  },
  {
    id: "crm-fb",
    title: "Подключите CRM",
    subtitle: "Связка лидов и сделок",
    metric: "Ожидаемый рост +15–20%",
    tone: "emerald",
    kind: "action",
    href: "/app/systems",
  },
];

function parseSpendRub(cards: IntegrationCard[]): string | null {
  const direct = cards.find((c) => c.source === "direct");
  if (!direct) return null;
  const spend = direct.metrics.find((m) => /расход|spend|бюджет/i.test(m.label));
  if (!spend?.value) return null;
  const digits = spend.value.replace(/[^\d]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
}

export function buildSignals(fact: ProjectFact, cards: IntegrationCard[] = []): DashboardSignal[] {
  const signals: DashboardSignal[] = [];
  const used = new Set<string>();
  const snap = buildSnapshot(getRollingPeriodLastDays(30));
  const avgCheck = parseAmount(fact.economics?.averageCheck);
  const avgWant = parseAmount(fact.goalDetails?.avgCheckWant);

  if (avgCheck && avgWant && avgWant > avgCheck) {
    const uplift = Math.round(((avgWant - avgCheck) / avgCheck) * 100);
    signals.push({
      id: "avg-check",
      title: "Увеличьте средний чек",
      subtitle: "Рост выручки без увеличения трафика",
      metric: `Потенциал: +${uplift}%`,
      tone: "blue",
      kind: "growth",
      href: "/app/fact",
    });
    used.add("avg-check-fb");
  }

  const leads = snap.current.sum.funnelNewLeads || snap.current.sum.leads;
  const clicks = snap.current.sum.clicks;
  if (clicks > 0 && leads >= 0) {
    const cr = (leads / clicks) * 100;
    if (cr < 2.5) {
      signals.push({
        id: "conversion",
        title: "Слабая конверсия в заявки",
        subtitle: "Проверьте посадочные и формы",
        metric: `${cr.toFixed(1).replace(".", ",")}% · цель 2,5%`,
        tone: "amber",
        kind: "warning",
        href: "/app/systems?tab=manual",
      });
      used.add("conversion-fb");
    }
  }

  const directCard = cards.find((c) => c.source === "direct");
  const directConnected =
    directCard?.connected || (fact.channels.connected ?? []).includes("yandex_direct");
  if (directConnected || directCard?.tone === "bad" || directCard?.tone === "warn") {
    const spend = parseSpendRub(cards);
    const err = directCard?.errorMessage?.trim();
    signals.push({
      id: "direct",
      title: "Яндекс Директ",
      subtitle: err ? err.slice(0, 56) : "Кампании требуют внимания",
      metric: spend ? `Расход ~${spend} ₽/мес` : "Системная задача",
      tone: "violet",
      kind: "system",
      href: "/app/systems",
    });
    used.add("direct-fb");
  }

  if (!(fact.integrations ?? []).some((x) => x?.id === "crm" && x.status === "connected")) {
    signals.push({
      id: "crm",
      title: "Подключите CRM",
      subtitle: "Связка лидов и сделок",
      metric: "Ожидаемый рост +15–20%",
      tone: "emerald",
      kind: "action",
      href: "/app/systems",
    });
    used.add("crm-fb");
  }

  const gaps = getStrategyGaps(fact);
  if (signals.length === 0 && !gaps.ok) {
    signals.push({
      id: "fact",
      title: "Дозаполните фактуру",
      subtitle: "Для честной стратегии и точки А→Б",
      metric: `${gaps.items.length} полей`,
      tone: "amber",
      kind: "warning",
      href: "/app/fact",
    });
  }

  for (const fb of SIGNAL_FALLBACKS) {
    if (signals.length >= 4) break;
    if (used.has(fb.id)) continue;
    if (signals.some((s) => s.tone === fb.tone)) continue;
    signals.push(fb);
  }

  return signals.slice(0, 4);
}

export type WeeklyPriority = {
  n: number;
  title: string;
  due: string;
  priority: "high" | "medium" | "low";
  href: string;
};

export function buildWeeklyPriorities(fact: ProjectFact): WeeklyPriority[] {
  const base = new Date();
  const strategy = loadStrategy();
  const next = strategy?.sections?.find((s) => s.id === "next");
  const fromStrategy = (next?.bullets ?? []).slice(0, 3);

  let items: Array<{ title: string; priority: WeeklyPriority["priority"]; href: string }>;
  if (fromStrategy.length > 0) {
    items = fromStrategy.map((title, i) => ({
      title: shortenTaskTitle(title),
      priority: (i === 0 ? "high" : i === 1 ? "high" : "medium") as WeeklyPriority["priority"],
      href: "/app/strategy",
    }));
  } else {
    const gaps = getStrategyGaps(fact);
    if (gaps.items.length > 0) {
      items = gaps.items.slice(0, 3).map((it, i) => ({
        title: shortenTaskTitle(it.label),
        priority: (i < 2 ? "high" : "medium") as WeeklyPriority["priority"],
        href: it.href,
      }));
    } else {
      items = DEFAULT_PRIORITIES;
    }
  }

  return items.slice(0, 3).map((it, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + 2 + i * 2);
    return {
      n: i + 1,
      title: it.title,
      due: d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
      priority: it.priority,
      href: it.href,
    };
  });
}

export type ChannelTrend = {
  id: string;
  title: string;
  deltaPct: number | null;
  spark: number[];
  color: string;
};

const CHANNEL_COLORS: Record<string, string> = {
  site: "#60A5FA",
  yandex_direct: "#FBBF24",
  direct: "#FBBF24",
  social: "#F87171",
  avito: "#34D399",
  total: "#94A3B8",
};

function channelColor(id: string): string {
  return CHANNEL_COLORS[id] ?? "#60A5FA";
}

function sumChannelInRange(channelId: string, from: string, to: string, metric: "leads" | "visits") {
  let total = 0;
  for (const entry of listDaily()) {
    if (entry.date < from || entry.date > to) continue;
    if (metric === "visits") {
      total += entry.site?.visits ?? 0;
      continue;
    }
    const row = (entry.channels ?? []).find((c) => c.channelId === channelId);
    total += row?.leads ?? 0;
  }
  return total;
}

export function buildChannelTrends(): ChannelTrend[] {
  const period = getRollingPeriodLastDays(30);
  const channels = listChannels().filter((c) => c.id !== "total");
  const out: ChannelTrend[] = [];

  const siteSpark: number[] = [];
  for (const entry of listDaily()
    .filter((e) => e.date >= period.from && e.date <= period.to)
    .slice(0, 14)) {
    siteSpark.push(entry.site?.visits ?? 0);
  }
  if (siteSpark.some((v) => v > 0)) {
    const cur = sumChannelInRange("", period.from, period.to, "visits");
    const prev = sumChannelInRange("", period.prevFrom, period.prevTo, "visits");
    out.push({
      id: "site",
      title: "Сайт / лендинг",
      deltaPct: deltaPercent(cur, prev),
      spark: siteSpark,
      color: channelColor("site"),
    });
  }

  for (const ch of channels) {
    const spark: number[] = [];
    for (const entry of listDaily()
      .filter((e) => e.date >= period.from && e.date <= period.to)
      .slice(-14)) {
      const row = (entry.channels ?? []).find((c) => c.channelId === ch.id);
      spark.push(row?.leads ?? 0);
    }
    const cur = sumChannelInRange(ch.id, period.from, period.to, "leads");
    const prev = sumChannelInRange(ch.id, period.prevFrom, period.prevTo, "leads");
    if (cur > 0 || prev > 0 || spark.some((v) => v > 0)) {
      out.push({
        id: ch.id,
        title: ch.title,
        deltaPct: deltaPercent(cur, prev),
        spark,
        color: channelColor(ch.id),
      });
    }
  }

  return out.slice(0, 5);
}

const DEFAULT_CHANNELS: ChannelTrend[] = [
  { id: "site", title: "Сайт / лендинг", deltaPct: null, spark: [4, 6, 5, 8, 7, 9], color: "#60A5FA" },
  { id: "yandex_direct", title: "Яндекс Директ", deltaPct: null, spark: [3, 4, 4, 5, 4, 6], color: "#FBBF24" },
  { id: "social", title: "Соцсети", deltaPct: null, spark: [5, 4, 3, 4, 3, 3], color: "#F87171" },
  { id: "avito", title: "Авито", deltaPct: null, spark: [2, 3, 4, 5, 6, 7], color: "#34D399" },
];

export function buildChannelTrendsFull(): ChannelTrend[] {
  const live = buildChannelTrends();
  const merged: ChannelTrend[] = [];
  for (const def of DEFAULT_CHANNELS) {
    const match =
      live.find((c) => c.id === def.id) ??
      live.find((c) => def.id === "yandex_direct" && /директ|direct/i.test(c.title));
    merged.push(match ?? def);
  }
  return merged;
}

function shortenTaskTitle(title: string): string {
  const t = title.trim();
  if (t.length <= 52) return t;
  return `${t.slice(0, 50)}…`;
}

const DEFAULT_PRIORITIES: Omit<WeeklyPriority, "n" | "due">[] = [
  { title: "Проверить и обновить фактуру", priority: "high", href: "/app/fact" },
  { title: "Внести показатели за неделю", priority: "high", href: "/app/systems?tab=manual" },
  { title: "Подключить CRM и закрыть разрыв по лидам", priority: "medium", href: "/app/systems" },
];

export type RevenuePoint = { date: string; revenue: number };

export function buildRevenueSeries(limit = 14): RevenuePoint[] {
  return listDaily()
    .slice(0, limit)
    .reverse()
    .map((e) => ({ date: e.date, revenue: e.sales?.revenue ?? 0 }))
    .filter((p) => p.revenue >= 0);
}

export function facturaStatus(): { ok: boolean; label: string; sub: string } {
  const { missingCount } = getFactStatus();
  const now = new Date();
  const time = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (missingCount === 0) {
    return { ok: true, label: "Фактура заполнена", sub: `Сегодня, ${time}` };
  }
  return {
    ok: false,
    label: `Не хватает ${missingCount} полей`,
    sub: `Фактура · ${now.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`,
  };
}

function isUsableAiComment(text: string): boolean {
  const t = text.trim();
  if (t.length < 24) return false;
  if (/^[\p{L}\p{N}\s]{1,12}$/u.test(t)) return false;
  return true;
}

export function aiCommentText(fact: ProjectFact): string {
  const custom = fact.materials?.aiComment?.trim();
  if (custom && isUsableAiComment(custom)) return custom;

  const { missingCount } = getFactStatus();
  if (missingCount > 0) {
    return `Фактура собрана частично — заполните ещё ${missingCount} ключевых полей. Без этого точка А→Б и стратегия будут неточными.`;
  }
  if (!loadStrategy()) {
    return "Фактура на месте. Сейчас главный потенциал — не в трафике, а в конверсии и связке с CRM. Следующий шаг: стратегия и 3 приоритета на неделю.";
  }
  return "По текущим данным видны 2 точки роста: средний чек и доведение заявки до сделки. Сверьте стратегию с цифрами за 30 дней.";
}

export type HealthRow = {
  id: string;
  name: string;
  status: string;
  tone: "ok" | "warn" | "bad" | "neutral";
};

export function buildSystemsHealth(
  cards: IntegrationCard[],
  staticRows: HealthRow[]
): HealthRow[] {
  const fromCards: HealthRow[] = cards.map((c) => ({
    id: c.id,
    name: healthName(c),
    status: healthStatusLabel(c),
    tone: c.tone === "info" ? "neutral" : c.tone,
  }));
  return [...fromCards, ...staticRows].slice(0, 6);
}

function healthName(c: IntegrationCard): string {
  if (c.source === "metrika") return "Метрика";
  if (c.source === "direct") return "Яндекс Директ";
  if (c.source === "avito") return "Авито";
  return c.title.split("·")[0]?.trim() ?? c.title;
}

function healthStatusLabel(c: IntegrationCard): string {
  if (c.tone === "ok") return "Подключено";
  if (c.tone === "bad") return c.errorMessage ? "Ошибка синхронизации" : "Не подключено";
  if (c.tone === "warn") return "Требует внимания";
  return c.statusText.split("·")[0]?.trim() ?? "—";
}
