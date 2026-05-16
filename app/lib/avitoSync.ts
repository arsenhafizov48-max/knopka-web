import type { SupabaseClient } from "@supabase/supabase-js";

import { ensureAvitoAccessToken } from "@/app/lib/avitoEnsureToken";

export type AvitoSnapshotPayloadV1 = {
  version: 1;
  syncedAt: string;
  avitoUserId: number | null;
  dateFrom: string;
  dateTo: string;
  items: Array<{
    id: number;
    title: string | null;
    status: string | null;
    url: string | null;
    category: string | null;
    uniqViews: number | null;
    uniqContacts: number | null;
    uniqFavorites: number | null;
  }>;
  totals: {
    itemsListed: number;
    uniqViews: number;
    uniqContacts: number;
    uniqFavorites: number;
  };
};

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rangeLastDays(days: number): { dateFrom: string; dateTo: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return { dateFrom: isoDate(start), dateTo: isoDate(end) };
}

async function avitoFetch(
  token: string,
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; json: unknown }> {
  const res = await fetch(`https://api.avito.ru${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  return { ok: res.ok, status: res.status, json };
}

async function resolveAvitoUserId(token: string): Promise<number | null> {
  const r = await avitoFetch(token, "/core/v1/accounts/self");
  if (!r.ok || !r.json || typeof r.json !== "object") return null;
  const o = r.json as Record<string, unknown>;
  const id = o.id ?? o.user_id ?? o.userId;
  if (typeof id === "number" && Number.isFinite(id)) return id;
  if (typeof id === "string" && /^\d+$/.test(id)) return Number(id);
  return null;
}

type RawItem = {
  id: number;
  title: string | null;
  status: string | null;
  url: string | null;
  category: string | null;
};

async function fetchItems(token: string, maxPages = 4): Promise<RawItem[]> {
  const out: RawItem[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const r = await avitoFetch(
      token,
      `/core/v1/items?per_page=50&page=${page}&status=active,old,removed,blocked,rejected`
    );
    if (!r.ok) break;
    if (!r.json || typeof r.json !== "object") break;
    const root = r.json as Record<string, unknown>;
    const resources = (root.resources ?? root.items ?? root.result) as unknown;
    if (!Array.isArray(resources) || resources.length === 0) break;

    for (const row of resources) {
      if (!row || typeof row !== "object") continue;
      const it = row as Record<string, unknown>;
      const id = it.id ?? it.item_id;
      const numId = typeof id === "number" ? id : typeof id === "string" ? Number(id) : NaN;
      if (!Number.isFinite(numId)) continue;
      const title =
        typeof it.title === "string"
          ? it.title
          : typeof it.name === "string"
            ? it.name
            : null;
      const status = typeof it.status === "string" ? it.status : null;
      const url = typeof it.url === "string" ? it.url : null;
      let category: string | null = null;
      if (typeof it.category === "string") category = it.category;
      else if (it.category && typeof it.category === "object") {
        const c = it.category as Record<string, unknown>;
        category = typeof c.name === "string" ? c.name : null;
      }
      out.push({ id: numId, title, status, url, category });
    }

    const meta = root.meta as Record<string, unknown> | undefined;
    const lastPage =
      typeof meta?.page_count === "number"
        ? meta.page_count
        : typeof meta?.pages === "number"
          ? meta.pages
          : page;
    if (page >= lastPage) break;
  }
  return out;
}

function sumStatField(stats: unknown, field: string): number {
  if (!stats || typeof stats !== "object") return 0;
  const o = stats as Record<string, unknown>;
  const direct = o[field];
  if (typeof direct === "number") return direct;
  if (Array.isArray(o)) {
    return o.reduce((acc, row) => {
      if (!row || typeof row !== "object") return acc;
      const v = (row as Record<string, unknown>)[field];
      return acc + (typeof v === "number" ? v : 0);
    }, 0);
  }
  return 0;
}

async function fetchStatsForItems(
  token: string,
  userId: number,
  itemIds: number[],
  dateFrom: string,
  dateTo: string
): Promise<Map<number, { uniqViews: number; uniqContacts: number; uniqFavorites: number }>> {
  const map = new Map<number, { uniqViews: number; uniqContacts: number; uniqFavorites: number }>();
  if (itemIds.length === 0) return map;

  const chunkSize = 100;
  for (let i = 0; i < itemIds.length; i += chunkSize) {
    const chunk = itemIds.slice(i, i + chunkSize);
    const r = await avitoFetch(token, `/stats/v1/accounts/${userId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemIds: chunk,
        dateFrom,
        dateTo,
        periodGrouping: "day",
      }),
    });
    if (!r.ok || !r.json || typeof r.json !== "object") continue;
    const root = r.json as Record<string, unknown>;
    const result = (root.result ?? root.items ?? root) as unknown;
    if (Array.isArray(result)) {
      for (const row of result) {
        if (!row || typeof row !== "object") continue;
        const it = row as Record<string, unknown>;
        const id = it.itemId ?? it.item_id ?? it.id;
        const numId = typeof id === "number" ? id : typeof id === "string" ? Number(id) : NaN;
        if (!Number.isFinite(numId)) continue;
        const stats = it.stats ?? it.statistics ?? it;
        map.set(numId, {
          uniqViews: sumStatField(stats, "uniqViews"),
          uniqContacts: sumStatField(stats, "uniqContacts"),
          uniqFavorites: sumStatField(stats, "uniqFavorites"),
        });
      }
    } else if (result && typeof result === "object") {
      for (const [key, val] of Object.entries(result as Record<string, unknown>)) {
        const numId = Number(key);
        if (!Number.isFinite(numId)) continue;
        map.set(numId, {
          uniqViews: sumStatField(val, "uniqViews"),
          uniqContacts: sumStatField(val, "uniqContacts"),
          uniqFavorites: sumStatField(val, "uniqFavorites"),
        });
      }
    }
  }
  return map;
}

