import { NextResponse } from "next/server";

import { gigachatChatCompletion, type GigaChatMessage } from "@/app/lib/gigachat/server";

const SYSTEM_PROMPT = `Ты — ассистент продукта «КНОПКА» (маркетинговый кабинет для бизнеса).
Пользователь на странице «Стратегия маркетинга». Ниже в сообщении может быть снимок его фактуры из ЛК (точка А/Б, каналы, материалы, ссылки и т.д.) и/или текст сформированной стратегии.
Опирайся ТОЛЬКО на эти данные: не выдумывай цифры, города, выручку и факты, которых нет в снимке. Если чего-то нет — скажи прямо и предложи, что заполнить в кабинете (Фактура, шаги онбординга, материалы).
Отвечай по-русски, структурировано. Форматируй ответ в Markdown: заголовки ## и ###, списки, **жирный** для акцентов, при необходимости таблицы. Можешь анализировать разрыв А→Б, каналы, гипотезы и формулировки для стратегии.`;

const MAX_USER_CHARS = 12_000;
const MAX_HISTORY = 24;

type Body = {
  text?: string;
  strategyContext?: string;
  /** Снимок фактуры из ЛК (точка А/Б, материалы, каналы…) */
  cabinetContext?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
};

export async function POST(req: Request) {
  if (!process.env.GIGACHAT_AUTHORIZATION_KEY?.trim()) {
    return NextResponse.json(
      { error: "GigaChat не настроен: добавьте GIGACHAT_AUTHORIZATION_KEY в переменные окружения." },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Пустое сообщение" }, { status: 400 });
  }
  if (text.length > MAX_USER_CHARS) {
    return NextResponse.json({ error: "Сообщение слишком длинное" }, { status: 400 });
  }

  const strategyContext =
    typeof body.strategyContext === "string" ? body.strategyContext.trim().slice(0, 24_000) : "";

  const cabinetContext =
    typeof body.cabinetContext === "string" ? body.cabinetContext.trim().slice(0, 28_000) : "";

  const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY) : [];
  for (const m of history) {
    if (
      (m.role !== "user" && m.role !== "assistant") ||
      typeof m.content !== "string" ||
      m.content.length > MAX_USER_CHARS
    ) {
      return NextResponse.json({ error: "Некорректная история диалога" }, { status: 400 });
    }
  }

  let system = SYSTEM_PROMPT;
  if (cabinetContext) {
    system += `\n\n${cabinetContext}`;
  }
  if (strategyContext) {
    system += `\n\nКонтекст сформированного документа стратегии:\n${strategyContext}`;
  }

  const messages: GigaChatMessage[] = [{ role: "system", content: system }];

  for (const m of history) {
    messages.push({ role: m.role, content: m.content.trim() });
  }
  messages.push({ role: "user", content: text });

  try {
    const reply = await gigachatChatCompletion(messages);
    return NextResponse.json({ reply });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Ошибка GigaChat";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
