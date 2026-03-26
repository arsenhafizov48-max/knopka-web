import { NextResponse } from "next/server";

import { createSupabaseAuthRouteClient } from "@/app/lib/supabaseAuthRoute";
import { logIntegrationActivity } from "@/app/lib/integrationActivity";
import { getSupabaseServiceRoleClient } from "@/app/lib/supabaseServiceRole";
import {
  syncAllYandexMetrikaCountersForUser,
  syncYandexMetrikaCountersForConnection,
} from "@/app/lib/yandexMetrikaSync";

async function syncAllUsersCron() {
  const admin = getSupabaseServiceRoleClient();
  const { data: oauthRows, error } = await admin
    .from("yandex_metrika_oauth")
    .select("user_id");
  if (error) throw new Error(error.message);

  const seen = new Set<string>();
  const results: Array<{ user_id: string; counters: unknown }> = [];
  for (const row of oauthRows ?? []) {
    const uid = row.user_id as string;
    if (seen.has(uid)) continue;
    seen.add(uid);
    const counters = await syncAllYandexMetrikaCountersForUser(admin, uid);
    results.push({ user_id: uid, counters });
  }
  return results;
}

export async function GET(request: Request) {
  return runSync(request);
}

export async function POST(request: Request) {
  return runSync(request);
}

async function runSync(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  const isCron = Boolean(cronSecret && auth === `Bearer ${cronSecret}`);

  if (isCron) {
    try {
      const results = await syncAllUsersCron();
      return NextResponse.json({ mode: "cron", users: results.length, results });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  const supabase = await createSupabaseAuthRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let admin;
  try {
    admin = getSupabaseServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "service_role_missing" }, { status: 503 });
  }

  let body: { connectionId?: string } = {};
  try {
    body = (await request.json()) as { connectionId?: string };
  } catch {
    /* empty */
  }
  const cid = typeof body.connectionId === "string" ? body.connectionId.trim() : "";

  let results;
  if (cid) {
    const { data: own } = await admin
      .from("yandex_metrika_oauth")
      .select("id")
      .eq("user_id", user.id)
      .eq("id", cid)
      .maybeSingle();
    if (!own) {
      return NextResponse.json({ error: "connection_not_found" }, { status: 404 });
    }
    results = await syncYandexMetrikaCountersForConnection(admin, user.id, cid);
  } else {
    results = await syncAllYandexMetrikaCountersForUser(admin, user.id);
  }
  if (results.length === 0) {
    await logIntegrationActivity(
      admin,
      user.id,
      "Яндекс Метрика",
      "Синхронизация: нет счётчиков для выгрузки (добавьте номер в «Системы и данные»).",
      "info"
    );
    return NextResponse.json({
      ok: true,
      message: "Нет счётчиков — добавьте номер в «Системы и данные».",
      results: [],
    });
  }
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0 && results.length === failed.length) {
    const errText = failed.map((f) => f.error).filter(Boolean).join(" · ") || "sync_failed";
    await logIntegrationActivity(
      admin,
      user.id,
      "Яндекс Метрика",
      `Ошибка синхронизации: ${errText}`,
      "bad"
    );
    return NextResponse.json({
      ok: false,
      error: errText,
      results,
    });
  }

  const okN = results.length - failed.length;
  const msg =
    failed.length === 0
      ? `Синхронизация успешна: обновлено ${results.length} счётчик(ов).`
      : `Синхронизация частично: успешно ${okN}, с ошибками ${failed.length}. ${failed.map((f) => f.error).filter(Boolean).join(" · ")}`;
  await logIntegrationActivity(
    admin,
    user.id,
    "Яндекс Метрика",
    msg,
    failed.length > 0 ? "warn" : "ok"
  );

  return NextResponse.json({
    ok: true,
    results,
    partial: failed.length > 0,
  });
}
