"use client";

/** =========================
 *  Step-1 types
 *  ========================= */

export type LegalForm = "ИП" | "ООО" | "Самозанятый" | "Другое";
export type WorkFormat = "Онлайн" | "Офлайн" | "Смешанный";

export type ProjectChannels = {
  connected: string[];
  planned: string[];
};

export type ProjectEconomics = {
  product: string;
  averageCheck: string;
  marginPercent: string;
};

/** =========================
 *  Step-1 Point A / Point B
 *  ========================= */

export type PointAB = {
  revenue: string;
  clients: string;
  averageCheck?: string;
};

/** =========================
 *  Step-1 Goals details
 *  ========================= */

export type GoalDetails = {
  moreLeadsNow: string;
  moreLeadsWant: string;

  avgCheckWant: string;

  marketingComment: string;
  analyticsComment: string;
};

/** =========================
 *  Step-2 types
 *  ========================= */

export type PlatformLinks = {
  site: string;
  telegram: string;
  instagram: string;
  vk: string;

  yandexMaps: string;
  yandexBusiness?: string;

  avito: string;
  marketplaces: string;
  other: string;
};

export type ChannelBudgetRow = {
  id: string;
  channel: string;
  budget: number;
};

export type SpecialistCostRow = {
  id: string;
  role: string;
  cost: number;
};

/** =========================
 *  Step-3 types (Systems)
 *  ========================= */

export type IntegrationGroup =
  | "crm"
  | "analytics"
  | "ads"
  | "marketplaces"
  | "search";

export type IntegrationStatus = "not_connected" | "connected" | "configured";

export type Integration = {
  id: string;
  group: IntegrationGroup;
  title: string;
  status: IntegrationStatus;
  settings?: Record<string, string>;
};

/** =========================
 *  Step-4 types (Materials)
 *  ========================= */

export type Materials = {
  commercialFiles: string[]; // MVP: имена файлов
  priceFiles: string[];
  brandFiles: string[];
  aiComment: string;
};

/** =========================
 *  ProjectFact
 *  ========================= */

export type ProjectFact = {
  legalForm: LegalForm;
  workFormat: WorkFormat;
  services: string[];
  revenueRange: string;
  goals: string[];

  projectName: string;
  niche: string;
  geo: string;

  goal: string;

  // структура точки А/Б и детали целей (для проверки/фактуры/GPT)
  pointA: PointAB;
  pointB: PointAB;
  goalDetails: GoalDetails;

  // обязательные поля (для статуса и быстрых проверок)
  currentRevenue: string;
  currentClients: string;
  targetRevenue: string;
  targetClients: string;

  channels: ProjectChannels;
  economics: ProjectEconomics;

  platformLinks: PlatformLinks;
  channelBudgets: ChannelBudgetRow[];
  specialistCosts: SpecialistCostRow[];

  integrations: Integration[];

  materials: Materials;

  onboardingDone: boolean;
  lastStep: 1 | 2 | 3 | 4;

  updatedAt: string;
};

export const PROJECT_FACT_STORAGE_KEY = "knopka.projectFact.v4";
const LEGACY_PROJECT_FACT_STORAGE_KEY_V5 = "knopka.projectFact.v5";

function safeString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function safeNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

export function normalizeText(v: string) {
  return (v ?? "").trim();
}

export function toggleInArray(arr: string[], value: string) {
  const has = arr.includes(value);
  return has ? arr.filter((x) => x !== value) : [...arr, value];
}

function uid(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = globalThis as any;
  if (c?.crypto?.randomUUID) return c.crypto.randomUUID();
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeLegalForm(v: unknown): LegalForm {
  return v === "ИП" || v === "ООО" || v === "Самозанятый" || v === "Другое"
    ? v
    : "ИП";
}

function normalizeWorkFormat(v: unknown): WorkFormat {
  return v === "Онлайн" || v === "Офлайн" || v === "Смешанный" ? v : "Онлайн";
}

function normalizeStringArray(v: unknown, fallback: string[] = []): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string") : fallback;
}

function normalizeLastStep(v: unknown): 1 | 2 | 3 | 4 {
  return v === 1 || v === 2 || v === 3 || v === 4 ? v : 1;
}

