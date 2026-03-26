export type StrategySectionId =
  | "goal"
  | "point_a"
  | "demand"
  | "competitors"
  | "current"
  | "decomposition"
  | "channels"
  | "budget"
  | "next"
  /** @deprecated заменён на demand + competitors */
  | "market";

/** Таблица внутри раздела (например список запросов Вордстата). */
export type StrategyTable = {
  title: string;
  columns: string[];
  rows: string[][];
};

export type StrategySection = {
  id: StrategySectionId;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  tables?: StrategyTable[];
};

export type StrategyDocument = {
  version: 1;
  generatedAt: string;
  factSnapshotUpdatedAt: string;
  sections: StrategySection[];
};

export type StrategyGapItem = {
  label: string;
  href: string;
};
