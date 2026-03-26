import type { SupabaseClient } from "@supabase/supabase-js";

import { ensureYandexMetrikaAccessToken } from "@/app/lib/yandexMetrikaEnsureToken";

export type MetrikaSnapshotPayloadV1 = {
  version: 1;
  syncedAt: string;
  date1: string;
  date2: string;
  counterId: number;
  totals: {
    visits: number | null;
    bounceRate: number | null;
    avgVisitDurationSeconds: number | null;
    pageviews: number | null;
  };
  /** Разбивка по источнику трафика (последний источник) */
  byTrafficSource: Array<{
    source: string;
    visits: number | null;
    bounceRate: number | null;
    avgVisitDurationSeconds: number | null;
  }>;
};

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rangeLastDays(days: number): { date1: string; date2: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return { date1: isoDate(start), date2: isoDate(end) };
}

async function metricaPostJson(
  token: string,
  path: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; status: number; json: unknown }> {
  const res = await fetch(`https://api-metrika.yandex.net${path}`, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    json = { error: text.slice(0, 500) };
  }
  return { ok: res.ok, status: res.status, json };
}

function parseDataRow(
  data: Record<string, unknown>
): { totals: number[]; dimensions?: string[][] } | null {
  const dataArr = data.data as unknown;
  if (!Array.isArray(dataArr) || dataArr.length === 0) return null;
  const first = dataArr[0] as Record<string, unknown>;
  const totals = first.metrics as unknown;
  if (!Array.isArray(totals)) return null;
  const dims = first.dimensions as unknown;
  return {
    totals: totals.map((x) => (typeof x === "number" ? x : Number(x))),
    dimensions: Array.isArray(dims) ? (dims as string[][]) : undefined,
  };
}

function apiErrorMessage(json: unknown): string {
  if (!json || typeof json !== "object") return "stat/v1/data";
  const o = json as Record<string, unknown>;
  if (typeof o.message === "string") return o.message;
  const errs = o.errors as unknown;
  if (Array.isArray(errs) && errs[0] && typeof errs[0] === "object") {
    const e = errs[0] as Record<string, unknown>;
    if (typeof e.text === "string") return e.text;
  }
  return "stat/v1/data";
}

async function fetchTotals(
  token: string,
  counterId: number,
  date1: string,
  date2: string
): Promise<MetrikaSnapshotPayloadV1["totals"] | null> {
  const r = await metricaPostJson(token, "/stat/v1/data", {
    ids: [counterId],
    metrics: [
      "ym:s:visits",
      "ym:s:bounceRate",
      "ym:s:avgVisitDurationSeconds",
      "ym:s:pageviews",
    ],
    date1,
    date2,
    accuracy: "0.95",
    limit: 1,
  });
  if (!r.ok) {
    throw new Error(apiErrorMessage(r.json));
  }
  const j = r.json as Record<string, unknown>;
  const totals = parseDataRow(j);
  if (!totals) return null;
  const [visits, bounceRate, avgVisitDurationSeconds, pageviews] = totals.totals;
  return {
    visits: visits ?? null,
    bounceRate: bounceRate ?? null,
    avgVisitDurationSeconds: avgVisitDurationSeconds ?? null,
    pageviews: pageviews ?? null,
  };
}

async function fetchByTrafficSource(
  token: string,
  counterId: number,
  date1: string,
  date2: string
): Promise<MetrikaSnapshotPayloadV1["byTrafficSource"]> {
  const r = await metricaPostJson(token, "/stat/v1/data", {
    ids: [counterId],
    dimensions: ["ym:s:lastTrafficSource"],
    metrics: ["ym:s:visits", "ym:s:bounceRate", "ym:s:avgVisitDurationSeconds"],
    date1,
    date2,
    accuracy: "0.95",
    limit: 100,
  });
  if (!r.ok) {
    return [];
  }
  const j = r.json as Record<string, unknown>;
  const dataArr = j.data as unknown;
  if (!Array.isArray(dataArr)) return [];
  const out: MetrikaSnapshotPayloadV1["byTrafficSource"] = [];
  for (const row of dataArr) {
    const o = row as Record<string, unknown>;
    const dims = o.dimensions as unknown;
    const mets = o.metrics as unknown;
    const name =
      Array.isArray(dims) && dims.length > 0 && typeof dims[0] === "string"
        ? dims[0]
        : "—";
    const mv = Array.isArray(mets) ? mets : [];
    out.push({
      source: name,
      visits: typeof mv[0] === "number" ? mv[0] : mv[0] != null ? Number(mv[0]) : null,
      bounceRate: typeof mv[1] === "number" ? mv[1] : mv[1] != null ? Number(mv[1]) : null,
      avgVisitDurationSeconds:
        typeof mv[2] === "number" ? mv[2] : mv[2] != null ? Number(mv[2]) : null,
    });
  }
  return out;
}

export async function syncYandexMetrikaCounter(
  admin: SupabaseClient,
  userId: string,
  counterRowId: string
): Promise<{ ok: true; payload: MetrikaSnapshotPayloadV1 } | { ok: false; message: string }> {
  try {
    const token = await ensureYandexMetrikaAccessToken(admin, userId);

    const { data: row, error } = await admin
      .from("yandex_metrika_counters")
      .select("id, counter_id")
      .eq("id", counterRowId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !row) {
      return { ok: false, message: "Счётчик не найден" };
    }

    const counterId = Number((row as { counter_id: number }).counter_id);
    const { date1, date2 } = rangeLastDays(30);
    const syncedAt = new Date().toISOString();

    const totals = await fetchTotals(token, counterId, date1, date2);
    const byTrafficSource = await fetchByTrafficSource(token, counterId, date1, date2);

    if (!totals) {
      const msg = "Не удалось получить данные отчёта Метрики";
      await admin
        .from("yandex_metrika_counters")
        .update({
          sync_status: "error",
          error_message: msg,
          synced_at: syncedAt,
        })
        .eq("id", counterRowId);
      return { ok: false, message: msg };
    }

    const payload: MetrikaSnapshotPayloadV1 = {
      version: 1,
      syncedAt,
      date1,
      date2,
      counterId,
      totals,
      byTrafficSource,
    };

    const { error: upErr } = await admin
      .from("yandex_metrika_counters")
      .update({
        payload: payload as unknown as Record<string, unknown>,
        sync_status: "ok",
        error_message: null,
        synced_at: syncedAt,
      })
      .eq("id", counterRowId);

    if (upErr) {
      return { ok: false, message: upErr.message };
    }

    return { ok: true, payload };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    try {
      await admin
        .from("yandex_metrika_counters")
        .update({
          sync_status: "error",
          error_message: message,
          synced_at: new Date().toISOString(),
        })
        .eq("id", counterRowId);
    } catch {
      /* ignore */
    }
    return { ok: false, message };
  }
}

export async function syncAllYandexMetrikaCountersForUser(
  admin: SupabaseClient,
  userId: string
): Promise<Array<{ counterId: string; ok: boolean; error?: string }>> {
  const { data: rows } = await admin
    .from("yandex_metrika_counters")
    .select("id")
    .eq("user_id", userId);

  const results: Array<{ counterId: string; ok: boolean; error?: string }> = [];
  for (const r of rows ?? []) {
    const id = (r as { id: string }).id;
    const res = await syncYandexMetrikaCounter(admin, userId, id);
    if (res.ok) {
      results.push({ counterId: id, ok: true });
    } else {
      results.push({ counterId: id, ok: false, error: res.message });
    }
  }
  return results;
}
