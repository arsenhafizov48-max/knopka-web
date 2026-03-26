import { NextResponse } from "next/server";

import { formatProjectFactForAi } from "@/app/app/lib/gigachat/formatProjectFactForAi";
import type { ProjectFact } from "@/app/app/lib/projectFact";
import { parseCompetitorAnalysisJson } from "@/app/app/lib/strategy/parseCompetitorAnalysis";
import { gigachatChatCompletion } from "@/app/lib/gigachat/server";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";

/** Лимит времени на Vercel Pro (на Hobby часто ~10 с — см. документацию хостинга). */
export const maxDuration = 120;

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function isStrategyCompetitorRunsTableMissing(err: { message?: string; code?: string } | null): boolean {
  if (!err?.message) return false;
  const m = err.message.toLowerCase();
  return (
    m.includes("strategy_competitor_runs") ||
    m.includes("schema cache") ||
    m.includes("does not exist") ||
    err.code === "PGRST205"
  );
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

Задача: экспертный анализ конкурентов для бизнеса в нише «${niche}», география «${geo}».

Важно:
- Ты не выполняешь реальный краулинг в реальном времени, но обязан опираться на типичную структуру сайтов и карточек в этой нише/городе и давать содержательный разбор (оффер, цены «от…», сегмент, УТП), как если бы ты изучил публичные страницы. В source укажи основу: «публичный сайт / типовая витрина», «карточка на картах», «оценка по открытым данным».
- Для каждого конкурента в sites обязательно заполни siteUrl — рабочий https://… главной или услуги (если точный URL неизвестен, укажи наиболее вероятный официальный домен бренда в этом регионе и отметь это в source).

1) sites — от 10 до 20 строк (ровно в этом диапазоне). Поля JSON:
   num, top («Да»/«Нет» — оценка видимости в нише в регионе),
   competitor (краткое название без URL),
   siteUrl (полный URL, https),
   segment, priceAnchor, positioning (оффер/позиционирование),
   strengths, weaknesses (в т.ч. «куда бить»),
   source,
   channel: seo | ads | mixed | unknown

2) yandexMaps — от 10 до 20 строк: конкуренты в радиусе ~3 км от типичной точки обслуживания в «${geo}» (ориентир; если точный адрес в фактуре не задан — оценка по центру города/района из строки гео). Поля:
   num, top, competitor, mapUrl (ссылка на карточку org или поиск — https://…),
   location (район/метро),
   ratingStars (например 4.5), ratingsCount (число оценок), reviewsCount (число отзывов),
   rating (дублирующая короткая строка «звёзды / оценки / отзывы» для совместимости),
   cardSnippet (что видно на карточке),
   strengthMaps, weakness, source

3) gis2 — то же что yandexMaps, от 10 до 20 строк, поля идентичны.

Верни ТОЛЬКО один JSON без markdown:
{
  "sites": [ { ... } ],
  "yandexMaps": [ { ... } ],
  "gis2": [ { ... } ]
}

num — 1..N внутри каждого массива. Без дубликатов бренда без смысла. Анализ должен быть подробным и экспертным.`;
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
          "Ты эксперт по маркетингу и конкурентному анализу. Отвечай только валидным JSON. Включай реалистичные https-ссылки siteUrl и mapUrl. Рейтинги и цены — осторожно («от…», «ориентир»). Ключи: sites, yandexMaps, gis2.",
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

  if (insErr && isStrategyCompetitorRunsTableMissing(insErr)) {
    return NextResponse.json({
      ...payload,
      id: null as string | null,
      createdAt: null as string | null,
      persisted: false,
      warning:
        "Таблица в Supabase ещё не создана: в панели проекта выполните SQL из файла supabase/migrations/008_strategy_competitor_runs.sql (раздел SQL Editor → Run). Пока анализ показан ниже, но в «Историю анализов» не попал.",
    });
  }

  if (insErr || !row) {
    return NextResponse.json(
      { error: insErr?.message ?? "Не удалось сохранить анализ" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    id: row.id,
    createdAt: row.created_at,
    persisted: true,
    ...payload,
  });
}
