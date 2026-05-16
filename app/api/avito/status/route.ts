import { NextResponse } from "next/server";

import type { AvitoSnapshotPayloadV1 } from "@/app/lib/avitoSync";
import { createSupabaseAuthRouteClient } from "@/app/lib/supabaseAuthRoute";
import { getSupabaseServiceRoleClient } from "@/app/lib/supabaseServiceRole";

export async function GET() {
  const supabase = await createSupabaseAuthRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let admin;
  try {
    admin = getSupabaseServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "service_role_missing" }, { status: 503 });
  }

  const { data: rows, error } = await admin
    .from("avito_oauth")
    .select("id, expires_at, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const connections = await Promise.all(
    (rows ?? []).map(async (r) => {
      const { data: snap } = await admin
        .from("avito_snapshot")
        .select("synced_at, sync_status, error_message, payload")
        .eq("connection_id", r.id)
        .maybeSingle();

      const pl = snap?.payload as AvitoSnapshotPayloadV1 | null;

      return {
        id: r.id,
        expiresAt: r.expires_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        snapshot: snap
          ? {
              syncedAt: snap.synced_at,
              syncStatus: snap.sync_status,
              errorMessage: snap.error_message,
              totals: pl?.totals ?? null,
              dateFrom: pl?.dateFrom ?? null,
              dateTo: pl?.dateTo ?? null,
            }
          : null,
      };
    })
  );

  return NextResponse.json({ connections });
}
