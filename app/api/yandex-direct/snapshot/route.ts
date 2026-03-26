import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createSupabaseAuthRouteClient } from "@/app/lib/supabaseAuthRoute";
import { getSupabaseServiceRoleClient } from "@/app/lib/supabaseServiceRole";

/**
 * Полный JSON снимка структуры Директа (может быть большим). Только для залогиненного владельца.
 * Query: `connectionId` — id строки yandex_direct_oauth (обязательно при нескольких аккаунтах).
 */
export async function GET(request: Request) {
  const supabase = await createSupabaseAuthRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const connectionId = new URL(request.url).searchParams.get("connectionId")?.trim() ?? "";

  let admin;
  try {
    admin = getSupabaseServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "service_role_missing" }, { status: 503 });
  }

  if (!connectionId) {
    const { data: first } = await admin
      .from("yandex_direct_oauth")
      .select("id")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!first?.id) {
      return NextResponse.json(
        {
          error: "no_connection",
          hint: "Сначала подключите Яндекс Директ в «Системы и данные».",
        },
        { status: 404 }
      );
    }
    return fetchSnapshot(admin, user.id, first.id as string);
  }

  const { data: own } = await admin
    .from("yandex_direct_oauth")
    .select("id")
    .eq("user_id", user.id)
    .eq("id", connectionId)
    .maybeSingle();
  if (!own) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return fetchSnapshot(admin, user.id, connectionId);
}

async function fetchSnapshot(admin: SupabaseClient, userId: string, connectionId: string) {
  const { data, error } = await admin
    .from("yandex_direct_snapshot")
    .select("payload, synced_at, sync_status, error_message")
    .eq("connection_id", connectionId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: oauthOk } = await admin
    .from("yandex_direct_oauth")
    .select("id")
    .eq("user_id", userId)
    .eq("id", connectionId)
    .maybeSingle();
  if (!oauthOk) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!data) {
    return NextResponse.json(
      {
        error: "no_snapshot",
        hint: "Сначала выполните синхронизацию (кнопка в «Системы и данные»).",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    connectionId,
    syncedAt: data.synced_at,
    syncStatus: data.sync_status,
    errorMessage: data.error_message,
    payload: data.payload,
  });
}
