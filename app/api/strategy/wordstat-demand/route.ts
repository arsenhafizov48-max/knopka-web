import { NextResponse } from "next/server";

import type { StrategyTable } from "@/app/app/lib/strategy/types";
import { gigachatChatCompletion } from "@/app/lib/gigachat/server";
import { getSupabaseServerClient } from "@/app/lib/supabaseServer";
import { wordstatTopRequests } from "@/app/lib/wordstat/client";
import {
  extractGeoTokensForStripping,
  stripGeoTokensFromPhrase,
} from "@/app/lib/wordstat/phraseGeoSanitize";
import {
  getWordstatRegionsTreeCached,
  isAllRussiaGeo,
  regionLabelForUi,
  resolveWordstatRegionIds,
} from "@/app/lib/wordstat/regionResolve";
import type { WordstatTopRequestsResult } from "@/app/lib/wordstat/types";

const N_TARGET = 10;
const N_BROAD = 30;
const TOP_N = 8;

type FactPayload = {
  niche: string;
  geo: string;
  economics?: { product?: string; averageCheck?: string; marginPercent?: string };
  services?: string[];
  projectName?: string;
};

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

function normalizeText(s: unknown): string {
  return typeof s === "string" ? s.trim() : "";
}

function fmtNum(n: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
}

