export type ChannelDef = {
  id: string;
  title: string;
  isCustom?: boolean;
};

export type DailyChannelMetrics = {
  channelId: string;
  impressions: number;
  clicks: number;
  spend: number;
  leads: number;
};

export type SiteMetrics = {
  visits: number;
  bounceRate: number; // %
  avgTimeSec: number; // секунды
  depth: number; // страниц
};

export type SalesMetrics = {
  sql: number;
  sales: number;
  revenue: number;
};

/** Звонки, переписка, прочие расходы вне рекламных каналов */
export type OutreachMetrics = {
  calls: number;
  messages: number;
  otherExpenses: number;
};

/** Этапы воронки продаж за день (ручной ввод) */
export type FunnelMetrics = {
  newLeads: number;
  qualified: number;
  inProgress: number;
  closedWon: number;
};

export type DailyEntryV2 = {
  date: string; // YYYY-MM-DD
  channels: DailyChannelMetrics[];
  site?: SiteMetrics;
  sales?: SalesMetrics;
  outreach?: OutreachMetrics;
  funnel?: FunnelMetrics;
  /** Заметки к дню */
  notes?: string;
};

export const KEY_DAILY_V2 = "knopka.data.daily.v2";
const KEY_DAILY_V1 = "knopka.data.daily.v1";
export const KEY_DATA_CHANNELS = "knopka.data.channels.v1";

const DEFAULT_CHANNELS: ChannelDef[] = [
  { id: "avito", title: "Авито" },
  { id: "yandex_direct", title: "Яндекс Директ" },
  { id: "tg_ads", title: "Реклама в Телеграм" },
  { id: "vk_ads", title: "Реклама ВК" },
  { id: "rsy", title: "РСЯ" },
  { id: "bloggers", title: "Блогеры" },
];


function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toNum(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function slugify(input: string) {
  const s = input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9а-яё-]/gi, "")
    .replace(/-+/g, "-");
  return s || "kanal";
}

export function listChannels(): ChannelDef[] {
  if (!isBrowser()) return DEFAULT_CHANNELS;

  const custom = safeParse<ChannelDef[]>(localStorage.getItem(KEY_DATA_CHANNELS), []);
  const merged = [...DEFAULT_CHANNELS];

  for (const c of custom) {
    if (!c?.id || !c?.title) continue;
    if (!merged.some((x) => x.id === c.id)) merged.push({ ...c, isCustom: true });
  }

  return merged;
}

export function addCustomChannel(title: string): ChannelDef | null {
  if (!isBrowser()) return null;

  const t = String(title || "").trim();
  if (!t) return null;

  const existing = listChannels();
  let id = slugify(t);

  // уникальность
  if (existing.some((c) => c.id === id)) {
    let i = 2;
    while (existing.some((c) => c.id === `${id}-${i}`)) i += 1;
    id = `${id}-${i}`;
  }

  const custom = safeParse<ChannelDef[]>(localStorage.getItem(KEY_DATA_CHANNELS), []);
  const ch: ChannelDef = { id, title: t, isCustom: true };
  custom.push(ch);
  localStorage.setItem(KEY_DATA_CHANNELS, JSON.stringify(custom));

  return ch;
}

export function removeCustomChannel(id: string) {
  if (!isBrowser()) return;

  const custom = safeParse<ChannelDef[]>(localStorage.getItem(KEY_DATA_CHANNELS), []);
  const next = custom.filter((c) => c.id !== id);
  localStorage.setItem(KEY_DATA_CHANNELS, JSON.stringify(next));
}

function migrateV1toV2(): DailyEntryV2[] {
  if (!isBrowser()) return [];

  const v1 = safeParse<any[]>(localStorage.getItem(KEY_DAILY_V1), []);
  if (!Array.isArray(v1) || v1.length === 0) return [];

  // кладём старые значения в канал "Общий"
  const migrated: DailyEntryV2[] = v1
    .map((r) => {
      const date = String(r?.date || "").slice(0, 10);
      if (!date) return null;

      const channels: DailyChannelMetrics[] = [
        {
          channelId: "total",
          impressions: toNum(r?.impressions),
          clicks: toNum(r?.clicks),
          spend: toNum(r?.spend),
          leads: toNum(r?.leads),
        },
      ];

      const sales: SalesMetrics = {
        sql: toNum(r?.sql),
        sales: toNum(r?.sales),
        revenue: toNum(r?.revenue),
      };

      return { date, channels, sales };
    })
    .filter(Boolean) as DailyEntryV2[];

  // добавим канал "Общий" в кастомные, чтобы он нормально отображался
  const channels = listChannels();
  if (!channels.some((c) => c.id === "total")) {
    const custom = safeParse<ChannelDef[]>(localStorage.getItem(KEY_DATA_CHANNELS), []);
    custom.push({ id: "total", title: "Общий", isCustom: true });
    localStorage.setItem(KEY_DATA_CHANNELS, JSON.stringify(custom));
  }

  localStorage.setItem(KEY_DAILY_V2, JSON.stringify(migrated));
  return migrated;
}

export function listDaily(): DailyEntryV2[] {
  if (!isBrowser()) return [];

  const v2 = safeParse<DailyEntryV2[]>(localStorage.getItem(KEY_DAILY_V2), []);
  if (Array.isArray(v2) && v2.length > 0) {
    return v2.slice().sort((a, b) => (a.date > b.date ? -1 : 1));
  }

  const migrated = migrateV1toV2();
  return migrated.slice().sort((a, b) => (a.date > b.date ? -1 : 1));
}

export function getDaily(date: string): DailyEntryV2 | null {
  const all = listDaily();
  return all.find((x) => x.date === date) ?? null;
}

export function upsertDaily(entry: DailyEntryV2) {
  if (!isBrowser()) return;

  const all = listDaily();
  const next = all.filter((x) => x.date !== entry.date);
  next.unshift(entry);
  localStorage.setItem(KEY_DAILY_V2, JSON.stringify(next));
  window.dispatchEvent(new Event("knopka:dailyDataUpdated"));
}

export function deleteDaily(date: string) {
  if (!isBrowser()) return;
  const all = listDaily();
  const next = all.filter((x) => x.date !== date);
  localStorage.setItem(KEY_DAILY_V2, JSON.stringify(next));
}
export const KEY_HIDDEN_CHANNELS = "knopka.data.channels.hidden.v1";

export function listHiddenChannelIds(): string[] {
  if (!isBrowser()) return [];
  const ids = safeParse<string[]>(localStorage.getItem(KEY_HIDDEN_CHANNELS), []);
  return Array.isArray(ids) ? ids.filter(Boolean) : [];
}

export function hideChannel(id: string) {
  if (!isBrowser()) return;
  const ids = new Set(listHiddenChannelIds());
  ids.add(id);
  localStorage.setItem(KEY_HIDDEN_CHANNELS, JSON.stringify(Array.from(ids)));
}

export function showChannel(id: string) {
  if (!isBrowser()) return;
  const ids = listHiddenChannelIds().filter((x) => x !== id);
  localStorage.setItem(KEY_HIDDEN_CHANNELS, JSON.stringify(ids));
}
