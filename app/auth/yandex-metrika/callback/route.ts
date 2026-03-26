import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseAuthRouteClient } from "@/app/lib/supabaseAuthRoute";
import { getSupabaseServiceRoleClient } from "@/app/lib/supabaseServiceRole";
import { withBasePath } from "@/app/lib/publicBasePath";
import {
  getYandexMetrikaRedirectUri,
  YANDEX_METRIKA_OAUTH_STATE_COOKIE,
} from "@/app/lib/yandexMetrikaOAuth";
import { getYandexPassportProfile } from "@/app/lib/yandexPassportLogin";

function systemsRedirect(origin: string, query: Record<string, string>) {
  const q = new URLSearchParams(query).toString();
  return NextResponse.redirect(`${origin}${withBasePath(`/app/systems?${q}`)}`);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;

  const yandexError = url.searchParams.get("error");
  if (yandexError) {
    return systemsRedirect(origin, {
      ym_error: url.searchParams.get("error_description") || yandexError,
    });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return systemsRedirect(origin, { ym_error: "missing_code_or_state" });
  }

  const cookieStore = await cookies();
  const expected = cookieStore.get(YANDEX_METRIKA_OAUTH_STATE_COOKIE)?.value;
  cookieStore.set(YANDEX_METRIKA_OAUTH_STATE_COOKIE, "", {
    path: "/",
    maxAge: 0,
  });

  if (!expected || expected !== state) {
    return systemsRedirect(origin, { ym_error: "invalid_state" });
  }

  const supabase = await createSupabaseAuthRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return systemsRedirect(origin, { ym_error: "not_logged_in" });
  }

  const clientId = process.env.YANDEX_METRIKA_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.YANDEX_METRIKA_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return systemsRedirect(origin, { ym_error: "server_oauth_not_configured" });
  }

  let admin;
  try {
    admin = getSupabaseServiceRoleClient();
  } catch {
    return systemsRedirect(origin, { ym_error: "server_db_not_configured" });
  }

  const redirectUri = getYandexMetrikaRedirectUri(request.url);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch("https://oauth.yandex.ru/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const rawText = await tokenRes.text();
  let tokenJson: Record<string, unknown>;
  try {
    tokenJson = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return systemsRedirect(origin, { ym_error: "token_not_json" });
  }

  if (!tokenRes.ok) {
    const msg =
      typeof tokenJson.error_description === "string"
        ? tokenJson.error_description
        : typeof tokenJson.error === "string"
          ? tokenJson.error
          : "token_exchange_failed";
    return systemsRedirect(origin, { ym_error: msg });
  }

  const accessToken = typeof tokenJson.access_token === "string" ? tokenJson.access_token : "";
  if (!accessToken) {
    return systemsRedirect(origin, { ym_error: "no_access_token" });
  }

  const expiresIn =
    typeof tokenJson.expires_in === "number" && Number.isFinite(tokenJson.expires_in)
      ? tokenJson.expires_in
      : 3600;
  const refreshToken =
    typeof tokenJson.refresh_token === "string" ? tokenJson.refresh_token : null;

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  const passport = await getYandexPassportProfile(accessToken).catch(() => null);

  const { error: upsertError } = await admin.from("yandex_metrika_oauth").upsert(
    {
      user_id: user.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
      yandex_login: passport?.login ?? null,
      yandex_email: passport?.defaultEmail ?? null,
    },
    { onConflict: "user_id" }
  );

  if (upsertError) {
    return systemsRedirect(origin, { ym_error: upsertError.message });
  }

  return systemsRedirect(origin, { ym: "connected" });
}
