import { NextResponse } from "next/server";

import { createSupabaseAuthRouteClient } from "@/app/lib/supabaseAuthRoute";
import { getSupabaseServiceRoleClient } from "@/app/lib/supabaseServiceRole";

/**
 * Полный JSON снимка структуры Директа (может быть большим). Только для залогиненного владельца.
 */
export async function GET() {
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

  const { data, error } = await admin
    .from("yandex_direct_snapshot")
    .select("payload, synced_at, sync_status, error_message")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "no_snapshot", hint: "Сначала выполните синхронизацию (кнопка в «Системы и данные»)." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    syncedAt: data.synced_at,
    syncStatus: data.sync_status,
    errorMessage: data.error_message,
    payload: data.payload,
  });
}
