import type { StrategyDocument } from "./types";

/** Подменяет блок «2. Анализ спроса и конкурентов» данными из Вордстата + ИИ. */
export function applyWordstatMarketSection(
  doc: StrategyDocument,
  paragraphs: string[],
  bullets: string[]
): StrategyDocument {
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
          }
        : s
    ),
  };
}
