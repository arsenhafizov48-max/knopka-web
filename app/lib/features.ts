export type FeatureKey =
  | "weekly-report"
  | "export-report"
  | "create-report"
  | "export-template";

export const FEATURES: Record<
  FeatureKey,
  { title: string; wipHint: string }
> = {
  "weekly-report": {
    title: "Еженедельный отчёт",
    wipHint:
      "Готовим weekly-формат: изменения за 7 дней, причины, что улучшить и план действий. Пока раздел закрыт, чтобы интерфейс был честным.",
  },
  "export-report": {
    title: "Экспорт отчёта",
    wipHint:
      "Скоро добавим экспорт в PDF/CSV и шаблоны под разные роли (собственник / маркетолог / продажник).",
  },
  "create-report": {
    title: "Создание отчёта",
    wipHint:
      "Добавим создание отчёта из подключённых источников: метрики → выводы → приоритеты. Пока ведём к готовым шаблонам.",
  },
  "export-template": {
    title: "Экспорт шаблона",
    wipHint:
      "Сделаем экспорт шаблонов и их копирование внутри кабинета. Сейчас доступна только демонстрационная структура.",
  },
};
