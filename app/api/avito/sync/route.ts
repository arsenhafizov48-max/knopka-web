import { NextResponse } from "next/server";

import { createSupabaseAuthRouteClient } from "@/app/lib/supabaseAuthRoute";
import { syncAvitoSnapshot } from "@/app/lib/avitoSync";
import { logIntegrationActivity } from "@/app/lib/integrationActivity";
import { getSupabaseServiceRoleClient } from "@/app/lib/supabaseServiceRole";

export async function POST(request: Request) {
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

  let body: { connectionId?: string } = {};
  try {
    body = (await request.json()) as { connectionId?: string };
  } catch {
    /* empty */
  }

  let connectionId = typeof body.connectionId === "string" ? body.connectionId.trim() : "";
  if (!connectionId) {
    const { data: first } = await admin
      .from("avito_oauth")
      .select("id")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    connectionId = (first as { id?: string } | null)?.id ?? "";
  }

  if (!connectionId) {
    return NextResponse.json({ error: "not_connected" }, { status: 404 });
  }

  const { data: own } = await admin
    .from("avito_oauth")
    .select("id")
    .eq("user_id", user.id)
    .eq("id", connectionId)
    .maybeSingle();

  if (!own) {
    return NextResponse.json({ error: "connection_not_found" }, { status: 404 });
  }

  const result = await syncAvitoSnapshot(admin, user.id, connectionId);

  if (!result.ok) {
    await logIntegrationActivity(admin, user.id, "Авито", `Ошибка синхронизации: ${result.message}`, "bad");
    return NextResponse.json({ ok: false, error: result.message }, { status: 502 });
  }

  await logIntegrationActivity(
    admin,
    user.id,
    "Авито",
    `Синхронизация: ${result.payload.totals.itemsListed} объявл., просмотры ${result.payload.totals.uniqViews}, контакты ${result.payload.totals.uniqContacts}.`,
    "ok"
  );

  return NextResponse.json({ ok: true, payload: result.payload });
}