function defaultPlatformLinks(): PlatformLinks {
  return {
    site: "",
    telegram: "",
    instagram: "",
    vk: "",
    yandexMaps: "",
    yandexBusiness: "",
    avito: "",
    marketplaces: "",
    other: "",
  };
}

function normalizePlatformLinks(v: unknown, fallback: PlatformLinks): PlatformLinks {
  const o = (v ?? {}) as Partial<PlatformLinks> & Record<string, unknown>;
  const yMaps = safeString((o as any).yandexMaps ?? (o as any).yandexBusiness, fallback.yandexMaps);

  return {
    site: safeString(o.site, fallback.site),
    telegram: safeString(o.telegram, fallback.telegram),
    instagram: safeString(o.instagram, fallback.instagram),
    vk: safeString(o.vk, fallback.vk),

    yandexMaps: yMaps,
    yandexBusiness: safeString((o as any).yandexBusiness ?? yMaps, fallback.yandexBusiness ?? ""),

    avito: safeString(o.avito, fallback.avito),
    marketplaces: safeString(o.marketplaces, fallback.marketplaces),
    other: safeString(o.other, fallback.other),
  };
}

function normalizeChannelBudgets(v: unknown, fallback: ChannelBudgetRow[]) {
  if (!Array.isArray(v)) return fallback;
  const rows = v
    .map((x) => x as Partial<ChannelBudgetRow> & Record<string, unknown>)
    .map((r) => ({
      id: safeString(r.id, uid()),
      channel: safeString((r as any).channel, ""),
      budget: safeNumber((r as any).budget, 0),
    }));
  return rows.filter((r) => r.id && typeof r.channel === "string");
}

function normalizeSpecialistCosts(v: unknown, fallback: SpecialistCostRow[]) {
  if (!Array.isArray(v)) return fallback;
  const rows = v
    .map((x) => x as Partial<SpecialistCostRow> & Record<string, unknown>)
    .map((r) => ({
      id: safeString(r.id, uid()),
      role: safeString((r as any).role, ""),
      cost: safeNumber((r as any).cost, 0),
    }));
  return rows.filter((r) => r.id && typeof r.role === "string");
}

function normalizeIntegrations(v: unknown, fallback: Integration[]) {
  if (!Array.isArray(v)) return fallback;

  const rows = v.map((x) => x as Partial<Integration> & Record<string, unknown>);
  return rows
    .map((r) => {
      const rawSettings = (r as any).settings;
      let settings: Record<string, string> | undefined;

      if (rawSettings && typeof rawSettings === "object" && !Array.isArray(rawSettings)) {
        settings = {};
        for (const [k, val] of Object.entries(rawSettings as Record<string, unknown>)) {
          if (typeof val === "string") settings[k] = val;
        }
      }

      const group: IntegrationGroup =
        r.group === "crm" ||
        r.group === "analytics" ||
        r.group === "ads" ||
        r.group === "marketplaces" ||
        r.group === "search"
          ? r.group
          : "crm";

      const status: IntegrationStatus =
        r.status === "not_connected" ||
        r.status === "connected" ||
        r.status === "configured"
          ? r.status
          : "not_connected";

      return {
        id: safeString(r.id, uid()),
        group,
        title: safeString(r.title, ""),
        status,
        settings,
      };
    })
    .filter((r) => r.id && r.title);
}

function defaultIntegrations(): Integration[] {
  return [
    { id: uid(), group: "crm", title: "amoCRM", status: "not_connected" },
    { id: uid(), group: "crm", title: "Bitrix24", status: "not_connected" },
    { id: uid(), group: "crm", title: "Yclients", status: "configured" },
    { id: uid(), group: "crm", title: "Другая CRM / таблица", status: "not_connected" },

    { id: uid(), group: "analytics", title: "Яндекс.Метрика", status: "configured" },
    { id: uid(), group: "analytics", title: "Google Analytics", status: "not_connected" },
    { id: uid(), group: "analytics", title: "Сквозная аналитика / Roistat / другое", status: "not_connected" },

    { id: uid(), group: "ads", title: "Яндекс.Директ", status: "not_connected" },
    { id: uid(), group: "ads", title: "VK Реклама", status: "not_connected" },
    { id: uid(), group: "ads", title: "Telegram Ads / другое", status: "not_connected" },

    { id: uid(), group: "marketplaces", title: "Ozon", status: "not_connected" },
    { id: uid(), group: "marketplaces", title: "Wildberries", status: "not_connected" },
    { id: uid(), group: "marketplaces", title: "Авито (кабинет)", status: "not_connected" },

    { id: uid(), group: "search", title: "Яндекс.Вебмастер", status: "not_connected" },
    { id: uid(), group: "search", title: "Google Search Console", status: "not_connected" },
    { id: uid(), group: "search", title: "Яндекс Бизнес / Организация", status: "not_connected" },
  ];
}

