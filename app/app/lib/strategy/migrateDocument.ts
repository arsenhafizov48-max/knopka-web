import type { StrategyDocument, StrategySection } from "@/app/app/lib/strategy/types";

function placeholderPointA(): StrategySection {
  return {
    id: "point_a",
    title: "2. Точка А — анализ маркетинга",
    paragraphs: [
      "Подключите Яндекс Директ / Метрику в «Системы и данные» и пересоберите стратегию — блок заполнится выводами по кампаниям и визитам.",
    ],
    bullets: [
      "Точка А — «что есть по данным сейчас», без желаемого будущего.",
    ],
  };
}

function placeholderCompetitors(): StrategySection {
  return {
    id: "competitors",
    title: "4. Анализ конкурентов",
    paragraphs: [
      "Запустите «Анализ конкурентов» на вкладке «Конкуренты» — таблицы по сайтам и картам попадут в этот раздел стратегии.",
    ],
    bullets: [
      "Проверяйте ссылки и цены по конкурентам вручную — модель опирается на открытые данные.",
    ],
  };
}

/** Совместимость со старыми документами в localStorage (id market, старая нумерация). */
export function migrateStrategyDocument(doc: StrategyDocument): StrategyDocument {
  let sections = doc.sections.map((s) => {
    if (s.id === "market") {
      return {
        ...s,
        id: "demand" as const,
        title: "3. Анализ спроса",
      };
    }
    return s;
  });

  const hasPointA = sections.some((s) => s.id === "point_a");
  const hasCompetitors = sections.some((s) => s.id === "competitors");
  const goalIdx = sections.findIndex((s) => s.id === "goal");

  if (!hasPointA && goalIdx >= 0) {
    sections.splice(goalIdx + 1, 0, placeholderPointA());
  }

  const demandIdx = sections.findIndex((s) => s.id === "demand");
  if (!hasCompetitors && demandIdx >= 0) {
    sections.splice(demandIdx + 1, 0, placeholderCompetitors());
  }

  const titleById: Partial<Record<string, string>> = {
    current: "5. Что есть сейчас",
    decomposition: "6. Декомпозиция точки Б",
    channels: "7. Каналы и приоритеты",
    budget: "8. Бюджеты и специалисты",
    next: "9. Что делать дальше",
  };

  sections = sections.map((s) => {
    const t = titleById[s.id];
    return t ? { ...s, title: t } : s;
  });

  return { ...doc, sections };
}
