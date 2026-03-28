"use client";

/**
 * Несколько «проектов» (бизнесов) в одном аккаунте: изолированные данные в localStorage / IndexedDB.
 * Старые ключи без префикса при первом запуске копируются в проект `default`.
 */

export const DEFAULT_PROJECT_ID = "default";

export const PROJECTS_META_KEY = "knopka.projects.meta.v1";

export type ProjectEntry = {
  id: string;
  name: string;
  createdAt: string;
};

export type ProjectsMeta = {
  version: 1;
  activeId: string;
  projects: ProjectEntry[];
};

const LEGACY_COPY: Array<{ legacy: string; suffix: string }> = [
  { legacy: "knopka.projectFact.v4", suffix: "projectFact.v4" },
  { legacy: "knopka.strategy.v1", suffix: "strategy.v1" },
  { legacy: "knopka.data.daily.v2", suffix: "data.daily.v2" },
  { legacy: "knopka.data.channels.v1", suffix: "data.channels.v1" },
  { legacy: "knopka.data.channels.hidden.v1", suffix: "data.channels.hidden.v1" },
  { legacy: "knopka.materials.v1", suffix: "materials.v1" },
  { legacy: "knopka.reports.v1", suffix: "reports.v1" },
];

let bootstrapped = false;

function uid(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getProjectsMeta(): ProjectsMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROJECTS_META_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as ProjectsMeta;
    if (o?.version !== 1 || !Array.isArray(o.projects)) return null;
    return o;
  } catch {
    return null;
  }
}

export function setProjectsMeta(next: ProjectsMeta): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROJECTS_META_KEY, JSON.stringify(next));
}

/** Ключ хранилища для текущего активного проекта: `knopka.p.<id>.<suffix>` */
export function scopedKey(suffix: string): string {
  return `knopka.p.${getActiveProjectId()}.${suffix}`;
}

export function ensureProjectsBootstrap(): void {
  if (typeof window === "undefined") return;
  if (bootstrapped) return;
  bootstrapped = true;

  let meta = getProjectsMeta();
  if (!meta) {
    meta = {
      version: 1,
      activeId: DEFAULT_PROJECT_ID,
      projects: [
        {
          id: DEFAULT_PROJECT_ID,
          name: "Мой бизнес",
          createdAt: new Date().toISOString(),
        },
      ],
    };
    setProjectsMeta(meta);

    const pid = DEFAULT_PROJECT_ID;
    const prefix = `knopka.p.${pid}.`;
    for (const { legacy, suffix } of LEGACY_COPY) {
      const target = `${prefix}${suffix}`;
      if (window.localStorage.getItem(target)) continue;
      const v = window.localStorage.getItem(legacy);
      if (v) window.localStorage.setItem(target, v);
    }
    const factTarget = `${prefix}projectFact.v4`;
    if (!window.localStorage.getItem(factTarget)) {
      const v5 = window.localStorage.getItem("knopka.projectFact.v5");
      if (v5) window.localStorage.setItem(factTarget, v5);
    }
  }
}

export function getActiveProjectId(): string {
  if (typeof window === "undefined") return DEFAULT_PROJECT_ID;
  ensureProjectsBootstrap();
  const m = getProjectsMeta();
  return m?.activeId ?? DEFAULT_PROJECT_ID;
}

export function listProjects(): ProjectEntry[] {
  if (typeof window === "undefined") return [];
  ensureProjectsBootstrap();
  return getProjectsMeta()?.projects ?? [];
}

export function setActiveProjectId(id: string): void {
  if (typeof window === "undefined") return;
  ensureProjectsBootstrap();
  const m = getProjectsMeta();
  if (!m || !m.projects.some((p) => p.id === id)) return;
  if (m.activeId === id) return;
  m.activeId = id;
  setProjectsMeta(m);
  window.dispatchEvent(new Event("knopka:activeProjectChanged"));
  window.dispatchEvent(new Event("knopka:projectFactUpdated"));
  window.dispatchEvent(new Event("knopka:strategyUpdated"));
  window.dispatchEvent(new Event("knopka:dailyDataUpdated"));
  window.dispatchEvent(new Event("knopka:materialsUpdated"));
}

export function addProject(name: string): string {
  ensureProjectsBootstrap();
  const m = getProjectsMeta();
  if (!m) return DEFAULT_PROJECT_ID;
  const id = uid();
  m.projects.push({
    id,
    name: name.trim() || "Новый проект",
    createdAt: new Date().toISOString(),
  });
  setProjectsMeta(m);
  return id;
}

export function renameProject(id: string, name: string): void {
  ensureProjectsBootstrap();
  const m = getProjectsMeta();
  if (!m) return;
  const n = name.trim();
  if (!n) return;
  m.projects = m.projects.map((p) => (p.id === id ? { ...p, name: n } : p));
  setProjectsMeta(m);
  window.dispatchEvent(new Event("knopka:projectsMetaUpdated"));
}
