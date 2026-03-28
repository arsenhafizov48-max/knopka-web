import { DEFAULT_PROJECT_ID, ensureProjectsBootstrap, getActiveProjectId, scopedKey } from "@/app/app/lib/activeProject";
import { migrateStrategyDocument } from "@/app/app/lib/strategy/migrateDocument";
import type { StrategyDocument } from "./types";

export function getStrategyStorageKey(): string {
  ensureProjectsBootstrap();
  return scopedKey("strategy.v1");
}

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
  const key = getStrategyStorageKey();
  let s = safeParse(window.localStorage.getItem(key));
  if (!s?.document && getActiveProjectId() === DEFAULT_PROJECT_ID) {
    const legacy = safeParse(window.localStorage.getItem("knopka.strategy.v1"));
    if (legacy?.document) {
      saveStrategy(migrateStrategyDocument(legacy.document));
      s = legacy;
    }
  }
  if (!s?.document) return null;
  return migrateStrategyDocument(s.document);
}

export function saveStrategy(document: StrategyDocument) {
  if (typeof window === "undefined") return;
  const payload: Stored = { document };
  window.localStorage.setItem(getStrategyStorageKey(), JSON.stringify(payload));
  window.dispatchEvent(new Event("knopka:strategyUpdated"));
}

export function clearStrategy() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(getStrategyStorageKey());
  window.dispatchEvent(new Event("knopka:strategyUpdated"));
}
