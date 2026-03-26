import type { SupabaseClient } from "@supabase/supabase-js";

type OauthRow = {
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
};

export async function ensureYandexMetrikaAccessToken(
  admin: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: row, error } = await admin
    .from("yandex_metrika_oauth")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !row) {
    throw new Error("Яндекс Метрика не подключена");
  }

  const r = row as OauthRow;
  const expMs = r.expires_at ? new Date(r.expires_at).getTime() : 0;
  const stale = !r.access_token || Date.now() > expMs - 120_000;

  if (!stale) return r.access_token;

  if (!r.refresh_token) {
    throw new Error("Нет refresh_token — переподключите Метрику");
  }

  const clientId = process.env.YANDEX_METRIKA_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.YANDEX_METRIKA_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("YANDEX_METRIKA_OAUTH_CLIENT_ID/SECRET не заданы");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: r.refresh_token,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const tokenRes = await fetch("https://oauth.yandex.ru/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const raw = await tokenRes.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("OAuth: ответ не JSON");
  }

  if (!tokenRes.ok) {
    const msg =
      typeof json.error_description === "string"
        ? json.error_description
        : typeof json.error === "string"
          ? json.error
          : "refresh_token failed";
    throw new Error(msg);
  }

  const accessToken = typeof json.access_token === "string" ? json.access_token : "";
  if (!accessToken) throw new Error("OAuth: нет access_token");

  const expiresIn =
    typeof json.expires_in === "number" && Number.isFinite(json.expires_in)
      ? json.expires_in
      : 3600;
  const newRefresh =
    typeof json.refresh_token === "string" ? json.refresh_token : r.refresh_token;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const now = new Date().toISOString();

  const { error: upErr } = await admin
    .from("yandex_metrika_oauth")
    .update({
      access_token: accessToken,
      refresh_token: newRefresh,
      expires_at: expiresAt,
      updated_at: now,
    })
    .eq("user_id", userId);

  if (upErr) throw new Error(upErr.message);

  return accessToken;
}
