import * as https from "node:https";
import { randomUUID } from "crypto";
import { URL } from "node:url";

const OAUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
const CHAT_URL = "https://gigachat.devices.sberbank.ru/api/v1/chat/completions";

export type GigaChatMessage = { role: "system" | "user" | "assistant"; content: string };

/**
 * Запросы к хостам Сбера с Vercel/AWS часто падают на проверке TLS (цепочка CA),
 * т.к. корневой сертификат не в стандартном хранилище Node.
 * Для этих двух фиксированных URL отключаем verify — только здесь, не для всего приложения.
 */
function sberHttpsRequest(
  urlString: string,
  method: string,
  headers: Record<string, string>,
  body: string | null
): Promise<{ statusCode: number; raw: string }> {
  const url = new URL(urlString);
  const merged: Record<string, string> = { ...headers };
  if (body !== null) {
    merged["Content-Length"] = String(Buffer.byteLength(body, "utf8"));
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method,
        headers: merged,
        rejectUnauthorized: false,
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => {
          raw += chunk;
        });
        res.on("end", () => {
          resolve({ statusCode: res.statusCode ?? 0, raw });
        });
      }
    );
    req.on("error", reject);
    if (body !== null) {
      req.write(body, "utf8");
    }
    req.end();
  });
}

function authorizationHeader(): string {
  const key = process.env.GIGACHAT_AUTHORIZATION_KEY?.trim();
  if (!key) {
    throw new Error("GIGACHAT_AUTHORIZATION_KEY не задан");
  }
  return key.startsWith("Basic ") ? key : `Basic ${key}`;
}

/** Access token ~30 мин; на каждый запрос чата запрашиваем новый (проще для serverless). */
export async function getGigaChatAccessToken(): Promise<string> {
  const scope = process.env.GIGACHAT_API_SCOPE?.trim() || "GIGACHAT_API_PERS";
  const body = new URLSearchParams({ scope }).toString();

  const { statusCode, raw } = await sberHttpsRequest(OAUTH_URL, "POST", {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
    Authorization: authorizationHeader(),
    RqUID: randomUUID(),
  }, body);

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`GigaChat OAuth ${statusCode}: ${raw.slice(0, 400)}`);
  }

  let data: { access_token?: string };
  try {
    data = JSON.parse(raw) as { access_token?: string };
  } catch {
    throw new Error("GigaChat OAuth: неверный JSON");
  }

  if (!data.access_token) {
    throw new Error("GigaChat OAuth: нет access_token");
  }

  return data.access_token;
}

export async function gigachatChatCompletion(messages: GigaChatMessage[]): Promise<string> {
  const token = await getGigaChatAccessToken();
  const model = process.env.GIGACHAT_MODEL?.trim() || "GigaChat";

  const payload = JSON.stringify({
    model,
    messages,
    temperature: 0.6,
    stream: false,
  });

  const { statusCode, raw } = await sberHttpsRequest(
    CHAT_URL,
    "POST",
    {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    payload
  );

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`GigaChat chat ${statusCode}: ${raw.slice(0, 500)}`);
  }

  let data: {
    choices?: Array<{ message?: { content?: string } }>;
  };
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    throw new Error("GigaChat: неверный JSON ответа");
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("GigaChat: пустой ответ модели");
  }

  return content;
}
