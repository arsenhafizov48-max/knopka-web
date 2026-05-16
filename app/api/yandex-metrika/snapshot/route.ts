import { NextResponse } from "next/server";

import { createSupabaseAuthRouteClient } from "@/app/lib/supabaseAuthRoute";
import { getSupabaseServiceRoleClient } from "@/app/lib/supabaseServiceRole";
import type { MetrikaSnapshotPayloadV1 } from "@/app/lib/yandexMetrikaSync";

export async function GET(request: Request) {
  const supabase = await createSupabaseAuthRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const counterRowId = url.searchParams.get("counterRowId")?.trim() ?? "";

  let admin;
  try {
    admin = getSupabaseServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "service_role_missing" }, { status: 503 });
  }

  let q = admin
    .from("yandex_metrika_counters")
    .select("id, counter_id, site_name, sync_status, error_message, synced_at, payload")
    .eq("user_id", user.id);

  if (counterRowId) {
    q = q.eq("id", counterRowId);
  } else {
    q = q.order("synced_at", { ascending: false }).limit(1);
  }

  const { data: row, error } = await q.maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!row) {
    return NextResponse.json(
      { error: "not_found", hint: "Добавьте счётчик в «Системы и данные» и синхронизируйте." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    counterRowId: row.id,
    counterId: row.counter_id,
    siteName: row.site_name,
    syncedAt: row.synced_at,
    syncStatus: row.sync_status,
    errorMessage: row.error_message,
    payload: (row.payload as MetrikaSnapshotPayloadV1 | null) ?? null,
  });
}
