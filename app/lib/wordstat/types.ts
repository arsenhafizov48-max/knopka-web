/** Типы ответов API Вордстата — см. https://yandex.com/support2/wordstat/ru/content/api-structure */

export type WordstatDevice = "all" | "desktop" | "phone" | "tablet";

export type WordstatPhraseCount = {
  phrase: string;
  count: number;
};

/** Ответ /v1/topRequests при одной фразе */
export type WordstatTopRequestsResult = {
  requestPhrase: string;
  totalCount: number | null;
  topRequests: WordstatPhraseCount[] | null;
  associations: WordstatPhraseCount[] | null;
  error?: string;
};

export type WordstatDynamicsPoint = {
  date: string;
  count: number;
  share: number;
};

export type WordstatDynamicsResponse = {
  dynamics: WordstatDynamicsPoint[];
};

export type WordstatRegionBreakdown = {
  regionId: number;
  count: number;
  share: number;
  affinityIndex: number;
};

export type WordstatRegionsResponse = {
  regions: WordstatRegionBreakdown[];
};

export type WordstatUserInfo = {
  userInfo: {
    login: string;
    limitPerSecond: number;
    dailyLimit: number;
    dailyLimitRemaining: number;
  };
};
