import { NextResponse } from "next/server";

import { createSupabaseAuthRouteClient } from "@/app/lib/supabaseAuthRoute";
import { getSupabaseServiceRoleClient } from "@/app/lib/supabaseServiceRole";
import type { AvitoSnapshotPayloadV1 } from "@/app/lib/avitoSync";

export async function GET(request: Request) {
  const supabase = await createSupabaseAuthRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const connectionId = url.searchParams.get("connectionId")?.trim() ?? "";

  let admin;
  try {
    admin = getSupabaseServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "service_role_missing" }, { status: 503 });
  }

  let cid = connectionId;
  if (!cid) {
    const { data: first } = await admin
      .from("avito_oauth")
      .select("id")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    cid = (first as { id?: string } | null)?.id ?? "";
  }

  if (!cid) {
    return NextResponse.json({ error: "not_connected", hint: "Подключите Авито в «Системы и данные»." }, { status: 404 });
  }

  const { data: own } = await admin
    .from("avito_oauth")
    .select("id")
    .eq("user_id", user.id)
    .eq("id", cid)
    .maybeSingle();

  if (!own) {
    return NextResponse.json({ error: "connection_not_found" }, { status: 404 });
  }

  const { data: snap } = await admin
    .from("avito_snapshot")
    .select("synced_at, sync_status, error_message, payload")
    .eq("connection_id", cid)
    .maybeSingle();

  return NextResponse.json({
    connectionId: cid,
    syncedAt: snap?.synced_at ?? null,
    syncStatus: snap?.sync_status ?? null,
    errorMessage: snap?.error_message ?? null,
    payload: (snap?.payload as AvitoSnapshotPayloadV1 | null) ?? null,
  });
}
