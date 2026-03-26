import { NextResponse } from "next/server";

import { createSupabaseAuthRouteClient } from "@/app/lib/supabaseAuthRoute";
import { logIntegrationActivity } from "@/app/lib/integrationActivity";
import { getSupabaseServiceRoleClient } from "@/app/lib/supabaseServiceRole";
import { syncYandexDirectStructure } from "@/app/lib/yandexDirectStructureSync";

async function syncAllOAuthConnections() {
  const admin = getSupabaseServiceRoleClient();
  const { data: rows, error } = await admin
    .from("yandex_direct_oauth")
    .select("id, user_id");
  if (error) throw new Error(error.message);

  const results: Array<{
    connection_id: string;
    user_id: string;
    ok: boolean;
    error?: string;
    counts?: unknown;
    partial?: boolean;
    warnings?: string[];
  }> = [];
  for (const row of rows ?? []) {
    const uid = row.user_id as string;
    const cid = row.id as string;
    const r = await syncYandexDirectStructure(admin, uid, cid);
    if (r.ok) {
      results.push({
        connection_id: cid,
        user_id: uid,
        ok: true,
        counts: r.payload.counts,
        partial: Boolean(r.payload.syncWarnings?.length),
        warnings: r.payload.syncWarnings,
      });
    } else {
      results.push({ connection_id: cid, user_id: uid, ok: false, error: r.message });
      await logIntegrationActivity(
        admin,
        uid,
        "Яндекс Директ",
        `Ошибка синхронизации (cron): ${r.message}`,
        "bad"
      );
    }
  }
  return results;
}

export async function GET(request: Request) {
  return runSync(request);
}

export async function POST(request: Request) {
  return runSync(request);
}

type PostBody = { connectionId?: string };

async function runSync(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  const isCron = Boolean(cronSecret && auth === `Bearer ${cronSecret}`);

  if (isCron) {
    try {
      const results = await syncAllOAuthConnections();
      return NextResponse.json({ mode: "cron", connections: results.length, results });
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

  let body: PostBody = {};
  try {
    body = (await request.json()) as PostBody;
  } catch {
    /* empty */
  }
  const singleId = typeof body.connectionId === "string" ? body.connectionId.trim() : "";

  if (singleId) {
    const { data: row } = await admin
      .from("yandex_direct_oauth")
      .select("id")
      .eq("user_id", user.id)
      .eq("id", singleId)
      .maybeSingle();
    if (!row) {
      return NextResponse.json({ error: "connection_not_found" }, { status: 404 });
    }
    const r = await syncYandexDirectStructure(admin, user.id, singleId);
    if (!r.ok) {
      await logIntegrationActivity(
        admin,
        user.id,
        "Яндекс Директ",
        `Ошибка синхронизации: ${r.message}`,
        "bad"
      );
      return NextResponse.json({ ok: false, error: r.message });
    }
    const warnings = r.payload.syncWarnings;
    await logIntegrationActivity(
      admin,
      user.id,
      "Яндекс Директ",
      "Синхронизация структуры кампаний завершена успешно.",
      warnings?.length ? "warn" : "ok"
    );
    return NextResponse.json({
      ok: true,
      connectionId: singleId,
      counts: r.payload.counts,
      syncedAt: r.payload.syncedAt,
      partial: Boolean(warnings?.length),
      warnings: warnings ?? [],
    });
  }

  const { data: conns } = await admin
    .from("yandex_direct_oauth")
    .select("id")
    .eq("user_id", user.id);
  if (!conns?.length) {
    return NextResponse.json({ ok: false, error: "Нет подключений Директа." }, { status: 400 });
  }

  const merged: Array<{ connectionId: string; ok: boolean; error?: string }> = [];
  for (const c of conns) {
    const cid = (c as { id: string }).id;
    const r = await syncYandexDirectStructure(admin, user.id, cid);
    if (r.ok) {
      merged.push({ connectionId: cid, ok: true });
      await logIntegrationActivity(
        admin,
        user.id,
        "Яндекс Директ",
        "Синхронизация структуры кампаний завершена успешно.",
        r.payload.syncWarnings?.length ? "warn" : "ok"
      );
    } else {
      merged.push({ connectionId: cid, ok: false, error: r.message });
      await logIntegrationActivity(
        admin,
        user.id,
        "Яндекс Директ",
        `Ошибка синхронизации: ${r.message}`,
        "bad"
      );
    }
  }

  const failed = merged.filter((m) => !m.ok);
  const firstOk = merged.find((m) => m.ok);
  if (!firstOk) {
    return NextResponse.json({
      ok: false,
      error: failed.map((f) => f.error).filter(Boolean).join(" · ") || "sync_failed",
      results: merged,
    });
  }

  return NextResponse.json({
    ok: true,
    results: merged,
    partial: failed.length > 0,
  });
}
