import type { StrategyDocument } from "./types";

export const STRATEGY_STORAGE_KEY = "knopka.strategy.v1";

type Stored = {
  document: StrategyDocument;
};

function safeParse(raw: string | null): Stored | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Stored;
    if (!o?.document?.sections || !Array.isArray(o.document.sections)) return null;
    return o;
  } catch {
    return null;
  }
}

export function loadStrategy(): StrategyDocument | null {
  if (typeof window === "undefined") return null;
  const s = safeParse(window.localStorage.getItem(STRATEGY_STORAGE_KEY));
  return s?.document ?? null;
}

export function saveStrategy(document: StrategyDocument) {
  if (typeof window === "undefined") return;
  const payload: Stored = { document };
  window.localStorage.setItem(STRATEGY_STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event("knopka:strategyUpdated"));
}

export function clearStrategy() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STRATEGY_STORAGE_KEY);
  window.dispatchEvent(new Event("knopka:strategyUpdated"));
}
