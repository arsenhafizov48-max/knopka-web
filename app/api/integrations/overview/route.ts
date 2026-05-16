import { NextResponse } from "next/server";

import { buildIntegrationsOverview } from "@/app/lib/integrationsContext";
import { createSupabaseAuthRouteClient } from "@/app/lib/supabaseAuthRoute";
import { getSupabaseServiceRoleClient } from "@/app/lib/supabaseServiceRole";

export async function GET() {
  const supabase = await createSupabaseAuthRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ authenticated: false, blockForAi: "", cards: [] });
  }

  let admin;
  try {
    admin = getSupabaseServiceRoleClient();
  } catch {
    return NextResponse.json({
      authenticated: true,
      blockForAi:
        "Интеграции: сервер без SUPABASE_SERVICE_ROLE_KEY — сводка Метрика/Директ/Авито недоступна.",
      cards: [],
    });
  }

  const overview = await buildIntegrationsOverview(admin, user.id);

  return NextResponse.json({
    authenticated: true,
    ...overview,
  });
}
