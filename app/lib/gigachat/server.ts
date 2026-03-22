import { randomUUID } from "crypto";

const OAUTH_URL = "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
const CHAT_URL = "https://gigachat.devices.sberbank.ru/api/v1/chat/completions";

export type GigaChatMessage = { role: "system" | "user" | "assistant"; content: string };

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
  const res = await fetch(OAUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: authorizationHeader(),
      RqUID: randomUUID(),
    },
    body: new URLSearchParams({ scope }).toString(),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`GigaChat OAuth ${res.status}: ${raw.slice(0, 400)}`);
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

  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
      stream: false,
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`GigaChat chat ${res.status}: ${raw.slice(0, 500)}`);
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
