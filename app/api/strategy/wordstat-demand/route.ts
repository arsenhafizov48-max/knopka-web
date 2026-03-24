import { NextResponse } from "next/server";

import { gigachatChatCompletion } from "@/app/lib/gigachat/server";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { wordstatTopRequests } from "@/app/lib/wordstat/client";
import {
  getWordstatRegionsTreeCached,
  isAllRussiaGeo,
  regionLabelForUi,
  resolveWordstatRegionIds,
} from "@/app/lib/wordstat/regionResolve";
import type { WordstatTopRequestsResult } from "@/app/lib/wordstat/types";

const MAX_TARGET = 22;
const MAX_BROAD = 12;
const MAX_COMBINED = 36;
const TOP_N = 9;

type FactPayload = {
  niche: string;
  geo: string;
  economics?: { product?: string };
  services?: string[];
  projectName?: string;
};

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function normalizeText(s: unknown): string {
  return typeof s === "string" ? s.trim() : "";
}

function describeProduct(f: FactPayload): string {
  const p = normalizeText(f.economics?.product);
  if (p) return p;
  const svc = (f.services ?? []).map((s) => normalizeText(s)).filter(Boolean);
  return svc.join(", ");
}

function parseFact(body: unknown): FactPayload | null {
  if (!body || typeof body !== "object") return null;
  const b = body as { fact?: unknown };
  const f = b.fact;
  if (!f || typeof f !== "object") return null;
  const o = f as Record<string, unknown>;
  const niche = normalizeText(o.niche);
  const geo = normalizeText(o.geo);
  if (!niche || !geo) return null;
  return {
    niche,
    geo,
    economics:
      o.economics && typeof o.economics === "object"
        ? (o.economics as FactPayload["economics"])
        : undefined,
    services: Array.isArray(o.services)
      ? o.services.filter((x): x is string => typeof x === "string")
      : undefined,
    projectName: typeof o.projectName === "string" ? o.projectName.trim() : undefined,
  };
}

function normPhrase(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/ё/g, "е");
}