function defaultChannelBudgets(): ChannelBudgetRow[] {
  return [
    { id: uid(), channel: "Сайт / лендинг", budget: 0 },
    { id: uid(), channel: "Соцсети (все)", budget: 0 },
    { id: uid(), channel: "Яндекс.Директ / поиск", budget: 0 },
    { id: uid(), channel: "Авито", budget: 0 },
    { id: uid(), channel: "Маркетплейсы", budget: 0 },
  ];
}

function defaultSpecialistCosts(): SpecialistCostRow[] {
  return [
    { id: uid(), role: "Маркетолог / руководитель маркетинга", cost: 0 },
    { id: uid(), role: "SMM-специалист", cost: 0 },
    { id: uid(), role: "Настройщик рекламы / трафик-менеджер", cost: 0 },
  ];
}

function defaultMaterials(): Materials {
  return { commercialFiles: [], priceFiles: [], brandFiles: [], aiComment: "" };
}

function defaultPointAB(): PointAB {
  return { revenue: "", clients: "", averageCheck: "" };
}

function normalizePointAB(v: unknown, fallback: PointAB): PointAB {
  const o = (v ?? {}) as Record<string, unknown>;

  // поддержка старого v5
  const revenue = safeString((o as any).revenue ?? (o as any).revenuePerMonth, fallback.revenue);
  const clients = safeString((o as any).clients ?? (o as any).clientsPerMonth, fallback.clients);
  const averageCheck = safeString((o as any).averageCheck ?? (o as any).avgCheck, fallback.averageCheck ?? "");

  return {
    revenue,
    clients,
    averageCheck: averageCheck ?? "",
  };
}

function defaultGoalDetails(): GoalDetails {
  return {
    moreLeadsNow: "",
    moreLeadsWant: "",
    avgCheckWant: "",
    marketingComment: "",
    analyticsComment: "",
  };
}

