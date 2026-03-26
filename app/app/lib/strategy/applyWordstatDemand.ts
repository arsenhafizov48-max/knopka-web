import type { StrategyDocument, StrategyTable } from "./types";

/** Подменяет раздел «3. Анализ спроса» данными из Вордстата + ИИ. */
export function applyWordstatDemandSection(
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
      s.id === "demand"
        ? {
            ...s,
            title: "3. Анализ спроса",
            paragraphs,
            bullets,
            tables: tables?.length ? tables : undefined,
          }
        : s
    ),
  };
}

/** @deprecated используйте applyWordstatDemandSection */
export const applyWordstatMarketSection = applyWordstatDemandSection;
