import type { StrategyDocument, StrategyTable } from "./types";

/** Подменяет блок «2. Анализ спроса и конкурентов» данными из Вордстата + ИИ. */
export function applyWordstatMarketSection(
  doc: StrategyDocument,
  payload: {
    paragraphs: string[];
    bullets: string[];
    tables?: StrategyTable[];
  }
): StrategyDocument {
  const { paragraphs, bullets, tables } = payload;
  return {
    ...doc,
    generatedAt: new Date().toISOString(),
    sections: doc.sections.map((s) =>
      s.id === "market"
        ? {
            ...s,
            title: "2. Анализ спроса и конкурентов",
            paragraphs,
            bullets,
            tables: tables?.length ? tables : undefined,
          }
        : s
    ),
  };
}
