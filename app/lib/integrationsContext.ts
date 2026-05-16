import type { SupabaseClient } from "@supabase/supabase-js";

import type { AvitoSnapshotPayloadV1 } from "@/app/lib/avitoSync";
import type { MetrikaSnapshotPayloadV1 } from "@/app/lib/yandexMetrikaSync";

export type IntegrationTone = "ok" | "warn" | "bad" | "info";

export type IntegrationCard = {
  id: string;
  source: "metrika" | "direct" | "avito";
  title: string;
  connected: boolean;
  statusText: string;
  tone: IntegrationTone;
  syncedAt: string | null;
  errorMessage: string | null;
  metrics: Array<{ label: string; value: string }>;
  bullets: string[];
  dataHref: string | null;
  systemsHref: string;
};

export type IntegrationsOverview = {
  blockForAi: string;
  cards: IntegrationCard[];
  metrika: { connected: boolean; counters: number };
  direct: { connected: boolean; connections: number };
  avito: { connected: boolean; connections: number };
};

function fmtInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(n));
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const pct = n <= 1 ? n * 100 : n;
  return `${pct.toFixed(1)}%`;
}

function fmtDuration(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return "—";
  return `${Math.round(sec)} с`;
}

function fmtRuDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export async function buildIntegrationsOverview(
  admin: SupabaseClient,
  userId: string
): Promise<IntegrationsOverview> {
  const ai = { metrika: [] as string[], direct: [] as string[], avito: [] as string[] };
  const cards: IntegrationCard[] = [];

  // --- Авито ---
  const { data: avitoOauth } = await admin
    .from("avito_oauth")
    .select("id, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  const avitoCount = avitoOauth?.length ?? 0;

  if (avitoCount === 0) {
    ai.avito.push("Авито: не подключено.");
    cards.push({
      id: "avito-none",
      source: "avito",
      title: "Авито",
      connected: false,
      statusText: "Не подключено",
      tone: "warn",
      syncedAt: null,
      errorMessage: null,
      metrics: [],
      bullets: ["Подключите OAuth в «Системы и данные», затем нажмите «Синхронизировать»."],
      dataHref: null,
      systemsHref: "/app/systems",
    });
  } else {
    for (const row of avitoOauth ?? []) {
      const cid = (row as { id: string }).id;
      const { data: snap } = await admin
        .from("avito_snapshot")
        .select("synced_at, sync_status, error_message, payload")
        .eq("connection_id", cid)
        .maybeSingle();

      const pl = snap?.payload as AvitoSnapshotPayloadV1 | null;
      const err = snap?.error_message ?? null;
      const st = snap?.sync_status ?? "pending";
      const syncedAt = snap?.synced_at ?? null;

      ai.avito.push(`Авито: подключено. Статус выгрузки: ${st}.`);
      if (syncedAt) ai.avito.push(`Авито — последняя синхронизация: ${syncedAt}.`);
      if (pl?.totals) {
        ai.avito.push(
          `Авито — период ${pl.dateFrom}–${pl.dateTo}: объявлений ${pl.totals.itemsListed}, уник. просмотры ${pl.totals.uniqViews}, уник. контакты ${pl.totals.uniqContacts}, в избранное ${pl.totals.uniqFavorites}.`
        );
        const top = [...(pl.items ?? [])]
          .sort((a, b) => (b.uniqViews ?? 0) - (a.uniqViews ?? 0))
          .slice(0, 5);
        for (const it of top) {
          if (!it.title) continue;
          ai.avito.push(
            `  · «${it.title}»: просмотры ${it.uniqViews ?? "—"}, контакты ${it.uniqContacts ?? "—"}.`
          );
        }
      }
      if (err && st !== "ok") ai.avito.push(`Авито — ошибка: ${err}`);

      const metrics: IntegrationCard["metrics"] = pl?.totals
        ? [
            { label: "Объявлений", value: fmtInt(pl.totals.itemsListed) },
            { label: "Просмотры (уник.)", value: fmtInt(pl.totals.uniqViews) },
            { label: "Контакты (уник.)", value: fmtInt(pl.totals.uniqContacts) },
          ]
        : [];

      cards.push({
        id: `avito-${cid}`,
        source: "avito",
        title: "Авито",
        connected: true,
        statusText:
          st === "ok" && pl
            ? `Синхронизировано · ${fmtRuDate(syncedAt)}`
            : err
              ? "Ошибка синхронизации"
              : "Нужна синхронизация",
        tone: st === "ok" && pl ? "ok" : err ? "bad" : "warn",
        syncedAt,
        errorMessage: err,
        metrics,
        bullets: pl
          ? [`Период: ${pl.dateFrom} – ${pl.dateTo}`, "Данные для ИИ и отчётов обновляются по кнопке «Синхронизировать»."]
          : ["Нажмите «Синхронизировать» в «Системах», чтобы выгрузить объявления и статистику."],
        dataHref: `/app/avito-data?connectionId=${encodeURIComponent(cid)}`,
        systemsHref: "/app/systems",
      });
    }
  }

  // --- Директ ---
  const { data: dirOauth } = await admin
    .from("yandex_direct_oauth")
    .select("id, yandex_login, yandex_email")
    .eq("user_id", userId);

  const dirCount = dirOauth?.length ?? 0;

  if (dirCount === 0) {
    ai.direct.push("Яндекс Директ: не подключён.");
    cards.push({
      id: "direct-none",
      source: "direct",
      title: "Яндекс Директ",
      connected: false,
      statusText: "Не подключено",
      tone: "warn",
      syncedAt: null,
      errorMessage: null,
      metrics: [],
      bullets: ["Подключите OAuth и дождитесь одобрения API в Директе."],
      dataHref: null,
      systemsHref: "/app/systems",
    });
  } else {
    for (const dirOauthRow of dirOauth ?? []) {
      const oid = (dirOauthRow as { id: string }).id;
      const acc =
        (dirOauthRow as { yandex_email?: string | null; yandex_login?: string | null }).yandex_email ||
        (dirOauthRow as { yandex_login?: string | null }).yandex_login ||
        "аккаунт";

      const { data: dirSnap } = await admin
        .from("yandex_direct_snapshot")
        .select("synced_at, sync_status, error_message, payload")
        .eq("connection_id", oid)
        .maybeSingle();

      const st = dirSnap?.sync_status ?? "pending";
      const err = dirSnap?.error_message ?? null;
      const syncedAt = dirSnap?.synced_at ?? null;
      const p = dirSnap?.payload as { counts?: Record<string, number> } | null;

      ai.direct.push(`Яндекс Директ: подключён (${acc}). Статус выгрузки: ${st}.`);
      if (syncedAt) ai.direct.push(`Директ (${acc}) — последняя синхронизация: ${syncedAt}.`);
      if (p?.counts) {
        ai.direct.push(
          `Директ (${acc}) — кампаний ${p.counts.campaigns ?? 0}, групп ${p.counts.adGroups ?? 0}, объявлений ${p.counts.ads ?? 0}, фраз ${p.counts.keywords ?? 0}.`
        );
      }
      if (err && st !== "ok") ai.direct.push(`Директ (${acc}) — ${err}`);

      cards.push({
        id: `direct-${oid}`,
        source: "direct",
        title: `Яндекс Директ · ${acc}`,
        connected: true,
        statusText: st === "ok" ? `Структура выгружена · ${fmtRuDate(syncedAt)}` : "Ошибка синхронизации",
        tone: st === "ok" ? "ok" : "bad",
        syncedAt,
        errorMessage: err,
        metrics: p?.counts
          ? [
              { label: "Кампании", value: fmtInt(p.counts.campaigns) },
              { label: "Группы", value: fmtInt(p.counts.adGroups) },
              { label: "Объявления", value: fmtInt(p.counts.ads) },
            ]
          : [],
        bullets: ["Структура РК для анализа и стратегии. Полная статистика (расходы, CPA) — в разработке."],
        dataHref: `/app/yandex-direct-data?connectionId=${encodeURIComponent(oid)}`,
        systemsHref: "/app/systems",
      });
    }
  }

  // --- Метрика ---
  const { data: ymOauth } = await admin
    .from("yandex_metrika_oauth")
    .select("id")
    .eq("user_id", userId);

  const { data: ymCounters } = await admin
    .from("yandex_metrika_counters")
    .select("id, counter_id, site_name, sync_status, error_message, synced_at, payload, connection_id")
    .eq("user_id", userId);

  const ymConn = ymOauth?.length ?? 0;
  const ymCtr = ymCounters?.length ?? 0;

  if (ymConn === 0) {
    ai.metrika.push("Яндекс Метрика: не подключена.");
    cards.push({
      id: "metrika-none",
      source: "metrika",
      title: "Яндекс Метрика",
      connected: false,
      statusText: "Не подключено",
      tone: "warn",
      syncedAt: null,
      errorMessage: null,
      metrics: [],
      bullets: ["Подключите OAuth и добавьте номер счётчика."],
      dataHref: null,
      systemsHref: "/app/systems",
    });
  } else if (ymCtr === 0) {
    ai.metrika.push("Яндекс Метрика: OAuth есть, счётчики не добавлены.");
    cards.push({
      id: "metrika-no-counter",
      source: "metrika",
      title: "Яндекс Метрика",
      connected: true,
      statusText: "Нет счётчика",
      tone: "warn",
      syncedAt: null,
      errorMessage: null,
      metrics: [],
      bullets: ["Укажите номер счётчика в «Системах» и нажмите «Синхронизировать»."],
      dataHref: "/app/metrika-data",
      systemsHref: "/app/systems",
    });
  } else {
    for (const c of ymCounters ?? []) {
      const row = c as {
        id: string;
        counter_id: number;
        site_name: string | null;
        sync_status: string | null;
        error_message: string | null;
        synced_at: string | null;
        payload: MetrikaSnapshotPayloadV1 | null;
      };
      const pl = row.payload;
      const t = pl?.totals;
      const st = row.sync_status ?? "pending";
      const err = row.error_message;

      ai.metrika.push(
        `Метрика — счётчик ${row.counter_id} (${row.site_name ?? "сайт"}): статус ${st}, синхронизация ${row.synced_at ?? "—"}.`
      );
      if (t && (t.visits != null || t.pageviews != null)) {
        ai.metrika.push(
          `  За ${pl?.date1 ?? "?"}–${pl?.date2 ?? "?"}: визиты ${t.visits ?? "—"}, просмотры ${t.pageviews ?? "—"}, отказы ${fmtPct(t.bounceRate)}, время ${fmtDuration(t.avgVisitDurationSeconds)}.`
        );
        const sources = pl?.byTrafficSource?.slice(0, 5) ?? [];
        for (const s of sources) {
          ai.metrika.push(`  · Источник «${s.source}»: визиты ${s.visits ?? "—"}.`);
        }
      }
      if (err && st !== "ok") ai.metrika.push(`  Ошибка: ${err}`);

      cards.push({
        id: `metrika-${row.id}`,
        source: "metrika",
        title: `Метрика · #${row.counter_id}`,
        connected: true,
        statusText: st === "ok" ? `Синхронизировано · ${fmtRuDate(row.synced_at)}` : "Ошибка",
        tone: st === "ok" ? "ok" : "bad",
        syncedAt: row.synced_at,
        errorMessage: err,
        metrics: t
          ? [
              { label: "Визиты", value: fmtInt(t.visits) },
              { label: "Просмотры", value: fmtInt(t.pageviews) },
              { label: "Отказы", value: fmtPct(t.bounceRate) },
            ]
          : [],
        bullets: row.site_name ? [`Сайт: ${row.site_name}`] : [],
        dataHref: `/app/metrika-data?counterRowId=${encodeURIComponent(row.id)}`,
        systemsHref: "/app/systems",
      });
    }
  }

  const cardOrder: Record<IntegrationCard["source"], number> = { metrika: 0, direct: 1, avito: 2 };
  const sortedCards = [...cards].sort((a, b) => cardOrder[a.source] - cardOrder[b.source]);

  const blockForAi = [
    "=== Яндекс Метрика ===",
    ...(ai.metrika.length ? ai.metrika : ["Не подключено или нет данных."]),
    "",
    "=== Яндекс Директ ===",
    ...(ai.direct.length ? ai.direct : ["Не подключено или нет данных."]),
    "",
    "=== Авито ===",
    ...(ai.avito.length ? ai.avito : ["Не подключено или нет данных."]),
  ].join("\n");

  return {
    blockForAi,
    cards: sortedCards,
    metrika: { connected: ymConn > 0, counters: ymCtr },
    direct: { connected: dirCount > 0, connections: dirCount },
    avito: { connected: avitoCount > 0, connections: avitoCount },
  };
}
