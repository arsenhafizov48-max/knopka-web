/**
 * Клиент API Яндекс Вордстата (только сервер).
 * Документация: https://yandex.com/support2/wordstat/ru/content/api-wordstat
 * Методы: https://yandex.com/support2/wordstat/ru/content/api-structure
 */
import type {
  WordstatDevice,
  WordstatDynamicsResponse,
  WordstatRegionsResponse,
  WordstatTopRequestsResult,
  WordstatUserInfo,
} from "./types";

const BASE_URL = "https://api.wordstat.yandex.net";

export function getWordstatOAuthToken(): string | null {
  const t = process.env.YANDEX_WORDSTAT_OAUTH_TOKEN?.trim();
  return t || null;
}

export type WordstatClientError = {
  ok: false;
  status: number;
  message: string;
};

export type WordstatClientOk<T> = { ok: true; data: T };

export type WordstatClientResult<T> = WordstatClientOk<T> | WordstatClientError;

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<WordstatClientResult<T>> {
  const token = getWordstatOAuthToken();
  if (!token) {
    return {
      ok: false,
      status: 503,
      message: "Вордстат не настроен: задайте YANDEX_WORDSTAT_OAUTH_TOKEN в переменных окружения.",
    };
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Сеть";
    return { ok: false, status: 502, message: `Запрос к Вордстату: ${msg}` };
  }

  const text = await res.text();
  if (!res.ok) {
    let hint = text.slice(0, 600) || res.statusText;
    if (res.status === 429) hint = "Квота Вордстата: слишком много запросов. " + hint;
    if (res.status === 503) hint = "Сервис Вордстата недоступен, повторите позже. " + hint;
    return { ok: false, status: res.status, message: hint };
  }

  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, status: 502, message: "Вордстат вернул не JSON" };
  }
}

/** /v1/userInfo — не расходует квоту */
export function wordstatUserInfo(): Promise<WordstatClientResult<WordstatUserInfo>> {
  return postJson<WordstatUserInfo>("/v1/userInfo", {});
}

/** /v1/getRegionsTree — не расходует квоту */
export function wordstatGetRegionsTree(): Promise<WordstatClientResult<unknown>> {
  return postJson<unknown>("/v1/getRegionsTree", {});
}

export type TopRequestsParams = {
  phrase?: string;
  phrases?: string[];
  numPhrases?: number;
  regions?: number[];
  devices?: WordstatDevice[];
};

/** /v1/topRequests — 1 единица квоты (до 128 фраз в phrases) */
export function wordstatTopRequests(
  params: TopRequestsParams
): Promise<WordstatClientResult<WordstatTopRequestsResult | WordstatTopRequestsResult[]>> {
  const body: Record<string, unknown> = {};
  if (params.phrase != null) body.phrase = params.phrase;
  if (params.phrases != null) body.phrases = params.phrases;
  if (params.numPhrases != null) body.numPhrases = params.numPhrases;
  if (params.regions != null) body.regions = params.regions;
  if (params.devices != null) body.devices = params.devices;
  return postJson("/v1/topRequests", body);
}

export type DynamicsParams = {
  phrase: string;
  period: "monthly" | "weekly" | "daily";
  fromDate: string;
  toDate?: string;
  regions?: number[];
  devices?: WordstatDevice[];
};

/** /v1/dynamics — 1 единица квоты */
export function wordstatDynamics(params: DynamicsParams): Promise<WordstatClientResult<WordstatDynamicsResponse>> {
  const body: Record<string, unknown> = {
    phrase: params.phrase,
    period: params.period,
    fromDate: params.fromDate,
  };
  if (params.toDate != null) body.toDate = params.toDate;
  if (params.regions != null) body.regions = params.regions;
  if (params.devices != null) body.devices = params.devices;
  return postJson("/v1/dynamics", body);
}

export type RegionsDistributionParams = {
  phrase: string;
  regionType?: "cities" | "regions" | "all";
  devices?: WordstatDevice[];
};

/** /v1/regions — 2 единицы квоты */
export function wordstatRegionsDistribution(
  params: RegionsDistributionParams
): Promise<WordstatClientResult<WordstatRegionsResponse>> {
  const body: Record<string, unknown> = { phrase: params.phrase };
  if (params.regionType != null) body.regionType = params.regionType;
  if (params.devices != null) body.devices = params.devices;
  return postJson("/v1/regions", body);
}
