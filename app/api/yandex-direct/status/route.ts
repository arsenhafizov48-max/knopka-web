import { NextResponse } from "next/server";

import { createSupabaseAuthRouteClient } from "@/app/lib/supabaseAuthRoute";
import { getSupabaseServiceRoleClient } from "@/app/lib/supabaseServiceRole";

export async function GET() {
  const supabase = await createSupabaseAuthRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ connected: false, authenticated: false, connections: [] });
  }

  let admin;
  try {
    admin = getSupabaseServiceRoleClient();
  } catch {
    return NextResponse.json(
      { connected: false, authenticated: true, error: "service_role_missing", connections: [] },
      { status: 503 }
    );
  }

  const { data: oauthRows, error } = await admin
    .from("yandex_direct_oauth")
    .select("id, expires_at, updated_at, yandex_login, yandex_email")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { connected: false, authenticated: true, error: error.message, connections: [] },
      { status: 500 }
    );
  }

  const connections: Array<{
    id: string;
    expiresAt: string | null;
    updatedAt: string | null;
    yandexAccount: { login: string | null; email: string | null };
    snapshot: {
      syncedAt: string | null;
      status: string | null;
      errorMessage: string | null;
      counts: unknown;
    } | null;
  }> = [];

  for (const row of oauthRows ?? []) {
    const id = (row as { id: string }).id;
    const snapRes = await admin
      .from("yandex_direct_snapshot")
      .select("synced_at, sync_status, error_message, payload")
      .eq("connection_id", id)
      .maybeSingle();

    const snap = snapRes.error ? null : snapRes.data;
    const payload = snap?.payload as { counts?: unknown; version?: number } | null;
    const snapshotCounts =
      payload && typeof payload === "object" && payload.version === 1 && payload.counts
        ? payload.counts
        : null;

    const yandexLogin =
      row && typeof (row as { yandex_login?: unknown }).yandex_login === "string"
        ? (row as { yandex_login: string }).yandex_login
        : null;
    const yandexEmail =
      row && typeof (row as { yandex_email?: unknown }).yandex_email === "string"
        ? (row as { yandex_email: string }).yandex_email
        : null;

    connections.push({
      id,
      expiresAt: (row as { expires_at?: string | null }).expires_at ?? null,
      updatedAt: (row as { updated_at?: string | null }).updated_at ?? null,
      yandexAccount: { login: yandexLogin, email: yandexEmail },
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

  return NextResponse.json({
    connected: connections.length > 0,
    authenticated: true,
    connections,
  });
}
