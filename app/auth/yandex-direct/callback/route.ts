import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseAuthRouteClient } from "@/app/lib/supabaseAuthRoute";
import { logIntegrationActivity } from "@/app/lib/integrationActivity";
import { getSupabaseServiceRoleClient } from "@/app/lib/supabaseServiceRole";
import { withBasePath } from "@/app/lib/publicBasePath";
import {
  getYandexDirectRedirectUri,
  YANDEX_DIRECT_OAUTH_INTENT_COOKIE,
  YANDEX_DIRECT_OAUTH_STATE_COOKIE,
} from "@/app/lib/yandexDirectOAuth";
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
      yd_error: url.searchParams.get("error_description") || yandexError,
    });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return systemsRedirect(origin, { yd_error: "missing_code_or_state" });
  }

  const cookieStore = await cookies();
  const expected = cookieStore.get(YANDEX_DIRECT_OAUTH_STATE_COOKIE)?.value;
  const intent = cookieStore.get(YANDEX_DIRECT_OAUTH_INTENT_COOKIE)?.value ?? "default";
  cookieStore.set(YANDEX_DIRECT_OAUTH_STATE_COOKIE, "", {
    path: "/",
    maxAge: 0,
  });
  cookieStore.set(YANDEX_DIRECT_OAUTH_INTENT_COOKIE, "", {
    path: "/",
    maxAge: 0,
  });

  if (!expected || expected !== state) {
    return systemsRedirect(origin, { yd_error: "invalid_state" });
  }

  const supabase = await createSupabaseAuthRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return systemsRedirect(origin, { yd_error: "not_logged_in" });
  }

  const clientId = process.env.YANDEX_DIRECT_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.YANDEX_DIRECT_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return systemsRedirect(origin, { yd_error: "server_oauth_not_configured" });
  }

  let admin;
  try {
    admin = getSupabaseServiceRoleClient();
  } catch {
    return systemsRedirect(origin, { yd_error: "server_db_not_configured" });
  }

  const redirectUri = getYandexDirectRedirectUri(request.url);
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
    return systemsRedirect(origin, { yd_error: "token_not_json" });
  }

  if (!tokenRes.ok) {
    const msg =
      typeof tokenJson.error_description === "string"
        ? tokenJson.error_description
        : typeof tokenJson.error === "string"
          ? tokenJson.error
          : "token_exchange_failed";
    return systemsRedirect(origin, { yd_error: msg });
  }

  const accessToken = typeof tokenJson.access_token === "string" ? tokenJson.access_token : "";
  if (!accessToken) {
    return systemsRedirect(origin, { yd_error: "no_access_token" });
  }

  const expiresIn =
    typeof tokenJson.expires_in === "number" && Number.isFinite(tokenJson.expires_in)
      ? tokenJson.expires_in
      : 3600;
  const refreshToken =
    typeof tokenJson.refresh_token === "string" ? tokenJson.refresh_token : null;

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  const passport = await getYandexPassportProfile(accessToken).catch(() => null);

  const { count: existingCount, error: countErr } = await admin
    .from("yandex_direct_oauth")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (countErr) {
    return systemsRedirect(origin, { yd_error: countErr.message });
  }

  const n = existingCount ?? 0;
  const row = {
    user_id: user.id,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
    yandex_login: passport?.login ?? null,
    yandex_email: passport?.defaultEmail ?? null,
  };

  let insertError: { message: string } | null = null;
  if (intent === "add") {
    const { error } = await admin.from("yandex_direct_oauth").insert({
      id: randomUUID(),
      ...row,
    });
    insertError = error;
  } else if (n === 0) {
    const { error } = await admin.from("yandex_direct_oauth").insert({
      id: randomUUID(),
      ...row,
    });
    insertError = error;
  } else {
    return systemsRedirect(origin, {
      yd_error:
        "Уже есть подключение Директа. Нажмите «Подключить ещё аккаунт» или отключите существующее.",
    });
  }

  if (insertError) {
    return systemsRedirect(origin, { yd_error: insertError.message });
  }

  const label =
    passport?.defaultEmail ?? passport?.login ?? "новый аккаунт";
  await logIntegrationActivity(
    admin,
    user.id,
    "Яндекс Директ",
    `Подключён аккаунт: ${label}.`,
    "ok"
  );

  return systemsRedirect(origin, { yd: "connected" });
}
