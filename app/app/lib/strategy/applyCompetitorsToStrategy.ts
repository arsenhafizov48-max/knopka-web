import { channelLabelRu } from "@/app/app/lib/strategy/competitorExport";
import type { CompetitorAnalysisPayload } from "@/app/app/lib/strategy/competitorTypes";
import type { StrategyDocument, StrategyTable } from "@/app/app/lib/strategy/types";

function sitesTable(rows: CompetitorAnalysisPayload["sites"]): StrategyTable {
  return {
    title: "Конкуренты — сайты",
    columns: [
      "№",
      "ТОП",
      "Название",
      "Сайт (URL)",
      "Сегмент",
      "Цена-якорь",
      "Позиционирование",
      "Сильные стороны",
      "Слабые места / куда бить",
      "Канал",
      "Источник",
    ],
    rows: rows.map((r) => [
      String(r.num),
      r.top,
      r.competitor,
      r.siteUrl || "—",
      r.segment,
      r.priceAnchor,
      r.positioning,
      r.strengths,
      r.weaknesses,
      channelLabelRu(r.channel),
      r.source,
    ]),
  };
}

function mapsTable(title: string, rows: CompetitorAnalysisPayload["yandexMaps"]): StrategyTable {
  return {
    title,
    columns: [
      "№",
      "ТОП",
      "Название",
      "Ссылка",
      "Локация / метро",
      "Рейтинг (звёзды)",
      "Оценок",
      "Отзывов",
      "На карточке",
      "Сильная сторона",
      "Куда бить",
      "Источник",
    ],
    rows: rows.map((r) => [
      String(r.num),
      r.top,
      r.competitor,
      r.mapUrl || "—",
      r.location,
      r.ratingStars || "—",
      r.ratingsCount || "—",
      r.reviewsCount || "—",
      r.cardSnippet || r.rating,
      r.strengthMaps,
      r.weakness,
      r.source,
    ]),
  };
}

/** Записывает таблицы конкурентов в раздел «4. Анализ конкурентов». */
export function applyCompetitorsToStrategy(
  doc: StrategyDocument,
  payload: CompetitorAnalysisPayload
): StrategyDocument {
  const intro =
    "Ниже — таблицы конкурентов (GigaChat по фактуре и открытым данным). Ссылки проверяйте вручную; цены и офферы — ориентир.";

  const tables: StrategyTable[] = [];
  if (payload.sites.length) tables.push(sitesTable(payload.sites));
  if (payload.yandexMaps.length) tables.push(mapsTable("Конкуренты — Яндекс.Карты (ориентир 3 км)", payload.yandexMaps));
  if (payload.gis2.length) tables.push(mapsTable("Конкуренты — 2ГИС (ориентир 3 км)", payload.gis2));

  return {
    ...doc,
    generatedAt: new Date().toISOString(),
    sections: doc.sections.map((s) =>
      s.id === "competitors"
        ? {
            ...s,
            title: "4. Анализ конкурентов",
            paragraphs: [intro],
            bullets: [
              "Сайты: уточняйте цену-якорь по прайсам и лидам на посадочных.",
              "Карты: рейтинг и число отзывов — по данным карточек; при расхождении сверяйте вручную.",
            ],
            tables: tables.length ? tables : undefined,
          }
        : s
    ),
  };
}
