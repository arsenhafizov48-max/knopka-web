/**
 * Сборка / применение снимка localStorage для синхронизации с Supabase (таблица knopka_workspace).
 */

import { PROJECT_FACT_STORAGE_KEY } from "@/app/app/lib/projectFact";
import {
  KEY_DAILY_V2,
  KEY_DATA_CHANNELS,
  KEY_HIDDEN_CHANNELS,
} from "@/app/app/lib/data/storage";
import { STRATEGY_STORAGE_KEY } from "@/app/app/lib/strategy/storage";

export const WORKSPACE_PAYLOAD_VERSION = 1 as const;

export type KnopkaWorkspacePayload = {
  v: typeof WORKSPACE_PAYLOAD_VERSION;
  /** JSON-строка как в localStorage (ProjectFact) */
  projectFactJson: string | null;
  strategyJson: string | null;
  dailyV2Json: string | null;
  dataChannelsJson: string | null;
  hiddenChannelsJson: string | null;
};

export function emptyWorkspacePayload(): KnopkaWorkspacePayload {
  return {
    v: WORKSPACE_PAYLOAD_VERSION,
    projectFactJson: null,
    strategyJson: null,
    dailyV2Json: null,
    dataChannelsJson: null,
    hiddenChannelsJson: null,
  };
}

export function collectWorkspaceFromLocalStorage(): KnopkaWorkspacePayload {
  if (typeof window === "undefined") return emptyWorkspacePayload();
  return {
    v: WORKSPACE_PAYLOAD_VERSION,
    projectFactJson: window.localStorage.getItem(PROJECT_FACT_STORAGE_KEY),
    strategyJson: window.localStorage.getItem(STRATEGY_STORAGE_KEY),
    dailyV2Json: window.localStorage.getItem(KEY_DAILY_V2),
    dataChannelsJson: window.localStorage.getItem(KEY_DATA_CHANNELS),
    hiddenChannelsJson: window.localStorage.getItem(KEY_HIDDEN_CHANNELS),
  };
}

function isNonEmptyPayload(p: KnopkaWorkspacePayload): boolean {
  return Boolean(
    p.projectFactJson ||
      p.strategyJson ||
      p.dailyV2Json ||
      p.dataChannelsJson ||
      p.hiddenChannelsJson
  );
}

/** Есть ли смысл считать облако «непустым» */
export function hasCloudData(raw: unknown): raw is KnopkaWorkspacePayload {
  if (!raw || typeof raw !== "object") return false;
  const p = raw as Partial<KnopkaWorkspacePayload>;
  return isNonEmptyPayload({
    v: WORKSPACE_PAYLOAD_VERSION,
    projectFactJson: typeof p.projectFactJson === "string" ? p.projectFactJson : null,
    strategyJson: typeof p.strategyJson === "string" ? p.strategyJson : null,
    dailyV2Json: typeof p.dailyV2Json === "string" ? p.dailyV2Json : null,
    dataChannelsJson:
      typeof p.dataChannelsJson === "string" ? p.dataChannelsJson : null,
    hiddenChannelsJson:
      typeof p.hiddenChannelsJson === "string" ? p.hiddenChannelsJson : null,
  });
}

/** Записать в localStorage и разослать события обновления UI */
export function applyWorkspacePayloadToLocalStorage(p: KnopkaWorkspacePayload) {
  if (typeof window === "undefined") return;

  const setOrRemove = (key: string, val: string | null) => {
    if (val === null || val === undefined) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, val);
    }
  };

  setOrRemove(PROJECT_FACT_STORAGE_KEY, p.projectFactJson);
  setOrRemove(STRATEGY_STORAGE_KEY, p.strategyJson);
  setOrRemove(KEY_DAILY_V2, p.dailyV2Json);
  setOrRemove(KEY_DATA_CHANNELS, p.dataChannelsJson);
  setOrRemove(KEY_HIDDEN_CHANNELS, p.hiddenChannelsJson);

  window.dispatchEvent(new Event("knopka:projectFactUpdated"));
  window.dispatchEvent(new Event("knopka:strategyUpdated"));
  window.dispatchEvent(new Event("knopka:dailyDataUpdated"));
}

/**
 * Слияние projectFact из облака и из браузера при первой загрузке.
 * Раньше облако всегда перетирало localStorage — из‑за этого после «Завершить настройку»
 * при быстром F5 или пока debounce ещё не отправил снимок в Supabase, подтягивался
 * старый payload без onboardingDone и казалось, что «ничего не меняется».
 */
export function mergeProjectFactJsonForInitialPull(
  localJson: string | null,
  cloudJson: string | null
): string | null {
  if (!localJson?.trim()) return cloudJson;
  if (!cloudJson?.trim()) return localJson;

  try {
    const local = JSON.parse(localJson) as { updatedAt?: string; onboardingDone?: boolean };
    const cloud = JSON.parse(cloudJson) as { updatedAt?: string; onboardingDone?: boolean };

    const t = (s: string | undefined) => {
      const n = s ? Date.parse(s) : NaN;
      return Number.isFinite(n) ? n : 0;
    };

    const lt = t(local.updatedAt);
    const ct = t(cloud.updatedAt);

    if (lt > ct) return localJson;
    if (ct > lt) return cloudJson;

    // Одинаковое время (или оба без даты): не откатываем завершённый онбординг
    if (local.onboardingDone && !cloud.onboardingDone) return localJson;
    if (cloud.onboardingDone && !local.onboardingDone) return cloudJson;

    return cloudJson;
  } catch {
    return localJson;
  }
}

/** Нормализация ответа PostgREST (payload может прийти как объект) */
export function normalizePayloadFromDb(raw: unknown): KnopkaWorkspacePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== WORKSPACE_PAYLOAD_VERSION && o.v !== undefined && o.v !== 1) {
    return null;
  }
  const str = (x: unknown) => (typeof x === "string" ? x : null);
  return {
    v: WORKSPACE_PAYLOAD_VERSION,
    projectFactJson: str(o.projectFactJson),
    strategyJson: str(o.strategyJson),
    dailyV2Json: str(o.dailyV2Json),
    dataChannelsJson: str(o.dataChannelsJson),
    hiddenChannelsJson: str(o.hiddenChannelsJson),
  };
}