function uniqStrings(arr: unknown[], cap: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    if (typeof x !== "string") continue;
    let t = x.trim().replace(/^["'\s]+|["'\s]+$/g, "");
    if (t.length < 2) continue;
    const k = normPhrase(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= cap) break;
  }
  return out;
}

function asStringList(arr: unknown[], max: number): string[] {
  const out: string[] = [];
  for (const x of arr) {
    if (typeof x !== "string") continue;
    const t = x.trim().replace(/\s+/g, " ");
    if (t.length < 2) continue;
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function dedupeLowerPreserveOrder(arr: string[]): string[] {
  const seen = new Set<string>();
  return arr.filter((s) => {
    const k = s.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
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

function asTopResults(data: unknown): WordstatTopRequestsResult[] {
  if (Array.isArray(data)) return data as WordstatTopRequestsResult[];
  if (data && typeof data === "object") return [data as WordstatTopRequestsResult];
  return [];
}

type StatRow = {
  kind: "target" | "broad";
  seed: string;
  totalCount: number | null;
  top: { phrase: string; count: number }[];
  error?: string;
};

/**
 * POST /api/strategy/wordstat-demand
 * Тело: { fact: ProjectFact } — достаточно niche, geo, economics.product / services.
 * GigaChat предлагает фразы (целевые / общие) → один batch topRequests → GigaChat пишет блок стратегии.
 */
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
    return bad("Нужен объект fact с непустыми полями niche и geo");
  }

  const tree = await getWordstatRegionsTreeCached();
  const regionIds = resolveWordstatRegionIds(fact.geo, tree);
  const regionLabel = regionLabelForUi(fact.geo, regionIds, tree);

  const product = describeProduct(fact);
  const project = normalizeText(fact.projectName);

  const step1User = `Ниша: ${fact.niche}
Проект: ${project || "—"}
Продукт/услуги: ${product || "не указано"}
География для поиска (из личного кабинета пользователя): ${regionLabel}
Исходная строка гео из фактуры: ${fact.geo}

Задача: составь набор поисковых фраз для Яндекс.Вордстат. Отчёт topRequests показывает спрос в масштабе, близком к месячному.

Верни ТОЛЬКО один JSON-объект без markdown и без текста вокруг:
{"target":["фраза",...],"broad":["фраза",...],"notes":"1 предложение"}

Правила:
- target: до ${MAX_TARGET} фраз — максимально релевантные покупательскому спросу в этой нише (коммерческие и информационные формулировки, русский язык).
- broad: до ${MAX_BROAD} фраз — более общий/смежный спрос, сравнения, широкие или двусмысленные запросы рядом с нишей.
- без дубликатов между списками, без пустых строк;
- фразы короткие (обычно 2–6 слов), без нумерации.`;

  let raw1: string;
  try {
    raw1 = await gigachatChatCompletion([
      {
        role: "system",
        content:
          "Ты маркетолог-исследователь. Отвечай только валидным JSON-объектом в одну строку или с переносами, без Markdown.",
      },
      { role: "user", content: step1User },
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "GigaChat";
    return NextResponse.json({ error: `GigaChat (подбор фраз): ${msg}` }, { status: 502 });
  }

  let parsed1: Record<string, unknown>;
  try {
    parsed1 = parseModelJson(raw1);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "parse";
    return NextResponse.json(
      { error: `Не удалось разобрать ответ модели (фразы): ${msg}` },
      { status: 502 }
    );
  }

  const target = uniqStrings(Array.isArray(parsed1.target) ? parsed1.target : [], MAX_TARGET);
  const broad = uniqStrings(Array.isArray(parsed1.broad) ? parsed1.broad : [], MAX_BROAD);

  const broadNorm = new Set(broad.map(normPhrase));
  const targetDedup = target.filter((t) => !broadNorm.has(normPhrase(t)));
  const combined = [...targetDedup, ...broad].slice(0, MAX_COMBINED);

  if (combined.length === 0) {
    return NextResponse.json({ error: "Модель не вернула ни одной фразы для Вордстата" }, { status: 502 });
  }

  const kindByNorm = new Map<string, "target" | "broad">();
  for (const p of targetDedup) kindByNorm.set(normPhrase(p), "target");
  for (const p of broad) kindByNorm.set(normPhrase(p), "broad");

  const wsParams: Parameters<typeof wordstatTopRequests>[0] = {
    phrases: combined,
    numPhrases: TOP_N,
  };
  if (regionIds?.length) wsParams.regions = regionIds;

  const ws = await wordstatTopRequests(wsParams);
  if (!ws.ok) {
    const status = ws.status === 429 ? 429 : ws.status === 503 ? 503 : 502;
    return NextResponse.json({ error: ws.message }, { status });
  }

  const results = asTopResults(ws.data);
  const rows: StatRow[] = [];

  for (const item of results) {
    const seed = normalizeText(item.requestPhrase);
    const kind = kindByNorm.get(normPhrase(seed)) ?? "target";
    if (item.error) {
      rows.push({
        kind,
        seed: seed || "?",
        totalCount: item.totalCount ?? null,
        top: [],
        error: item.error,
      });
      continue;
    }
    const top = (item.topRequests ?? [])
      .filter((x) => x && typeof x.phrase === "string" && typeof x.count === "number")
      .slice(0, TOP_N)
      .map((x) => ({ phrase: x.phrase, count: x.count }));
    rows.push({
      kind,
      seed: seed || "?",
      totalCount: item.totalCount ?? null,
      top,
    });
  }

  const geoNote = isAllRussiaGeo(fact.geo)
    ? "Запросы по всей России (регион в API не ограничивался)."
    : regionIds?.length
      ? `Регионы Вордстата: id ${regionIds.join(", ")}.`
      : "Регион по строке гео не сопоставился с деревом регионов API — использована вся Россия.";

  const step2User = `Контекст: ${geoNote}

Ниша: ${fact.niche}
География (для текста стратегии): ${regionLabel}
Продукт/услуги: ${product || "не указано"}

Ниже — данные Яндекс.Вордстат (метод topRequests): для каждой исходной фразы (seed) указан тип kind (target = целевой спрос, broad = более общий) и список популярных смежных запросов с полем count (условная частотность в масштабе сервиса).

${JSON.stringify(rows)}

Сформируй раздел «Анализ спроса и конкурентов» для маркетинговой стратегии.

Верни ТОЛЬКО JSON:
{"paragraphs":["...","..."], "bullets":["...","..."]}

Требования:
- paragraphs: 3–5 абзацев по-русски; в первом абзаце кратко укажи географию и что опора на Вордстат и подбор фраз (целевые vs общие) сделан моделью по нише из ЛК.
- объясни разницу между целевыми и общими запросами по фактическим данным;
- bullets: 5–8 конкретных рекомендаций (SEO, контент, реклама, посадочные);
- не придумывай числа вне переданного JSON; если по части фраз ошибки — честно упомяни ограничение выборки.`;

  let raw2: string;
  try {
    raw2 = await gigachatChatCompletion([
      {
        role: "system",
        content:
          "Ты стратег по маркетингу. Пиши связно по-русски. Ответ только валидным JSON-объектом, без Markdown.",
      },
      { role: "user", content: step2User },
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "GigaChat";
    return NextResponse.json({ error: `GigaChat (текст стратегии): ${msg}` }, { status: 502 });
  }

  let parsed2: Record<string, unknown>;
  try {
    parsed2 = parseModelJson(raw2);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "parse";
    return NextResponse.json(
      { error: `Не удалось разобрать ответ модели (стратегия): ${msg}` },
      { status: 502 }
    );
  }

  let paragraphs = asStringList(Array.isArray(parsed2.paragraphs) ? parsed2.paragraphs : [], 8);
  let bullets = dedupeLowerPreserveOrder(
    asStringList(Array.isArray(parsed2.bullets) ? parsed2.bullets : [], 14)
  );

  if (paragraphs.length === 0) {
    paragraphs.push(
      "По данным Вордстата удалось получить выборку смежных запросов; сформулируйте гипотезы по контенту и рекламе и проверьте их тестами с ограниченным бюджетом."
    );
  }
  if (bullets.length === 0) {
    bullets.push("Зафиксируйте 5–10 целевых ключевых фраз из отчёта и сверьте их с коммерческим предложением на посадочной странице.");
  }

  return NextResponse.json({
    regionLabel,
    regionIds: regionIds ?? null,
    allRussia: !regionIds?.length,
    phrases: { target: targetDedup.length, broad: broad.length, requested: combined.length },
    market: { paragraphs, bullets },
  });
}
