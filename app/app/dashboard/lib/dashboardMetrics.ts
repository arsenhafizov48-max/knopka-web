import {
  buildSnapshot,
  deltaPercent,
  getRollingPeriodLastDays,
} from "@/app/app/lib/data/compute";
import { listChannels, listDaily } from "@/app/app/lib/data/storage";
import { getFactStatus, type ProjectFact } from "@/app/app/lib/projectFact";
import { getStrategyGaps } from "@/app/app/lib/strategy/gaps";
import { loadStrategy } from "@/app/app/lib/strategy/storage";

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
    if (m <= 3) return `${m}–${m + 1} мес. при текущем темпе`;
    if (m <= 12) return `${Math.max(1, m - 1)}–${m + 1} мес. при текущем темпе`;
    return "более года при текущем темпе";
  }
  return "9–12 мес. — укажите данные за несколько недель для точной оценки";
}

export type DashboardSignal = {
  id: string;
  title: string;
  subtitle: string;
  tone: "blue" | "amber" | "violet" | "emerald";
  href: string;
};

export function buildSignals(fact: ProjectFact): DashboardSignal[] {
  const signals: DashboardSignal[] = [];
  const snap = buildSnapshot(getRollingPeriodLastDays(30));
  const { aRev, bRev, aCli, bCli } = pickPointValues(fact);
  const avgCheck = parseAmount(fact.economics?.averageCheck);
  const avgWant = parseAmount(fact.goalDetails?.avgCheckWant);

  if (avgCheck && avgWant && avgWant > avgCheck) {
    const uplift = Math.round(((avgWant - avgCheck) / avgCheck) * 100);
    signals.push({
      id: "avg-check",
      title: "Увеличьте средний чек",
      subtitle: `Цель +${uplift}% к текущему чеку — потенциал роста выручки без роста трафика`,
      tone: "blue",
      href: "/app/fact",
    });
  }

  const leads = snap.current.sum.funnelNewLeads || snap.current.sum.leads;
  const clicks = snap.current.sum.clicks;
  if (clicks > 0 && leads >= 0) {
    const cr = (leads / clicks) * 100;
    if (cr < 2.5) {
      signals.push({
        id: "conversion",
        title: "Слабая конверсия в заявки",
        subtitle: `Сейчас ~${cr.toFixed(1)}% клик→лид за 30 дней — проверьте посадочные и формы`,
        tone: "amber",
        href: "/app/systems?tab=manual",
      });
    }
  }

  const gaps = getStrategyGaps(fact);
  const directGap = gaps.items.find((i) => i.label.toLowerCase().includes("канал"));
  if (directGap || (fact.channels.connected ?? []).includes("yandex_direct")) {
    signals.push({
      id: "direct",
      title: "Яндекс Директ",
      subtitle: "Проверьте кампании и синхронизацию в «Системах» — структура и расходы для отчётов",
      tone: "violet",
      href: "/app/systems",
    });
  }

  if (!(fact.integrations ?? []).some((x) => x?.id === "crm" && x.status === "connected")) {
    signals.push({
      id: "crm",
      title: "Подключите CRM",
      subtitle: "Связка лидов и сделок даст честную воронку в дашборде и стратегии",
      tone: "emerald",
      href: "/app/systems",
    });
  }

  if (signals.length === 0 && !gaps.ok) {
    signals.push({
      id: "fact",
      title: "Дозаполните фактуру",
      subtitle: `${gaps.items.length} полей для честной стратегии и точки А→Б`,
      tone: "amber",
      href: "/app/fact",
    });
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
  const strategy = loadStrategy();
  const next = strategy?.sections?.find((s) => s.id === "next");
  const fromStrategy = (next?.bullets ?? []).slice(0, 3);
  if (fromStrategy.length > 0) {
    const base = new Date();
    return fromStrategy.map((title, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + 2 + i * 2);
      return {
        n: i + 1,
        title,
        due: d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
        priority: i === 0 ? "high" : i === 1 ? "high" : "medium",
        href: "/app/strategy",
      };
    });
  }

  const gaps = getStrategyGaps(fact);
  const base = new Date();
  return gaps.items.slice(0, 3).map((it, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + 3 + i * 2);
    return {
      n: i + 1,
      title: it.label,
      due: d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
      priority: i < 2 ? "high" : "medium",
      href: it.href,
    };
  });
}

export type ChannelTrend = {
  id: string;
  title: string;
  deltaPct: number | null;
  spark: number[];
};

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
      });
    }
  }

  return out.slice(0, 5);
}

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
  const sub = `Бизнес-фактура · ${now.toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })}`;
  if (missingCount === 0) {
    return { ok: true, label: "Фактура заполнена", sub };
  }
  return { ok: false, label: `Не хватает ${missingCount} полей`, sub };
}

export function aiCommentText(fact: ProjectFact): string {
  const custom = fact.materials?.aiComment?.trim();
  if (custom) return custom;
  const { missingCount } = getFactStatus();
  const gaps = getStrategyGaps(fact);
  if (missingCount > 0) {
    return `Фактура собрана частично — заполните ещё ${missingCount} ключевых полей, чтобы точка А→Б и стратегия были честными. Начните с шага онбординга или раздела «Фактура».`;
  }
  if (!loadStrategy()) {
    return "Отлично: базовая фактура на месте. Следующий шаг — собрать стратегию роста и выбрать 3 приоритета на неделю. Могу помочь сформулировать гипотезы по каналам.";
  }
  return "Стратегия уже есть — сверьте её с данными за последние 30 дней и обновите приоритеты, если изменились каналы или цели.";
}
