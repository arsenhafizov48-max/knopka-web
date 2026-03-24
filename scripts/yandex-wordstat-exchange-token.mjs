/**
 * Одноразовый обмен authorization code → access_token для API Вордстата.
 *
 * 1. В .env.local (не коммитить) добавь строки:
 *    YANDEX_OAUTH_CLIENT_ID=...
 *    YANDEX_OAUTH_CLIENT_SECRET=...
 *    YANDEX_OAUTH_CODE=код_со_страницы_яндекса
 *    (опционально) YANDEX_OAUTH_REDIRECT_URI=https://oauth.yandex.ru/verification_code
 *
 * 2. Запуск: npm run wordstat:exchange-token
 *
 * 3. Скопируй access_token в Vercel → YANDEX_WORDSTAT_OAUTH_TOKEN
 * 4. Удали YANDEX_OAUTH_CODE и секрет из .env.local после использования.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const p = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(p)) {
    console.error("Нет файла .env.local в корне проекта.");
    process.exit(1);
  }
  const out = {};
  const raw = fs.readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = loadEnvLocal();
const clientId = env.YANDEX_OAUTH_CLIENT_ID?.trim();
const clientSecret = env.YANDEX_OAUTH_CLIENT_SECRET?.trim();
const code = env.YANDEX_OAUTH_CODE?.trim();
const redirectUri =
  env.YANDEX_OAUTH_REDIRECT_URI?.trim() || "https://oauth.yandex.ru/verification_code";

if (!clientId || !clientSecret || !code) {
  console.error(
    "В .env.local нужны три переменные:\n" +
      "  YANDEX_OAUTH_CLIENT_ID\n" +
      "  YANDEX_OAUTH_CLIENT_SECRET\n" +
      "  YANDEX_OAUTH_CODE\n"
  );
  process.exit(1);
}

const body = new URLSearchParams({
  grant_type: "authorization_code",
  code,
  client_id: clientId,
  client_secret: clientSecret,
  redirect_uri: redirectUri,
});

const res = await fetch("https://oauth.yandex.ru/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: body.toString(),
});

const text = await res.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  console.error("Ответ не JSON:", text.slice(0, 500));
  process.exit(1);
}

if (!res.ok) {
  console.error("Ошибка:", res.status, json);
  process.exit(1);
}

if (!json.access_token) {
  console.error("В ответе нет access_token:", json);
  process.exit(1);
}

console.log("\n=== Скопируй в Vercel → YANDEX_WORDSTAT_OAUTH_TOKEN (только значение ниже) ===\n");
console.log(json.access_token);
console.log("\n=== Конец токена ===\n");
if (json.expires_in != null) {
  console.log("expires_in (сек):", json.expires_in);
}
if (json.refresh_token) {
  console.log("\nЕсть refresh_token — сохрани отдельно для продления (позже можно добавить в сервис).\n");
}
