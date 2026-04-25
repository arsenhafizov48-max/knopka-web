import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseAuthRouteClient } from "@/app/lib/supabaseAuthRoute";
import { AVITO_OAUTH_STATE_COOKIE, getAvitoRedirectUri } from "@/app/lib/avitoOAuth";

export async function GET(request: Request) {
  const supabase = await createSupabaseAuthRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const clientId = process.env.AVITO_OAUTH_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json({ error: "server_oauth_not_configured" }, { status: 503 });
  }
  const scope = (process.env.AVITO_OAUTH_SCOPE?.trim() || "items:info,stats:read").replace(/\s+/g, "");

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(AVITO_OAUTH_STATE_COOKIE, state, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 10,
  });

  const redirectUri = getAvitoRedirectUri(request.url);
  const authUrl = new URL("https://avito.ru/oauth");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}

