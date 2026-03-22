import { NextResponse } from "next/server";

/**
 * Проверка Cloudflare Turnstile на сервере.
 * Без TURNSTILE_SECRET_KEY в .env — маршрут возвращает ok (удобно для локалки).
 */
export async function POST(req: Request) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  let token: string | undefined;
  try {
    const body = (await req.json()) as { token?: string };
    token = body.token;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  if (!secret) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  if (!token) {
    return NextResponse.json({ ok: false, error: "no_token" }, { status: 400 });
  }

  const params = new URLSearchParams();
  params.set("secret", secret);
  params.set("response", token);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = (await res.json()) as { success?: boolean };
  if (!data.success) {
    return NextResponse.json({ ok: false, error: "verify_failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