function normalizeGoalDetails(v: unknown, fallback: GoalDetails): GoalDetails {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    moreLeadsNow: safeString((o as any).moreLeadsNow ?? (o as any).leadsNow, fallback.moreLeadsNow),
    moreLeadsWant: safeString((o as any).moreLeadsWant ?? (o as any).leadsTarget, fallback.moreLeadsWant),
    avgCheckWant: safeString((o as any).avgCheckWant ?? (o as any).avgCheckTarget, fallback.avgCheckWant),
    marketingComment: safeString((o as any).marketingComment, fallback.marketingComment),
    analyticsComment: safeString((o as any).analyticsComment, fallback.analyticsComment),
  };
}

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

    pointA: defaultPointAB(),
    pointB: defaultPointAB(),
    goalDetails: defaultGoalDetails(),

    currentRevenue: "",
    currentClients: "",
    targetRevenue: "",
    targetClients: "",

    channels: { connected: [], planned: [] },
    economics: { product: "", averageCheck: "", marginPercent: "" },

    platformLinks: defaultPlatformLinks(),
    channelBudgets: defaultChannelBudgets(),
    specialistCosts: defaultSpecialistCosts(),

    integrations: defaultIntegrations(),
    materials: defaultMaterials(),

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

    const materialsRaw = (parsed as any).materials;
    const materials: Materials =
      materialsRaw && typeof materialsRaw === "object"
        ? {
            commercialFiles: normalizeStringArray((materialsRaw as any).commercialFiles, base.materials.commercialFiles),
            priceFiles: normalizeStringArray((materialsRaw as any).priceFiles, base.materials.priceFiles),
            brandFiles: normalizeStringArray((materialsRaw as any).brandFiles, base.materials.brandFiles),
            aiComment: safeString((materialsRaw as any).aiComment, base.materials.aiComment),
          }
        : base.materials;

    const result: ProjectFact = {
      ...base,
      ...parsed,

      legalForm: normalizeLegalForm(parsed.legalForm),
      workFormat: normalizeWorkFormat(parsed.workFormat),

      services: normalizeStringArray(parsed.services, base.services),
      revenueRange: safeString(parsed.revenueRange, base.revenueRange),
      goals: normalizeStringArray(parsed.goals, base.goals),

      projectName: safeString(parsed.projectName, base.projectName),
      niche: safeString(parsed.niche, base.niche),
      geo: safeString(parsed.geo, base.geo),
      goal: safeString(parsed.goal, base.goal),

      pointA: normalizePointAB((parsed as any).pointA, base.pointA),
      pointB: normalizePointAB((parsed as any).pointB, base.pointB),
      goalDetails: normalizeGoalDetails((parsed as any).goalDetails, base.goalDetails),

      currentRevenue: safeString((parsed as any).currentRevenue, base.currentRevenue),
      currentClients: safeString((parsed as any).currentClients, base.currentClients),
      targetRevenue: safeString((parsed as any).targetRevenue, base.targetRevenue),
      targetClients: safeString((parsed as any).targetClients, base.targetClients),

      channels: {
        connected: normalizeStringArray(parsed.channels?.connected, base.channels.connected),
        planned: normalizeStringArray(parsed.channels?.planned, base.channels.planned),
      },

      economics: {
        product: safeString(parsed.economics?.product, base.economics.product),
        averageCheck: safeString(parsed.economics?.averageCheck, base.economics.averageCheck),
        marginPercent: safeString(parsed.economics?.marginPercent, base.economics.marginPercent),
      },

      platformLinks: normalizePlatformLinks(parsed.platformLinks, base.platformLinks),
      channelBudgets: normalizeChannelBudgets(parsed.channelBudgets, base.channelBudgets),
      specialistCosts: normalizeSpecialistCosts(parsed.specialistCosts, base.specialistCosts),

      integrations: normalizeIntegrations(parsed.integrations, base.integrations),

      materials,

      onboardingDone: Boolean(parsed.onboardingDone),
      lastStep: normalizeLastStep(parsed.lastStep),
      updatedAt: safeString(parsed.updatedAt, base.updatedAt),
    };

    return syncDerivedFields(result);
  } catch {
    return null;
  }
}

export function loadProjectFact(): ProjectFact {
  if (typeof window === "undefined") return getDefaultProjectFact();

  const rawV4 = window.localStorage.getItem(PROJECT_FACT_STORAGE_KEY);
  const parsedV4 = safeParse(rawV4);
  if (parsedV4) return parsedV4;

  const rawV5 = window.localStorage.getItem(LEGACY_PROJECT_FACT_STORAGE_KEY_V5);
  const parsedV5 = safeParse(rawV5);
  if (parsedV5) {
    saveProjectFact(parsedV5);
    return parsedV5;
  }

  return getDefaultProjectFact();
}

export function saveProjectFact(next: ProjectFact) {
  if (typeof window === "undefined") return;
  const payload: ProjectFact = { ...syncDerivedFields(next), updatedAt: new Date().toISOString() };
  window.localStorage.setItem(PROJECT_FACT_STORAGE_KEY, JSON.stringify(payload));
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

    platformLinks: patch.platformLinks
      ? { ...current.platformLinks, ...patch.platformLinks }
      : current.platformLinks,

    channelBudgets: Array.isArray(patch.channelBudgets) ? patch.channelBudgets : current.channelBudgets,
    specialistCosts: Array.isArray(patch.specialistCosts) ? patch.specialistCosts : current.specialistCosts,
    integrations: Array.isArray(patch.integrations) ? patch.integrations : current.integrations,

    materials: patch.materials ? { ...current.materials, ...patch.materials } : current.materials,

    pointA: patch.pointA ? { ...current.pointA, ...patch.pointA } : current.pointA,
    pointB: patch.pointB ? { ...current.pointB, ...patch.pointB } : current.pointB,
    goalDetails: patch.goalDetails ? { ...current.goalDetails, ...patch.goalDetails } : current.goalDetails,

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
  window.localStorage.removeItem(PROJECT_FACT_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_PROJECT_FACT_STORAGE_KEY_V5);
  window.dispatchEvent(new Event("knopka:projectFactUpdated"));
}

