const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export function isTurnstileConfigured(): boolean {
  return Boolean(SITE_KEY);
}

export function getTurnstileSiteKey(): string {
  return SITE_KEY;
}

export async function verifyTurnstileToken(token: string | null): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isTurnstileConfigured()) return { ok: true };
  if (!token) {
    return { ok: false, message: "Пройдите проверку «Я не робот»" };
  }
  const res = await fetch("/api/auth/turnstile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    return { ok: false, message: "Проверка не пройдена. Обновите капчу и попробуйте снова." };
  }
  return { ok: true };
}
