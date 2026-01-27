"use client";

export type LegalForm = "ИП" | "ООО" | "Самозанятый" | "Другое";
export type WorkFormat = "Онлайн" | "Офлайн" | "Смешанный";

export type ProjectChannels = {
  connected: string[];
  planned: string[];
};

export type ProjectEconomics = {
  // пока оставляем совместимость со старой версией
  product: string;
  averageCheck: string;
  marginPercent: string;
};

export type ProjectFact = {
  // Step-1 (как на скрине)
  legalForm: LegalForm;
  workFormat: WorkFormat;
  services: string[]; // теги услуг/продуктов
  revenueRange: string; // например: "300–700 тыс ₽"
  goals: string[]; // чекбоксы целей

  // базовые поля (используем и дальше)
  projectName: string;
  niche: string;
  geo: string;

  // старое поле цели оставляем для совместимости (можно потом убрать)
  goal: string;

  channels: ProjectChannels;
  economics: ProjectEconomics;

  onboardingDone: boolean;
  lastStep: 1 | 2 | 3 | 4;

  updatedAt: string;
};

const STORAGE_KEY = "knopka.projectFact.v2";

export function getDefaultProjectFact(): ProjectFact {
  return {
    legalForm: "ИП",
    workFormat: "Онлайн",
    services: [],
    revenueRange: "",
    goals: [],

    projectName: "",
    niche: "",
    geo: "",
    goal: "",

    channels: { connected: [], planned: [] },
    economics: { product: "", averageCheck: "", marginPercent: "" },

    onboardingDone: false,
    lastStep: 1,
    updatedAt: new Date().toISOString(),
  };
}

function safeParse(value: string | null): ProjectFact | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ProjectFact>;
    const base = getDefaultProjectFact();

    const last =
      parsed?.lastStep === 1 || parsed?.lastStep === 2 || parsed?.lastStep === 3 || parsed?.lastStep === 4
        ? parsed.lastStep
        : base.lastStep;

    const legalForm: LegalForm =
      parsed?.legalForm === "ИП" || parsed?.legalForm === "ООО" || parsed?.legalForm === "Самозанятый" || parsed?.legalForm === "Другое"
        ? parsed.legalForm
        : base.legalForm;

    const workFormat: WorkFormat =
      parsed?.workFormat === "Онлайн" || parsed?.workFormat === "Офлайн" || parsed?.workFormat === "Смешанный"
        ? parsed.workFormat
        : base.workFormat;

    return {
      ...base,
      ...parsed,

      legalForm,
      workFormat,

      services: Array.isArray(parsed?.services) ? parsed.services.filter((x) => typeof x === "string") : base.services,
      revenueRange: typeof parsed?.revenueRange === "string" ? parsed.revenueRange : base.revenueRange,
      goals: Array.isArray(parsed?.goals) ? parsed.goals.filter((x) => typeof x === "string") : base.goals,

      channels: {
        connected: Array.isArray(parsed?.channels?.connected) ? parsed.channels!.connected : base.channels.connected,
        planned: Array.isArray(parsed?.channels?.planned) ? parsed.channels!.planned : base.channels.planned,
      },
      economics: {
        product: typeof parsed?.economics?.product === "string" ? parsed.economics!.product : base.economics.product,
        averageCheck: typeof parsed?.economics?.averageCheck === "string" ? parsed.economics!.averageCheck : base.economics.averageCheck,
        marginPercent: typeof parsed?.economics?.marginPercent === "string" ? parsed.economics!.marginPercent : base.economics.marginPercent,
      },

      onboardingDone: Boolean(parsed?.onboardingDone),
      lastStep: last,
      updatedAt: typeof parsed?.updatedAt === "string" ? parsed.updatedAt : base.updatedAt,
    };
  } catch {
    return null;
  }
}

export function loadProjectFact(): ProjectFact {
  if (typeof window === "undefined") return getDefaultProjectFact();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return safeParse(raw) ?? getDefaultProjectFact();
}

export function saveProjectFact(next: ProjectFact) {
  if (typeof window === "undefined") return;
  const payload: ProjectFact = { ...next, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event("knopka:projectFactUpdated"));
}

export function patchProjectFact(patch: Partial<ProjectFact>) {
  const current = loadProjectFact();
  const next: ProjectFact = {
    ...current,
    ...patch,
    channels: patch.channels
      ? {
          connected: patch.channels.connected ?? current.channels.connected,
          planned: patch.channels.planned ?? current.channels.planned,
        }
      : current.channels,
    economics: patch.economics
      ? {
          product: patch.economics.product ?? current.economics.product,
          averageCheck: patch.economics.averageCheck ?? current.economics.averageCheck,
          marginPercent: patch.economics.marginPercent ?? current.economics.marginPercent,
        }
      : current.economics,
    updatedAt: new Date().toISOString(),
  };
  saveProjectFact(next);
}

export function setOnboardingDone(done: boolean) {
  const current = loadProjectFact();
  saveProjectFact({ ...current, onboardingDone: done, lastStep: 4 });
}

export function setLastStep(step: 1 | 2 | 3 | 4) {
  const current = loadProjectFact();
  saveProjectFact({ ...current, lastStep: step });
}

export function clearProjectFact() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("knopka:projectFactUpdated"));
}

export function normalizeText(v: string) {
  return (v ?? "").trim();
}

export function toggleInArray(arr: string[], value: string) {
  const has = arr.includes(value);
  return has ? arr.filter((x) => x !== value) : [...arr, value];
}

export function getFactStatus() {
  const f = loadProjectFact();

  const missing: string[] = [];

  if (!normalizeText(f.niche)) missing.push("Ниша");
  if (!normalizeText(f.geo)) missing.push("Город/регион");

  // started = ввёл хоть что-то
  const started =
    !!normalizeText(f.niche) ||
    !!normalizeText(f.geo) ||
    (f.services?.length ?? 0) > 0 ||
    (f.goals?.length ?? 0) > 0 ||
    !!normalizeText(f.economics.averageCheck) ||
    (f.channels.connected?.length ?? 0) > 0 ||
    (f.channels.planned?.length ?? 0) > 0;

  const done = Boolean(f.onboardingDone);

  const nextStep = done ? 1 : f.lastStep;
  const continueUrl = `/app/onboarding/step-${nextStep}`;

  return {
    started,
    done,
    missing,
    missingCount: missing.length,
    continueUrl,
    fact: f,
  };
}
