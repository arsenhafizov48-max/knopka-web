import { NextResponse } from "next/server";

import { createSupabaseAuthRouteClient } from "@/app/lib/supabaseAuthRoute";
import { getSupabaseServiceRoleClient } from "@/app/lib/supabaseServiceRole";

type MetrikaPayload = {
  version?: number;
  totals?: {
    visits?: number | null;
    bounceRate?: number | null;
    avgVisitDurationSeconds?: number | null;
    pageviews?: number | null;
  };
  date1?: string;
  date2?: string;
};

export async function GET() {
  const supabase = await createSupabaseAuthRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ authenticated: false, blockForAi: "" });
  }

  let admin;
  try {
    admin = getSupabaseServiceRoleClient();
  } catch {
    return NextResponse.json({
      authenticated: true,
      blockForAi:
        "Интеграции: сервер без SUPABASE_SERVICE_ROLE_KEY — статус Яндекс Директ/Метрика недоступен.",
    });
  }

  const lines: string[] = [];

  const { data: dirOauth } = await admin
    .from("yandex_direct_oauth")
    .select("expires_at, yandex_login, yandex_email")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: dirSnap } = await admin
    .from("yandex_direct_snapshot")
    .select("synced_at, sync_status, error_message, payload")
    .eq("user_id", user.id)
    .maybeSingle();

  if (dirOauth) {
    const acc =
      (dirOauth as { yandex_email?: string | null; yandex_login?: string | null }).yandex_email ||
      (dirOauth as { yandex_login?: string | null }).yandex_login ||
      "аккаунт";
    lines.push(
      `Яндекс Директ: подключён (${acc}). Статус выгрузки: ${dirSnap?.sync_status ?? "нет данных"}.`
    );
    if (dirSnap?.synced_at) {
      lines.push(`Директ — последняя синхронизация структуры: ${dirSnap.synced_at}.`);
    }
    if (dirSnap?.error_message && dirSnap.sync_status !== "ok") {
      lines.push(`Директ — примечание: ${dirSnap.error_message}`);
    }
    const p = dirSnap?.payload as { counts?: Record<string, number> } | null;
    if (p?.counts) {
      lines.push(
        `Директ — в снимке: кампаний ${p.counts.campaigns ?? 0}, групп ${p.counts.adGroups ?? 0}, объявлений ${p.counts.ads ?? 0}, фраз ${p.counts.keywords ?? 0}.`
      );
    }
  } else {
    lines.push("Яндекс Директ: не подключён.");
  }

  const { data: ymOauth } = await admin
    .from("yandex_metrika_oauth")
    .select("expires_at, yandex_login, yandex_email")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: ymCounters } = await admin
    .from("yandex_metrika_counters")
    .select("counter_id, site_name, sync_status, error_message, synced_at, payload")
    .eq("user_id", user.id);

  if (ymOauth) {
    lines.push("Яндекс Метрика: OAuth подключён.");
    if (!ymCounters?.length) {
      lines.push("Метрика: счётчики не добавлены — отчёты по сайту не выгружаются.");
    } else {
      for (const c of ymCounters) {
        const row = c as {
          counter_id: number;
          site_name: string | null;
          sync_status: string | null;
          error_message: string | null;
          synced_at: string | null;
          payload: MetrikaPayload | null;
        };
        const pl = row.payload;
        const t = pl?.totals;
        lines.push(
          `Метрика — счётчик ${row.counter_id} (${row.site_name ?? "сайт"}): статус ${row.sync_status ?? "—"}, синхронизация ${row.synced_at ?? "—"}.`
        );
        if (t && (t.visits != null || t.pageviews != null)) {
          const brPct =
            t.bounceRate != null
              ? t.bounceRate <= 1
                ? t.bounceRate * 100
                : t.bounceRate
              : null;
          const br = brPct != null ? `${brPct.toFixed(1)}%` : "—";
          const dur =
            t.avgVisitDurationSeconds != null
              ? `${Math.round(t.avgVisitDurationSeconds)} с`
              : "—";
          lines.push(
            `  За период ${pl?.date1 ?? "?"}–${pl?.date2 ?? "?"}: визиты ${t.visits ?? "—"}, просмотры ${t.pageviews ?? "—"}, отказы ${br}, среднее время ${dur}.`
          );
        }
        if (row.error_message && row.sync_status !== "ok") {
          lines.push(`  Ошибка: ${row.error_message}`);
        }
      }
    }
  } else {
    lines.push("Яндекс Метрика: не подключена.");
  }

  const blockForAi = lines.join("\n");

  return NextResponse.json({
    authenticated: true,
    blockForAi,
    direct: { connected: !!dirOauth },
    metrika: { connected: !!ymOauth, counters: ymCounters?.length ?? 0 },
  });
}
