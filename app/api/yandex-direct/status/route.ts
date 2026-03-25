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
    .from("yandex_direct_oauth")
    .select("expires_at, updated_at, yandex_login, yandex_email")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { connected: false, authenticated: true, error: error.message },
      { status: 500 }
    );
  }

  const snapRes = await admin
    .from("yandex_direct_snapshot")
    .select("synced_at, sync_status, error_message, payload")
    .eq("user_id", user.id)
    .maybeSingle();

  const snap = snapRes.error ? null : snapRes.data;
  const payload = snap?.payload as { counts?: unknown; version?: number } | null;
  const snapshotCounts =
    payload && typeof payload === "object" && payload.version === 1 && payload.counts
      ? payload.counts
      : null;

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
    snapshot: snap
      ? {
          syncedAt: snap.synced_at,
          status: snap.sync_status,
          errorMessage: snap.error_message,
          counts: snapshotCounts,
        }
      : null,
  });
}
