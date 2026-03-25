import { NextResponse } from "next/server";

import { createSupabaseAuthRouteClient } from "@/app/lib/supabaseAuthRoute";
import { getSupabaseServiceRoleClient } from "@/app/lib/supabaseServiceRole";
import { syncYandexDirectStructure } from "@/app/lib/yandexDirectStructureSync";

async function syncAllOAuthUsers() {
  const admin = getSupabaseServiceRoleClient();
  const { data: rows, error } = await admin.from("yandex_direct_oauth").select("user_id");
  if (error) throw new Error(error.message);

  const results: Array<{
    user_id: string;
    ok: boolean;
    error?: string;
    counts?: unknown;
    partial?: boolean;
    warnings?: string[];
  }> = [];
  for (const row of rows ?? []) {
    const uid = row.user_id as string;
    const r = await syncYandexDirectStructure(admin, uid);
    if (r.ok) {
      results.push({
        user_id: uid,
        ok: true,
        counts: r.payload.counts,
        partial: Boolean(r.payload.syncWarnings?.length),
        warnings: r.payload.syncWarnings,
      });
    } else {
      results.push({ user_id: uid, ok: false, error: r.message });
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

async function runSync(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  const isCron = Boolean(cronSecret && auth === `Bearer ${cronSecret}`);

  if (isCron) {
    try {
      const results = await syncAllOAuthUsers();
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

  const r = await syncYandexDirectStructure(admin, user.id);
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: r.message });
  }

  const warnings = r.payload.syncWarnings;
  return NextResponse.json({
    ok: true,
    counts: r.payload.counts,
    syncedAt: r.payload.syncedAt,
    partial: Boolean(warnings?.length),
    warnings: warnings ?? [],
  });
}
