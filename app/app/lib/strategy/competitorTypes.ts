/** Строки таблиц анализа конкурентов (совместимы с шаблоном Excel «Анализ Сайты» / «Анализ Карты»). */

export type CompetitorChannelHint = "seo" | "ads" | "mixed" | "unknown";

export type CompetitorSiteRow = {
  num: number;
  /** «Да» / «Нет» — в топе выдачи по нише в регионе (оценка модели). */
  top: string;
  /** Название конкурента (без URL). */
  competitor: string;
  /** Полный URL сайта (https://…). */
  siteUrl: string;
  segment: string;
  priceAnchor: string;
  positioning: string;
  strengths: string;
  weaknesses: string;
  source: string;
  channel: CompetitorChannelHint;
};

export type CompetitorMapRow = {
  num: number;
  top: string;
  competitor: string;
  /** Ссылка на карточку организации (Яндекс / 2ГИС). */
  mapUrl: string;
  location: string;
  /** Агрегат «рейтинг / отзывы» если отдельные поля не заданы. */
  rating: string;
  ratingStars: string;
  ratingsCount: string;
  reviewsCount: string;
  cardSnippet: string;
  strengthMaps: string;
  weakness: string;
  source: string;
};

export type CompetitorAnalysisPayload = {
  sites: CompetitorSiteRow[];
  yandexMaps: CompetitorMapRow[];
  gis2: CompetitorMapRow[];
};
