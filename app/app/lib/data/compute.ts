import { listDaily, type DailyEntryV2 } from "./storage";

type PeriodPreset = "day" | "week" | "month" | "quarter" | "custom";

export type PeriodRange = {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  prevFrom: string; // YYYY-MM-DD
  prevTo: string; // YYYY-MM-DD
};

export type SumTotals = {
  impressions: number;
  clicks: number;
  leads: number;
  sql: number;
  sales: number;
  spend: number;
  revenue: number;
};

export type DerivedTotals = {
  cpc: number | null;
  cpl: number | null;
  crClickToLead: number | null;
  crLeadToSale: number | null;
  aov: number | null;
};

export type Snapshot = {
  sum: SumTotals;
  derived: DerivedTotals;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseISO(date: string) {
  // YYYY-MM-DD → локальная дата без времени
  const [y, m, dd] = date.split("-").map((x) => Number(x));
  return new Date(y, (m || 1) - 1, dd || 1);
}

function addDays(date: string, days: number) {
  const d = parseISO(date);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

function startOfWeek(date: string) {
  const d = parseISO(date);
  const day = d.getDay(); // 0 вс … 6 сб
  const diff = day === 0 ? -6 : 1 - day; // понедельник
  d.setDate(d.getDate() + diff);
  return toISO(d);
}

function endOfWeek(date: string) {
  const s = startOfWeek(date);
  return addDays(s, 6);
}

function startOfMonth(date: string) {
  const d = parseISO(date);
  d.setDate(1);
  return toISO(d);
}

function endOfMonth(date: string) {
  const d = parseISO(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return toISO(d);
}

function startOfQuarter(date: string) {
  const d = parseISO(date);
  const q = Math.floor(d.getMonth() / 3);
  d.setMonth(q * 3, 1);
  return toISO(d);
}

function endOfQuarter(date: string) {
  const d = parseISO(date);
  const q = Math.floor(d.getMonth() / 3);
  d.setMonth(q * 3 + 3, 0); // последний день квартала
  return toISO(d);
}

function daysBetweenInclusive(from: string, to: string) {
  const a = parseISO(from);
  const b = parseISO(to);
  const ms = b.getTime() - a.getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  return days + 1;
}

function safeDiv(n: number, d: number) {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
  return n / d;
}

function derived(sum: SumTotals): DerivedTotals {
  return {
    cpc: safeDiv(sum.spend, sum.clicks),
    cpl: safeDiv(sum.spend, sum.leads),
    crClickToLead: safeDiv(sum.leads, sum.clicks),
    crLeadToSale: safeDiv(sum.sales, sum.leads),
    aov: safeDiv(sum.revenue, sum.sales),
  };
}

function inRange(date: string, from: string, to: string) {
  return date >= from && date <= to;
}

function sumEntry(entry: DailyEntryV2): SumTotals {
  const ch = entry.channels || [];
  const impressions = ch.reduce((acc, x) => acc + (x.impressions || 0), 0);
  const clicks = ch.reduce((acc, x) => acc + (x.clicks || 0), 0);
  const spend = ch.reduce((acc, x) => acc + (x.spend || 0), 0);
  const leads = ch.reduce((acc, x) => acc + (x.leads || 0), 0);

  const sql = entry.sales?.sql || 0;
  const sales = entry.sales?.sales || 0;
  const revenue = entry.sales?.revenue || 0;

  return { impressions, clicks, leads, sql, sales, spend, revenue };
}

function sumRange(from: string, to: string): Snapshot {
  const all = listDaily();
  const total: SumTotals = {
    impressions: 0,
    clicks: 0,
    leads: 0,
    sql: 0,
    sales: 0,
    spend: 0,
    revenue: 0,
  };

  for (const e of all) {
    if (!e?.date) continue;
    if (!inRange(e.date, from, to)) continue;

    const s = sumEntry(e);
    total.impressions += s.impressions;
    total.clicks += s.clicks;
    total.leads += s.leads;
    total.sql += s.sql;
    total.sales += s.sales;
    total.spend += s.spend;
    total.revenue += s.revenue;
  }

  return { sum: total, derived: derived(total) };
}

export function getPeriodRange(args: {
  preset: PeriodPreset;
  baseDate?: string; // YYYY-MM-DD
  customFrom?: string;
  customTo?: string;
}): PeriodRange {
  const today = toISO(new Date());
  const base = args.baseDate || today;

  let from = base;
  let to = base;

  if (args.preset === "day") {
    from = base;
    to = base;
  }

  if (args.preset === "week") {
    from = startOfWeek(base);
    to = endOfWeek(base);
  }

  if (args.preset === "month") {
    from = startOfMonth(base);
    to = endOfMonth(base);
  }

  if (args.preset === "quarter") {
    from = startOfQuarter(base);
    to = endOfQuarter(base);
  }

  if (args.preset === "custom") {
    from = args.customFrom || base;
    to = args.customTo || base;
  }

  // прошлый период той же длины
  const len = daysBetweenInclusive(from, to);
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(len - 1));

  return { from, to, prevFrom, prevTo };
}

export function buildSnapshot(range: PeriodRange) {
  const current = sumRange(range.from, range.to);
  const previous = sumRange(range.prevFrom, range.prevTo);
  return { range, current, previous };
}

export function deltaPercent(current: number | null, previous: number | null) {
  if (current === null || previous === null) return null;
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return null;
  return (current - previous) / previous;
}
