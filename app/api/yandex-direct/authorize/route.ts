import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseAuthRouteClient } from "@/app/lib/supabaseAuthRoute";
import {
  getYandexDirectRedirectUri,
  YANDEX_DIRECT_OAUTH_STATE_COOKIE,
  YANDEX_DIRECT_SCOPE,
} from "@/app/lib/yandexDirectOAuth";
import { withBasePath } from "@/app/lib/publicBasePath";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;

  const clientId = process.env.YANDEX_DIRECT_OAUTH_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json(
      { error: "YANDEX_DIRECT_OAUTH_CLIENT_ID is not configured" },
      { status: 503 }
    );
  }

  const supabase = await createSupabaseAuthRouteClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}${withBasePath("/login")}`);
  }

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(YANDEX_DIRECT_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const redirectUri = getYandexDirectRedirectUri(request.url);
  const authUrl = new URL("https://oauth.yandex.ru/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", YANDEX_DIRECT_SCOPE);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
