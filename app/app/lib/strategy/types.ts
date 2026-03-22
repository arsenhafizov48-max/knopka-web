export type StrategySectionId =
  | "goal"
  | "market"
  | "current"
  | "decomposition"
  | "channels"
  | "budget"
  | "next";

export type StrategySection = {
  id: StrategySectionId;
  title: string;
  paragraphs: string[];
  bullets?: string[];
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
