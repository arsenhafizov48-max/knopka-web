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
    .select("expires_at, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { connected: false, authenticated: true, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    connected: !!data,
    authenticated: true,
    expiresAt: data?.expires_at ?? null,
    updatedAt: data?.updated_at ?? null,
  });
}
