import type { SupabaseClient } from "@supabase/supabase-js";

type OauthRow = {
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
};

export async function ensureAvitoAccessToken(
  admin: SupabaseClient,
  userId: string,
  connectionId: string
): Promise<string> {
  const { data: row, error } = await admin
    .from("avito_oauth")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .eq("id", connectionId)
    .maybeSingle();

  if (error || !row) {
    throw new Error("Авито не подключено");
  }

  const r = row as OauthRow;
  const expMs = r.expires_at ? new Date(r.expires_at).getTime() : 0;
  const stale = !r.access_token || Date.now() > expMs - 120_000;

  if (!stale) return r.access_token;

  if (!r.refresh_token) {
    throw new Error("Нет refresh_token — переподключите Авито");
  }

  const clientId = process.env.AVITO_OAUTH_CLIENT_ID?.trim();
  const clientSecret = process.env.AVITO_OAUTH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("AVITO_OAUTH_CLIENT_ID/SECRET не заданы");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: r.refresh_token,
    client_id: clientId,
    client_secret: clientSecret,
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
    throw new Error("Avito token: неверный ответ");
  }

  if (!tokenRes.ok) {
    const msg =
      typeof tokenJson.error_description === "string"
        ? tokenJson.error_description
        : typeof tokenJson.error === "string"
          ? tokenJson.error
          : "refresh_failed";
    throw new Error(msg);
  }

  const accessToken = typeof tokenJson.access_token === "string" ? tokenJson.access_token : "";
  if (!accessToken) {
    throw new Error("Avito token: нет access_token");
  }

  const expiresIn =
    typeof tokenJson.expires_in === "number" && Number.isFinite(tokenJson.expires_in)
      ? tokenJson.expires_in
      : 86_400;
  const refreshToken =
    typeof tokenJson.refresh_token === "string" ? tokenJson.refresh_token : r.refresh_token;

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  await admin
    .from("avito_oauth")
    .update({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connectionId)
    .eq("user_id", userId);

  return accessToken;
}
