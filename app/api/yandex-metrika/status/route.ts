import { NextResponse } from "next/server";

import { createSupabaseAuthRouteClient } from "@/app/lib/supabaseAuthRoute";
import { getSupabaseServiceRoleClient } from "@/app/lib/supabaseServiceRole";

export async function GET() {
  const supabase = await createSupabaseAuthRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ connected: false, authenticated: false });
  }

  let admin;
  try {
    admin = getSupabaseServiceRoleClient();
  } catch {
    return NextResponse.json(
      { connected: false, authenticated: true, error: "service_role_missing" },
      { status: 503 }
    );
  }

  const { data, error } = await admin
    .from("yandex_metrika_oauth")
    .select("expires_at, updated_at, yandex_login, yandex_email")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { connected: false, authenticated: true, error: error.message },
      { status: 500 }
    );
  }

  const { data: counterRows } = await admin
    .from("yandex_metrika_counters")
    .select("id, counter_id, site_name, sync_status, error_message, synced_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const yandexLogin =
    data && typeof (data as { yandex_login?: unknown }).yandex_login === "string"
      ? (data as { yandex_login: string }).yandex_login
      : null;
  const yandexEmail =
    data && typeof (data as { yandex_email?: unknown }).yandex_email === "string"
      ? (data as { yandex_email: string }).yandex_email
      : null;

  return NextResponse.json({
    connected: !!data,
    authenticated: true,
    expiresAt: data?.expires_at ?? null,
    updatedAt: data?.updated_at ?? null,
    yandexAccount:
      data && (yandexLogin || yandexEmail)
        ? { login: yandexLogin, email: yandexEmail }
        : null,
    counters: counterRows ?? [],
  });
}
