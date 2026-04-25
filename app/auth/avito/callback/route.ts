import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseAuthRouteClient } from "@/app/lib/supabaseAuthRoute";
import { logIntegrationActivity } from "@/app/lib/integrationActivity";
import { getSupabaseServiceRoleClient } from "@/app/lib/supabaseServiceRole";
import { withBasePath } from "@/app/lib/publicBasePath";
import { AVITO_OAUTH_STATE_COOKIE, getAvitoRedirectUri } from "@/app/lib/avitoOAuth";

function systemsRedirect(origin: string, query: Record<string, string>) {
  const q = new URLSearchParams(query).toString();
  return NextResponse.redirect(`${origin}${withBasePath(`/app/systems?${q}`)}`);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return systemsRedirect(origin, { av_error: "missing_code_or_state" });
  }

  const cookieStore = await cookies();
  const expected = cookieStore.get(AVITO_OAUTH_STATE_COOKIE)?.value;
  cookieStore.set(AVITO_OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  if (!expected || expected !== state) {
    return systemsRedirect(origin, { av_error: "invalid_state" });
  }

  const supabase = await createSupabaseAuthRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return systemsRedirect(origin, { av_error: "not_logged_in" });
  }

  const clientId = process.env.AVITO_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.AVITO_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return systemsRedirect(origin, { av_error: "server_oauth_not_configured" });
  }

  let admin;
  try {
    admin = getSupabaseServiceRoleClient();
  } catch {
    return systemsRedirect(origin, { av_error: "server_db_not_configured" });
  }

  const redirectUri = getAvitoRedirectUri(request.url);

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch("https://api.avito.ru/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const rawText = await tokenRes.text();
  let tokenJson: Record<string, unknown>;
  try {
    tokenJson = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return systemsRedirect(origin, { av_error: "token_not_json" });
  }

  if (!tokenRes.ok) {
    const msg =
      typeof tokenJson.error_description === "string"
        ? tokenJson.error_description
        : typeof tokenJson.error === "string"
          ? tokenJson.error
          : "token_exchange_failed";
    return systemsRedirect(origin, { av_error: msg });
  }

  const accessToken = typeof tokenJson.access_token === "string" ? tokenJson.access_token : "";
  if (!accessToken) {
    return systemsRedirect(origin, { av_error: "no_access_token" });
  }

  const expiresIn =
    typeof tokenJson.expires_in === "number" && Number.isFinite(tokenJson.expires_in)
      ? tokenJson.expires_in
      : 24 * 3600;
  const refreshToken = typeof tokenJson.refresh_token === "string" ? tokenJson.refresh_token : null;

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  const { error } = await admin.from("avito_oauth").insert({
    user_id: user.id,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return systemsRedirect(origin, { av_error: error.message });
  }

  await logIntegrationActivity(admin, user.id, "Авито", "Подключено", "ok");

  return systemsRedirect(origin, { av: "connected" });
}