/** Средний чек из строки фактуры: «75 000», «75к», «75 т.р.», «75000». */
function parseAverageCheckRub(raw: string): number | null {
  const s = normalizeText(raw).toLowerCase();
  if (!s) return null;
  let mult = 1;
  if (/\bмлн\b|миллион/i.test(s)) mult = 1_000_000;
  else if (/\bк\b|тыс|т\.?\s*р|тысяч/i.test(s)) mult = 1000;

  const digits = normalizeText(raw).replace(/\s/g, "").replace(",", ".");
  const n = Number(digits.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * mult);
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
  const econ =
    o.economics && typeof o.economics === "object"
      ? (o.economics as FactPayload["economics"])
      : undefined;
  return {
    niche,
    geo,
    economics: econ,
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

function numPercent(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const t = v.trim().replace("%", "").replace(",", ".");
    const n = parseFloat(t);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function clampConversionPercent(p: number): number {
  if (!Number.isFinite(p)) return 1;
  return Math.min(15, Math.max(0.01, p));
}

type StatRow = {
  kind: "target" | "broad";
  seed: string;
  totalCount: number | null;
  top: { phrase: string; count: number }[];
  error?: string;
};

function buildStep1User(
  fact: FactPayload,
  regionLabel: string,
  coreProduct: string,
  productCombined: string,
  servicesLine: string,
  project: string,
  attempt: number,
  hasRegionFilter: boolean
): string {
  const geoRule = hasRegionFilter
    ? `КРИТИЧНО — как в веб-интерфейсе Яндекс.Вордстата: регион «${regionLabel}» уже задаётся ОТДЕЛЬНО в API (параметр regions), пользователь вводит запрос БЕЗ города, а фильтр — «Казань» и т.д.
Поэтому в КАЖДОЙ фразе ЗАПРЕЩЕНО писать названия городов, областей, краёв, «в Казани», «Казань», «Татарстан» и любые топонимы из строки гео. Иначе спрос сильно занижается: люди чаще ищут «маркетинговое агентство», а не «маркетинговое агентство казань».`
    : `География в интерфейсе: ${regionLabel}. Если это по сути вся Россия без привязки города в API — топоним в фразе допустим только если без него теряется смысл (редко).`;

  const retry =
    attempt > 0
      ? `\n\nПовтор: нужно СТРОГО 10 target и 30 broad.${hasRegionFilter ? " Снова БЕЗ названий городов/регионов в тексте фраз — только параметр regions." : ""}`
      : "";

  return `Ты подбираешь ключевые фразы под Яндекс.Вордстат.

Основная ниша (из ЛК): ${fact.niche}
Ключевой продукт/оффер (отдельное поле фактуры, если есть): ${coreProduct || "—"}
Сводка продукт/услуги: ${productCombined || "не указано"}
Дополнительные услуги (из фактуры, список): ${servicesLine}
Проект: ${project || "—"}
Строка гео в ЛК: ${fact.geo}

${geoRule}

Логика подбора:
- target (10 шт.): «целевой» коммерческий спрос по ОСНОВНОЙ нише и ключевому офферу. Делай синонимы и близкие формулировки: например при нише «маркетинговое агентство» — «маркетинговое агентство», «интернет-маркетинг агентство», «digital агентство», «агентство интернет-маркетинга», «маркетолог на аутсорсе», «аутсорс маркетолог» — всё по смыслу ниши, без города в строке.
- broad (30 шт.): более широкий и смежный спрос, сравнения, информационные, конкурирующие формулировки. Если в доп. услугах есть сайт, контекст, SMM, брендинг — включай ОТДЕЛЬНЫЕ широкие запросы по этим темам (тоже без топонима, если действует запрет выше).

Задача: составить фразы для метода topRequests. По каждой фразе API вернёт «спрос» за период ~месяц.

Верни ТОЛЬКО JSON без markdown:
{"target":["...","..." x10],"broad":["...","..." x30],"notes":"одно предложение"}

Жёстко:
- РОВНО 10 уникальных target и РОВНО 30 уникальных broad, без пересечения между списками.
- Фразы 2–7 слов, русский язык, без кавычек и нумерации.
${retry}`;
}

/**
 * POST /api/strategy/wordstat-demand
 * 10 целевых + 30 общих фраз → Вордстат (1 batch) → таблицы с totalCount → ИИ: текст + % конверсии → расчёт выручки по среднему чеку.
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

  const productCombined = describeProduct(fact);
  const coreProduct = normalizeText(fact.economics?.product ?? "");
  const servicesLine =
    (fact.services ?? []).map((s) => normalizeText(s)).filter(Boolean).join("; ") || "—";
  const project = normalizeText(fact.projectName);
  const avgCheckRub = parseAverageCheckRub(normalizeText(fact.economics?.averageCheck ?? ""));
  const avgCheckStr = normalizeText(fact.economics?.averageCheck ?? "");

  const hasRegionFilter = Boolean(regionIds?.length);
  const geoStripTokens = hasRegionFilter ? extractGeoTokensForStripping(fact.geo) : [];

  let target: string[] = [];
  let broad: string[] = [];
  let parsed1Notes = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    const step1User = buildStep1User(
      fact,
      regionLabel,
      coreProduct,
      productCombined,
      servicesLine,
      project,
      attempt,
      hasRegionFilter
    );
    let raw1: string;
    try {
      raw1 = await gigachatChatCompletion([
        {
          role: "system",
          content: hasRegionFilter
            ? "Ты маркетолог-исследователь. Отвечай только валидным JSON. География уже в API (regions): в тексте фраз НЕЛЬЗЯ указывать города, области и страны — только смысл запроса."
            : "Ты маркетолог-исследователь. Отвечай только валидным JSON. Соблюдай точное число элементов в массивах, как просит пользователь.",
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

    parsed1Notes = typeof parsed1.notes === "string" ? parsed1.notes.trim() : "";

    const rawTarget = uniqStrings(
      (Array.isArray(parsed1.target) ? parsed1.target : []).map((x) =>
        typeof x === "string" ? stripGeoTokensFromPhrase(x, geoStripTokens) : x
      ),
      25
    );
    const rawBroad = uniqStrings(
      (Array.isArray(parsed1.broad) ? parsed1.broad : []).map((x) =>
        typeof x === "string" ? stripGeoTokensFromPhrase(x, geoStripTokens) : x
      ),
      45
    );
    const broadNorm = new Set(rawBroad.map(normPhrase));
    const targetDedup = rawTarget.filter((t) => !broadNorm.has(normPhrase(t)));

    target = targetDedup.slice(0, N_TARGET);
    broad = rawBroad.slice(0, N_BROAD);

    if (target.length === N_TARGET && broad.length === N_BROAD) break;
  }

  if (target.length !== N_TARGET || broad.length !== N_BROAD) {
    return NextResponse.json(
      {
        error:
          "Модель не вернула ровно 10 целевых и 30 общих фраз. Нажмите ещё раз или упростите формулировку ниши в фактуре.",
      },
      { status: 502 }
    );
  }

  const kindByNorm = new Map<string, "target" | "broad">();
  for (const p of target) kindByNorm.set(normPhrase(p), "target");
  for (const p of broad) kindByNorm.set(normPhrase(p), "broad");

  const combined = [...target, ...broad];

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
  const byNorm = new Map<string, WordstatTopRequestsResult>();
  for (const item of results) {
    const key = normPhrase(normalizeText(item.requestPhrase));
    if (key) byNorm.set(key, item);
  }

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

  function demandCell(phrase: string): { display: string; value: number | null } {
    const item = byNorm.get(normPhrase(phrase));
    if (!item) return { display: "— (нет ответа)", value: null };
    if (item.error) return { display: `ошибка: ${item.error}`, value: null };
    if (item.totalCount == null) return { display: "—", value: null };
    return { display: fmtNum(item.totalCount), value: item.totalCount };
  }

  const targetTableRows: string[][] = [];
  let sumTarget = 0;
  let sumBroad = 0;
  for (let i = 0; i < target.length; i++) {
    const { display, value } = demandCell(target[i]!);
    if (value != null) sumTarget += value;
    targetTableRows.push([String(i + 1), target[i]!, display]);
  }
  const broadTableRows: string[][] = [];
  for (let i = 0; i < broad.length; i++) {
    const { display, value } = demandCell(broad[i]!);
    if (value != null) sumBroad += value;
    broadTableRows.push([String(i + 1), broad[i]!, display]);
  }

  const geoNote = isAllRussiaGeo(fact.geo)
    ? "Запросы по всей России (regions в API не передавались)."
    : regionIds?.length
      ? `Регионы Вордстата: id ${regionIds.join(", ")}.`
      : "Регион по строке гео не сопоставился с деревом API — фактически вся Россия.";

  const phraseNote = hasRegionFilter
    ? "Важно: seed-фразы без топонимов в строке — регион уже ограничен в запросе к API (как поле «Регион» в интерфейсе Вордстата)."
    : "";

  const step2User = `${geoNote}
${phraseNote}

Ниша: ${fact.niche}. Продукт/услуги: ${productCombined || "—"}.
География (текст для стратегии): ${regionLabel}.

Сумма показателя «спрос» по 10 ЦЕЛЕВЫМ фразам (сумма totalCount): ${fmtNum(sumTarget)}.
Сумма «спрос» по 30 ОБЩИМ фразам: ${fmtNum(sumBroad)}.

Средний чек из фактуры (строка): ${avgCheckStr || "не указан"}.
Число для расчёта (если распознано на сервере): ${avgCheckRub != null ? `${fmtNum(avgCheckRub)} ₽` : "не распознано"}.

Детализация по фразам (seed = введённая фраза, totalCount и top — смежные запросы):
${JSON.stringify(rows)}

Твоя задача:
1) Объяснить разницу целевых vs общих запросов по этим цифрам.
2) Предложить ОДНУ реалистичную долю конверсии в оплату/сделку в процентах (conversionRatePercent), исходя из ниши, B2B/B2C, среднего чека и ширины запросов. Для узких B2B обычно доли меньше, для массового B2C выше — но всё в разумных пределах (типично 0.05%–3%).
3) Используй для обоснования сумму по целевым как прокси «месячного интереса в поиске» — это НЕ число уникальных людей.

Верни ТОЛЬКО JSON:
{
  "paragraphs": ["2-4 абзаца, без Markdown-таблиц"],
  "bullets": ["5-8 рекомендаций"],
  "conversionRatePercent": 1.0,
  "conversionRationale": "коротко почему такой процент",
  "demandNote": "одно предложение как читать сумму спроса"
}`;

  let raw2: string;
  try {
    raw2 = await gigachatChatCompletion([
      {
        role: "system",
        content:
          "Ты финансово ориентированный маркетинг-стратег. Отвечай только валидным JSON. Не выдумывай totalCount — они уже в данных.",
      },
      { role: "user", content: step2User },
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "GigaChat";
    return NextResponse.json({ error: `GigaChat (анализ): ${msg}` }, { status: 502 });
  }

  let parsed2: Record<string, unknown>;
  try {
    parsed2 = parseModelJson(raw2);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "parse";
    return NextResponse.json(
      { error: `Не удалось разобрать ответ модели (анализ): ${msg}` },
      { status: 502 }
    );
  }

  let aiParagraphs = asStringList(Array.isArray(parsed2.paragraphs) ? parsed2.paragraphs : [], 6);
  let bullets = dedupeLowerPreserveOrder(
    asStringList(Array.isArray(parsed2.bullets) ? parsed2.bullets : [], 14)
  );

  const rawRate = numPercent(parsed2.conversionRatePercent, 1);
  const conversionRatePercent = clampConversionPercent(rawRate);
  const conversionRationale =
    typeof parsed2.conversionRationale === "string"
      ? parsed2.conversionRationale.trim()
      : "оценка модели по нише и ширине запросов";
  const demandNote =
    typeof parsed2.demandNote === "string"
      ? parsed2.demandNote.trim()
      : "Сумма спроса по фразам — ориентир Яндекс.Вордстата, не число уникальных покупателей.";

  if (aiParagraphs.length === 0) {
    aiParagraphs.push(
      "По выгрузке Вордстата видна разница частот между узкими и широкими формулировками — используйте её при планировании SEO и рекламы."
    );
  }
  if (bullets.length === 0) {
    bullets.push("Сверьте топовые смежные запросы из отчёта с посадочными страницами и объявлениями.");
  }

  const expectedDeals = Math.round(sumTarget * (conversionRatePercent / 100));
  const potentialRevenueRub =
    avgCheckRub != null && Number.isFinite(expectedDeals) ? expectedDeals * avgCheckRub : null;

  const geoHint = hasRegionFilter
    ? " Фразы подобраны без названия города/региона в тексте: география задана фильтром региона в API (аналог выпадающего региона в веб-Вордстате)."
    : "";

  const intro =
    `Данные: Яндекс.Вордстат (метод topRequests), ${regionLabel}.${geoHint} Число в столбце «Спрос» — ориентир месячной частотности по фразе в выбранной географии; это не аудитория «в людях» и не гарантия переходов. ${parsed1Notes ? `Заметка к подбору фраз: ${parsed1Notes}` : ""}`;

  const tables: StrategyTable[] = [
    {
      title: `Целевые запросы (${N_TARGET} шт.) — спрос (ориентир/мес)`,
      columns: ["№", "Запрос", "Спрос"],
      rows: targetTableRows,
    },
    {
      title: `Общие / нецелевые запросы (${N_BROAD} шт.) — спрос по каждому`,
      columns: ["№", "Запрос", "Спрос"],
      rows: broadTableRows,
    },
    {
      title: "Оценка потенциала по фактуре (оценочно)",
      columns: ["Показатель", "Значение"],
      rows: [
        ["Сумма спроса по 10 целевым фразам", `${fmtNum(sumTarget)} (сумма показателей Вордстата)`],
        ["Сумма спроса по 30 общим фразам", `${fmtNum(sumBroad)}`],
        ["Как читать спрос", demandNote],
        [
          "Принятая конверсия в оплату/сделку",
          `${conversionRatePercent}% — ${conversionRationale}`,
        ],
        [
          "Ожидаемых оплат в месяц (оценка)",
          `${fmtNum(sumTarget)} × ${conversionRatePercent}% ≈ ${fmtNum(expectedDeals)}`,
        ],
        [
          "Средний чек (фактура)",
          avgCheckRub != null ? `${fmtNum(avgCheckRub)} ₽` : "не указан или не распознан — заполните в фактуре",
        ],
        [
          "Потенциальная выручка в месяц (оценка)",
          avgCheckRub != null && potentialRevenueRub != null
            ? `${fmtNum(expectedDeals)} × ${fmtNum(avgCheckRub)} ₽ = ${fmtNum(potentialRevenueRub)} ₽`
            : "— (нужен средний чек в фактуре)",
        ],
      ],
    },
  ];

  const paragraphs = [intro, ...aiParagraphs];

  return NextResponse.json({
    regionLabel,
    regionIds: regionIds ?? null,
    allRussia: !regionIds?.length,
    phrases: { target: N_TARGET, broad: N_BROAD, requested: combined.length },
    sums: { target: sumTarget, broad: sumBroad },
    estimate: {
      conversionRatePercent,
      expectedDeals,
      averageCheckRub: avgCheckRub,
      potentialRevenueRub,
    },
    market: { paragraphs, bullets, tables },
  });
}
