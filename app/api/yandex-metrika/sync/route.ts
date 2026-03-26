import { NextResponse } from "next/server";

import { createSupabaseAuthRouteClient } from "@/app/lib/supabaseAuthRoute";
import { getSupabaseServiceRoleClient } from "@/app/lib/supabaseServiceRole";
import { syncAllYandexMetrikaCountersForUser } from "@/app/lib/yandexMetrikaSync";

async function syncAllUsersCron() {
  const admin = getSupabaseServiceRoleClient();
  const { data: oauthRows, error } = await admin
    .from("yandex_metrika_oauth")
    .select("user_id");
  if (error) throw new Error(error.message);

  const results: Array<{ user_id: string; counters: unknown }> = [];
  for (const row of oauthRows ?? []) {
    const uid = row.user_id as string;
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

  const results = await syncAllYandexMetrikaCountersForUser(admin, user.id);
  if (results.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "Нет счётчиков — добавьте номер в «Системы и данные».",
      results: [],
    });
  }
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0 && results.length === failed.length) {
    return NextResponse.json({
      ok: false,
      error: failed.map((f) => f.error).filter(Boolean).join(" · ") || "sync_failed",
      results,
    });
  }

  return NextResponse.json({
    ok: true,
    results,
    partial: failed.length > 0,
  });
}