export function getFactStatus() {
  const f = loadProjectFact();

  const missing: string[] = [];
  if (!normalizeText(f.projectName)) missing.push("Название компании");
  if (!normalizeText(f.niche)) missing.push("Ниша");
  if (!normalizeText(f.geo)) missing.push("Город/регион");
  if (!normalizeText(f.goal)) missing.push("Цель");
  if (!normalizeText(f.economics.averageCheck)) missing.push("Средний чек");
  if (!normalizeText(f.currentRevenue)) missing.push("Оборот сейчас");
  if (!normalizeText(f.currentClients)) missing.push("Клиенты/продажи сейчас");
  if (!normalizeText(f.targetRevenue)) missing.push("Оборот (цель)");
  if (!normalizeText(f.targetClients)) missing.push("Клиенты/продажи (цель)");

  const started =
    !!normalizeText(f.projectName) ||
    !!normalizeText(f.niche) ||
    !!normalizeText(f.geo) ||
    !!normalizeText(f.goal) ||
    !!normalizeText(f.currentRevenue) ||
    !!normalizeText(f.currentClients) ||
    !!normalizeText(f.targetRevenue) ||
    !!normalizeText(f.targetClients) ||
    (f.services?.length ?? 0) > 0 ||
    (f.goals?.length ?? 0) > 0 ||
    !!normalizeText(f.economics.averageCheck);

  const done = Boolean(f.onboardingDone);

  const nextStep = done ? 1 : f.lastStep;
  const continueUrl = `/app/onboarding/step-${nextStep}`;

  return { started, done, missing, missingCount: missing.length, continueUrl, fact: f };
}

/** Куда направить пользователя после входа: незавершённый онбординг или кабинет */
export function getCabinetEntryPath(): string {
  const { done, started, continueUrl } = getFactStatus();
  if (done) return "/app/dashboard";
  if (!started) return "/app/onboarding/step-1";
  return continueUrl;
}

/** Ключевой продукт/услуга: поле экономики или список услуг с шага 1 онбординга */
export function describeProductService(f: ProjectFact): string {
  const p = normalizeText(f.economics.product);
  if (p) return p;
  const svc = (f.services ?? []).map((s) => normalizeText(s)).filter(Boolean);
  return svc.join(", ");
}

function syncDerivedFields(f: ProjectFact): ProjectFact {
  const next: ProjectFact = { ...f };

  // ключевой продукт: шаг 1 пишет в services[], стратегия ждёт economics.product
  if (!normalizeText(next.economics.product)) {
    const svc = (next.services ?? []).map((s) => normalizeText(s)).filter(Boolean);
    if (svc.length > 0) {
      next.economics = { ...next.economics, product: svc.join(", ") };
    }
  }

  // если заполнили pointA/pointB — подтягиваем в обязательные поля
  if (!normalizeText(next.currentRevenue) && normalizeText(next.pointA.revenue)) next.currentRevenue = normalizeText(next.pointA.revenue);
  if (!normalizeText(next.currentClients) && normalizeText(next.pointA.clients)) next.currentClients = normalizeText(next.pointA.clients);
  if (!normalizeText(next.targetRevenue) && normalizeText(next.pointB.revenue)) next.targetRevenue = normalizeText(next.pointB.revenue);
  if (!normalizeText(next.targetClients) && normalizeText(next.pointB.clients)) next.targetClients = normalizeText(next.pointB.clients);

  // средний чек сейчас — в economics.averageCheck; дублируем в pointA.averageCheck
  const avgNow = normalizeText(next.economics.averageCheck ?? "");
  if (avgNow && !normalizeText(next.pointA.averageCheck ?? "")) {
    next.pointA = { ...next.pointA, averageCheck: avgNow };
  }

  // если выбрана цель «повысить чек» и указан want — дублируем в pointB.averageCheck
  if (normalizeText(next.goalDetails.avgCheckWant) && !normalizeText(next.pointB.averageCheck ?? "")) {
    next.pointB = { ...next.pointB, averageCheck: normalizeText(next.goalDetails.avgCheckWant) };
  }

  return next;
}
