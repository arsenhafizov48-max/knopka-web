import { NextResponse } from "next/server";

import { createSupabaseAuthRouteClient } from "@/app/lib/supabaseAuthRoute";
import { logIntegrationActivity } from "@/app/lib/integrationActivity";
import { getSupabaseServiceRoleClient } from "@/app/lib/supabaseServiceRole";

export async function POST(request: Request) {
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

  let id = "";
  try {
    const j = (await request.json()) as { id?: string };
    id = typeof j.id === "string" ? j.id.trim() : "";
  } catch {
    /* empty */
  }

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const { error } = await admin.from("avito_oauth").delete().eq("user_id", user.id).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logIntegrationActivity(admin, user.id, "Авито", "Отключено", "info");
  return NextResponse.json({ ok: true });
}