export async function syncAvitoSnapshot(
  admin: SupabaseClient,
  userId: string,
  connectionId: string
): Promise<{ ok: true; payload: AvitoSnapshotPayloadV1 } | { ok: false; message: string }> {
  try {
    const token = await ensureAvitoAccessToken(admin, userId, connectionId);
    const { dateFrom, dateTo } = rangeLastDays(30);

    const avitoUserId = await resolveAvitoUserId(token);
    const rawItems = await fetchItems(token);

    let statsMap = new Map<number, { uniqViews: number; uniqContacts: number; uniqFavorites: number }>();
    if (avitoUserId && rawItems.length > 0) {
      statsMap = await fetchStatsForItems(
        token,
        avitoUserId,
        rawItems.map((x) => x.id),
        dateFrom,
        dateTo
      );
    }

    const items = rawItems.map((it) => {
      const st = statsMap.get(it.id);
      return {
        ...it,
        uniqViews: st?.uniqViews ?? null,
        uniqContacts: st?.uniqContacts ?? null,
        uniqFavorites: st?.uniqFavorites ?? null,
      };
    });

    const totals = items.reduce(
      (acc, it) => ({
        itemsListed: acc.itemsListed + 1,
        uniqViews: acc.uniqViews + (it.uniqViews ?? 0),
        uniqContacts: acc.uniqContacts + (it.uniqContacts ?? 0),
        uniqFavorites: acc.uniqFavorites + (it.uniqFavorites ?? 0),
      }),
      { itemsListed: 0, uniqViews: 0, uniqContacts: 0, uniqFavorites: 0 }
    );

    const syncedAt = new Date().toISOString();
    const payload: AvitoSnapshotPayloadV1 = {
      version: 1,
      syncedAt,
      avitoUserId,
      dateFrom,
      dateTo,
      items,
      totals,
    };

    const syncStatus = rawItems.length === 0 ? "ok" : "ok";
    await admin.from("avito_snapshot").upsert(
      {
        connection_id: connectionId,
        payload: payload as unknown as Record<string, unknown>,
        sync_status: syncStatus,
        error_message: rawItems.length === 0 ? "Нет объявлений в ответе API" : null,
        synced_at: syncedAt,
      },
      { onConflict: "connection_id" }
    );

    if (rawItems.length === 0) {
      return { ok: false, message: "Объявления не получены — проверьте права API (items:info) или аккаунт." };
    }

    return { ok: true, payload };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const syncedAt = new Date().toISOString();
    await admin.from("avito_snapshot").upsert(
      {
        connection_id: connectionId,
        payload: { version: 1, syncedAt, items: [], totals: { itemsListed: 0, uniqViews: 0, uniqContacts: 0, uniqFavorites: 0 } },
        sync_status: "error",
        error_message: message,
        synced_at: syncedAt,
      },
      { onConflict: "connection_id" }
    );
    return { ok: false, message };
  }
}
