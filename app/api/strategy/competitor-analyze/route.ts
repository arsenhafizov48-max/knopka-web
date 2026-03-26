import { NextResponse } from "next/server";

import { formatProjectFactForAi } from "@/app/app/lib/gigachat/formatProjectFactForAi";
import type { ProjectFact } from "@/app/app/lib/projectFact";
import { parseCompetitorAnalysisJson } from "@/app/app/lib/strategy/parseCompetitorAnalysis";
import { gigachatChatCompletion } from "@/app/lib/gigachat/server";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function parseModelJson(text: string): Record<string, unknown> {
  const t = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("В ответе модели нет JSON-объекта");
  }
  return JSON.parse(t.slice(start, end + 1)) as Record<string, unknown>;
}

function parseFact(body: unknown): ProjectFact | null {
  if (!body || typeof body !== "object") return null;
  const b = body as { fact?: unknown };
  const f = b.fact;
  if (!f || typeof f !== "object") return null;
  return f as ProjectFact;
}

function buildUserPrompt(factBlock: string, niche: string, geo: string): string {
  return `${factBlock}

Задача: подготовить анализ конкурентов для локального бизнеса в нише «${niche}», география «${geo}».

Ты опираешься на общеизвестные сведения о рынке и типичных игроках; это НЕ живой парсинг сайтов и карт. Явно укажи в поле source у каждой строки, на чём основано (например: «публичный сайт / отзывы», «типичный игрок ниши», «оценка по открытым данным»).

Нужны три блока — как в шаблоне Excel:

1) sites — конкуренты в поиске/сайтах (10–15 строк). Колонки:
   num, top (строка «Да» или «Нет» — оценка «в топе» по нише в регионе), competitor, segment, priceAnchor, positioning, strengths, weaknesses, source,
   channel — одно из: seo | ads | mixed | unknown (SEO vs реклама vs смешанно; обоснуй логику кратко в strengths/weaknesses при необходимости).

2) yandexMaps — карточки в духе Яндекс.Карт (8–12 строк). Колонки:
   num, top, competitor, location (район/метро/адрес если уместно), rating (рейтинг и отзывы текстом), cardSnippet (что видно в сниппете карточки), strengthMaps, weakness, source.

3) gis2 — аналогично для 2ГИС (8–12 строк), те же поля что yandexMaps.

Верни ТОЛЬКО один JSON без markdown:
{
  "sites": [ { ... } ],
  "yandexMaps": [ { ... } ],
  "gis2": [ { ... } ]
}

Числа num — порядковые 1..N внутри каждого массива. Не дублируй один и тот же бренд без смысла; включай реальных типичных конкурентов региона, если они известны.`;
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Требуется вход в аккаунт" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad("Некорректный JSON");
  }

  const fact = parseFact(body);
  if (!fact) {
    return bad("Нужен объект fact");
  }

  const niche = String(fact.niche ?? "").trim();
  const geo = String(fact.geo ?? "").trim();
  if (!niche || !geo) {
    return bad("В фактуре должны быть заполнены ниша и география");
  }

  const factBlock = formatProjectFactForAi(fact);
  const userPrompt = buildUserPrompt(factBlock, niche, geo);

  let raw: string;
  try {
    raw = await gigachatChatCompletion([
      {
        role: "system",
        content:
          "Ты маркетолог-аналитик. Отвечай только валидным JSON по схеме пользователя. Не выдумывай точные рейтинги и цены: формулируй осторожно («от…», «ориентир»). Поля на латинице как в примере (yandexMaps, sites, gis2).",
      },
      { role: "user", content: userPrompt },
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "GigaChat";
    return NextResponse.json({ error: `GigaChat: ${msg}` }, { status: 502 });
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = parseModelJson(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "parse";
    return NextResponse.json({ error: `Не удалось разобрать JSON модели: ${msg}` }, { status: 502 });
  }

  const payload = parseCompetitorAnalysisJson(parsed);
  if (!payload) {
    return NextResponse.json(
      { error: "Модель вернула пустой или неподдерживаемый формат таблиц" },
      { status: 502 }
    );
  }

  const factSnapshot = JSON.parse(JSON.stringify(fact)) as Record<string, unknown>;

  const { data: row, error: insErr } = await supabase
    .from("strategy_competitor_runs")
    .insert({
      user_id: user.id,
      geo,
      niche,
      fact_snapshot: factSnapshot,
      sites: payload.sites,
      yandex_maps: payload.yandexMaps,
      gis2: payload.gis2,
      raw_model_text: raw.slice(0, 120_000),
    })
    .select("id, created_at")
    .single();

  if (insErr || !row) {
    return NextResponse.json(
      { error: insErr?.message ?? "Не удалось сохранить анализ" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    id: row.id,
    createdAt: row.created_at,
    ...payload,
  });
}
